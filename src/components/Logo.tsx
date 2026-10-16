import Link from "next/link";

export default function Logo({ className = "" }: { className?: string }) {
  return (
    <Link href="/" aria-label="AdverticeAF home" className={`group inline-flex items-center gap-2.5 ${className}`}>
      <span
        aria-hidden="true"
        className="flex h-9 w-9 items-center justify-center rounded-xl border border-accent/40 bg-raised font-display text-lg font-bold text-accent transition-colors group-hover:border-accent"
      >
        A
      </span>
      <span className="font-display text-xl font-bold tracking-tight text-fg">
        advertice<span className="text-accent">af</span>
      </span>
    </Link>
  );
}
