"use client";

import { Layout, Hexagon, Box, Palette } from "lucide-react";

const CATEGORIES = [
  { id: "UI", label: "UI Design", icon: Layout },
  { id: "Logo", label: "Logo", icon: Hexagon },
  { id: "Icon", label: "Icon", icon: Box },
  { id: "Illustration", label: "Illustration", icon: Palette },
];

interface CategorySelectorProps {
  selected: string | null;
  onSelect: (category: string | null) => void;
  disabled?: boolean;
}

export default function CategorySelector({
  selected,
  onSelect,
  disabled,
}: CategorySelectorProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {CATEGORIES.map((cat) => {
        const Icon = cat.icon;
        const isActive = selected === cat.id;
        return (
          <button
            key={cat.id}
            onClick={() => onSelect(isActive ? null : cat.id)}
            disabled={disabled}
            className={`flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-medium transition-all ${
              isActive
                ? "bg-stone-900 text-white"
                : "border border-stone-200 bg-white text-stone-600 hover:border-stone-300 hover:bg-stone-50"
            } disabled:cursor-not-allowed disabled:opacity-50`}
          >
            <Icon className="h-3.5 w-3.5" />
            {cat.label}
          </button>
        );
      })}
    </div>
  );
}
