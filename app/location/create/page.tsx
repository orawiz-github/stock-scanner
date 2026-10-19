"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthGuard } from "@/components/auth-guard";
import { supabase } from "@/lib/supabase";

function LocationCreateContent() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [aisle, setAisle] = useState("");
  const [shelf, setShelf] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("");

    if (!supabase) {
      setStatus("Supabase is not configured.");
      return;
    }

    const trimmedName = name.trim();

    if (!trimmedName) {
      setStatus("Location name is required.");
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase.from("locations").insert({
        name: trimmedName,
        aisle: aisle.trim() || null,
        shelf: shelf.trim() || null,
      });

      if (error) {
        throw error;
      }

      setStatus("Location created successfully.");
      setName("");
      setAisle("");
      setShelf("");
      router.push("/home");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to create location.";
      setStatus(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-white">
      <div className="mx-auto w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-6 shadow-xl">
        <p className="text-xs uppercase tracking-[0.2em] text-emerald-400">Location</p>
        <h1 className="mt-3 text-3xl font-semibold">Create location</h1>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label htmlFor="name" className="mb-2 block text-sm text-slate-300">
              Location name
            </label>
            <input
              id="name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Main Warehouse"
              className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-3 text-white placeholder:text-slate-500 focus:border-emerald-400 focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="aisle" className="mb-2 block text-sm text-slate-300">
              Aisle
            </label>
            <input
              id="aisle"
              value={aisle}
              onChange={(event) => setAisle(event.target.value)}
              placeholder="A1"
              className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-3 text-white placeholder:text-slate-500 focus:border-emerald-400 focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="shelf" className="mb-2 block text-sm text-slate-300">
              Shelf
            </label>
            <input
              id="shelf"
              value={shelf}
              onChange={(event) => setShelf(event.target.value)}
              placeholder="Top row"
              className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-3 text-white placeholder:text-slate-500 focus:border-emerald-400 focus:outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-xl bg-emerald-500 px-4 py-3 font-medium text-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? "Creating..." : "Create location"}
          </button>
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

export default function LocationCreatePage() {
  return (
    <AuthGuard>
      <LocationCreateContent />
    </AuthGuard>
  );
}
