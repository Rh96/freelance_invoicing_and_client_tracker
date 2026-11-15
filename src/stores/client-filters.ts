import { create } from "zustand";

/**
 * UI state for the client list (ADR-004: Zustand holds UI state only, never server data).
 * Lives outside the component, so the search survives navigating away and back.
 */
type ClientFiltersState = {
  search: string;
  setSearch: (search: string) => void;
  clearSearch: () => void;
};

export const useClientFilters = create<ClientFiltersState>()((set) => ({
  search: "",
  setSearch: (search) => set({ search }),
  clearSearch: () => set({ search: "" }),
}));
