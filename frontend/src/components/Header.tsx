"use client";

import { History } from "lucide-react";

interface HeaderProps {
  onHistoryClick?: () => void;
  hasSession?: boolean;
}

export default function Header({ onHistoryClick, hasSession = false }: HeaderProps) {
  return (
    <header className="sticky top-0 z-50 border-b border-stone-200/80 bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-6 py-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-stone-900 text-sm font-bold text-white">
            F
          </div>
          <div>
            <h1 className="text-lg font-semibold tracking-tight text-stone-900">
              Find My Design
            </h1>
          </div>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {hasSession && onHistoryClick && (
            <button
              onClick={onHistoryClick}
              className="flex items-center gap-1.5 rounded-full border border-stone-200 bg-stone-50 px-3 py-1 text-xs font-medium text-stone-600 transition-colors hover:bg-stone-100"
            >
              <History className="h-3 w-3" />
              History
            </button>
          )}
          <span className="rounded-full border border-stone-200 bg-stone-50 px-3 py-1 text-xs font-medium text-stone-500">
            AI-Powered
          </span>
        </div>
      </div>
    </header>
  );
}
