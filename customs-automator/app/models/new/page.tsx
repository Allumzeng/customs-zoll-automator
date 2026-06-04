import { AppNav } from "@/components/customs/AppNav";
import { ModelForm } from "@/components/customs/ModelForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function NewModelPage() {
  return (
    <div className="min-h-screen bg-zinc-50">
      <AppNav />
      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle>Create Extraction Model</CardTitle>
          </CardHeader>
          <CardContent>
            <ModelForm />
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
