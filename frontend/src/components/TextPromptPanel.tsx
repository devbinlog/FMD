"use client";

interface TextPromptPanelProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export default function TextPromptPanel({
  value,
  onChange,
  disabled,
}: TextPromptPanelProps) {
  return (
    <div className="space-y-2">
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        placeholder="Describe the design you're looking for...&#10;e.g. &quot;minimal blue geometric logo for a tech startup&quot;"
        className="min-h-[140px] w-full resize-y rounded-xl border border-stone-200 bg-white px-4 py-3 text-[15px] leading-relaxed text-stone-900 placeholder:text-stone-400 transition-colors focus:border-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-900/5 disabled:cursor-not-allowed disabled:opacity-50"
      />
      <p className="text-xs text-stone-400">
        Tip: Include colors, styles, and specific elements for better results.
      </p>
    </div>
  );
}
