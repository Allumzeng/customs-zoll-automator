"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { EXTRACTION_SYSTEM_PROMPT } from "@/lib/prompts";

export function ModelForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(formData: FormData) {
    setLoading(true);
    setError(null);
    const body = {
      name: formData.get("name"),
      label: formData.get("label"),
      description: formData.get("description"),
      document_types: String(formData.get("document_types") || "")
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean),
      languages: String(formData.get("languages") || "")
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean),
      extraction_prompt: formData.get("extraction_prompt"),
    };

    const response = await fetch("/api/model", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await response.json();
    setLoading(false);

    if (!response.ok) {
      setError(data.error || "Could not create model.");
      return;
    }
    router.push(`/models/${data.id}`);
  }

  return (
    <form action={submit} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="label">Label</Label>
          <Input id="label" name="label" defaultValue="Customer Format Extractor" required />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="name">Internal name</Label>
          <Input id="name" name="name" defaultValue="customer-format" required />
        </div>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="description">Description</Label>
        <Input id="description" name="description" defaultValue="Customer-specific invoice and packing-list format." />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="document_types">Document types</Label>
          <Input id="document_types" name="document_types" defaultValue="invoice,packing_list,cmr" />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="languages">Languages</Label>
          <Input id="languages" name="languages" defaultValue="zh,en,de" />
        </div>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="extraction_prompt">Server-side extraction prompt</Label>
        <Textarea
          id="extraction_prompt"
          name="extraction_prompt"
          defaultValue={EXTRACTION_SYSTEM_PROMPT}
          className="min-h-72 font-mono text-xs"
        />
      </div>
      <Button disabled={loading}>
        <Save />
        {loading ? "Saving..." : "Create Model"}
      </Button>
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
    </form>
  );
}
