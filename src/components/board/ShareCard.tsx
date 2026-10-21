"use client";

import { useEffect, useId, useState, useSyncExternalStore } from "react";
import Button from "@/components/ui/Button";
import {
  CARD_H,
  CARD_W,
  buildXIntentUrl,
  cleanText,
  copyText,
  layoutShareCard,
  safeHttpUrl,
  slugify,
  truncate,
} from "@/lib/board/share";

export interface ShareCardProps {
  /** Small line above the big text, e.g. "AdverticeAF Board · This week". */
  kicker: string;
  /** Big text, e.g. "#1" or "King of the Throne" or "Tile 12,4". */
  big: string;
  /** Name of the listing. */
  title: string;
  subtitle?: string;
  /** Page people land on when they click the share link. */
  shareUrl: string;
  /** Prefilled post text. */
  shareText: string;
}

/* Brand values copied from globals.css, because canvas cannot read CSS variables. */
const C = {
  ink: "#030712",
  raised: "#101a2f",
  lineStrong: "#334155",
  fg: "#f1f5f9",
  muted: "#a5b4c8",
  accent: "#22d3ee",
} as const;

/** System fonts only: no network, works offline. */
const FONT = 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

function drawCard(ctx: CanvasRenderingContext2D, props: ShareCardProps) {
  const font = (size: number, weight: number) => `${weight} ${size}px ${FONT}`;
  const layout = layoutShareCard(
    { kicker: props.kicker.toUpperCase(), big: props.big, title: props.title, subtitle: props.subtitle },
    (text, size, weight) => {
      ctx.font = font(size, weight);
      return ctx.measureText(text).width;
    },
  );

  // Background.
  const bg = ctx.createLinearGradient(0, 0, CARD_W, CARD_H);
  bg.addColorStop(0, C.ink);
  bg.addColorStop(1, C.raised);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, CARD_W, CARD_H);

  const glow = ctx.createRadialGradient(CARD_W - 120, 80, 0, CARD_W - 120, 80, 520);
  glow.addColorStop(0, "rgba(34, 211, 238, 0.22)");
  glow.addColorStop(1, "rgba(34, 211, 238, 0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, CARD_W, CARD_H);

  // Frame and accent bar.
  ctx.strokeStyle = C.lineStrong;
  ctx.lineWidth = 2;
  ctx.strokeRect(24, 24, CARD_W - 48, CARD_H - 48);
  ctx.fillStyle = C.accent;
  ctx.fillRect(24, 24, 8, CARD_H - 48);

  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  const x = 80;
  for (const block of layout.blocks) {
    ctx.font = font(block.size, block.weight);
    ctx.fillStyle = block.role === "big" ? C.accent : block.role === "subtitle" ? C.muted : C.fg;
    for (const line of block.lines) {
      ctx.fillText(line.text, x, line.y);
    }
  }

  // Footer: wordmark on the left, disclosure on the right.
  const footerY = 574;
  ctx.fillStyle = C.accent;
  ctx.beginPath();
  ctx.arc(x + 9, footerY, 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = C.fg;
  ctx.font = font(34, 800);
  ctx.fillText("adverticeaf", x + 30, footerY);

  const safe = safeHttpUrl(props.shareUrl);
  const host = safe ? new URL(safe).host : "";
  const right = truncate(host ? `Paid placement · ${host}` : "Paid placement", 60);
  ctx.textAlign = "right";
  ctx.fillStyle = C.muted;
  ctx.font = font(24, 500);
  ctx.fillText(right, CARD_W - 80, footerY);
}

function renderCard(props: ShareCardProps): Promise<Blob> {
  return new Promise((resolve, reject) => {
    try {
      const canvas = document.createElement("canvas");
      canvas.width = CARD_W;
      canvas.height = CARD_H;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Canvas is not available."));
        return;
      }
      drawCard(ctx, props);
      canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Could not encode the image."))), "image/png");
    } catch (e) {
      reject(e instanceof Error ? e : new Error("Could not draw the image."));
    }
  });
}

/* Browser capability detection that is safe for SSR: server snapshot is "none". */
const noopSubscribe = () => () => {};
function capabilitySnapshot(): string {
  if (typeof navigator === "undefined") return "none";
  const caps: string[] = [];
  if (typeof navigator.share === "function") caps.push("share");
  if (typeof ClipboardItem !== "undefined" && typeof navigator.clipboard?.write === "function") caps.push("copyImage");
  return caps.join(",") || "none";
}

interface Rendered {
  key: string;
  url: string | null;
  blob: Blob | null;
}

type Tone = "ok" | "bad" | "info";
interface Message {
  tone: Tone;
  text: string;
}

const TONE_CLASS: Record<Tone, string> = { ok: "text-ok", bad: "text-bad", info: "text-fg" };
const TONE_PREFIX: Record<Tone, string> = { ok: "Done: ", bad: "Problem: ", info: "" };

