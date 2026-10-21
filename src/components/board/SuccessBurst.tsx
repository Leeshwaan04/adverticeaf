import type { CSSProperties, ReactNode } from "react";

/**
 * Small celebratory burst. CSS only, one shot, never blocks interaction (pointer-events: none).
 * Under prefers-reduced-motion nothing moves: a static ring is shown instead.
 */

const PARTICLES = Array.from({ length: 14 }, (_, i) => {
  const angle = (360 / 14) * i;
  return {
    angle,
    distance: 56 + (i % 3) * 14,
    color: i % 3 === 0 ? "var(--color-accent)" : i % 3 === 1 ? "var(--color-ok)" : "var(--color-warn)",
    delay: (i % 4) * 40,
  };
});

const CSS = `
.sb-wrap{position:relative;display:inline-flex;align-items:center;justify-content:center}
.sb-layer{position:absolute;inset:0;pointer-events:none;display:flex;align-items:center;justify-content:center}
.sb-ring{position:absolute;inset:-6px;border-radius:9999px;border:2px solid var(--color-accent);opacity:.5}
.sb-dot{position:absolute;display:none;width:8px;height:8px;border-radius:2px;background:var(--sb-color)}
@media (prefers-reduced-motion: no-preference){
  .sb-ring{opacity:0;animation:sb-ring 900ms ease-out 1 both}
  .sb-dot{display:block;opacity:0;animation:sb-pop 900ms cubic-bezier(.2,.8,.3,1) var(--sb-delay) 1 both}
}
@keyframes sb-pop{
  0%{opacity:1;transform:rotate(var(--sb-angle)) translateY(0) scale(1)}
  100%{opacity:0;transform:rotate(var(--sb-angle)) translateY(calc(var(--sb-distance) * -1)) scale(.4)}
}
@keyframes sb-ring{
  0%{opacity:.9;transform:scale(.6)}
  100%{opacity:0;transform:scale(1.5)}
}
`;

export default function SuccessBurst({ children }: { children?: ReactNode }) {
  return (
    <span className="sb-wrap">
      <style>{CSS}</style>
      {children}
      <span className="sb-layer" aria-hidden="true">
        <span className="sb-ring" />
        {PARTICLES.map((p, i) => (
          <span
            key={i}
            className="sb-dot"
            style={
              {
                "--sb-angle": `${p.angle}deg`,
                "--sb-distance": `${p.distance}px`,
                "--sb-color": p.color,
                "--sb-delay": `${p.delay}ms`,
              } as CSSProperties
            }
          />
        ))}
      </span>
    </span>
  );
}
