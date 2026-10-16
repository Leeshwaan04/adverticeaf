"use client";

import Button from "@/components/ui/Button";
import { useModals } from "@/components/ModalProvider";
import type { ContactPrefill } from "@/components/ContactModal";
import type { ComponentProps } from "react";

type Props = Omit<ComponentProps<typeof Button>, "onClick" | "href"> & { prefill?: ContactPrefill };

/** Opens the contact modal. Lets server components place a modal trigger. */
export default function ContactButton({ prefill, children, ...rest }: Props) {
  const { openContact } = useModals();
  return (
    <Button {...(rest as object)} onClick={() => openContact(prefill)}>
      {children}
    </Button>
  );
}

export function ListingButton({ children, ...rest }: Omit<ComponentProps<typeof Button>, "onClick" | "href">) {
  const { openListing } = useModals();
  return (
    <Button {...(rest as object)} onClick={() => openListing()}>
      {children}
    </Button>
  );
}
