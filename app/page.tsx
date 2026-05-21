"use client";
import { useMemo, useRef, useState } from "react";
import { toPng } from "html-to-image";
import JSZip from "jszip";
import confetti from "canvas-confetti";
import {
  CoverCard,
  BodyCard,
  TakeawayCard,
  CARD_W,
  CARD_H,
} from "@/components/Card";
import { GRADIENTS } from "@/lib/gradients";
import type {
  BodyCardData,
  CoverCardData,
  PostData,
  TakeawayCardData,
} from "@/lib/types";

const PREVIEW_SCALE = 0.32;

interface Stage {
  id: string;
  label: string;
  status: "pending" | "active" | "done" | "error";
  detail?: string;
  progress?: number;
}

type StreamEvent =
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

function fireConfetti() {
  const colors = ["#1a73e8", "#34a853", "#fbbc04", "#ea4335"];
  const duration = 800;
  const end = Date.now() + duration;

  // Side bursts from both edges
  confetti({
    particleCount: 60,
    angle: 60,
    spread: 65,
    startVelocity: 55,
    origin: { x: 0, y: 0.6 },
    colors,
    scalar: 0.9,
  });
  confetti({
    particleCount: 60,
    angle: 120,
    spread: 65,
    startVelocity: 55,
    origin: { x: 1, y: 0.6 },
    colors,
    scalar: 0.9,
  });

  // Center burst delayed for a second "pop"
  setTimeout(() => {
    confetti({
      particleCount: 100,
      spread: 100,
      startVelocity: 45,
      origin: { x: 0.5, y: 0.4 },
      colors,
      scalar: 1.1,
    });
  }, 220);

  // Gentle tail rain
  (function tail() {
    if (Date.now() > end) return;
    confetti({
      particleCount: 4,
      angle: 90,
      spread: 120,
      startVelocity: 25,
      origin: { x: Math.random(), y: 0 },
      colors,
      scalar: 0.7,
      gravity: 0.8,
    });
    requestAnimationFrame(tail);
  })();
}

const STAGE_BLUEPRINT: Stage[] = [
  { id: "detect", label: "소스 분석", status: "pending" },
  { id: "fetch", label: "본문 가져오기", status: "pending" },
  { id: "model", label: "Claude 추론", status: "pending" },
  { id: "parse", label: "JSON 파싱", status: "pending" },
];

function hashIndex(s: string, mod: number) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h % mod;
}

async function exportCard(node: HTMLElement): Promise<string> {
  await (document as Document & { fonts: { ready: Promise<unknown> } }).fonts
    .ready;
  return await toPng(node, {
    pixelRatio: 1,
    width: CARD_W,
    height: CARD_H,
    cacheBust: true,
    backgroundColor: "#000000",
  });
}

