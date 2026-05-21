import { NextRequest } from "next/server";
import { spawn } from "node:child_process";
import { JSDOM } from "jsdom";
import { Readability } from "@mozilla/readability";
import { buildTextPrompt } from "@/lib/prompt";
import type { ExtractedContent, PostData, SourceType } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 180;

type Event =
  | {
      kind: "stage";
      id: string;
      label: string;
      status: "active" | "done" | "error";
      detail?: string;
      progress?: number;
    }
  | { kind: "tick"; id: string; detail: string; progress?: number }
  | { kind: "result"; post: PostData }
  | { kind: "error"; message: string };

// Expected total characters in the model's JSON response.
// Korean output averages 2,000–2,800 chars; we use 2,500 as the denominator
// for the progress percentage and cap streaming progress at 99% so the bar
// finishes only on real completion.
const EXPECTED_MODEL_CHARS = 2500;

const YT_HOSTS = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "youtu.be",
]);

function detectSourceType(url: string): SourceType {
  try {
    const u = new URL(url);
    if (YT_HOSTS.has(u.hostname)) return "video";
    return "article";
  } catch {
    return "article";
  }
}

function getYouTubeId(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname === "youtu.be") return u.pathname.slice(1) || null;
    if (u.pathname === "/watch") return u.searchParams.get("v");
    if (u.pathname.startsWith("/shorts/"))
      return u.pathname.split("/")[2] || null;
    if (u.pathname.startsWith("/embed/"))
      return u.pathname.split("/")[2] || null;
    return null;
  } catch {
    return null;
  }
}

async function fetchHtml(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
      Accept: "text/html,application/xhtml+xml",
    },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.text();
}

function metaContent(dom: JSDOM, selectors: string[]): string | null {
  const doc = dom.window.document;
  for (const sel of selectors) {
    const el = doc.querySelector(sel);
    const v = el?.getAttribute("content");
    if (v) return v;
  }
  return null;
}

async function extractArticle(url: string): Promise<ExtractedContent> {
  const html = await fetchHtml(url);
  const dom = new JSDOM(html, { url });
  const og_image = metaContent(dom, [
    'meta[property="og:image"]',
    'meta[name="twitter:image"]',
  ]);
  const site_name =
    metaContent(dom, [
      'meta[property="og:site_name"]',
      'meta[name="application-name"]',
    ]) || new URL(url).hostname.replace(/^www\./, "");
  const reader = new Readability(dom.window.document);
  const article = reader.parse();
  const title =
    article?.title ||
    metaContent(dom, ['meta[property="og:title"]']) ||
    dom.window.document.title ||
    "Untitled";
  const text = (article?.textContent || "").trim().slice(0, 12000);
  return { url, source_type: "article", title, text, og_image, site_name };
}

async function extractYouTube(url: string): Promise<ExtractedContent> {
  const id = getYouTubeId(url);
  if (!id) throw new Error("유튜브 영상 ID를 찾지 못했습니다");
  const oembed = await fetch(
    `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`,
  );
  let title = "YouTube Video";
  let author = "YouTube";
  let thumb: string | null = `https://i.ytimg.com/vi/${id}/maxresdefault.jpg`;
  if (oembed.ok) {
    const data = (await oembed.json()) as {
      title?: string;
      author_name?: string;
      thumbnail_url?: string;
    };
    title = data.title || title;
    author = data.author_name || author;
    thumb = data.thumbnail_url || thumb;
  }
  let description = "";
  try {
    const html = await fetchHtml(url);
    const m = html.match(/"shortDescription":"((?:\\.|[^"\\])*)"/);
    if (m) description = JSON.parse(`"${m[1]}"`);
  } catch {
    // best effort
  }
  const text = [
    `Video title: ${title}`,
    `Channel: ${author}`,
    description ? `Description:\n${description}` : "",
  ]
    .filter(Boolean)
    .join("\n\n")
    .slice(0, 12000);
  return {
    url,
    source_type: "video",
    title,
    text,
    og_image: thumb,
    site_name: author,
  };
}

