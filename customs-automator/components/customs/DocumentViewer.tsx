import { FileText } from "lucide-react";

export function DocumentViewer({ sourceText }: { sourceText?: string | null }) {
  return (
    <aside className="rounded-lg border bg-zinc-950 p-4 text-zinc-100">
      <div className="mb-3 flex items-center gap-2 text-sm font-medium">
        <FileText className="size-4 text-teal-300" />
        Source Evidence
      </div>
      <pre className="max-h-[520px] whitespace-pre-wrap rounded-md bg-black/30 p-3 text-xs leading-5 text-zinc-200">
        {sourceText || "Uploaded document previews can be connected here once Supabase Storage is configured."}
      </pre>
    </aside>
  );
}
