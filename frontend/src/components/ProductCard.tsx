"use client";

import type { SearchResultItem } from "@/types/api";
import { ArrowUpRight } from "lucide-react";

interface ProductCardProps {
  item: SearchResultItem;
}

export default function ProductCard({ item }: ProductCardProps) {
  const similarityPct = Math.round(item.score_overall * 100);

  const getSourceLabel = (url: string | null): string => {
    if (!url) return "";
    try {
      const hostname = new URL(url).hostname.replace("www.", "");
      const map: Record<string, string> = {
        "dribbble.com": "Dribbble",
        "behance.net": "Behance",
        "figma.com": "Figma",
        "creativemarket.com": "Creative Market",
        "ui8.net": "UI8",
        "elements.envato.com": "Envato",
        "unsplash.com": "Unsplash",
        "pexels.com": "Pexels",
        "pixabay.com": "Pixabay",
        "freepik.com": "Freepik",
      };
      return map[hostname] || hostname;
    } catch {
      return "";
    }
  };

  const sourceLabel = getSourceLabel(item.product_url);

  // Deterministic pastel background color from title string
  const colorIndex = item.title.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const palettes = [
    { bg: "#f0f4ff", fg: "#3b5bdb" },
    { bg: "#fff0f6", fg: "#c2255c" },
    { bg: "#f3faf3", fg: "#2f9e44" },
    { bg: "#fff8f0", fg: "#e8590c" },
    { bg: "#f3f0ff", fg: "#7048e8" },
    { bg: "#e8f8f8", fg: "#0c8599" },
    { bg: "#fffbea", fg: "#e67700" },
  ];
  const palette = palettes[colorIndex % palettes.length];

  return (
    <a
      href={item.product_url || "#"}
      target="_blank"
      rel="noopener noreferrer"
      className="group block overflow-hidden rounded-2xl border border-stone-200/80 bg-white transition-all duration-200 hover:border-stone-300 hover:shadow-lg hover:shadow-stone-200/50"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-stone-100">
        {item.image_url ? (
          <img
            src={item.image_url}
            alt={item.title}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <div
            className="flex h-full flex-col items-center justify-center gap-2"
            style={{ backgroundColor: palette.bg }}
          >
            <span
              className="text-3xl font-black tracking-tight"
              style={{ color: palette.fg }}
            >
              {sourceLabel ? sourceLabel.slice(0, 2).toUpperCase() : item.title.slice(0, 2).toUpperCase()}
            </span>
            {sourceLabel && (
              <span className="text-xs font-medium" style={{ color: palette.fg, opacity: 0.7 }}>
                {sourceLabel}
              </span>
            )}
          </div>
        )}
        <div className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-xs font-semibold text-stone-900 shadow-sm backdrop-blur-sm">
          {similarityPct}% match
        </div>
        {sourceLabel && (
          <div className="absolute right-3 top-3 rounded-full bg-stone-900/70 px-2.5 py-1 text-xs font-medium text-white backdrop-blur-sm">
            {sourceLabel}
          </div>
        )}
      </div>

      <div className="p-4">
        <h3 className="text-[15px] font-semibold leading-snug text-stone-900 line-clamp-2">
          {item.title}
        </h3>
        <div className="mt-2 flex items-center gap-2">
          {item.price != null && item.price > 0 ? (
            <span className="text-sm font-bold text-stone-900">
              {item.price.toLocaleString()}
              <span className="font-normal text-stone-500">won</span>
            </span>
          ) : (
            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
              Free
            </span>
          )}
        </div>
        <p className="mt-2 text-xs text-stone-400 line-clamp-1">
          {item.explanation.join(" · ")}
        </p>
        <div className="mt-3 flex items-center gap-1 text-xs font-medium text-orange-600 opacity-0 transition-opacity group-hover:opacity-100">
          View on {sourceLabel || "site"}
          <ArrowUpRight className="h-3 w-3" />
        </div>
      </div>
    </a>
  );
}
