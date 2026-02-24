"use client";

export default function Footer() {
  return (
    <footer className="mt-20 border-t border-stone-200">
      <div className="mx-auto max-w-6xl px-6 py-8">
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded bg-stone-900 text-[10px] font-bold text-white">
              F
            </div>
            <span className="text-sm font-medium text-stone-700">Find My Design</span>
          </div>
          <p className="text-xs text-stone-400">
            &copy; 2026 FMD &mdash; AI-powered design search engine
          </p>
        </div>
      </div>
    </footer>
  );
}
