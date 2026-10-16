import type { Metadata, Viewport } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ModalProvider from "@/components/ModalProvider";
import { SITE } from "@/lib/site";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const grotesk = Space_Grotesk({ subsets: ["latin"], variable: "--font-grotesk", display: "swap" });

const TITLE = "AdverticeAF | Creative lab and agency directory";

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: { default: TITLE, template: "%s | AdverticeAF" },
  description: SITE.description,
  alternates: { canonical: "/" },
  openGraph: {
    title: TITLE,
    description: SITE.description,
    url: SITE.url,
    siteName: SITE.name,
    type: "website",
    locale: "en_US",
  },
  twitter: { card: "summary", title: TITLE, description: SITE.description },
};

export const viewport: Viewport = {
  themeColor: "#030712",
  colorScheme: "dark",
};

const organization = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: SITE.name,
  url: SITE.url,
  description: SITE.description,
  ...(SITE.contactEmail ? { email: SITE.contactEmail } : {}),
  ...(SITE.legalEntity ? { legalName: SITE.legalEntity } : {}),
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${grotesk.variable}`}>
      <body className="min-h-screen bg-ink font-sans text-fg antialiased">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organization).replace(/</g, "\\u003c") }}
        />
        <a href="#main" className="skip-link">
          Skip to main content
        </a>
        <ModalProvider>
          <Navbar />
          <main id="main" className="pt-16">
            {children}
          </main>
          <Footer />
        </ModalProvider>
      </body>
    </html>
  );
}