export default function Home() {
  const [url, setUrl] = useState("");
  const [running, setRunning] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stages, setStages] = useState<Stage[]>(STAGE_BLUEPRINT);
  const [post, setPost] = useState<PostData | null>(null);
  const [gradientIdx, setGradientIdx] = useState(0);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);

  const gradient = useMemo(() => GRADIENTS[gradientIdx], [gradientIdx]);

  function applyEvent(ev: StreamEvent) {
    if (ev.kind === "stage") {
      setStages((prev) =>
        prev.map((s) =>
          s.id === ev.id
            ? {
                ...s,
                label: ev.label,
                status: ev.status,
                detail: ev.detail,
                progress: ev.progress ?? s.progress,
              }
            : s,
        ),
      );
    } else if (ev.kind === "tick") {
      setStages((prev) =>
        prev.map((s) =>
          s.id === ev.id
            ? {
                ...s,
                detail: ev.detail,
                progress: ev.progress ?? s.progress,
              }
            : s,
        ),
      );
    } else if (ev.kind === "result") {
      setPost(ev.post);
      setGradientIdx(hashIndex(ev.post.source_url, GRADIENTS.length));
      fireConfetti();
    } else if (ev.kind === "error") {
      setError(ev.message);
      setStages((prev) =>
        prev.map((s) =>
          s.status === "active" ? { ...s, status: "error" } : s,
        ),
      );
    }
  }

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim() || running) return;
    setError(null);
    setPost(null);
    setStages(STAGE_BLUEPRINT.map((s) => ({ ...s })));
    setRunning(true);

    try {
      const res = await fetch("/api/run", {
        method: "POST",
        body: JSON.stringify({ url }),
        headers: { "Content-Type": "application/json" },
      });
      if (!res.body) throw new Error("스트림 응답이 없습니다");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const messages = buffer.split("\n\n");
        buffer = messages.pop() || "";
        for (const msg of messages) {
          const line = msg.split("\n").find((l) => l.startsWith("data: "));
          if (!line) continue;
          try {
            applyEvent(JSON.parse(line.slice(6)) as StreamEvent);
          } catch {
            // ignore malformed
          }
        }
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setRunning(false);
    }
  }

  function updateCover(c: CoverCardData) {
    setPost((p) => (p ? { ...p, cover: c } : p));
  }
  function updateBody(i: number, c: BodyCardData) {
    setPost((p) => {
      if (!p) return p;
      const next = [...p.body_cards];
      next[i] = c;
      return { ...p, body_cards: next };
    });
  }
  function updateTakeaway(c: TakeawayCardData) {
    setPost((p) => (p ? { ...p, takeaway: c } : p));
  }

  async function exportAll() {
    if (!post) return;
    setExporting(true);
    try {
      const zip = new JSZip();
      const nodes = cardRefs.current.filter(Boolean) as HTMLDivElement[];
      for (let i = 0; i < nodes.length; i++) {
        const dataUrl = await exportCard(nodes[i]);
        const b64 = dataUrl.split(",")[1];
        zip.file(`card-${String(i + 1).padStart(2, "0")}.png`, b64, {
          base64: true,
        });
      }
      const blob = await zip.generateAsync({ type: "blob" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      const stem =
        post.cover.headline
          .toLowerCase()
          .replace(/[^a-z0-9가-힣]+/g, "-")
          .replace(/^-|-$/g, "")
          .slice(0, 48) || "post";
      a.download = `${stem}.zip`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setExporting(false);
    }
  }

  async function exportOne(idx: number) {
    if (!post) return;
    const node = cardRefs.current[idx];
    if (!node) return;
    setExporting(true);
    try {
      const dataUrl = await exportCard(node);
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `card-${String(idx + 1).padStart(2, "0")}.png`;
      a.click();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setExporting(false);
    }
  }

  cardRefs.current = [];
  const registerRef = (idx: number) => (el: HTMLDivElement | null) => {
    cardRefs.current[idx] = el;
  };

  const totalCards = post ? 1 + post.body_cards.length + 1 : 0;
  const buttonLabel = running ? "생성 중…" : "생성";
  const showProgress = running || stages.some((s) => s.status !== "pending");

  return (
    <main className="mx-auto max-w-6xl px-6 py-12 sm:px-10 sm:py-16">
      {/* Header */}
      <header className="mb-10">
        <div className="flex items-center gap-3">
          <LogoMark />
          <span className="text-[14px] font-medium text-[var(--md-on-surface-variant)]">
            Card Studio
          </span>
        </div>
        <h1 className="mt-6 text-[36px] font-medium leading-tight tracking-[-0.01em]">
          인스타그램 카드 생성기
        </h1>
        <p className="mt-2 text-[15px] leading-relaxed text-[var(--md-on-surface-variant)]">
          기사나 유튜브 링크를 붙여넣으면 캐러셀 카드로 변환합니다.
        </p>
      </header>

      {/* Input row */}
      <form onSubmit={handleGenerate} className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <input
            id="url"
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder=" "
            className="peer w-full rounded-2xl border border-[var(--md-outline)] bg-[var(--md-surface)] px-5 pb-3 pt-6 text-[15px] outline-none transition focus:border-[var(--md-primary)] focus:ring-1 focus:ring-[var(--md-primary)] disabled:opacity-50"
            disabled={running}
            required
          />
          <label
            htmlFor="url"
            className="pointer-events-none absolute left-5 top-2 text-[12px] font-medium text-[var(--md-on-surface-variant)] transition peer-placeholder-shown:top-4 peer-placeholder-shown:text-[15px] peer-focus:top-2 peer-focus:text-[12px] peer-focus:text-[var(--md-primary)]"
          >
            기사 또는 YouTube URL
          </label>
        </div>
        <button
          type="submit"
          disabled={running}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-[var(--md-primary)] px-7 py-4 text-[14px] font-medium text-[var(--md-on-primary)] shadow-[var(--md-elev-1)] transition hover:bg-[var(--md-primary-hover)] hover:shadow-[var(--md-elev-2)] disabled:opacity-50 disabled:shadow-none"
        >
          {running && <Spinner />}
          {buttonLabel}
        </button>
      </form>

      {/* Progress stepper */}
      {showProgress && (
        <section className="mt-8 rounded-3xl bg-[var(--md-surface-container-low)] p-2 shadow-[var(--md-elev-1)]">
          <div className="flex items-center justify-between px-4 pb-2 pt-3">
            <span className="text-[13px] font-medium text-[var(--md-on-surface-variant)]">
              진행 상황
            </span>
            <span className="rounded-full bg-[var(--md-surface-container)] px-2.5 py-0.5 font-mono text-[11px] text-[var(--md-on-surface-variant)]">
              {running ? "실행 중" : "완료"}
            </span>
          </div>
          <ol className="space-y-0 px-2 pb-3 pt-1">
            {stages.map((s, i) => (
              <StageRow
                key={s.id}
                index={i + 1}
                stage={s}
                isLast={i === stages.length - 1}
              />
            ))}
          </ol>
        </section>
      )}

      {/* Error */}
      {error && (
        <div className="mt-6 flex items-start gap-3 rounded-2xl bg-[var(--md-error-container)] px-5 py-4 text-[14px] text-[var(--md-error)]">
          <span className="mt-0.5 inline-flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-[var(--md-error)] text-[12px] font-bold text-white">
            !
          </span>
          <div>
            <div className="font-medium">오류가 발생했습니다</div>
            <div className="mt-0.5 text-[13px] opacity-90">{error}</div>
          </div>
        </div>
      )}

      {/* Cards */}
      {post && (
        <>
          {/* Toolbar */}
          <div className="mt-12 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="mb-3 text-[13px] font-medium text-[var(--md-on-surface-variant)]">
                팔레트
              </div>
              <div className="flex flex-wrap gap-2">
                {GRADIENTS.map((g, i) => (
                  <button
                    key={g.id}
                    onClick={() => setGradientIdx(i)}
                    className={`relative h-10 w-16 overflow-hidden rounded-full border transition ${
                      i === gradientIdx
                        ? "border-[var(--md-primary)] ring-2 ring-[var(--md-primary)] ring-offset-2 ring-offset-[var(--md-surface)]"
                        : "border-[var(--md-outline)] hover:scale-105"
                    }`}
                    style={{ background: g.css }}
                    title={g.id}
                    aria-label={`그라데이션 ${g.id}`}
                  />
                ))}
              </div>
            </div>
            <button
              onClick={exportAll}
              disabled={exporting}
              className="inline-flex items-center gap-2 self-start rounded-full border border-[var(--md-outline)] bg-[var(--md-surface)] px-6 py-3 text-[14px] font-medium text-[var(--md-primary)] transition hover:bg-[rgba(26,115,232,0.08)] disabled:opacity-50 sm:self-auto"
            >
              <DownloadIcon />
              {exporting ? "내보내는 중…" : "전체 ZIP 내보내기"}
            </button>
          </div>

          {/* Card grid */}
          <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <CardFrame
              label="커버"
              num={1}
              total={totalCards}
              onExport={() => exportOne(0)}
              busy={exporting}
            >
              <CoverCard
                ref={registerRef(0)}
                data={post.cover}
                coverImage={post.cover_image}
                onChange={updateCover}
                gradient={gradient}
                index={1}
                total={totalCards}
              />
            </CardFrame>

            {post.body_cards.map((bc, i) => (
              <CardFrame
                key={i}
                label={`본문 ${i + 1}`}
                num={i + 2}
                total={totalCards}
                onExport={() => exportOne(i + 1)}
                busy={exporting}
              >
                <BodyCard
                  ref={registerRef(i + 1)}
                  data={bc}
                  onChange={(d) => updateBody(i, d)}
                  gradient={gradient}
                  index={i + 2}
                  total={totalCards}
                />
              </CardFrame>
            ))}

            <CardFrame
              label="결론"
              num={totalCards}
              total={totalCards}
              onExport={() => exportOne(post.body_cards.length + 1)}
              busy={exporting}
            >
              <TakeawayCard
                ref={registerRef(post.body_cards.length + 1)}
                data={post.takeaway}
                sourceLabel={post.cover.source_label}
                onChange={updateTakeaway}
                gradient={gradient}
                index={totalCards}
                total={totalCards}
              />
            </CardFrame>
          </div>
        </>
      )}

      {/* Empty state */}
      {!post && !running && !error && (
        <div className="mt-12 rounded-3xl bg-[var(--md-surface-container-low)] px-8 py-16 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--md-primary-container)]">
            <SparkIcon />
          </div>
          <div className="text-[16px] font-medium">준비 완료</div>
          <p className="mt-1 text-[13px] text-[var(--md-on-surface-variant)]">
            위 입력란에 URL을 붙여넣으면 카드 생성을 시작합니다.
          </p>
        </div>
      )}

      <footer className="mt-20 flex flex-col items-start justify-between gap-2 border-t border-[var(--md-outline-variant)] pt-6 text-[12px] text-[var(--md-on-surface-faded)] sm:flex-row sm:items-center">
        <div>Claude Sonnet 4.6 · 로컬 실행</div>
        <div>1080 × 1350 · PNG</div>
      </footer>
    </main>
  );
}

function LogoMark() {
  return (
    <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[var(--md-primary)] text-[14px] font-bold text-white shadow-[var(--md-elev-1)]">
      카
    </span>
  );
}

function Spinner() {
  return (
    <span
      className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white"
      aria-hidden
    />
  );
}

function DownloadIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 4v12" />
      <path d="m6 12 6 6 6-6" />
      <path d="M5 20h14" />
    </svg>
  );
}

function SparkIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-6 w-6 text-[var(--md-on-primary-container)]"
      fill="currentColor"
    >
      <path d="M12 2 14 9l7 2-7 2-2 7-2-7-7-2 7-2 2-7Z" />
    </svg>
  );
}

function StageIndicator({ status }: { status: Stage["status"] }) {
  if (status === "done") {
    return (
      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--md-primary)] text-white shadow-[var(--md-elev-1)]">
        <svg
          viewBox="0 0 24 24"
          className="h-3.5 w-3.5"
          fill="none"
          stroke="currentColor"
          strokeWidth={3}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m5 12 5 5L20 7" />
        </svg>
      </span>
    );
  }
  if (status === "active") {
    return (
      <span className="relative flex h-6 w-6 items-center justify-center">
        <span className="absolute inset-0 animate-ping rounded-full bg-[var(--md-primary)] opacity-30" />
        <span className="relative h-6 w-6 rounded-full border-2 border-[var(--md-primary)]">
          <span className="absolute inset-1 rounded-full bg-[var(--md-primary)]" />
        </span>
      </span>
    );
  }
  if (status === "error") {
    return (
      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--md-error)] text-white">
        <span className="text-[12px] font-bold">!</span>
      </span>
    );
  }
  return (
    <span className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-[var(--md-outline)] bg-[var(--md-surface)]" />
  );
}

