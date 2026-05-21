"use client";
import { useEffect, useRef } from "react";

interface Props {
  value: string;
  onChange: (v: string) => void;
  className?: string;
  style?: React.CSSProperties;
  multiline?: boolean;
  placeholder?: string;
}

export function Editable({
  value,
  onChange,
  className,
  style,
  multiline = true,
  placeholder,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);

  // Keep DOM in sync if external value changes and element isn't focused.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (document.activeElement !== el && el.innerText !== value) {
      el.innerText = value;
    }
  }, [value]);

  return (
    <div
      ref={ref}
      contentEditable
      suppressContentEditableWarning
      data-placeholder={placeholder ?? ""}
      className={className}
      style={style}
      onBlur={(e) => {
        const next = e.currentTarget.innerText;
        if (next !== value) onChange(next);
      }}
      onKeyDown={(e) => {
        if (!multiline && e.key === "Enter") {
          e.preventDefault();
          (e.currentTarget as HTMLElement).blur();
        }
      }}
    >
      {value}
    </div>
  );
}