interface RawPost {
  source_url?: string;
  source_type?: string;
  cover?: { headline?: string; subhead?: string; source_label?: string };
  body_cards?: Array<{
    headline?: string;
    body?: string;
    key_term?: string | null;
    gloss?: string | null;
  }>;
  takeaway?: { headline?: string; body?: string };
}

function extractJsonObject(text: string): unknown {
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  const raw = fence ? fence[1] : text;
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("응답에서 JSON 객체를 찾지 못했습니다");
  }
  return JSON.parse(raw.slice(start, end + 1));
}

function validatePost(obj: unknown): asserts obj is RawPost {
  if (!obj || typeof obj !== "object") throw new Error("객체가 아닙니다");
  const o = obj as RawPost;
  if (!o.cover?.headline || !o.cover?.subhead || !o.cover?.source_label)
    throw new Error("커버 필드 누락");
  if (!Array.isArray(o.body_cards) || o.body_cards.length < 1)
    throw new Error("본문 카드 누락");
  if (!o.takeaway?.headline || !o.takeaway?.body)
    throw new Error("결론 필드 누락");
}

async function runClaude(
  prompt: string,
  onTextDelta: (chunk: string) => void,
  timeoutMs = 120_000,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const args = [
      "-p",
      "--model",
      "sonnet",
      "--output-format",
      "stream-json",
      "--verbose",
      "--max-turns",
      "1",
    ];
    const child = spawn("claude", args, {
      shell: process.platform === "win32",
      stdio: ["pipe", "pipe", "pipe"],
      env: { ...process.env, FORCE_COLOR: "0" },
    });

    let stderr = "";
    let buffer = "";
    let finalText = "";
    let settled = false;
    const finish = (fn: () => void) => {
      if (settled) return;
      settled = true;
      fn();
    };

    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      finish(() => reject(new Error(`Claude CLI 시간 초과 (${timeoutMs}ms)`)));
    }, timeoutMs);

    const handleLine = (line: string) => {
      const trimmed = line.trim();
      if (!trimmed) return;
      try {
        const ev = JSON.parse(trimmed);
        // stream-json emits assistant messages with content blocks.
        // The content block of type "text" carries the model's text output.
        if (ev.type === "assistant" && ev.message?.content) {
          for (const block of ev.message.content) {
            if (block.type === "text" && typeof block.text === "string") {
              onTextDelta(block.text);
              finalText += block.text;
            }
          }
        } else if (ev.type === "result") {
          // result event carries the final accumulated result text
          if (typeof ev.result === "string" && ev.result.length > finalText.length) {
            finalText = ev.result;
          }
        }
      } catch {
        // ignore non-JSON lines
      }
    };

    child.stdout.on("data", (d: Buffer) => {
      buffer += d.toString("utf8");
      const lines = buffer.split(/\r?\n/);
      buffer = lines.pop() || "";
      for (const line of lines) handleLine(line);
    });
    child.stderr.on("data", (d: Buffer) => {
      stderr += d.toString("utf8");
    });

    child.on("error", (err) => {
      clearTimeout(timer);
      finish(() =>
        reject(new Error(`Claude CLI 실행 실패: ${err.message}`)),
      );
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (buffer.trim()) handleLine(buffer);
      if (code !== 0) {
        finish(() =>
          reject(
            new Error(
              `Claude CLI 종료 코드 ${code}. stderr: ${stderr.slice(0, 400)}`,
            ),
          ),
        );
        return;
      }
      finish(() => resolve(finalText));
    });

    child.stdin.write(prompt);
    child.stdin.end();
  });
}

