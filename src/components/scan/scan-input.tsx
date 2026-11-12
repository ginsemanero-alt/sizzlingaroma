"use client";
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { ScanBarcode } from "lucide-react";

export interface ScanInputHandle {
  focus: () => void;
}

/**
 * Barcode input that stays focused. A USB scanner behaves like a keyboard that types
 * the code and presses Enter, so Enter submits the code. Typing manually works too.
 * If the user types while nothing is focused, keystrokes are redirected here.
 */
export const ScanInput = forwardRef<ScanInputHandle, { onScan: (code: string) => void; disabled?: boolean; label?: string; autoRefocus?: boolean }>(
  function ScanInput({ onScan, disabled, label = "Scan or type a barcode", autoRefocus = true }, ref) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [value, setValue] = useState("");

    useImperativeHandle(ref, () => ({ focus: () => inputRef.current?.focus() }));

    useEffect(() => {
      inputRef.current?.focus();
      if (!autoRefocus) return;
      const onKey = (e: KeyboardEvent) => {
        const t = e.target as HTMLElement | null;
        const typing = t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable);
        const inDialog = t?.closest("dialog");
        if (typing || inDialog || e.ctrlKey || e.metaKey || e.altKey) return;
        if (e.key.length === 1) inputRef.current?.focus();
      };
      window.addEventListener("keydown", onKey);
      return () => window.removeEventListener("keydown", onKey);
    }, [autoRefocus]);

    return (
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const code = value.trim();
          if (!code) return;
          onScan(code);
          setValue("");
        }}
        className="relative"
      >
        <label htmlFor="scan-input" className="field-label">{label}</label>
        <ScanBarcode className="pointer-events-none absolute bottom-4 left-5 size-6 text-primary" aria-hidden />
        <input
          ref={inputRef}
          id="scan-input"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          disabled={disabled}
          className="w-full rounded-[1.75rem] border-2 border-primary/30 bg-white py-4 pl-14 pr-24 font-mono text-lg font-bold tracking-wider text-ink shadow-soft outline-none transition placeholder:font-sans placeholder:text-sm placeholder:font-semibold placeholder:tracking-normal placeholder:text-muted/70 focus:border-primary"
          placeholder="Waiting for scan… (or type + Enter)"
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          inputMode="text"
          enterKeyHint="go"
          aria-describedby="scan-help"
        />
        <button type="submit" className="btn-primary absolute bottom-2 right-2 !rounded-[1.3rem]" disabled={disabled || !value.trim()}>
          Find
        </button>
        <p id="scan-help" className="mt-2 text-xs text-muted">USB scanner: just scan — the field stays focused. Phone: use the camera button.</p>
      </form>
    );
  },
);
