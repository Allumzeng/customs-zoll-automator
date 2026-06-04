import Link from "next/link";
import { ArrowRight, Languages } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Model } from "@/lib/schema";

export function ModelCard({ model }: { model: Omit<Model, "extraction_prompt"> | Model }) {
  return (
    <Card className="rounded-lg">
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-3">
          <span>{model.label}</span>
          <Badge variant="outline">v{model.version}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="min-h-10 text-sm text-zinc-600">{model.description || "No description yet."}</p>
        <div className="flex flex-wrap gap-1.5">
          {model.document_types.slice(0, 5).map((type) => (
            <Badge key={type} variant="secondary">
              {type}
            </Badge>
          ))}
        </div>
        <div className="flex items-center justify-between border-t pt-3">
          <div className="flex items-center gap-1.5 text-xs text-zinc-500">
            <Languages className="size-3.5" />
            {model.languages.join(" / ")}
          </div>
          <Button asChild size="sm" variant="outline">
            <Link href={`/models/${model.id}`}>
              Open
              <ArrowRight />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
