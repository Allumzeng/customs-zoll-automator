"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import type { Model } from "@/lib/schema";

export function ExtractUploader({ models }: { models: Array<Omit<Model, "extraction_prompt"> | Model> }) {
  const router = useRouter();
  const [modelId, setModelId] = useState(models[0]?.id || "default-customs-model");
  const [files, setFiles] = useState<FileList | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (!files?.length) {
      setStatus("Choose at least one PDF or image first.");
      return;
    }

    setLoading(true);
    setStatus("Extracting customs fields...");

    const formData = new FormData();
    formData.set("model_id", modelId);
    Array.from(files).forEach((file) => formData.append("files", file));

    const response = await fetch("/api/extract", {
      method: "POST",
      body: formData,
    });
    const data = await response.json();
    setLoading(false);

    if (!response.ok) {
      setStatus(data.error || "Extraction failed.");
      return;
    }

    router.push(data.redirect);
  }

  return (
    <Card className="rounded-lg">
      <CardHeader>
        <CardTitle>Production Extraction</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-2">
          <Label htmlFor="model">Model</Label>
          <select
            id="model"
            value={modelId}
            onChange={(event) => setModelId(event.target.value)}
            className="h-9 rounded-lg border bg-white px-3 text-sm"
          >
            {models.map((model) => (
              <option key={model.id} value={model.id}>
                {model.label}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="files">Documents</Label>
          <input
            id="files"
            type="file"
            multiple
            accept="application/pdf,image/png,image/jpeg"
            onChange={(event) => setFiles(event.target.files)}
            className="rounded-lg border bg-white p-3 text-sm"
          />
        </div>
        <Button onClick={submit} disabled={loading} className="w-full">
          <UploadCloud />
          {loading ? "Extracting..." : "Upload and Extract"}
        </Button>
        {status ? <p className="text-sm text-zinc-600">{status}</p> : null}
      </CardContent>
    </Card>
  );
}
