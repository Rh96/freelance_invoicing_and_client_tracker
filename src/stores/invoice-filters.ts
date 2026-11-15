import { create } from "zustand";
import type { StatusFilter } from "@/features/invoices/filter-invoices";

/** UI state for the invoice list (ADR-004). Survives navigating away and back. */
type InvoiceFiltersState = {
  status: StatusFilter;
  setStatus: (status: StatusFilter) => void;
};

export const useInvoiceFilters = create<InvoiceFiltersState>()((set) => ({
  status: "all",
  setStatus: (status) => set({ status }),
}));
