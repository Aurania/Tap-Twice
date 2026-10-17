import { Link, useLocation } from "react-router";
import { Mark } from "@/ui";

/** Temporary stand-in for screens built in later phases. Developer-facing, not translated. */
export function Placeholder({ screen, phase }: { screen: string; phase: number }) {
  const { pathname } = useLocation();
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-3 px-5 text-center">
      <Mark size={40} />
      <h1 className="tt-h1">{screen}</h1>
      <p className="tt-small text-ink-2">
        <code>{pathname}</code> · built in phase {phase}
      </p>
      <Link to="/dev/components" className="tt-link underline underline-offset-2">
        Open /dev/components
      </Link>
    </main>
  );
}
