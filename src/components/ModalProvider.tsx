"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import ContactModal, { type ContactPrefill } from "@/components/ContactModal";
import ListingModal from "@/components/ListingModal";

interface ModalApi {
  openContact: (prefill?: ContactPrefill) => void;
  openListing: () => void;
}

const ModalContext = createContext<ModalApi | null>(null);

export function useModals(): ModalApi {
  const ctx = useContext(ModalContext);
  if (!ctx) throw new Error("useModals must be used inside <ModalProvider>");
  return ctx;
}

export default function ModalProvider({ children }: { children: ReactNode }) {
  const [contactOpen, setContactOpen] = useState(false);
  const [prefill, setPrefill] = useState<ContactPrefill>({});
  const [listingOpen, setListingOpen] = useState(false);

  const openContact = useCallback((p?: ContactPrefill) => {
    setPrefill(p ?? {});
    setContactOpen(true);
  }, []);
  const openListing = useCallback(() => setListingOpen(true), []);

  const api = useMemo(() => ({ openContact, openListing }), [openContact, openListing]);

  return (
    <ModalContext.Provider value={api}>
      {children}
      <ContactModal open={contactOpen} onClose={() => setContactOpen(false)} prefill={prefill} />
      <ListingModal open={listingOpen} onClose={() => setListingOpen(false)} />
    </ModalContext.Provider>
  );
}
