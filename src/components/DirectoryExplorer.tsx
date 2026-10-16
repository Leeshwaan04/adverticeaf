"use client";

import { useMemo, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";
import AgencyCard from "@/components/AgencyCard";
import { AGENCIES, CATEGORIES, COUNTRIES, type Category } from "@/data/agencies";
import Button from "@/components/ui/Button";

const SORTS = [
  { value: "az", label: "Name (A to Z)" },
  { value: "oldest", label: "Established (oldest first)" },
  { value: "newest", label: "Established (newest first)" },
] as const;
type Sort = (typeof SORTS)[number]["value"];

const isCategory = (v: string | null): v is Category => !!v && (CATEGORIES as readonly string[]).includes(v);
const isSort = (v: string | null): v is Sort => !!v && SORTS.some((s) => s.value === v);

export default function DirectoryExplorer() {
  const params = useSearchParams();
  const [query, setQuery] = useState(params.get("q") ?? "");
  const [category, setCategory] = useState<Category | "all">(isCategory(params.get("category")) ? (params.get("category") as Category) : "all");
  const [country, setCountry] = useState(params.get("country") ?? "all");
  const [sort, setSort] = useState<Sort>(isSort(params.get("sort")) ? (params.get("sort") as Sort) : "az");

  // Keep filters in the URL so a filtered view can be shared or bookmarked.
  useEffect(() => {
    const next = new URLSearchParams();
    if (query.trim()) next.set("q", query.trim());
    if (category !== "all") next.set("category", category);
    if (country !== "all") next.set("country", country);
    if (sort !== "az") next.set("sort", sort);
    const qs = next.toString();
    window.history.replaceState(null, "", qs ? `?${qs}` : window.location.pathname);
  }, [query, category, country, sort]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = AGENCIES.filter((a) => {
      if (category !== "all" && a.category !== category) return false;
      if (country !== "all" && a.countryCode !== country) return false;
      if (!q) return true;
      const haystack = [
        a.name, a.summary, a.country, a.category, ...a.locations, ...a.clients.flatMap((c) => c.names),
      ].join(" ").toLowerCase();
      return haystack.includes(q);
    });
    return [...list].sort((a, b) => {
      if (sort === "az") return a.name.localeCompare(b.name);
      const ay = a.founded ?? 0;
      const by = b.founded ?? 0;
      return sort === "oldest" ? ay - by : by - ay;
    });
  }, [query, category, country, sort]);

  const filtered = query.trim() !== "" || category !== "all" || country !== "all";
  const reset = () => {
    setQuery("");
    setCategory("all");
    setCountry("all");
    setSort("az");
  };

  const chip = (active: boolean) =>
    `min-h-10 rounded-full border px-4 text-sm font-medium transition-colors ${
      active ? "border-accent bg-accent/10 text-fg" : "border-line-strong text-muted hover:text-fg"
    }`;

  return (
    <div>
      <div className="panel p-4 sm:p-5">
        <div className="grid gap-3 md:grid-cols-[1fr_auto_auto]">
          <div className="relative">
            <label htmlFor="dir-search" className="sr-only">Search agencies</label>
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden="true" />
            <input
              id="dir-search"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name, city, client or specialty"
              className="min-h-11 w-full rounded-xl border border-line-strong bg-ink pl-10 pr-4 text-sm text-fg placeholder:text-muted/70 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/40"
            />
          </div>
          <div>
            <label htmlFor="dir-country" className="sr-only">Country</label>
            <select
              id="dir-country"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className="min-h-11 w-full rounded-xl border border-line-strong bg-ink px-3 text-sm text-fg focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/40"
            >
              <option value="all">All countries</option>
              {COUNTRIES.map((c) => (
                <option key={c.code} value={c.code}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="dir-sort" className="sr-only">Sort by</label>
            <select
              id="dir-sort"
              value={sort}
              onChange={(e) => setSort(e.target.value as Sort)}
              className="min-h-11 w-full rounded-xl border border-line-strong bg-ink px-3 text-sm text-fg focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/40"
            >
              {SORTS.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div role="group" aria-label="Filter by category" className="mt-4 flex flex-wrap gap-2">
          <button type="button" aria-pressed={category === "all"} onClick={() => setCategory("all")} className={chip(category === "all")}>
            All categories
          </button>
          {CATEGORIES.map((c) => (
            <button key={c} type="button" aria-pressed={category === c} onClick={() => setCategory(c)} className={chip(category === c)}>
              {c}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-4 mt-6 flex items-center justify-between gap-4">
        <p role="status" aria-live="polite" className="text-sm text-muted">
          Showing <strong className="text-fg">{results.length}</strong> of {AGENCIES.length} agencies
        </p>
        {filtered && (
          <button type="button" onClick={reset} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg px-3 text-sm text-accent hover:text-accent-hover">
            <X className="h-3.5 w-3.5" aria-hidden="true" />
            Clear filters
          </button>
        )}
      </div>

      {results.length === 0 ? (
        <div className="panel px-6 py-14 text-center">
          <h2 className="text-lg font-semibold text-fg">No agencies match those filters</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted">
            The directory is small and growing. Try a broader search, or tell us about an agency we should add.
          </p>
          <Button variant="secondary" className="mt-6" onClick={reset}>Clear filters</Button>
        </div>
      ) : (
        <ul className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {results.map((a) => (
            <li key={a.slug}>
              <AgencyCard agency={a} headingLevel="h2" />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
