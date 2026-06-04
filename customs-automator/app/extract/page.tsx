import { AppNav } from "@/components/customs/AppNav";
import { ExtractUploader } from "@/components/customs/ExtractUploader";
import { HsCodeLookup } from "@/components/customs/HsCodeLookup";
import { listModels } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function ExtractPage() {
  const models = await listModels();

  return (
    <div className="min-h-screen bg-zinc-50">
      <AppNav />
      <main className="mx-auto grid max-w-6xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[1fr_380px]">
        <section className="space-y-4">
          <div>
            <h1 className="text-2xl font-semibold">Upload Documents</h1>
            <p className="mt-1 text-sm text-zinc-600">
              Upload invoices, packing lists, CMR, AWB, B/L, or Zollanmeldung files for extraction.
            </p>
          </div>
          <ExtractUploader models={models} />
        </section>
        <section className="space-y-4">
          <HsCodeLookup />
          <div className="rounded-lg border bg-white p-4 text-sm text-zinc-600">
            Exports remain locked until the review screen is approved. Low-confidence fields and conflicting
            document evidence are flagged for human verification.
          </div>
        </section>
      </main>
    </div>
  );
}
