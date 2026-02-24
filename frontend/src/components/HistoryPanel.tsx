"use client";

import { X, Clock, ArrowUpRight } from "lucide-react";
import type { HistoryItem } from "@/types/api";

interface HistoryPanelProps {
  items: HistoryItem[];
  onClose: () => void;
  isLoading: boolean;
}

export default function HistoryPanel({ items, onClose, isLoading }: HistoryPanelProps) {
  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div
        className="flex-1 bg-black/20 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Slide-over panel */}
      <div className="flex w-full max-w-md flex-col overflow-y-auto bg-white shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 flex items-center justify-between border-b border-stone-200 bg-white px-6 py-4">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-stone-500" />
            <h2 className="text-base font-semibold text-stone-900">Search History</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 transition-colors hover:bg-stone-100"
          >
            <X className="h-4 w-4 text-stone-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 space-y-3 p-4">
          {isLoading && (
            <div className="py-12 text-center text-sm text-stone-400">
              Loading history...
            </div>
          )}

          {!isLoading && items.length === 0 && (
            <div className="py-12 text-center">
              <p className="text-sm text-stone-400">No search history yet.</p>
              <p className="mt-1 text-xs text-stone-300">
                Your searches will appear here.
              </p>
            </div>
          )}

          {!isLoading &&
            items.map((item) => (
              <div
                key={item.design_id}
                className="space-y-3 rounded-xl border border-stone-200 bg-stone-50 p-4"
              >
                {/* AI image + prompt */}
                <div className="flex gap-3">
                  {item.ai_image_url ? (
                    <img
                      src={item.ai_image_url}
                      alt="AI reference"
                      className="h-14 w-14 shrink-0 rounded-lg border border-stone-200 object-cover"
                    />
                  ) : (
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-stone-200">
                      <span className="text-xs text-stone-400">
                        {item.input_mode === "canvas" ? "Sketch" : "Text"}
                      </span>
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="line-clamp-2 text-sm font-medium text-stone-800">
                      {item.text_prompt || "(Canvas sketch)"}
                    </p>
                    <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                      {item.category_hint && (
                        <span className="rounded-full bg-stone-200 px-2 py-0.5 text-xs text-stone-600">
                          {item.category_hint}
                        </span>
                      )}
                      {item.dominant_color && (
                        <span
                          className="inline-block h-3.5 w-3.5 rounded-full border border-stone-300"
                          style={{ backgroundColor: item.dominant_color }}
                          title={item.dominant_color}
                        />
                      )}
                    </div>
                    <p className="mt-1 text-xs text-stone-400">
                      {new Date(item.created_at).toLocaleDateString("ko-KR", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>

                {/* Keywords */}
                {item.keywords.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {item.keywords.slice(0, 6).map((kw) => (
                      <span
                        key={kw}
                        className="rounded-full border border-stone-200 bg-white px-2 py-0.5 text-xs text-stone-500"
                      >
                        {kw}
                      </span>
                    ))}
                  </div>
                )}

                {/* Top 3 results */}
                {item.top_results.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-xs font-medium uppercase tracking-wider text-stone-400">
                      Top Results
                    </p>
                    {item.top_results.map((r, i) => (
                      <a
                        key={i}
                        href={r.product_url || "#"}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group flex items-center gap-2 rounded-lg border border-stone-100 bg-white p-2 transition-colors hover:border-stone-300"
                      >
                        {r.image_url ? (
                          <img
                            src={r.image_url}
                            alt={r.title}
                            className="h-8 w-8 shrink-0 rounded object-cover"
                          />
                        ) : (
                          <div className="h-8 w-8 shrink-0 rounded bg-stone-100" />
                        )}
                        <span className="line-clamp-1 flex-1 text-xs text-stone-700">
                          {r.title}
                        </span>
                        <ArrowUpRight className="h-3 w-3 shrink-0 text-stone-300 transition-colors group-hover:text-stone-600" />
                      </a>
                    ))}
                  </div>
                )}
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
