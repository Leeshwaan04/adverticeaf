"use client";

import { useId, useMemo, useState } from "react";
import { Check, CircleCheck, CircleX, Copy } from "lucide-react";
import Section from "@/components/ui/Section";
import ContactButton from "@/components/ContactButton";
import { scoreHook, PLATFORMS, rewriteTemplates, type Platform } from "@/lib/hook-score";

const EXAMPLES = [
  "Buy our high quality electrolyte powder with 10 essential vitamins today!",
  "The all-in-one project management software designed for agile teams.",
  "Why 3 out of 4 people drink their coffee wrong before 9am",
];

export default function HookChecker() {
  const [headline, setHeadline] = useState("");
  const [platform, setPlatform] = useState<Platform>("Short video");
  const [copied, setCopied] = useState<number | null>(null);
  const inputId = useId();
  const platformName = useId();

  const result = useMemo(() => scoreHook(headline, platform), [headline, platform]);
  const templates = useMemo(() => rewriteTemplates(), []);

  async function copy(text: string, i: number) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(i);
      setTimeout(() => setCopied((c) => (c === i ? null : c)), 2000);
    } catch {
      /* Clipboard can be blocked; the text stays selectable on screen. */
    }
  }

  return (
    <Section
      id="hook-checker"
      tinted
      eyebrow="Free tool"
      title="Hook Checker"
      description="Paste an ad headline or the first line of a video. It is scored against six criteria you can see, so you know exactly why."
    >
      <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-2">
        <div className="panel p-6 sm:p-7">
          <label htmlFor={inputId} className="mb-1.5 block text-sm font-medium text-fg">
            Your headline or opening line
          </label>
          <textarea
            id={inputId}
            rows={4}
            value={headline}
            onChange={(e) => setHeadline(e.target.value)}
            placeholder="Paste your current hook here"
            className="w-full resize-y rounded-xl border border-line-strong bg-ink px-4 py-3 text-sm text-fg placeholder:text-muted/70 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/40"
          />
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted">Try an example:</span>
            {EXAMPLES.map((ex, i) => (
              <button
                key={ex}
                type="button"
                onClick={() => setHeadline(ex)}
                className="min-h-9 rounded-lg border border-line-strong px-3 text-xs text-muted transition-colors hover:border-accent hover:text-fg"
              >
                Example {i + 1}
              </button>
            ))}
          </div>

          <fieldset className="mt-6">
            <legend className="mb-2 text-sm font-medium text-fg">Where will it run?</legend>
            <div className="grid grid-cols-3 gap-2">
              {PLATFORMS.map((p) => (
                <label
                  key={p}
                  className={`flex min-h-11 cursor-pointer items-center justify-center rounded-xl border px-2 text-center text-xs font-medium transition-colors has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent ${
                    platform === p ? "border-accent bg-accent/10 text-fg" : "border-line-strong text-muted hover:text-fg"
                  }`}
                >
                  <input
                    type="radio"
                    name={platformName}
                    value={p}
                    checked={platform === p}
                    onChange={() => setPlatform(p)}
                    className="sr-only"
                  />
                  {p}
                </label>
              ))}
            </div>
          </fieldset>

          <p className="mt-6 rounded-xl bg-raised p-4 text-xs leading-relaxed text-muted">
            <strong className="font-semibold text-fg">How to read this.</strong> This is a rule-based checklist, not AI
            and not a prediction of results. Real performance depends on your audience, offer and execution. Test with
            real spend. It runs entirely in your browser: nothing you type is sent anywhere.
          </p>
        </div>

        <div className="panel p-6 sm:p-7" aria-live="polite">
          {!result ? (
            <div className="flex h-full min-h-64 flex-col items-center justify-center text-center">
              <p className="text-base font-semibold text-fg">Your score appears here</p>
              <p className="mt-2 max-w-xs text-sm text-muted">Type at least three words, or pick an example, to see how your hook scores.</p>
            </div>
          ) : (
            <div>
              <div className="flex items-center gap-5">
                <ScoreRing score={result.score} />
                <div>
                  <p className="text-sm text-muted">Checklist score</p>
                  <p className="text-2xl font-bold text-fg">{result.label}</p>
                  <p className="text-sm text-muted">
                    {result.passed} of {result.criteria.length} criteria met
                  </p>
                </div>
              </div>

              <ul className="mt-6 space-y-3">
                {result.criteria.map((c) => (
                  <li key={c.id} className="flex gap-3">
                    {c.pass ? (
                      <CircleCheck className="mt-0.5 h-5 w-5 shrink-0 text-ok" aria-label="Met" />
                    ) : (
                      <CircleX className="mt-0.5 h-5 w-5 shrink-0 text-warn" aria-label="Not met" />
                    )}
                    <div>
                      <p className="text-sm font-medium text-fg">{c.title}</p>
                      <p className="text-xs leading-relaxed text-muted">{c.pass ? c.passNote : c.tip}</p>
                    </div>
                  </li>
                ))}
              </ul>
              {result.platformTip && <p className="mt-5 text-xs leading-relaxed text-muted">{result.platformTip}</p>}
            </div>
          )}
        </div>
      </div>

      <div className="mx-auto mt-10 max-w-5xl">
        <h3 className="text-lg font-semibold text-fg">Starting-point rewrites</h3>
        <p className="mt-1 text-sm text-muted">
          Fill in the brackets with your own specifics. Only use a structure if it is true for your product.
        </p>
        <ul className="mt-5 grid gap-4 md:grid-cols-3">
          {templates.map((t, i) => (
            <li key={t.name} className="panel flex flex-col p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-accent">{t.name}</p>
              <p className="mt-3 flex-1 text-sm font-medium leading-snug text-fg">{t.template}</p>
              <p className="mt-3 text-xs leading-relaxed text-muted">{t.why}</p>
              <button
                type="button"
                onClick={() => copy(t.template, i)}
                className="mt-4 inline-flex min-h-9 items-center gap-1.5 self-start rounded-lg border border-line-strong px-3 text-xs font-medium text-muted transition-colors hover:border-accent hover:text-fg"
              >
                {copied === i ? <Check className="h-3.5 w-3.5 text-ok" aria-hidden="true" /> : <Copy className="h-3.5 w-3.5" aria-hidden="true" />}
                {copied === i ? "Copied" : "Copy template"}
              </button>
            </li>
          ))}
        </ul>

        <div className="mt-8 flex flex-col items-center gap-3 text-center">
          <p className="text-sm text-muted">Want a person to review the whole ad, not just the first line?</p>
          <ContactButton
            variant="secondary"
            prefill={{
              topic: "Review of my ads or creative strategy",
              message: headline.trim() ? `My current hook: "${headline.trim()}"` : undefined,
            }}
          >
            Ask us to review it
          </ContactButton>
        </div>
      </div>
    </Section>
  );
}

function ScoreRing({ score }: { score: number }) {
  const r = 34;
  const c = 2 * Math.PI * r;
  const color = score >= 80 ? "var(--color-ok)" : score >= 55 ? "var(--color-accent)" : "var(--color-warn)";
  return (
    <div className="relative h-20 w-20 shrink-0">
      <svg viewBox="0 0 80 80" className="h-20 w-20 -rotate-90" role="img" aria-label={`Score ${score} out of 100`}>
        <circle cx="40" cy="40" r={r} fill="none" stroke="var(--color-line)" strokeWidth="7" />
        <circle
          cx="40"
          cy="40"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - score / 100)}
          style={{ transition: "stroke-dashoffset 0.4s ease" }}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-xl font-bold text-fg">{score}</span>
    </div>
  );
}
