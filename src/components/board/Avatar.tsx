import { hueFor } from "@/lib/board/format";

/** Letter avatar with a deterministic colour. No external image requests. */
export default function Avatar({ name, size = 40, className = "" }: { name: string; size?: number; className?: string }) {
  const hue = hueFor(name);
  return (
    <span
      aria-hidden="true"
      className={`inline-flex shrink-0 items-center justify-center rounded-xl font-display font-bold text-white ${className}`}
      style={{
        width: size,
        height: size,
        fontSize: size * 0.45,
        background: `linear-gradient(135deg, hsl(${hue} 70% 38%), hsl(${(hue + 40) % 360} 70% 28%))`,
      }}
    >
      {name.trim().charAt(0).toUpperCase() || "?"}
    </span>
  );
}
