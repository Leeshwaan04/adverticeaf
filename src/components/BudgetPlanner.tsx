"use client";

import { useState } from "react";
import Section from "@/components/ui/Section";
import { TextField } from "@/components/ui/Field";

const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const int = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

/** Parse a text input; empty or invalid becomes 0 so the maths never produces NaN. */
const num = (v: string) => {
  const n = parseFloat(v);
  return Number.isFinite(n) && n > 0 ? n : 0;
};

interface Funnel {
  impressions: number;
  clicks: number;
  orders: number;
  revenue: number;
  roas: number;
  costPerOrder: number;
}

function funnel(budget: number, cpm: number, ctr: number, cvr: number, aov: number): Funnel {
  const impressions = cpm > 0 ? (budget / cpm) * 1000 : 0;
  const clicks = impressions * (ctr / 100);
  const orders = clicks * (cvr / 100);
  const revenue = orders * aov;
  return {
    impressions,
    clicks,
    orders,
    revenue,
    roas: budget > 0 ? revenue / budget : 0,
    costPerOrder: orders > 0 ? budget / orders : 0,
  };
}

export default function BudgetPlanner() {
  const [budget, setBudget] = useState("15000");
  const [cpm, setCpm] = useState("15");
  const [ctr, setCtr] = useState("2.4");
  const [cvr, setCvr] = useState("1.5");
  const [aov, setAov] = useState("75");
  const [margin, setMargin] = useState("50");
  const [lift, setLift] = useState(20);

  const b = num(budget);
  const base = funnel(b, num(cpm), num(ctr), num(cvr), num(aov));
  const improved = funnel(b, num(cpm), num(ctr) * (1 + lift / 100), num(cvr), num(aov));
  const m = Math.min(num(margin), 100);
  const breakEven = m > 0 ? 100 / m : 0;
  const ready = b > 0 && num(cpm) > 0;

  const rows: { label: string; a: string; c: string }[] = [
    { label: "Impressions", a: int.format(base.impressions), c: int.format(improved.impressions) },
    { label: "Link clicks", a: int.format(base.clicks), c: int.format(improved.clicks) },
    { label: "Orders", a: int.format(base.orders), c: int.format(improved.orders) },
    { label: "Revenue", a: usd.format(base.revenue), c: usd.format(improved.revenue) },
    { label: "ROAS (revenue / spend)", a: `${base.roas.toFixed(2)}x`, c: `${improved.roas.toFixed(2)}x` },
    { label: "Cost per order", a: usd.format(base.costPerOrder), c: usd.format(improved.costPerOrder) },
  ];

  return (
    <Section
      id="planner"
      eyebrow="Free tool"
      title="Budget Planner"
      description="A transparent model of how spend turns into orders. Every number is yours to change, and the formulas are shown below."
    >
      <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[1fr_1.2fr]">
        <div className="panel p-6 sm:p-7">
          <h3 className="text-base font-semibold text-fg">Your assumptions</h3>
          <p className="mt-1 text-xs leading-relaxed text-muted">
            Starting values are illustrative. Replace them with figures from your own ad account.
          </p>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <TextField label="Monthly ad spend ($)" name="budget" type="number" inputMode="decimal" min="0" step="any" value={budget} onChange={(e) => setBudget(e.target.value)} />
            <TextField label="CPM ($ per 1,000 views)" name="cpm" type="number" inputMode="decimal" min="0" step="any" value={cpm} onChange={(e) => setCpm(e.target.value)} />
            <TextField label="Link click-through rate (%)" name="ctr" type="number" inputMode="decimal" min="0" step="any" value={ctr} onChange={(e) => setCtr(e.target.value)} />
            <TextField label="Conversion rate (%)" name="cvr" type="number" inputMode="decimal" min="0" step="any" value={cvr} onChange={(e) => setCvr(e.target.value)} hint="Share of clicks that become orders." />
            <TextField label="Average order value ($)" name="aov" type="number" inputMode="decimal" min="0" step="any" value={aov} onChange={(e) => setAov(e.target.value)} />
            <TextField label="Gross margin (%)" name="margin" type="number" inputMode="decimal" min="0" max="100" step="any" value={margin} onChange={(e) => setMargin(e.target.value)} hint="Before ad spend." />
          </div>

          <div className="mt-6">
            <label htmlFor="lift" className="flex items-baseline justify-between text-sm font-medium text-fg">
              <span>What if better creative lifts click-through rate by</span>
              <output htmlFor="lift" className="font-semibold text-accent">+{lift}%</output>
            </label>
            <input
              id="lift"
              type="range"
              min={0}
              max={50}
              step={5}
              value={lift}
              onChange={(e) => setLift(Number(e.target.value))}
              className="mt-3 w-full accent-accent"
            />
            <p className="mt-1.5 text-xs text-muted">A what-if you control. It is not a result we promise.</p>
          </div>
        </div>

        <div className="panel p-6 sm:p-7" aria-live="polite">
          {!ready ? (
            <p className="text-sm text-muted">Enter an ad spend and CPM above zero to see the model.</p>
          ) : (
            <>
              <table className="w-full text-sm">
                <caption className="sr-only">Projected funnel with current and improved click-through rate</caption>
                <thead>
                  <tr className="border-b border-line text-left text-xs text-muted">
                    <th scope="col" className="pb-2 font-medium">Metric</th>
                    <th scope="col" className="pb-2 text-right font-medium">Your numbers</th>
                    <th scope="col" className="pb-2 text-right font-medium text-accent">With +{lift}% CTR</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.label} className="border-b border-line/60 last:border-0">
                      <th scope="row" className="py-2.5 text-left font-normal text-muted">{r.label}</th>
                      <td className="py-2.5 text-right font-semibold tabular-nums text-fg">{r.a}</td>
                      <td className="py-2.5 text-right font-semibold tabular-nums text-fg">{r.c}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {breakEven > 0 && (
                <p className="mt-5 rounded-xl bg-raised p-4 text-sm leading-relaxed text-muted">
                  At a {m}% gross margin, you need about{" "}
                  <strong className="text-fg">{breakEven.toFixed(2)}x ROAS</strong> to break even on ad spend.{" "}
                  {base.roas < breakEven ? (
                    <>Your current numbers sit below that, so spend would lose money before overheads.</>
                  ) : (
                    <>Your current numbers sit above that, before overheads and other costs.</>
                  )}
                </p>
              )}
            </>
          )}
        </div>
      </div>

      <div className="mx-auto mt-6 max-w-5xl text-xs leading-relaxed text-muted">
        <p>
          <strong className="font-semibold text-fg">Formulas.</strong> Impressions = spend / CPM x 1,000. Clicks =
          impressions x CTR. Orders = clicks x conversion rate. Revenue = orders x average order value. ROAS = revenue /
          spend.
        </p>
        <p className="mt-2">
          This is a simple model, not a forecast. It ignores returns, repeat purchases, attribution gaps and changes in
          CPM as you scale. Published benchmark reports, for example from{" "}
          <a className="text-accent underline underline-offset-2" href="https://www.triplewhale.com/blog/facebook-ads-benchmarks" target="_blank" rel="noopener noreferrer">
            Triple Whale
          </a>
          , show how widely these figures vary by industry and year, so use your own data where you can.
        </p>
      </div>
    </Section>
  );
}
