import Link from "next/link";
import { AppNav } from "@/components/customs/AppNav";
import { ReviewWorkspace } from "@/components/customs/ReviewWorkspace";
import { Button } from "@/components/ui/button";
import { getExtraction } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function ReviewPage({
  params,
}: {
  params: Promise<{ extraction_id: string }>;
}) {
  const { extraction_id } = await params;
  const extraction = await getExtraction(extraction_id);

  return (
    <div className="min-h-screen bg-zinc-50">
      <AppNav />
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        {extraction ? (
          <div className="space-y-5">
            <div>
              <h1 className="text-2xl font-semibold">Human Review</h1>
              <p className="mt-1 text-sm text-zinc-600">
                Confirm extracted customs data before JSON or CSV export is allowed.
              </p>
            </div>
            <ReviewWorkspace initialExtraction={extraction} />
          </div>
        ) : (
          <div className="rounded-lg border bg-white p-8 text-center">
            <h1 className="text-xl font-semibold">Extraction not found</h1>
            <p className="mt-2 text-sm text-zinc-600">
              Local demo extractions reset when the dev server restarts. Supabase persistence avoids that.
            </p>
            <Button asChild className="mt-4">
              <Link href="/extract">Start New Extraction</Link>
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}
