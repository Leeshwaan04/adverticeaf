"use client";

import { useState } from "react";
import { hueFor } from "@/lib/board/format";

interface Props {
  name: string;
  domain?: string;
  size?: number;
  className?: string;
}

export default function Avatar({ name, domain, size = 44, className = "" }: Props) {
  const [imgFailed, setImgFailed] = useState(false);
  const hue = hueFor(name);

  // If a domain is provided, try loading its real favicon
  const faviconUrl = domain && !imgFailed
    ? `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=128`
    : null;

  return (
    <span
      className={`relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/10 shadow-sm transition-transform ${className}`}
      style={{
        width: size,
        height: size,
        background: `linear-gradient(135deg, hsl(${hue} 60% 25%), hsl(${(hue + 45) % 360} 70% 15%))`,
      }}
    >
      {faviconUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={faviconUrl}
          alt={`${name} logo`}
          width={size}
          height={size}
          loading="lazy"
          onError={() => setImgFailed(true)}
          className="h-full w-full object-cover p-1.5 transition-opacity duration-200"
        />
      ) : (
        <span
          aria-hidden="true"
          className="font-display font-extrabold text-white"
          style={{ fontSize: size * 0.44 }}
        >
          {name.trim().charAt(0).toUpperCase() || "?"}
        </span>
      )}
    </span>
  );
}
