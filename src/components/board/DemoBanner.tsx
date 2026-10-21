import { BOARD_MODE } from "@/lib/board/config";

export default function DemoBanner() {
  if (BOARD_MODE !== "demo") return null;
  return (
    <div role="note" className="border-b border-warn/40 bg-warn/10 px-4 py-2.5 text-center text-sm text-fg">
      <strong className="font-semibold">Demo mode.</strong> Everything here is sample data held in your browser. No payments are taken and nothing is
      published.
    </div>
  );
}
