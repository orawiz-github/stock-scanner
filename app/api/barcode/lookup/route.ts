import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const barcode = request.nextUrl.searchParams.get("barcode");

  if (!barcode || !barcode.trim()) {
    return NextResponse.json({ error: "Barcode is required." }, { status: 400 });
  }

  try {
    const response = await fetch(`https://api.upcitemdb.com/prod/trial/lookup?upc=${encodeURIComponent(barcode)}`, {
      headers: {
        Accept: "application/json",
        "User-Agent": "stock-scanner/1.0",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: "Barcode lookup failed." },
        { status: response.status >= 500 ? 502 : 400 },
      );
    }

    const data = (await response.json()) as {
      items?: Array<{
        title?: string;
        description?: string;
        brand?: string;
        upc?: string;
        images?: string[];
      }>;
    };

    const item = data.items?.[0];

    if (!item) {
      return NextResponse.json({ error: "No product match found." }, { status: 404 });
    }

    return NextResponse.json({
      barcode: item.upc ?? barcode,
      title: item.title ?? "",
      description: item.description ?? item.title ?? "",
      brand: item.brand ?? "",
      image: item.images?.[0] ?? null,
      source: "UPCitemdb",
    });
  } catch {
    return NextResponse.json({ error: "Unable to reach barcode lookup service." }, { status: 502 });
  }
}
