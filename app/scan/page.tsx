"use client";

import { BrowserMultiFormatReader, type IScannerControls } from "@zxing/browser";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthGuard } from "@/components/auth-guard";

function ScanPageContent() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState("Preparing camera...");
  const [manualCode, setManualCode] = useState("");

  useEffect(() => {
    let mounted = true;

    async function startScanner() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError("This browser does not support camera access.");
        setStatus("Camera not available");
        return;
      }

      const reader = new BrowserMultiFormatReader();

      try {
        const videoElement = videoRef.current;
        if (!videoElement) {
          return;
        }

        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter((device) => device.kind === "videoinput");
        const deviceId = videoDevices.find((device) => /back|rear/i.test(device.label))?.deviceId ?? videoDevices[0]?.deviceId;

        const controls = await reader.decodeFromVideoDevice(
          deviceId,
          videoElement,
          (result, error, controls) => {
            if (result) {
              const code = result.getText();
              if (code) {
                setStatus("Barcode scanned");
                controls?.stop();
                router.push(`/product/barcode?barcode=${encodeURIComponent(code)}`);
              }
            }

            if (error && !/not found|no decode|checksum/i.test(String(error))) {
              setError(error.message || "Scan failed");
            }
          },
        );

        if (!mounted) {
          controls.stop();
          return;
        }

        controlsRef.current = controls;
        setStatus("Scanning... point your camera at a barcode");
        setError(null);

        try {
          await videoElement.play();
        } catch {
          // Ignore autoplay play() interruptions in browser startup.
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unable to access camera.";
        if (mounted) {
          setError(message);
          setStatus("Camera access denied");
        }
      }
    }

    startScanner();

    return () => {
      mounted = false;
      controlsRef.current?.stop();
    };
  }, [router]);

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-6 text-white">
      <div className="mx-auto flex w-full max-w-md flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-emerald-400">Stock scanner</p>
            <h1 className="mt-2 text-2xl font-semibold">Scan barcode</h1>
          </div>
          <button
            type="button"
            onClick={() => router.push("/")}
            className="rounded-full border border-white/20 px-3 py-1.5 text-sm text-white/80"
          >
            Back
          </button>
        </div>

        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-black shadow-2xl">
          <video
            ref={videoRef}
            className="h-[420px] w-full object-cover bg-black"
            autoPlay
            playsInline
            muted
          />

          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="h-44 w-64 rounded-2xl border-2 border-emerald-400/80 bg-transparent shadow-[0_0_0_9999px_rgba(2,6,23,0.45)]" />
          </div>
        </div>

        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4">
          <p className="text-sm font-medium text-emerald-300">Status</p>
          <p className="mt-1 text-base text-white">{status}</p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <p className="text-sm font-medium text-slate-200">Or enter barcode manually</p>
          <div className="mt-3 flex gap-2">
            <input
              value={manualCode}
              onChange={(event) => setManualCode(event.target.value)}
              placeholder="Enter barcode"
              className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white outline-none ring-0 placeholder:text-slate-400"
            />
            <button
              type="button"
              onClick={() => {
                const code = manualCode.trim();
                if (!code) {
                  setError("Please enter a barcode value.");
                  return;
                }
                router.push(`/product/barcode?barcode=${encodeURIComponent(code)}`);
              }}
              className="rounded-xl bg-emerald-500 px-3 py-2 text-sm font-medium text-slate-950"
            >
              Go
            </button>
          </div>
        </div>

        {error ? (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
            {error}
          </div>
        ) : null}
      </div>
    </main>
  );
}

export default function ScanPage() {
  return (
    <AuthGuard>
      <ScanPageContent />
    </AuthGuard>
  );
}
