"use client";

import { BrowserMultiFormatReader, type IScannerControls } from "@zxing/browser";
import type { Exception, Result } from "@zxing/library";
import { FormEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthGuard } from "@/components/auth-guard";
import { supabase } from "@/lib/supabase";

type BarcodeMode = "scan" | "manual";

function ProductCreateContent() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [name, setName] = useState("");
  const [barcode, setBarcode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState("");
  const [mode, setMode] = useState<BarcodeMode>("manual");
  const [scanMessage, setScanMessage] = useState("Ready to scan");
  const [scanError, setScanError] = useState<string | null>(null);
  const [cameraOptions, setCameraOptions] = useState<MediaDeviceInfo[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string | undefined>(undefined);

  useEffect(() => {
    async function loadCameraOptions() {
      if (!navigator.mediaDevices?.enumerateDevices) {
        return;
      }

      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter((device) => device.kind === "videoinput");
        setCameraOptions(videoDevices);

        if (!selectedCameraId && videoDevices.length > 0) {
          const preferred = videoDevices.find((device) => /back|rear/i.test(device.label)) ?? videoDevices[0];
          setSelectedCameraId(preferred.deviceId);
        }
      } catch {
        // Ignore device listing errors and continue using the default camera.
      }
    }

    loadCameraOptions();
  }, [selectedCameraId]);

  function stopScanner() {
    controlsRef.current?.stop();
    controlsRef.current = null;

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.srcObject = null;
    }
  }

  async function startScanner() {
    stopScanner();

    if (!navigator.mediaDevices?.getUserMedia) {
      setScanError("This browser does not support camera access.");
      setScanMessage("Camera not available");
      return;
    }

    const videoElement = videoRef.current;
    if (!videoElement) {
      setScanError("Camera video is not ready yet.");
      setScanMessage("Waiting for camera...");
      return;
    }

    const reader = new BrowserMultiFormatReader();
    const onDecode = (result: Result | undefined, error: Exception | undefined, controlsInstance: IScannerControls) => {
      if (result) {
        const code = result.getText();
        if (code) {
          setBarcode(code);
          setScanMessage("Barcode captured");
          setScanError(null);
          controlsInstance?.stop();
          stopScanner();
          setMode("manual");
        }
      }

      if (error && !/not found|no decode|checksum/i.test(String(error))) {
        setScanError(error.message || "Scan failed");
      }
    };

    try {
      let controls: IScannerControls | null = null;

      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter((device) => device.kind === "videoinput");
      const preferredDeviceId = selectedCameraId ?? videoDevices.find((device) => /back|rear/i.test(device.label))?.deviceId ?? videoDevices[0]?.deviceId;

      if (preferredDeviceId && !selectedCameraId) {
        setSelectedCameraId(preferredDeviceId);
      }

      try {
        controls = await reader.decodeFromVideoDevice(preferredDeviceId, videoElement, onDecode);
      } catch {
        controls = await reader.decodeFromVideoElement(videoElement, onDecode);
      }

      controlsRef.current = controls;
      setScanMessage("Scanning... point your camera at a barcode");
      setScanError(null);

      try {
        await videoElement.play();
      } catch {
        // Ignore autoplay restrictions.
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to access camera.";
      setScanError(message);
      setScanMessage("Camera access denied");
      setMode("manual");
    }
  }

  useEffect(() => {
    if (mode !== "scan") {
      stopScanner();
      return;
    }

    const timer = window.setTimeout(() => {
      startScanner();
    }, 150);

    return () => {
      window.clearTimeout(timer);
      stopScanner();
    };
  }, [mode]);

  function handleModeChange(nextMode: BarcodeMode) {
    if (nextMode === "scan") {
      setMode("scan");
      return;
    }

    stopScanner();
    setScanMessage("Manual barcode entry enabled");
    setScanError(null);
    setMode("manual");
  }

  function handleCancel() {
    stopScanner();
    setName("");
    setBarcode("");
    setScanError(null);
    setScanMessage("Ready to scan");
    setStatus("");
    router.push("/home");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("");

    if (!supabase) {
      setStatus("Supabase is not configured.");
      return;
    }

    const trimmedName = name.trim();
    const trimmedBarcode = barcode.trim();

    if (!trimmedName || !trimmedBarcode) {
      setStatus("Please enter both product name and barcode.");
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase.from("products").insert({
        name: trimmedName,
        barcode: trimmedBarcode,
      });

      if (error) {
        throw error;
      }

      setStatus("Product created successfully.");
      setName("");
      setBarcode("");
      stopScanner();
      router.push("/home");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to create product.";
      setStatus(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-white">
      <div className="mx-auto w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-6 shadow-xl">
        <p className="text-xs uppercase tracking-[0.2em] text-emerald-400">Product</p>
        <h1 className="mt-3 text-3xl font-semibold">Create product</h1>

        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={() => handleModeChange("scan")}
            className={`flex-1 rounded-xl px-3 py-2 text-sm font-medium ${
              mode === "scan" ? "bg-emerald-500 text-slate-950" : "border border-white/10 bg-slate-900 text-white"
            }`}
          >
            Scan barcode
          </button>
          <button
            type="button"
            onClick={() => handleModeChange("manual")}
            className={`flex-1 rounded-xl px-3 py-2 text-sm font-medium ${
              mode === "manual" ? "bg-sky-500 text-slate-950" : "border border-white/10 bg-slate-900 text-white"
            }`}
          >
            Enter manually
          </button>
        </div>

        {mode === "scan" ? (
          <>
            {cameraOptions.length > 1 ? (
              <div className="mt-5">
                <label htmlFor="camera-select" className="mb-2 block text-sm text-slate-300">
                  Camera
                </label>
                <select
                  id="camera-select"
                  value={selectedCameraId ?? ""}
                  onChange={(event) => setSelectedCameraId(event.target.value || undefined)}
                  className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-3 text-white focus:border-emerald-400 focus:outline-none"
                >
                  {cameraOptions.map((device) => (
                    <option key={device.deviceId} value={device.deviceId}>
                      {device.label || `Camera ${device.deviceId.slice(0, 6)}`}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}

            <div className="mt-5 overflow-hidden rounded-2xl border border-white/10 bg-black">
              <video
                ref={videoRef}
                className="h-60 w-full object-cover bg-black"
                autoPlay
                playsInline
                muted
              />
              <div className="border-t border-white/10 bg-slate-900/80 px-3 py-2 text-sm text-slate-200">
                {scanMessage}
              </div>
            </div>
          </>
        ) : null}

        {scanError ? (
          <div className="mt-3 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
            {scanError}
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label htmlFor="name" className="mb-2 block text-sm text-slate-300">
              Product name
            </label>
            <input
              id="name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Milk 1L"
              className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-3 text-white placeholder:text-slate-500 focus:border-emerald-400 focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="barcode" className="mb-2 block text-sm text-slate-300">
              Barcode
            </label>
            <input
              id="barcode"
              value={barcode}
              onChange={(event) => setBarcode(event.target.value)}
              placeholder="1234567890123"
              className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-3 text-white placeholder:text-slate-500 focus:border-emerald-400 focus:outline-none"
            />
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleCancel}
              className="flex-1 rounded-xl border border-white/10 bg-slate-800 px-4 py-3 font-medium text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 rounded-xl bg-emerald-500 px-4 py-3 font-medium text-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? "Creating..." : "Create product"}
            </button>
          </div>
        </form>

        {status ? (
          <div className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-200">
            {status}
          </div>
        ) : null}
      </div>
    </main>
  );
}

export default function ProductCreatePage() {
  return (
    <AuthGuard>
      <ProductCreateContent />
    </AuthGuard>
  );
}