export async function POST(req: NextRequest) {
  const { url, language } = (await req.json()) as {
    url?: string;
    language?: "ko" | "en";
  };
  const lang: "ko" | "en" = language === "en" ? "en" : "ko";

  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (ev: Event) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(ev)}\n\n`));
      };
      const stage = (
        id: string,
        label: string,
        status: "active" | "done" | "error",
        detail?: string,
        progress?: number,
      ) => send({ kind: "stage", id, label, status, detail, progress });
      const tick = (id: string, detail: string, progress?: number) =>
        send({ kind: "tick", id, detail, progress });

      try {
        if (!url || typeof url !== "string") {
          throw new Error("URL이 필요합니다");
        }

        // Stage 1 — detect
        stage("detect", "소스 분석", "active", url);
        const sourceType = detectSourceType(url);
        const host = (() => {
          try {
            return new URL(url).hostname.replace(/^www\./, "");
          } catch {
            return "";
          }
        })();
        stage(
          "detect",
          "소스 분석",
          "done",
          `${host} · ${sourceType === "video" ? "유튜브 영상" : "웹 기사"}`,
        );

        // Stage 2 — fetch + extract
        stage(
          "fetch",
          "본문 가져오기",
          "active",
          sourceType === "video" ? "oEmbed + 페이지" : "HTML 다운로드",
        );
        const content =
          sourceType === "video"
            ? await extractYouTube(url)
            : await extractArticle(url);
        if (!content.text || content.text.length < 100) {
          throw new Error("본문이 너무 짧거나 추출할 수 없습니다");
        }
        stage(
          "fetch",
          "본문 가져오기",
          "done",
          `${content.text.length.toLocaleString()}자 · ${content.title.slice(0, 40)}${content.title.length > 40 ? "…" : ""}`,
        );

        // Stage 3 — model
        stage("model", "Claude 추론", "active", "Sonnet 4.6 호출 중", 1);
        const prompt = buildTextPrompt(
          {
            url: content.url,
            source_type: content.source_type,
            site_name: content.site_name,
            title: content.title,
            text: content.text,
          },
          lang,
        );
        const startedAt = Date.now();
        let accumulated = "";
        let lastTickAt = 0;
        const text = await runClaude(prompt, (chunk) => {
          accumulated += chunk;
          const now = Date.now();
          // Throttle ticks to every 150ms so we don't flood the stream.
          if (now - lastTickAt > 150) {
            lastTickAt = now;
            const elapsed = ((now - startedAt) / 1000).toFixed(1);
            const progress = Math.min(
              99,
              Math.max(
                1,
                Math.round((accumulated.length / EXPECTED_MODEL_CHARS) * 100),
              ),
            );
            tick(
              "model",
              `${accumulated.length.toLocaleString()}자 · ${elapsed}초 · ${progress}%`,
              progress,
            );
          }
        });
        const elapsedSec = ((Date.now() - startedAt) / 1000).toFixed(1);
        stage(
          "model",
          "Claude 추론",
          "done",
          `${(text || accumulated).length.toLocaleString()}자 · ${elapsedSec}초 · 100%`,
          100,
        );

        // Stage 4 — parse
        stage("parse", "JSON 파싱", "active");
        const parsed = extractJsonObject(text || accumulated);
        validatePost(parsed);
        const bodyCount = parsed.body_cards?.length ?? 0;
        const glossed =
          parsed.body_cards?.filter((c) => c.key_term && c.gloss).length ?? 0;
        stage(
          "parse",
          "JSON 파싱",
          "done",
          `본문 ${bodyCount}장 · 용어풀이 ${glossed}개`,
        );

        const post: PostData = {
          source_url: parsed.source_url ?? content.url,
          source_type:
            parsed.source_type === "video" || parsed.source_type === "article"
              ? parsed.source_type
              : content.source_type,
          cover: {
            headline: parsed.cover!.headline!,
            subhead: parsed.cover!.subhead!,
            source_label: parsed.cover!.source_label!,
          },
          body_cards: parsed.body_cards!.map((c) => ({
            headline: c.headline ?? "",
            body: c.body ?? "",
            key_term: c.key_term ?? null,
            gloss: c.gloss ?? null,
          })),
          takeaway: {
            headline: parsed.takeaway!.headline!,
            body: parsed.takeaway!.body!,
          },
          cover_image: content.og_image,
        };

        send({ kind: "result", post });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        send({ kind: "error", message: msg });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
