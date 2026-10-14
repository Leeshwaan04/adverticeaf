import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AdverticeAF | Ads That Go Viral AF. Cold Hard ROI.",
  description: "The modern growth laboratory and creative agency turning boring brands into cultural phenomenons with high-converting short-form, 3D CGI, and AI-optimized ad hooks.",
  keywords: ["advertising", "growth agency", "viral ads", "UGC", "creative strategy", "TikTok ads", "Meta ads", "high ROAS"],
  authors: [{ name: "AdverticeAF Team" }],
  openGraph: {
    title: "AdverticeAF | Ads That Go Viral AF",
    description: "Cold hard ROI. Stop running ads that feel like homework.",
    url: "https://adverticeaf.com",
    siteName: "AdverticeAF",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "AdverticeAF | Ads That Go Viral AF",
    description: "Cold hard ROI. Stop running ads that feel like homework.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark scroll-smooth">
      <body className="min-h-screen bg-[#030712] text-slate-100 antialiased selection:bg-cyan-500/30 selection:text-cyan-200">
        {children}
      </body>
    </html>
  );
}

