"use client";
import { useEffect, useRef, useState } from "react";
import { Camera, CameraOff, LoaderCircle } from "lucide-react";
import type { IScannerControls } from "@zxing/browser";

/**
 * Phone / webcam barcode scanner (EAN-13, UPC, Code 128, Code 39, QR, …) using @zxing/browser.
 * Needs HTTPS (or localhost) for camera access.
 */
export function CameraScanner({ onDetected, active, onActiveChange }: { onDetected: (code: string) => void; active: boolean; onActiveChange: (v: boolean) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const lastRef = useRef<{ code: string; at: number }>({ code: "", at: 0 });
  const cbRef = useRef(onDetected);
  cbRef.current = onDetected;
  const [status, setStatus] = useState<"idle" | "starting" | "running" | "error">("idle");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!active) {
      controlsRef.current?.stop();
      controlsRef.current = null;
      setStatus("idle");
      return;
    }
    let cancelled = false;
    (async () => {
      setStatus("starting");
      setError("");
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error("This browser can't open the camera. Use HTTPS, or type the code instead.");
        const { BrowserMultiFormatReader } = await import("@zxing/browser");
        const reader = new BrowserMultiFormatReader(undefined, { delayBetweenScanAttempts: 120, delayBetweenScanSuccess: 600 });
        const controls = await reader.decodeFromConstraints(
          { video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false },
          videoRef.current!,
          (result) => {
            if (!result) return;
            const code = result.getText().trim();
            const now = Date.now();
            // ignore the same code seen again within 2.5s (camera keeps seeing it)
            if (code === lastRef.current.code && now - lastRef.current.at < 2500) return;
            lastRef.current = { code, at: now };
            navigator.vibrate?.(60);
            cbRef.current(code);
          },
        );
        if (cancelled) controls.stop();
        else {
          controlsRef.current = controls;
          setStatus("running");
        }
      } catch (e) {
        if (cancelled) return;
        const msg = e instanceof Error ? e.message : String(e);
        setError(/Permission|NotAllowed/i.test(msg) ? "Camera permission was denied. Allow camera access in your browser settings." : /NotFound|Requested device/i.test(msg) ? "No camera found on this device." : msg);
        setStatus("error");
        onActiveChange(false);
      }
    })();
    return () => {
      cancelled = true;
      controlsRef.current?.stop();
      controlsRef.current = null;
    };
  }, [active, onActiveChange]);

  return (
    <div>
      <button
        type="button"
        onClick={() => onActiveChange(!active)}
        className={active ? "btn-dark w-full" : "btn-soft w-full"}
        aria-pressed={active}
      >
        {active ? <CameraOff className="size-4" /> : <Camera className="size-4" />}
        {active ? "Stop camera" : "Scan with camera"}
      </button>
      {active && (
        <div className="relative mt-3 overflow-hidden rounded-[2rem] bg-ink">
          <video ref={videoRef} className="aspect-[4/3] w-full object-cover" muted playsInline aria-label="Camera preview" />
          <div className="pointer-events-none absolute inset-0 grid place-items-center" aria-hidden>
            <div className="h-1/3 w-3/4 rounded-3xl border-4 border-white/80 shadow-[0_0_0_9999px_rgba(27,20,17,0.35)]">
              <div className="mx-auto mt-[calc(50%-2px)] h-0.5 w-11/12 animate-pulse bg-primary" />
            </div>
          </div>
          {status === "starting" && (
            <div className="absolute inset-0 grid place-items-center text-white">
              <LoaderCircle className="size-8 animate-spin" aria-label="Starting camera" />
            </div>
          )}
        </div>
      )}
      {error && <p className="mt-2 rounded-2xl bg-bad-soft px-4 py-3 text-sm font-semibold text-bad" role="alert">{error}</p>}
    </div>
  );
}
