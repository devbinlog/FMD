"use client";

import { Type, PenTool } from "lucide-react";

type InputMode = "text" | "canvas";

interface InputModeTabsProps {
  mode: InputMode;
  onModeChange: (mode: InputMode) => void;
  disabled?: boolean;
}

export default function InputModeTabs({
  mode,
  onModeChange,
  disabled,
}: InputModeTabsProps) {
  const tabs: { value: InputMode; label: string; icon: typeof Type }[] = [
    { value: "text", label: "Text", icon: Type },
    { value: "canvas", label: "Sketch", icon: PenTool },
  ];

  return (
    <div className="inline-flex rounded-lg bg-stone-100 p-1">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        return (
          <button
            key={tab.value}
            onClick={() => onModeChange(tab.value)}
            disabled={disabled}
            className={`flex items-center gap-1.5 rounded-md px-4 py-2 text-sm font-medium transition-all ${
              mode === tab.value
                ? "bg-white text-stone-900 shadow-sm"
                : "text-stone-500 hover:text-stone-700"
            } disabled:cursor-not-allowed disabled:opacity-50`}
          >
            <Icon className="h-3.5 w-3.5" />
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
