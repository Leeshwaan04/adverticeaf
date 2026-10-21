import type { Metadata } from "next";
import Link from "next/link";
import PageShell, { Prose } from "@/components/PageShell";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Terms of use",
  description: "The terms for using the AdverticeAF website, tools and agency directory.",
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  const operator = SITE.legalEntity || SITE.name;
  return (
    <PageShell eyebrow="Legal" title="Terms of use" intro="The ground rules for using this site." reviewed>
      <Prose>
        <h2>Using the site</h2>
        <p>
          By using this site you agree to these terms. The site is operated by {operator}. Please do not misuse it, attempt
          to disrupt it, or scrape it in a way that harms its operation.
        </p>

        <h2>Information is general, not advice</h2>
        <p>
          The directory, Hook Checker and Budget Planner are provided for general information. They are not business, legal,
          financial or advertising advice, and their outputs are not predictions of results. You are responsible for your own
          decisions.
        </p>

        <h2>Directory information</h2>
        <p>
          Profiles are compiled from public third-party sources, which can be wrong or out of date, and we cannot guarantee
          their accuracy. Listing an agency is not an endorsement, and absence is not a judgement. Always confirm details
          with an agency directly. See <Link href="/methodology">how the directory works</Link> and tell us about errors
          through the suggestion form.
        </p>

        <h2>Third-party names and links</h2>
        <p>
          Agency, brand and publication names belong to their owners and are used only to identify them. They do not imply
          any affiliation with us. We are not responsible for the content of external sites we link to.
        </p>

        <h2>Content you send us</h2>
        <p>
          When you send us information, you confirm you have the right to share it and that it is accurate to the best of your
          knowledge. For listing suggestions, you confirm that you are authorised to act for the agency or that your
          information comes from the public sources you provide.
        </p>

        <h2>Our services</h2>
        <p>
          Prices shown on the site are starting prices, not a quote. Any paid work is covered by a separate written agreement
          that sets out scope, timing and price. We do not promise specific advertising results.
        </p>

        <h2>Paid placements</h2>
        <p>
          Paid placements, such as a Spotlight on the Campaigns page, are advertising. They are clearly labelled, they reflect payment and not quality,
          and they are not an endorsement. Prices are shown in US dollars before you pay and are set by us, not by your browser. Placements run one at a
          time in the order they are paid for. We can decline or remove a placement that breaks the rules on the page or the law, and if we cannot
          deliver a placement you paid for, we refund it in full. Payments are processed by Razorpay.
        </p>

        <h2>No warranty and limits on liability</h2>
        <p>
          The site and tools are provided as they are, without warranties of any kind. To the extent the law allows, we are
          not liable for losses that arise from using the site or relying on its information.
        </p>

        <h2>Changes</h2>
        <p>
          We may update these terms. The review date above shows when they last changed, and continued use means you accept the
          current version.
        </p>

        <h2>Contact</h2>
        <p>
          Questions about these terms? Use the <Link href="/contact">contact page</Link>.
        </p>
      </Prose>
    </PageShell>
  );
}
