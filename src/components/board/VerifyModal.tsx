"use client";

import { useEffect, useState } from "react";
import { Check, CheckCircle2, Copy, Loader2, ShieldCheck } from "lucide-react";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import { api } from "@/lib/board/api";
import type { VerificationInfo } from "@/lib/board/types";

interface VerifyModalProps {
  open: boolean;
  onClose: () => void;
  domain: string;
  onVerified?: () => void;
}

export default function VerifyModal({ open, onClose, domain, onVerified }: VerifyModalProps) {
  const [info, setInfo] = useState<VerificationInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [verified, setVerified] = useState(false);
  const [activeMethod, setActiveMethod] = useState<"dns" | "meta">("dns");
  const [copiedValue, setCopiedValue] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    if (!open || !domain) return;
    let unmounted = false;

    api
      .getVerification(domain)
      .then((res) => {
        if (!unmounted) {
          setInfo(res);
          setVerified(res.verified);
          setLoading(false);

          // Zero-click auto check: If not verified yet, test DNS immediately in the background
          if (!res.verified) {
            api.checkVerification(domain).then((checkRes) => {
              if (checkRes.verified && !unmounted) {
                setVerified(true);
                setStatusMessage(checkRes.message || "Domain ownership verified! Your verified badge is live.");
                onVerified?.();
              }
            }).catch(() => {});
          }
        }
      })
      .catch((err) => {
        if (!unmounted) {
          console.error("Failed to fetch verification info:", err);
          setLoading(false);
        }
      });

    return () => {
      unmounted = true;
    };
  }, [open, domain, onVerified]);

  const handleCopy = (text: string, id: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedValue(id);
      setTimeout(() => setCopiedValue(null), 2000);
    }
  };

  const handleCheck = async () => {
    if (checking || verified) return;
    setChecking(true);
    setStatusMessage(null);
    setIsError(false);

    try {
      const res = await api.checkVerification(domain);
      if (res.verified) {
        setVerified(true);
        setStatusMessage(res.message || "Domain ownership verified! Your verified badge is live.");
        setIsError(false);
        onVerified?.();
      } else {
        setStatusMessage(res.message || "Verification record not detected yet. DNS changes can take a minute to propagate.");
        setIsError(true);
      }
    } catch {
      setStatusMessage("Could not check verification. Please try again.");
      setIsError(true);
    } finally {
      setChecking(false);
    }
  };

  const dnsMethod = info?.methods.find((m) => m.type === "dns");
  const metaMethod = info?.methods.find((m) => m.type === "meta");

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Verify Domain Ownership"
      description={`Prove you control ${domain} to earn the verified trust badge on AdverticeAF.`}
      maxWidth="max-w-lg"
    >
      <div className="space-y-6">
        {loading ? (
          <div className="flex min-h-[220px] flex-col items-center justify-center gap-3">
            <Loader2 className="h-6 w-6 animate-spin text-accent" />
            <p className="text-xs text-muted">Generating secure verification token...</p>
          </div>
        ) : verified ? (
          <div className="rounded-2xl border border-ok/30 bg-ok/10 p-6 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-ok/20 text-ok">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <h3 className="mt-4 text-xl font-bold text-fg">Domain Verified</h3>
            <p className="mt-1 text-sm text-muted">
              {domain} is officially verified. The green trust badge is visible to all visitors.
            </p>
            <Button variant="primary" onClick={onClose} className="mt-6 w-full">
              Done
            </Button>
          </div>
        ) : (
          <div className="space-y-5">
            {/* Method Tabs */}
            <div className="flex rounded-xl bg-raised p-1 border border-line">
              <button
                type="button"
                onClick={() => setActiveMethod("dns")}
                className={`flex-1 rounded-lg py-2 text-xs font-semibold transition-all ${
                  activeMethod === "dns"
                    ? "bg-accent text-accent-ink shadow-sm"
                    : "text-muted hover:text-fg"
                }`}
              >
                DNS TXT Record (Recommended)
              </button>
              <button
                type="button"
                onClick={() => setActiveMethod("meta")}
                className={`flex-1 rounded-lg py-2 text-xs font-semibold transition-all ${
                  activeMethod === "meta"
                    ? "bg-accent text-accent-ink shadow-sm"
                    : "text-muted hover:text-fg"
                }`}
              >
                HTML Meta Tag
              </button>
            </div>

            {/* Instruction Panel */}
            {activeMethod === "dns" ? (
              <div className="space-y-3 rounded-xl border border-line bg-raised/40 p-4">
                <p className="text-xs text-muted">
                  Add this TXT record to your DNS provider (Cloudflare, Namecheap, GoDaddy, Vercel, etc.):
                </p>
                <div className="space-y-2">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-muted">Host / Name</span>
                    <div className="mt-1 flex items-center justify-between rounded-lg border border-line bg-surface px-3 py-2 text-xs font-mono text-fg">
                      <span className="truncate">_adverticeaf-verify</span>
                      <button
                        type="button"
                        onClick={() => handleCopy("_adverticeaf-verify", "host")}
                        className="text-accent hover:text-fg"
                      >
                        {copiedValue === "host" ? <Check className="h-3.5 w-3.5 text-ok" /> : <Copy className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-muted">TXT Value</span>
                    <div className="mt-1 flex items-center justify-between rounded-lg border border-line bg-surface px-3 py-2 text-xs font-mono text-fg">
                      <span className="truncate">{dnsMethod?.value || `adverticeaf-verify=${info?.token || ""}`}</span>
                      <button
                        type="button"
                        onClick={() => handleCopy(dnsMethod?.value || `adverticeaf-verify=${info?.token || ""}`, "val")}
                        className="text-accent hover:text-fg"
                      >
                        {copiedValue === "val" ? <Check className="h-3.5 w-3.5 text-ok" /> : <Copy className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3 rounded-xl border border-line bg-raised/40 p-4">
                <p className="text-xs text-muted">
                  Add this snippet inside the <code className="text-accent">&lt;head&gt;</code> of your website homepage:
                </p>
                <div className="relative rounded-lg border border-line bg-surface p-3">
                  <pre className="overflow-x-auto text-xs font-mono text-fg">
                    {metaMethod?.value || `<meta name="adverticeaf-verification" content="${info?.token || ""}" />`}
                  </pre>
                  <button
                    type="button"
                    onClick={() => handleCopy(metaMethod?.value || `<meta name="adverticeaf-verification" content="${info?.token || ""}" />`, "meta")}
                    className="absolute top-2 right-2 rounded-md bg-raised p-1.5 text-accent hover:text-fg"
                  >
                    {copiedValue === "meta" ? <Check className="h-3.5 w-3.5 text-ok" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>
            )}

            {/* Status Feedback */}
            {statusMessage && (
              <div
                className={`rounded-xl border p-3.5 text-xs ${
                  isError
                    ? "border-amber-500/30 bg-amber-500/10 text-amber-200"
                    : "border-ok/30 bg-ok/10 text-ok"
                }`}
              >
                {statusMessage}
              </div>
            )}

            {/* Verification Button */}
            <Button
              variant="primary"
              onClick={handleCheck}
              disabled={checking}
              className="w-full flex items-center justify-center gap-2 bg-accent hover:bg-accent-hover text-accent-ink font-bold border-none"
            >
              {checking ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Checking DNS &amp; Meta...
                </>
              ) : (
                <>
                  <ShieldCheck className="h-4 w-4" />
                  Check Verification
                </>
              )}
            </Button>
          </div>
        )}
      </div>
    </Modal>
  );
}

