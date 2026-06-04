import Link from "next/link";
import { FileSearch, FlaskConical, LayoutDashboard, PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export function AppNav() {
  return (
    <header className="border-b bg-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
        <Link href="/" className="flex items-center gap-2 font-semibold text-zinc-950">
          <FileSearch className="size-5 text-teal-700" />
          Customs Automator
        </Link>
        <nav className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm">
            <Link href="/">
              <LayoutDashboard />
              Dashboard
            </Link>
          </Button>
          <Button asChild variant="ghost" size="sm">
            <Link href="/extract">
              <FlaskConical />
              Extract
            </Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/models/new">
              <PlusCircle />
              Model
            </Link>
          </Button>
        </nav>
      </div>
    </header>
  );
}
