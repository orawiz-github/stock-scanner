"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AuthGuard } from "@/components/auth-guard";
import { supabase } from "@/lib/supabase";

type LocationOption = {
  id: string;
  name: string;
  aisle?: string | null;
  shelf?: string | null;
};

function StockUpdatePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const prefilledBarcode = searchParams.get("barcode") ?? "";
  const [barcode, setBarcode] = useState(prefilledBarcode);
  const [quantity, setQuantity] = useState("1");
  const [locationName, setLocationName] = useState("");
  const [locations, setLocations] = useState<LocationOption[]>([]);
  const [loadingLocations, setLoadingLocations] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState("");

  function handleCancel() {
    setBarcode(prefilledBarcode || "");
    setQuantity("1");
    setLocationName(locations[0]?.name ?? "");
    setStatus("");
    router.push("/home");
  }

  useEffect(() => {
    if (prefilledBarcode) {
      setBarcode(prefilledBarcode);
    }
  }, [prefilledBarcode]);

  useEffect(() => {
    async function loadLocations() {
      if (!supabase) {
        setStatus("Supabase is not configured. Add your env vars first.");
        setLoadingLocations(false);
        return;
      }

      const { data, error } = await supabase
        .from("locations")
        .select("id, name, aisle, shelf")
        .order("name");

      if (error) {
        setStatus(error.message);
        setLoadingLocations(false);
        return;
      }

      setLocations(data ?? []);
      if (data && data.length > 0) {
        setLocationName(data[0].name);
      }
      setLoadingLocations(false);
    }

    loadLocations();
  }, []);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!supabase) {
      setStatus("Supabase is not configured. Add your env vars first.");
      return;
    }

    const trimmedBarcode = barcode.trim();
    const parsedQuantity = Number(quantity);

    if (!trimmedBarcode) {
      setStatus("Barcode is required.");
      return;
    }

    if (!Number.isInteger(parsedQuantity) || parsedQuantity <= 0) {
      setStatus("Quantity must be a positive whole number.");
      return;
    }

    setSubmitting(true);
    setStatus("");

    try {
      const { data: product, error: productError } = await supabase
        .from("products")
        .select("id")
        .eq("barcode", trimmedBarcode)
        .single();

      if (productError || !product) {
        throw new Error("Product not found for this barcode.");
      }

      let locationId: string | null = null;

      if (locationName) {
        const { data: location, error: locationError } = await supabase
          .from("locations")
          .select("id")
          .eq("name", locationName)
          .maybeSingle();

        if (locationError) {
          throw locationError;
        }

        locationId = location?.id ?? null;
      }

      const { error: insertError } = await supabase.from("stocktake").insert({
        product_id: product.id,
        location_id: locationId,
        quantity: parsedQuantity,
      });

      if (insertError) {
        throw insertError;
      }

      setStatus("Stock updated successfully.");
      setBarcode("");
      setQuantity("1");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Something went wrong.";
      setStatus(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-white">
      <div className="mx-auto max-w-md rounded-2xl border border-white/10 bg-white/5 p-6 shadow-xl">
        <p className="text-xs uppercase tracking-[0.2em] text-emerald-400">Stock update</p>
        <h1 className="mt-3 text-3xl font-semibold">Add stock count</h1>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label htmlFor="barcode" className="mb-2 block text-sm text-slate-300">
              Product barcode
            </label>
            <input
              id="barcode"
              value={barcode}
              onChange={(event) => setBarcode(event.target.value)}
              placeholder="1234567890123"
              className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-white placeholder:text-slate-400"
            />
          </div>

          <div>
            <label htmlFor="location" className="mb-2 block text-sm text-slate-300">
              Location
            </label>
            <select
              id="location"
              value={locationName}
              onChange={(event) => setLocationName(event.target.value)}
              disabled={loadingLocations || locations.length === 0}
              className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-white"
            >
              {locations.length === 0 ? (
                <option value="">No locations found</option>
              ) : (
                locations.map((location) => (
                  <option key={location.id} value={location.name}>
                    {location.name} {location.aisle ? `• ${location.aisle}` : ""} {location.shelf ? `• ${location.shelf}` : ""}
                  </option>
                ))
              )}
            </select>
          </div>

          <div>
            <label htmlFor="quantity" className="mb-2 block text-sm text-slate-300">
              Quantity
            </label>
            <input
              id="quantity"
              type="number"
              min={1}
              value={quantity}
              onChange={(event) => setQuantity(event.target.value)}
              className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-white"
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
              disabled={submitting}
              className="flex-1 rounded-xl bg-emerald-500 px-4 py-3 font-medium text-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? "Updating..." : "Save stock update"}
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

export default function StockUpdatePage() {
  return (
    <AuthGuard>
      <Suspense fallback={<div className="min-h-screen bg-slate-950 px-4 py-8 text-white">Loading stock update...</div>}>
        <StockUpdatePageContent />
      </Suspense>
    </AuthGuard>
  );
}
