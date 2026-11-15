import { create } from "zustand";

/**
 * UI state for the client list (ADR-004: Zustand holds UI state only, never server data).
 * Lives outside the component, so the filters survive navigating away and back.
 */
type ClientFiltersState = {
  search: string;
  showArchived: boolean;
  setSearch: (search: string) => void;
  clearSearch: () => void;
  setShowArchived: (showArchived: boolean) => void;
};

export const useClientFilters = create<ClientFiltersState>()((set) => ({
  search: "",
  showArchived: false,
  setSearch: (search) => set({ search }),
  clearSearch: () => set({ search: "" }),
  setShowArchived: (showArchived) => set({ showArchived }),
}));
