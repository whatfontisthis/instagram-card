"use client";
import { forwardRef } from "react";
import type {
  BodyCardData,
  CoverCardData,
  TakeawayCardData,
} from "@/lib/types";
import type { Gradient } from "@/lib/gradients";
import { Editable } from "./Editable";

export const CARD_W = 1080;
export const CARD_H = 1350;

interface CommonProps {
  gradient: Gradient;
  index: number;
  total: number;
}

interface CoverProps extends CommonProps {
  data: CoverCardData;
  coverImage: string | null;
  onChange: (d: CoverCardData) => void;
}

export const CoverCard = forwardRef<HTMLDivElement, CoverProps>(
  function CoverCard({ data, coverImage, onChange, gradient }, ref) {
    const useImage = !!coverImage;
    const textLight = useImage || gradient.textColor === "light";
    return (
      <div
        ref={ref}
        className="relative overflow-hidden"
        style={{
          width: CARD_W,
          height: CARD_H,
          background: useImage ? "#000" : gradient.css,
          color: textLight ? "#ffffff" : "#0a0a0a",
        }}
      >
        {useImage && coverImage && (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={coverImage}
              alt=""
              crossOrigin="anonymous"
              className="absolute inset-0 h-full w-full object-cover opacity-90"
            />
            <div
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(180deg, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.35) 45%, rgba(0,0,0,0.85) 100%)",
              }}
            />
          </>
        )}
        <div className="relative flex h-full flex-col justify-between p-20">
          <Editable
            value={data.source_label}
            onChange={(v) => onChange({ ...data, source_label: v })}
            multiline={false}
            className="text-[28px] font-medium uppercase tracking-[0.18em] opacity-80"
          />
          <div className="space-y-8">
            <Editable
              value={data.headline}
              onChange={(v) => onChange({ ...data, headline: v })}
              className="text-[112px] font-extrabold leading-[1.02] tracking-[-0.02em]"
            />
            <Editable
              value={data.subhead}
              onChange={(v) => onChange({ ...data, subhead: v })}
              className="text-[40px] font-medium leading-[1.3] opacity-90"
            />
          </div>
        </div>
      </div>
    );
  },
);

interface BodyProps extends CommonProps {
  data: BodyCardData;
  onChange: (d: BodyCardData) => void;
}

export const BodyCard = forwardRef<HTMLDivElement, BodyProps>(function BodyCard(
  { data, gradient, index, total, onChange },
  ref,
) {
  const light = gradient.textColor === "light";
  const fg = light ? "#ffffff" : "#0a0a0a";
  const dim = light ? "rgba(255,255,255,0.65)" : "rgba(10,10,10,0.55)";
  return (
    <div
      ref={ref}
      className="relative overflow-hidden"
      style={{
        width: CARD_W,
        height: CARD_H,
        background: gradient.css,
        color: fg,
      }}
    >
      <div className="flex h-full flex-col justify-between p-20">
        <div
          className="text-[26px] font-medium uppercase tracking-[0.18em]"
          style={{ color: dim }}
        >
          {index} / {total}
        </div>
        <div className="space-y-10">
          <Editable
            value={data.headline}
            onChange={(v) => onChange({ ...data, headline: v })}
            className="text-[84px] font-extrabold leading-[1.04] tracking-[-0.02em]"
          />
          <Editable
            value={data.body}
            onChange={(v) => onChange({ ...data, body: v })}
            className="text-[44px] font-medium leading-[1.35]"
          />
        </div>
        <div>
          {data.key_term && data.gloss ? (
            <div
              className="border-t pt-8"
              style={{
                borderColor: light
                  ? "rgba(255,255,255,0.2)"
                  : "rgba(10,10,10,0.15)",
              }}
            >
              <Editable
                value={data.key_term}
                onChange={(v) => onChange({ ...data, key_term: v })}
                multiline={false}
                className="text-[30px] font-bold tracking-tight"
              />
              <Editable
                value={data.gloss}
                onChange={(v) => onChange({ ...data, gloss: v })}
                className="text-[30px] font-normal italic leading-[1.35]"
                style={{ color: dim } as React.CSSProperties}
              />
            </div>
          ) : (
            <div className="h-px" />
          )}
        </div>
      </div>
    </div>
  );
});

interface TakeawayProps extends CommonProps {
  data: TakeawayCardData;
  sourceLabel: string;
  onChange: (d: TakeawayCardData) => void;
}

export const TakeawayCard = forwardRef<HTMLDivElement, TakeawayProps>(
  function TakeawayCard({ data, gradient, sourceLabel, onChange }, ref) {
    const light = gradient.textColor === "light";
    const fg = light ? "#ffffff" : "#0a0a0a";
    const dim = light ? "rgba(255,255,255,0.65)" : "rgba(10,10,10,0.55)";
    return (
      <div
        ref={ref}
        className="relative overflow-hidden"
        style={{
          width: CARD_W,
          height: CARD_H,
          background: gradient.css,
          color: fg,
        }}
      >
        <div className="flex h-full flex-col justify-between p-20">
          <div
            className="text-[26px] font-medium uppercase tracking-[0.18em]"
            style={{ color: dim }}
          >
            Takeaway
          </div>
          <div className="space-y-10">
            <Editable
              value={data.headline}
              onChange={(v) => onChange({ ...data, headline: v })}
              className="text-[96px] font-extrabold leading-[1.02] tracking-[-0.02em]"
            />
            <Editable
              value={data.body}
              onChange={(v) => onChange({ ...data, body: v })}
              className="text-[44px] font-medium leading-[1.35]"
            />
          </div>
          <div
            className="text-[26px] font-medium tracking-tight"
            style={{ color: dim }}
          >
            {sourceLabel}
          </div>
        </div>
      </div>
    );
  },
);
