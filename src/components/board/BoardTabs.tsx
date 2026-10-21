"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export const BOARD_TABS = [
  { href: "/board", label: "Board", blurb: "Ranked by spend" },
  { href: "/board/throne", label: "Throne", blurb: "King of the hill" },
  { href: "/board/spotlight", label: "Spotlight", blurb: "Book an hour" },
  { href: "/board/wall", label: "Pixel Wall", blurb: "Own a tile" },
] as const;

export default function BoardTabs() {
  const path = (usePathname() ?? "").replace(/\/$/, "") || "/board";
  return (
    <nav aria-label="Board sections" className="border-b border-line bg-surface/60">
      <div className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-4 sm:px-6 lg:px-8">
        {BOARD_TABS.map((t) => {
          const active = t.href === "/board" ? path === "/board" || path.startsWith("/board/listing") || path.startsWith("/board/mine") : path.startsWith(t.href);
          return (
            <Link
              key={t.href}
              href={t.href}
              aria-current={active ? "page" : undefined}
              className={`relative whitespace-nowrap px-4 py-3.5 text-sm font-medium transition-colors ${
                active ? "text-fg after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:rounded-full after:bg-accent" : "text-muted hover:text-fg"
              }`}
            >
              {t.label}
              <span className="ml-2 hidden text-xs font-normal text-muted lg:inline">{t.blurb}</span>
            </Link>
          );
        })}
        <Link href="/board/rules" className="ml-auto whitespace-nowrap px-4 py-3.5 text-sm text-muted hover:text-fg">
          Rules
        </Link>
      </div>
    </nav>
  );
}
