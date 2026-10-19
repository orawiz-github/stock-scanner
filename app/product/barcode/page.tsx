"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AuthGuard } from "@/components/auth-guard";
import { supabase } from "@/lib/supabase";

type ProductLocation = {
  name: string | null;
  aisle: string | null;
  shelf: string | null;
};

type StockTakeRow = {
  quantity: number | null;
  locations: ProductLocation[] | ProductLocation | null;
};

type ProductRecord = {
  name: string | null;
  barcode: string | null;
  stocktake: StockTakeRow[] | null;
};

function ProductDetails() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const barcodeFromUrl = searchParams.get("barcode") ?? "";
  const [product, setProduct] = useState<ProductRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const barcode = decodeURIComponent(barcodeFromUrl);

    async function loadProduct() {
      if (!barcode) {
        setError("No barcode provided in the URL.");
        setLoading(false);
        return;
      }

      if (!supabase) {
        setError("Supabase is not configured. Add your env vars first.");
        setLoading(false);
        return;
      }

      try {
        const { data, error: queryError } = await supabase
          .from("products")
          .select("name, barcode, stocktake(quantity, locations(name, aisle, shelf))")
          .eq("barcode", barcode)
          .maybeSingle();

        if (queryError) {
          throw queryError;
        }

        if (!data) {
          setError(`No product found for barcode: ${barcode}`);
          setLoading(false);
          return;
        }

        const normalizedProduct = data as unknown as ProductRecord;
        setProduct(normalizedProduct);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load product details.");
      } finally {
        setLoading(false);
      }
    }

    loadProduct();
  }, [barcodeFromUrl]);

  const stockRows = Array.isArray(product?.stocktake) ? product.stocktake : [];
  const totalQuantity = stockRows.reduce((sum, row) => sum + Number(row.quantity ?? 0), 0);
  const locations = stockRows
    .flatMap((row) => {
      const locationEntry = row.locations;
      const locationList = Array.isArray(locationEntry)
        ? locationEntry
        : locationEntry
          ? [locationEntry]
          : [];

      return locationList.map((location) => {
        const label = [location?.name, location?.aisle, location?.shelf]
          .filter(Boolean)
          .join(" · ");
        return label || "Unknown location";
      });
    })
    .filter(Boolean) as string[];

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-white">
      <div className="mx-auto max-w-md rounded-2xl border border-white/10 bg-white/5 p-6 shadow-xl">
        <p className="text-xs uppercase tracking-[0.2em] text-emerald-400">Product</p>

        {loading ? (
          <p className="mt-4 text-slate-300">Loading product details...</p>
        ) : error ? (
          <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
            {error}
          </div>
        ) : (
          <>
            <h1 className="mt-3 text-3xl font-semibold">{product?.name ?? "Unknown product"}</h1>

            <div className="mt-6 space-y-4">
              <div className="rounded-xl border border-white/10 bg-slate-900/50 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Barcode</p>
                <p className="mt-2 text-lg font-medium text-white">{product?.barcode ?? decodeURIComponent(barcodeFromUrl)}</p>
              </div>

              <div className="rounded-xl border border-white/10 bg-slate-900/50 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Stock quantity</p>
                <p className="mt-2 text-lg font-medium text-white">{totalQuantity}</p>
              </div>

              <div className="rounded-xl border border-white/10 bg-slate-900/50 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Locations</p>
                <ul className="mt-2 space-y-1 text-white">
                  {locations.length ? (
                    locations.map((location) => (
                      <li key={location} className="rounded-lg bg-slate-800/80 px-2 py-1 text-sm">
                        {location}
                      </li>
                    ))
                  ) : (
                    <li className="rounded-lg bg-slate-800/80 px-2 py-1 text-sm">No locations found</li>
                  )}
                </ul>
              </div>
            </div>

            <button
              type="button"
              onClick={() => router.push(`/product/barcode/update?barcode=${encodeURIComponent(product?.barcode ?? decodeURIComponent(barcodeFromUrl))}`)}
              className="mt-6 w-full rounded-xl bg-emerald-500 px-4 py-3 font-medium text-slate-950"
            >
              Update stock
            </button>
          </>
        )}
      </div>
    </main>
  );
}

export default function ProductPage() {
  return (
    <AuthGuard>
      <Suspense fallback={<div className="min-h-screen bg-slate-950 px-4 py-8 text-white">Loading product...</div>}>
        <ProductDetails />
      </Suspense>
    </AuthGuard>
  );
}
