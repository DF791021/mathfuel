import { Sparkles } from "lucide-react";
import { Link } from "wouter";

/** An optional discovery door, separate from the main learning flow. */
export function WorkshopEntrance() {
  return (
    <Link href="/workshop" className="inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
      <Sparkles size={15} aria-hidden="true" />
      <span>Curious? Open the workshop</span>
    </Link>
  );
}
