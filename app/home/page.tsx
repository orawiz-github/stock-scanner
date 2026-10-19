"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { AuthGuard } from "@/components/auth-guard";
import { supabase } from "@/lib/supabase";

const options = [
  {
    title: "Scan barcode",
    description: "Open the camera and scan a product barcode.",
    href: "/scan",
    accent: "bg-emerald-500 text-slate-950",
  },
  {
    title: "Create product",
    description: "Add a new product and barcode to the catalog.",
    href: "/product/create",
    accent: "bg-violet-500 text-white",
  },
  {
    title: "Create location",
    description: "Add a storage location such as a warehouse or aisle.",
    href: "/location/create",
    accent: "bg-amber-500 text-slate-950",
  },
  {
    title: "Update stock",
    description: "Add stock counts for a product.",
    href: "/product/barcode/update",
    accent: "bg-sky-500 text-slate-950",
  },
];

function HomePageContent() {
  const router = useRouter();

  async function handleLogout() {
    if (!supabase) {
      router.push("/login");
      return;
    }

    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-white">
      <div className="mx-auto flex w-full max-w-md flex-col gap-6">
        <div className="text-center">
          <p className="text-xs uppercase tracking-[0.2em] text-emerald-400">Stock Scanner</p>
          <h1 className="mt-3 text-3xl font-semibold">Main menu</h1>
        </div>

        <div className="space-y-4">
          {options.map((option) => (
            <Link
              key={option.title}
              href={option.href}
              className="block rounded-2xl border border-white/10 bg-white/5 p-4 transition hover:border-emerald-400/60 hover:bg-white/10"
            >
              <div className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${option.accent}`}>
                {option.title}
              </div>
              <p className="mt-3 text-sm text-slate-300">{option.description}</p>
            </Link>
          ))}
        </div>

        <button
          type="button"
          onClick={handleLogout}
          className="w-full rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 font-medium text-red-200 transition hover:bg-red-500/20"
        >
          Logout
        </button>
      </div>
    </main>
  );
}

export default function HomePage() {
  return (
    <AuthGuard>
      <HomePageContent />
    </AuthGuard>
  );
}
