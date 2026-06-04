"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import type { HsCodeSuggestion } from "@/lib/hs-code";
import { ConfidenceBadge } from "./ConfidenceBadge";

export function HsCodeLookup() {
  const [description, setDescription] = useState("");
  const [result, setResult] = useState<HsCodeSuggestion | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  async function classify() {
    setStatus("Classifying...");
    setResult(null);
    const response = await fetch("/api/hs-code", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ description }),
    });
    const data = await response.json();
    if (response.ok) {
      setResult(data);
      setStatus(null);
    } else {
      setStatus(data.error || "Classification failed.");
    }
  }

  return (
    <div className="space-y-3 rounded-lg border bg-white p-4">
      <div className="grid gap-2">
        <Label htmlFor="hs-description">HS classifier</Label>
        <Textarea
          id="hs-description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Product description in Chinese, English, or German"
        />
      </div>
      <Button onClick={classify} variant="outline">
        <Search />
        Suggest HS Code
      </Button>
      {status ? <p className="text-sm text-zinc-600">{status}</p> : null}
      {result ? (
        <div className="rounded-md bg-zinc-50 p-3 text-sm">
          <div className="mb-2 flex items-center justify-between">
            <span className="font-mono text-lg font-semibold">{result.hs_code}</span>
            <ConfidenceBadge confidence={result.confidence} />
          </div>
          <p className="font-medium">{result.description_en}</p>
          <p className="mt-1 text-zinc-600">{result.reasoning}</p>
        </div>
      ) : null}
    </div>
  );
}
