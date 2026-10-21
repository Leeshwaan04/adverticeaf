import type { Metadata } from "next";
import PayTestClient from "./PayTestClient";

// A utility page for checking the payment setup. Never indexed.
export const metadata: Metadata = { title: "Payment test", robots: { index: false, follow: false } };

export default function PayTestPage() {
  return <PayTestClient />;
}
