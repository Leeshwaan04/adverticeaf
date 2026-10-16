import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost";
type Size = "sm" | "md" | "lg";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-accent text-accent-ink hover:bg-accent-hover font-bold",
  secondary: "border border-line-strong text-fg hover:border-accent hover:text-accent-hover font-semibold",
  ghost: "text-muted hover:text-fg font-medium",
};

const SIZES: Record<Size, string> = {
  sm: "px-3.5 py-2 text-sm min-h-9",
  md: "px-5 py-2.5 text-sm min-h-11",
  lg: "px-7 py-3.5 text-base min-h-12",
};

const BASE =
  "inline-flex items-center justify-center gap-2 rounded-xl transition-colors duration-150 disabled:opacity-60 disabled:cursor-not-allowed";

interface Shared {
  variant?: Variant;
  size?: Size;
  className?: string;
  children: ReactNode;
}

type ButtonProps = Shared & Omit<ComponentProps<"button">, keyof Shared> & { href?: undefined };
type LinkProps = Shared & Omit<ComponentProps<typeof Link>, keyof Shared | "href"> & { href: string };

export default function Button(props: ButtonProps | LinkProps) {
  const { variant = "primary", size = "md", className = "", children, ...rest } = props;
  const classes = `${BASE} ${VARIANTS[variant]} ${SIZES[size]} ${className}`;

  if ("href" in rest && rest.href !== undefined) {
    const { href, ...linkRest } = rest as Omit<LinkProps, keyof Shared>;
    const external = /^https?:\/\//.test(href);
    if (external) {
      return (
        <a href={href} className={classes} target="_blank" rel="noopener noreferrer">
          {children}
        </a>
      );
    }
    return (
      <Link href={href} className={classes} {...linkRest}>
        {children}
      </Link>
    );
  }

  const buttonRest = rest as Omit<ButtonProps, keyof Shared>;
  return (
    <button type="button" className={classes} {...buttonRest}>
      {children}
    </button>
  );
}
