/** Throne prices always show cents, so a ticking price never jumps between "$7" and "$6.99". */
const USD = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function usd2(cents: number): string {
  return USD.format(cents / 100);
}
