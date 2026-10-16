import type { Metadata } from "next";
import Link from "next/link";
import PageShell, { Prose } from "@/components/PageShell";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Privacy policy",
  description: "What AdverticeAF collects, why, where it goes and how to ask us to change or delete it.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  const operator = SITE.legalEntity || SITE.name;
  return (
    <PageShell eyebrow="Legal" title="Privacy policy" intro="A plain-language summary of what this site does with your information." reviewed>
      <Prose>
        <h2>The short version</h2>
        <ul>
          <li>The Hook Checker and Budget Planner run in your browser. What you type into them is not sent to us.</li>
          <li>We collect personal information only when you send us a form.</li>
          <li>This site does not currently use advertising cookies or third-party analytics.</li>
        </ul>

        <h2>Who is responsible</h2>
        <p>
          This site is operated by {operator}.{" "}
          {SITE.contactEmail ? (
            <>
              You can reach us at <a href={`mailto:${SITE.contactEmail}`}>{SITE.contactEmail}</a>.
            </>
          ) : (
            <>
              You can reach us through the <Link href="/contact">contact page</Link>.
            </>
          )}
        </p>

        <h2>What we collect</h2>
        <p>When you use the contact form or the listing suggestion form, we receive what you type into it:</p>
        <ul>
          <li>Contact form: your name, email, optional website, budget range, the topic you pick and any message you add.</li>
          <li>Listing form: the agency name, website, your work email, location, category, source links and any details you add.</li>
          <li>The address of the page you sent the form from.</li>
        </ul>
        <p>We do not ask for payment details or sensitive personal information, and we ask that you do not include any.</p>

        <h2>Why we use it</h2>
        <p>
          To reply to you, to review listing requests, and to keep a record of the conversation. We do not sell your
          information and we do not use it to send marketing you did not ask for.
        </p>

        <h2>Who it goes to</h2>
        <p>
          Form submissions are delivered to our inbox, either through a form-handling service or by opening an email from
          your own email app. Those providers process the message on our behalf. We may also share information where the
          law requires it.
        </p>

        <h2>Cookies and tracking</h2>
        <p>
          The site does not set cookies of its own and does not use advertising or analytics trackers. Fonts are served
          from this site rather than from a third-party font service. If we add analytics later, we will update this page
          first and ask for consent where the law requires it.
        </p>

        <h2>Links to other sites</h2>
        <p>
          Directory profiles link to agency websites and news sources. Those sites have their own privacy practices, which we
          do not control.
        </p>

        <h2>How long we keep it</h2>
        <p>We keep messages for as long as needed to respond and to keep a reasonable record, then delete them.</p>

        <h2>Your choices</h2>
        <p>
          Where data-protection law applies to you, such as the GDPR or India&apos;s Digital Personal Data Protection Act,
          you can ask us to show you the information we hold about you, correct it or delete it. Contact us and we will
          respond.
        </p>

        <h2>Children</h2>
        <p>This site is for businesses and is not directed at children.</p>

        <h2>Changes</h2>
        <p>If we change this policy, we will update the review date above.</p>
      </Prose>
    </PageShell>
  );
}
