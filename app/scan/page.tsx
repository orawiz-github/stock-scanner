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
  const [cameraOptions, setCameraOptions] = useState<MediaDeviceInfo[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string | undefined>(undefined);
  const [cameraChoice, setCameraChoice] = useState<string>("auto");

  async function loadCameraOptions() {
    if (!navigator.mediaDevices?.enumerateDevices) {
      return;
    }

    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter((device) => device.kind === "videoinput");
      setCameraOptions(videoDevices);

      if (!selectedCameraId && videoDevices.length > 0) {
        const preferred = videoDevices.find((device) => /back|rear|environment/i.test(device.label)) ?? videoDevices[0];
        setSelectedCameraId(preferred.deviceId);
      }
    } catch {
      // Ignore device-list errors and keep the default scan flow.
    }
  }

  useEffect(() => {
    void loadCameraOptions();
  }, [selectedCameraId]);

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
        const preferredDeviceId = selectedCameraId ?? videoDevices.find((device) => /back|rear|environment/i.test(device.label))?.deviceId ?? videoDevices[0]?.deviceId;

        const explicitDeviceId = cameraChoice !== "auto" && cameraChoice !== "environment" && cameraChoice !== "user" ? cameraChoice : undefined;

        const controls = cameraChoice === "environment" || cameraChoice === "user"
          ? await reader.decodeFromConstraints(
              { video: { facingMode: { ideal: cameraChoice } } },
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
            )
          : await reader.decodeFromVideoDevice(
              explicitDeviceId ?? preferredDeviceId,
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
  }, [router, selectedCameraId, cameraChoice]);

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

        <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
          <label htmlFor="scan-camera-select" className="mb-2 block text-sm text-slate-300">
            Camera
          </label>
          <select
            id="scan-camera-select"
            value={cameraChoice}
            onChange={(event) => {
              const nextChoice = event.target.value;
              setCameraChoice(nextChoice);

              if (nextChoice === "auto" || nextChoice === "environment" || nextChoice === "user") {
                setSelectedCameraId(undefined);
                return;
              }

              setSelectedCameraId(nextChoice);
            }}
            className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-3 text-white focus:border-emerald-400 focus:outline-none"
          >
            <option value="auto">Auto (recommended)</option>
            {cameraOptions.map((device) => (
              <option key={device.deviceId} value={device.deviceId}>
                {device.label || `Camera ${device.deviceId.slice(0, 6)}`}
              </option>
            ))}
            <option value="environment">Rear camera</option>
            <option value="user">Front camera</option>
          </select>
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
