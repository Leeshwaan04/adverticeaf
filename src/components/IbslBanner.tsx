export const IBSL_LINK = "https://indiabullssecurities.onelink.me/Kaqz/adverticeaf";

export default function IbslBanner({ className = "" }: { className?: string }) {
  return (
    <aside
      aria-label="Sponsored Announcement"
      className={`w-full overflow-hidden rounded-2xl border border-line bg-surface/40 p-2 sm:p-2.5 shadow-lg backdrop-blur-sm transition-all hover:border-line-strong ${className}`}
    >
      <div className="mb-1.5 flex items-center justify-between px-1.5 text-[10px] font-semibold tracking-wider text-muted uppercase">
        <span className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          Featured Partner
        </span>
        <span className="text-[10px] text-muted/80">Indiabulls Securities</span>
      </div>
      <a
        href={IBSL_LINK}
        target="_blank"
        rel="sponsored noopener noreferrer"
        aria-label="Indiabulls Securities — Open Your Free Account with ₹0 Account Opening Charges and ₹11 Per Executed Order"
        className="group relative block w-full overflow-hidden rounded-xl focus:outline-none focus:ring-2 focus:ring-accent"
      >
        <picture className="block w-full">
          <source media="(min-width: 1024px)" srcSet="/banners/ibsl/ibsl-banner-wide.jpg" />
          <source media="(min-width: 640px)" srcSet="/banners/ibsl/ibsl-banner-mid.jpg" />
          <img
            src="/banners/ibsl/ibsl-banner-mobile.jpg"
            alt="Indiabulls Securities — ₹0 Account Opening Charges, ₹11 Per Executed Order, 20 Years of Trust. Open Your Free Account Now"
            width={1024}
            height={136}
            className="h-auto w-full rounded-xl object-cover transition-opacity duration-200 group-hover:opacity-95"
            loading="eager"
          />
        </picture>
      </a>
    </aside>
  );
}