export default function ShareCard(props: ShareCardProps) {
  const { kicker, big, title, subtitle, shareUrl, shareText } = props;
  const linkId = useId();
  const caps = useSyncExternalStore(noopSubscribe, capabilitySnapshot, () => "none");
  const canShare = caps.split(",").includes("share");
  const canCopyImage = caps.split(",").includes("copyImage");

  const [attempt, setAttempt] = useState(0);
  const [rendered, setRendered] = useState<Rendered | null>(null);
  const [message, setMessage] = useState<Message | null>(null);

  const key = JSON.stringify([kicker, big, title, subtitle ?? "", shareUrl, attempt]);

  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;
    renderCard({ kicker, big, title, subtitle, shareUrl, shareText }).then(
      (blob) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setRendered({ key, url: objectUrl, blob });
      },
      () => {
        if (!cancelled) setRendered({ key, url: null, blob: null });
      },
    );
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [key, kicker, big, title, subtitle, shareUrl, shareText]);

  const current = rendered?.key === key ? rendered : null;
  const loading = current === null;
  const blob = current?.blob ?? null;
  const imageUrl = current?.url ?? null;
  const failed = current !== null && blob === null;

  const safeShareUrl = safeHttpUrl(shareUrl);
  const xUrl = buildXIntentUrl({ text: shareText, url: shareUrl });
  const alt = `Share card. ${cleanText(kicker)}. ${cleanText(big)}. ${cleanText(title)}.${subtitle ? ` ${cleanText(subtitle)}.` : ""}`;

  const say = (tone: Tone, text: string) => setMessage({ tone, text });

  const download = () => {
    if (!blob || !imageUrl) return;
    try {
      const a = document.createElement("a");
      a.href = imageUrl;
      a.download = `adverticeaf-${slugify(title)}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      say("ok", "Download started. Check your downloads folder.");
    } catch {
      say("bad", "Your browser blocked the download. Press and hold the image above to save it.");
    }
  };

  const copyImage = async () => {
    if (!blob) return;
    if (!canCopyImage) {
      say("info", "This browser cannot copy images. Use Download PNG instead.");
      return;
    }
    try {
      await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
      say("ok", "Image copied. Paste it into your post.");
    } catch {
      say("bad", "Copying the image was blocked. Use Download PNG instead.");
    }
  };

  const copyLink = async () => {
    const result = await copyText(safeShareUrl ?? shareUrl);
    if (result === "ok") say("ok", "Link copied.");
    else say("bad", "Copy was blocked. Select the link in the box below and copy it by hand.");
  };

  const nativeShare = async () => {
    try {
      const data: ShareData = { title: cleanText(title), text: shareText };
      if (safeShareUrl) data.url = safeShareUrl;
      if (blob) {
        const file = new File([blob], `adverticeaf-${slugify(title)}.png`, { type: "image/png" });
        if (typeof navigator.canShare === "function" && navigator.canShare({ files: [file] })) data.files = [file];
      }
      await navigator.share(data);
      say("ok", "Shared.");
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") say("info", "Share cancelled.");
      else say("bad", "Sharing is not available right now. Try Copy link or Share on X.");
    }
  };

  return (
    <section aria-label="Share your result" className="rounded-2xl border border-line bg-surface p-4 sm:p-5">
      <div className="relative aspect-[1200/630] w-full overflow-hidden rounded-xl border border-line bg-ink">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- blob: URL generated locally, nothing to optimise
          <img src={imageUrl} alt={alt} width={CARD_W} height={CARD_H} className="h-full w-full object-contain" />
        ) : failed ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 p-4 text-center">
            <p className="text-sm text-fg">We could not draw the image here. You can still share the link.</p>
            <Button size="sm" variant="secondary" onClick={() => setAttempt((n) => n + 1)}>
              Try again
            </Button>
          </div>
        ) : (
          <div className="h-full w-full motion-safe:animate-pulse bg-raised" role="img" aria-label="Preparing your share image" />
        )}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
        <Button onClick={download} disabled={loading || failed} className="col-span-2 sm:col-span-1">
          Download PNG
        </Button>
        <Button variant="secondary" onClick={copyImage} disabled={loading || failed}>
          Copy image
        </Button>
        <Button variant="secondary" onClick={copyLink}>
          Copy link
        </Button>
        <a
          href={xUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => say("info", "Opening X in a new tab.")}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-line-strong px-5 py-2.5 text-sm font-semibold text-fg transition-colors duration-150 hover:border-accent hover:text-accent-hover"
        >
          Share on X
        </a>
        {canShare && (
          <Button variant="secondary" onClick={nativeShare}>
            Share...
          </Button>
        )}
      </div>

      <div role="status" aria-live="polite" className="mt-3 min-h-5 text-sm">
        {message && (
          <p className={`${TONE_CLASS[message.tone]} font-medium`}>
            {TONE_PREFIX[message.tone]}
            {message.text}
          </p>
        )}
      </div>

      <div className="mt-2">
        <label htmlFor={linkId} className="mb-1.5 block text-xs font-medium text-muted">
          Your share link
        </label>
        <input
          id={linkId}
          readOnly
          value={shareUrl}
          onFocus={(e) => e.currentTarget.select()}
          className="min-h-11 w-full rounded-xl border border-line-strong bg-ink px-3 py-2 text-sm text-fg focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/40"
        />
      </div>
    </section>
  );
}
