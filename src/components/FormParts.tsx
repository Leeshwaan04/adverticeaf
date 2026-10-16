import Link from "next/link";
import { CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import Button from "@/components/ui/Button";
import { SITE } from "@/lib/site";

export function SubmitButton({ pending, children }: { pending: boolean; children: React.ReactNode }) {
  return (
    <Button type="submit" size="lg" disabled={pending} className="w-full" aria-busy={pending}>
      {pending ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          <span>Sending...</span>
        </>
      ) : (
        children
      )}
    </Button>
  );
}

export function FormError({ message }: { message: string }) {
  return (
    <div role="alert" className="flex items-start gap-2.5 rounded-xl border border-bad/40 bg-bad/10 p-3.5 text-sm text-fg">
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-bad" aria-hidden="true" />
      <p>{message}</p>
    </div>
  );
}

export function PrivacyNote() {
  return (
    <p className="text-xs leading-relaxed text-muted">
      We use these details only to reply to you. See our{" "}
      <Link href="/privacy" className="text-accent underline underline-offset-2 hover:text-accent-hover">
        privacy policy
      </Link>
      .
    </p>
  );
}

/** Honeypot: hidden from people and assistive tech, tempting to bots. */
export function Honeypot({ name }: { name: string }) {
  return (
    <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
      <label>
        Leave this field empty
        <input type="text" name={name} tabIndex={-1} autoComplete="off" />
      </label>
    </div>
  );
}

export function Done({
  mode,
  title,
  onClose,
}: {
  mode: "sent" | "mailto";
  title: string;
  onClose: () => void;
}) {
  return (
    <div className="py-4 text-center" role="status">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-ok/15 text-ok">
        <CheckCircle2 className="h-7 w-7" aria-hidden="true" />
      </div>
      <h3 className="text-xl font-bold text-fg">{title}</h3>
      {mode === "sent" ? (
        <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted">
          We have received your message and will reply by email.
        </p>
      ) : (
        <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted">
          Your email app should have opened with your message ready to send. It is not sent until you press send there.
          If nothing opened, email us at{" "}
          <a className="text-accent underline underline-offset-2" href={`mailto:${SITE.contactEmail}`}>
            {SITE.contactEmail}
          </a>
          .
        </p>
      )}
      <Button variant="secondary" className="mt-6" onClick={onClose}>
        Close
      </Button>
    </div>
  );
}
