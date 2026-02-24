"use client";

import { Sparkles } from "lucide-react";

export default function EmptyState() {
  return (
    <div className="flex flex-col items-center py-20 text-center">
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-stone-100">
        <Sparkles className="h-7 w-7 text-stone-400" />
      </div>
      <h3 className="text-lg font-semibold text-stone-800">
        Describe your ideal design
      </h3>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-stone-400">
        Type a description or draw a sketch above. FMD will analyze your input,
        generate an AI reference, and search across multiple design marketplaces.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        {["minimal logo", "dark dashboard UI", "watercolor illustration", "flat icon set"].map((hint) => (
          <span
            key={hint}
            className="rounded-full border border-stone-200 bg-white px-3 py-1 text-xs text-stone-500"
          >
            {hint}
          </span>
        ))}
      </div>
    </div>
  );
}
