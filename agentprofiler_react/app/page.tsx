"use client";

import React, { useEffect, useRef, useState } from "react";
import { renderUpsetPlot } from "./upset_plot";
import { renderToolCallGraph, renderToolCallFlow } from "./tool_call_graph";

const SAMPLE_TOOL_SETS = {
  data_tools: [
    "csv_record",
    "csv_read",
    "csv_filter",
    "csv_select",
    "csv_join",
    "csv_aggregate",
  ],
  enrichment_tools: [
    "gsea_pipe",
    "ora_pipe",
    "run_deseq2_gsea_pipe",
    "run_deseq2_ora_pipe",
  ],
  literature_tools: [
    "query_string_rumma",
    "query_table_rumma",
    "literature_trends",
    "prioritize_genes",
  ],
  gene_info_tools: ["gene_info", "sets_info_rumm", "enrich_rumma"],
};

function UpsetPlotPanel() {
  const upsetRef = useRef<HTMLDivElement | null>(null);
  const graphRef = useRef<HTMLDivElement | null>(null);
  const flowRef = useRef<HTMLDivElement | null>(null);
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTracing, setSelectedTracing] = useState<any>(null);
  const [viewMode, setViewMode] = useState<"detailed" | "flow">("detailed");

  useEffect(() => {
    // Load data from JSONL file
    fetch("/tracings.jsonl")
      .then((response) => response.text())
      .then((text) => {
        // Parse JSONL (each line is a JSON object)
        const lines = text.trim().split("\n");
        const parsedData = lines
          .map((line) => {
            try {
              const item = JSON.parse(line);
              // Ensure score field exists (default to 0 if missing)
              if (item.score === undefined) {
                item.score = 0;
              }
              return item;
            } catch (e) {
              console.error("Failed to parse line:", e);
              return null;
            }
          })
          .filter((item) => item !== null);
        setData(parsedData);
        setLoading(false);
      })
      .catch((error) => {
        console.error("Failed to load tracings.jsonl:", error);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (!upsetRef.current || loading || data.length === 0) return;
    renderUpsetPlot(upsetRef.current, data, SAMPLE_TOOL_SETS, {
      onTracingSelect: (tracing: any) => {
        setSelectedTracing(tracing);
      },
    });
  }, [data, loading]);

  useEffect(() => {
    if (!graphRef.current || !selectedTracing) return;

    const resizeObserver = new ResizeObserver(() => {
      if (graphRef.current && selectedTracing && viewMode === "detailed") {
        renderToolCallGraph(
          graphRef.current,
          selectedTracing,
          SAMPLE_TOOL_SETS
        );
      }
    });

    resizeObserver.observe(graphRef.current);
    if (viewMode === "detailed") {
      renderToolCallGraph(graphRef.current, selectedTracing, SAMPLE_TOOL_SETS);
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, [selectedTracing, viewMode]);

  useEffect(() => {
    if (!flowRef.current || !selectedTracing) return;

    const resizeObserver = new ResizeObserver(() => {
      if (flowRef.current && selectedTracing && viewMode === "flow") {
        renderToolCallFlow(flowRef.current, selectedTracing, SAMPLE_TOOL_SETS);
      }
    });

    resizeObserver.observe(flowRef.current);
    if (viewMode === "flow") {
      renderToolCallFlow(flowRef.current, selectedTracing, SAMPLE_TOOL_SETS);
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, [selectedTracing, viewMode]);

  return (
    <div className="w-full space-y-6">
      <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <div className="mb-4 flex items-baseline justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-black dark:text-zinc-50">
              AgentProfiler Upset Plot
            </h1>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              Visualizing overlaps across tools used by your agents. Click on a
              row to see the tool call sequence.
            </p>
          </div>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Loading tracings data...
            </p>
          </div>
        ) : data.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              No data available
            </p>
          </div>
        ) : (
          <div ref={upsetRef} className="w-full overflow-x-auto">
            {/* SVG is injected by D3 */}
          </div>
        )}
      </div>

      {selectedTracing && (
        <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <div className="mb-4 flex items-baseline justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold tracking-tight text-black dark:text-zinc-50">
                Tool Call Visualization
              </h2>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                {viewMode === "detailed"
                  ? "Detailed graph showing each tool call instance in tracing #"
                  : "Flow diagram with unique nodes and weighted edges showing tool call flow in tracing #"}
                {selectedTracing.id}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex rounded-lg border border-zinc-200 bg-zinc-50 p-1 dark:border-zinc-700 dark:bg-zinc-900">
                <button
                  onClick={() => setViewMode("detailed")}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                    viewMode === "detailed"
                      ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-zinc-50"
                      : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
                  }`}
                >
                  Detailed
                </button>
                <button
                  onClick={() => setViewMode("flow")}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                    viewMode === "flow"
                      ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-zinc-50"
                      : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
                  }`}
                >
                  Flow
                </button>
              </div>
              <button
                onClick={() => setSelectedTracing(null)}
                className="rounded-md px-3 py-1.5 text-sm font-medium text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
              >
                Close
              </button>
            </div>
          </div>
          <div
            ref={graphRef}
            className="w-full"
            style={{
              height: "500px",
              minHeight: "400px",
              display: viewMode === "detailed" ? "block" : "none",
            }}
          >
            {/* Detailed graph is injected by D3 */}
          </div>
          <div
            ref={flowRef}
            className="w-full"
            style={{
              height: "600px",
              minHeight: "500px",
              display: viewMode === "flow" ? "block" : "none",
            }}
          >
            {/* Flow diagram is injected by D3 */}
          </div>
        </div>
      )}
    </div>
  );
}

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 py-16 font-sans dark:bg-black">
      <main className="w-full max-w-7xl">
        <UpsetPlotPanel />
      </main>
    </div>
  );
}
