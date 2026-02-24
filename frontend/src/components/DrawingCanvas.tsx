"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { Paintbrush, Eraser, RotateCcw } from "lucide-react";

interface DrawingCanvasProps {
  onCanvasData: (data: string) => void;
  disabled?: boolean;
}

export default function DrawingCanvas({
  onCanvasData,
  disabled,
}: DrawingCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [tool, setTool] = useState<"draw" | "erase">("draw");
  const [brushSize, setBrushSize] = useState(4);

  const getCtx = useCallback(() => {
    return canvasRef.current?.getContext("2d") ?? null;
  }, []);

  const initCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
  }, []);

  useEffect(() => {
    initCanvas();
  }, [initCanvas]);

  const getPos = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (disabled) return;
    const ctx = getCtx();
    if (!ctx) return;
    setIsDrawing(true);
    const { x, y } = getPos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || disabled) return;
    const ctx = getCtx();
    if (!ctx) return;
    const { x, y } = getPos(e);
    ctx.lineWidth = brushSize;
    ctx.lineCap = "round";
    ctx.strokeStyle = tool === "draw" ? "#1c1917" : "#ffffff";
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (canvas) {
      onCanvasData(canvas.toDataURL("image/png"));
    }
  };

  const handleClear = () => {
    initCanvas();
    onCanvasData("");
  };

  const tools = [
    { id: "draw" as const, icon: Paintbrush, label: "Draw" },
    { id: "erase" as const, icon: Eraser, label: "Erase" },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        {tools.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setTool(t.id)}
              disabled={disabled}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                tool === t.id
                  ? "bg-stone-900 text-white"
                  : "border border-stone-200 text-stone-600 hover:bg-stone-50"
              }`}
              aria-label={t.label}
            >
              <Icon className="h-3.5 w-3.5" />
              {t.label}
            </button>
          );
        })}
        <div className="mx-1 h-4 w-px bg-stone-200" />
        <input
          type="range"
          min={1}
          max={20}
          value={brushSize}
          onChange={(e) => setBrushSize(Number(e.target.value))}
          disabled={disabled}
          className="h-1.5 w-20 accent-stone-900"
          aria-label="Brush size"
        />
        <span className="text-xs text-stone-400">{brushSize}px</span>
        <button
          onClick={handleClear}
          disabled={disabled}
          className="ml-auto flex items-center gap-1 rounded-lg border border-stone-200 px-3 py-1.5 text-xs font-medium text-stone-500 transition-colors hover:bg-stone-50"
        >
          <RotateCcw className="h-3 w-3" />
          Clear
        </button>
      </div>
      <canvas
        ref={canvasRef}
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
        className="h-72 w-full cursor-crosshair rounded-xl border border-stone-200 bg-white"
      />
    </div>
  );
}