function StageRow({
  index,
  stage,
  isLast,
}: {
  index: number;
  stage: Stage;
  isLast: boolean;
}) {
  const titleColor =
    stage.status === "pending"
      ? "text-[var(--md-on-surface-faded)]"
      : stage.status === "error"
        ? "text-[var(--md-error)]"
        : "text-[var(--md-on-surface)]";
  const connectorColor =
    stage.status === "done"
      ? "bg-[var(--md-primary)]"
      : "bg-[var(--md-outline-variant)]";
  return (
    <li className="relative flex gap-4 px-2 py-2">
      <div className="relative flex flex-col items-center">
        <StageIndicator status={stage.status} />
        {!isLast && (
          <span
            className={`mt-1 w-0.5 flex-1 ${connectorColor} transition-colors`}
          />
        )}
      </div>
      <div className="flex flex-1 items-start justify-between gap-4 pb-3 pt-0.5">
        <div className="min-w-0 flex-1">
          <div
            className={`text-[14px] font-medium leading-tight ${titleColor}`}
          >
            <span className="mr-2 font-mono text-[11px] text-[var(--md-on-surface-faded)]">
              {String(index).padStart(2, "0")}
            </span>
            {stage.label}
          </div>
          {stage.detail && (
            <div className="mt-1 truncate font-mono text-[12px] text-[var(--md-on-surface-variant)]">
              {stage.detail}
            </div>
          )}
          {typeof stage.progress === "number" &&
            (stage.status === "active" || stage.status === "done") && (
              <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-[var(--md-outline-variant)]">
                <div
                  className="h-full rounded-full bg-[var(--md-primary)] transition-[width] duration-300 ease-out"
                  style={{ width: `${stage.progress}%` }}
                />
              </div>
            )}
        </div>
      </div>
    </li>
  );
}

function CardFrame({
  label,
  num,
  total,
  onExport,
  busy,
  children,
}: {
  label: string;
  num: number;
  total: number;
  onExport: () => void;
  busy: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="group rounded-3xl bg-[var(--md-surface-container-low)] p-4 transition hover:shadow-[var(--md-elev-2)]">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-[var(--md-surface-container)] px-2.5 py-0.5 font-mono text-[11px] text-[var(--md-on-surface-variant)]">
            {num} / {total}
          </span>
          <span className="text-[13px] font-medium text-[var(--md-on-surface)]">
            {label}
          </span>
        </div>
        <button
          onClick={onExport}
          disabled={busy}
          className="rounded-full px-3 py-1 text-[12px] font-medium text-[var(--md-primary)] transition hover:bg-[rgba(26,115,232,0.08)] disabled:opacity-40"
        >
          PNG
        </button>
      </div>
      <div
        className="overflow-hidden rounded-2xl bg-black shadow-[var(--md-elev-1)]"
        style={{
          width: CARD_W * PREVIEW_SCALE,
          height: CARD_H * PREVIEW_SCALE,
        }}
      >
        <div
          style={{
            width: CARD_W,
            height: CARD_H,
            transform: `scale(${PREVIEW_SCALE})`,
            transformOrigin: "top left",
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
