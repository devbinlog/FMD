"use client";

import { useState, useRef, useCallback } from "react";
import { Search, Loader2, Wand2 } from "lucide-react";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import InputModeTabs from "@/components/InputModeTabs";
import TextPromptPanel from "@/components/TextPromptPanel";
import DrawingCanvas from "@/components/DrawingCanvas";
import CategorySelector from "@/components/CategorySelector";
import ProductCard from "@/components/ProductCard";
import EmptyState from "@/components/EmptyState";
import HistoryPanel from "@/components/HistoryPanel";

import {
  createSession,
  createDesign,
  processDesign,
  pollJobUntilDone,
  search,
  getSessionHistory,
} from "@/lib/api";
import type { SearchResultItem, JobStatus, HistoryItem } from "@/types/api";

type AppState = "idle" | "loading" | "results" | "error";

export default function Home() {
  const [appState, setAppState] = useState<AppState>("idle");
  const [mode, setMode] = useState<"text" | "canvas">("text");
  const [textPrompt, setTextPrompt] = useState("");
  const [canvasData, setCanvasData] = useState<string>("");
  const [category, setCategory] = useState<string | null>(null);
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [errorMsg, setErrorMsg] = useState("");
  const [progress, setProgress] = useState(0);
  const [aiImageUrl, setAiImageUrl] = useState<string | null>(null);
  const [keywords, setKeywords] = useState<string[]>([]);
  const [dominantColor, setDominantColor] = useState<string | null>(null);
  const sessionIdRef = useRef<string | null>(null);

  // History state
  const [showHistory, setShowHistory] = useState(false);
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const isLoading = appState === "loading";

  const handleHistoryClick = useCallback(async () => {
    setShowHistory(true);
    if (!sessionIdRef.current) return;
    setHistoryLoading(true);
    try {
      const resp = await getSessionHistory(sessionIdRef.current);
      setHistoryItems(resp.items);
    } catch {
      setHistoryItems([]);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  const handleSearch = useCallback(async () => {
    if (mode === "text" && !textPrompt.trim()) {
      setErrorMsg("Please enter a text description.");
      setAppState("error");
      return;
    }
    if (mode === "canvas" && !canvasData) {
      setErrorMsg("Please draw something on the canvas.");
      setAppState("error");
      return;
    }

    setAppState("loading");
    setErrorMsg("");
    setProgress(0);
    setAiImageUrl(null);
    setKeywords([]);
    setDominantColor(null);

    try {
      if (!sessionIdRef.current) {
        const sess = await createSession();
        sessionIdRef.current = sess.session_id;
      }

      const design = await createDesign({
        session_id: sessionIdRef.current,
        input_mode: mode,
        category_hint: category ?? undefined,
        text_prompt: mode === "text" ? textPrompt : undefined,
        canvas_data: mode === "canvas" ? canvasData : undefined,
      });

      const job = await processDesign(design.design_id);

      let finalStatus: JobStatus | null = null;
      finalStatus = await pollJobUntilDone(job.job_id, (status) => {
        setProgress(status.progress);
        if (status.ai_image_url) setAiImageUrl(status.ai_image_url);
      });

      if (finalStatus.status === "failed") {
        throw new Error(finalStatus.error_code || "Processing failed");
      }

      if (finalStatus.ai_image_url) setAiImageUrl(finalStatus.ai_image_url);
      if (finalStatus.keywords) setKeywords(finalStatus.keywords);
      if (finalStatus.dominant_color) setDominantColor(finalStatus.dominant_color);

      const searchRes = await search({
        design_id: design.design_id,
        providers: ["mock", "api"],
        limit: 12,
      });

      setResults(searchRes.results);
      setAppState("results");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong");
      setAppState("error");
    }
  }, [mode, textPrompt, canvasData, category]);

  const progressLabel =
    progress < 0.4
      ? "Analyzing design..."
      : progress < 0.7
        ? "Generating AI reference..."
        : "Searching products...";

  return (
    <div className="flex min-h-screen flex-col bg-[#faf9f7]">
      <Header
        onHistoryClick={handleHistoryClick}
        hasSession={!!sessionIdRef.current}
      />

      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10">
        <div className="space-y-10">
          {/* Hero + Input Section */}
          <section className="space-y-8">
            <div>
              <h2 className="text-3xl font-bold tracking-tight text-stone-900">
                Find Your Design
              </h2>
              <p className="mt-2 text-[15px] text-stone-500">
                Describe what you&apos;re looking for or draw a sketch &mdash; AI will find matching designs across the web.
              </p>
            </div>

            <div className="rounded-2xl border border-stone-200/80 bg-white p-6 shadow-sm">
              <div className="space-y-5">
                <InputModeTabs
                  mode={mode}
                  onModeChange={setMode}
                  disabled={isLoading}
                />

                {mode === "text" ? (
                  <TextPromptPanel
                    value={textPrompt}
                    onChange={setTextPrompt}
                    disabled={isLoading}
                  />
                ) : (
                  <DrawingCanvas
                    onCanvasData={setCanvasData}
                    disabled={isLoading}
                  />
                )}

                <div>
                  <label className="mb-2.5 block text-sm font-medium text-stone-700">
                    Category
                    <span className="ml-1 font-normal text-stone-400">(optional)</span>
                  </label>
                  <CategorySelector
                    selected={category}
                    onSelect={setCategory}
                    disabled={isLoading}
                  />
                </div>

                <button
                  onClick={handleSearch}
                  disabled={isLoading}
                  className="flex h-12 w-full items-center justify-center gap-2.5 rounded-xl bg-stone-900 px-4 text-[15px] font-medium text-white transition-all hover:bg-stone-800 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>{progressLabel}</span>
                      <span className="ml-1 tabular-nums text-stone-400">
                        {Math.round(progress * 100)}%
                      </span>
                    </>
                  ) : (
                    <>
                      <Search className="h-4 w-4" />
                      Search Designs
                    </>
                  )}
                </button>
              </div>
            </div>
          </section>

          {/* Error */}
          {appState === "error" && errorMsg && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4">
              <p className="text-sm text-red-700">{errorMsg}</p>
              <button
                onClick={() => setAppState("idle")}
                className="mt-2 text-sm font-medium text-red-600 hover:text-red-700"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* AI Analysis Panel */}
          {appState === "results" && (aiImageUrl || keywords.length > 0) && (
            <section className="rounded-2xl border border-stone-200/80 bg-white p-6">
              <div className="flex items-center gap-2.5 mb-5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-50">
                  <Wand2 className="h-4 w-4 text-orange-600" />
                </div>
                <div>
                  <h3 className="text-[15px] font-semibold text-stone-900">
                    AI Design Analysis
                  </h3>
                  <p className="text-xs text-stone-400">Powered by Stable Diffusion</p>
                </div>
              </div>
              <div className="flex flex-col gap-5 md:flex-row">
                {aiImageUrl && (
                  <div className="shrink-0">
                    <img
                      src={aiImageUrl}
                      alt="AI generated reference"
                      className="h-44 w-44 rounded-xl border border-stone-200 object-cover"
                    />
                  </div>
                )}
                <div className="flex-1 space-y-4">
                  {keywords.length > 0 && (
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wider text-stone-400 mb-2">
                        Detected Keywords
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {keywords.map((kw) => (
                          <span
                            key={kw}
                            className="rounded-full border border-stone-200 bg-stone-50 px-2.5 py-1 text-xs font-medium text-stone-600"
                          >
                            {kw}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {dominantColor && (
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wider text-stone-400 mb-2">
                        Dominant Color
                      </p>
                      <div className="flex items-center gap-2.5">
                        <div
                          className="h-7 w-7 rounded-lg border border-stone-200"
                          style={{ backgroundColor: dominantColor }}
                        />
                        <span className="text-sm font-mono text-stone-600">
                          {dominantColor}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </section>
          )}

          {/* Results */}
          {appState === "results" && results.length > 0 && (
            <section>
              <div className="mb-6 flex items-center justify-between">
                <h2 className="text-2xl font-bold tracking-tight text-stone-900">
                  Results
                </h2>
                <span className="rounded-full bg-stone-100 px-3 py-1 text-sm font-medium text-stone-600">
                  {results.length} found
                </span>
              </div>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {results.map((item, i) => (
                  <ProductCard key={i} item={item} />
                ))}
              </div>
            </section>
          )}

          {/* Empty state */}
          {appState === "idle" && <EmptyState />}
          {appState === "results" && results.length === 0 && (
            <div className="py-20 text-center">
              <h3 className="text-lg font-semibold text-stone-600">
                No matching designs found
              </h3>
              <p className="mt-2 text-sm text-stone-400">
                Try a different description or category.
              </p>
            </div>
          )}
        </div>
      </main>

      <Footer />

      {showHistory && (
        <HistoryPanel
          items={historyItems}
          onClose={() => setShowHistory(false)}
          isLoading={historyLoading}
        />
      )}
    </div>
  );
}
