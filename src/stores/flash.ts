import { create } from "zustand";

/**
 * A one-time message carried across a navigation, e.g. "Maya Chen added." after saving.
 * `FlashMessage` reads it on mount and clears it, so it shows once and not on a later visit.
 */
type FlashState = {
  message: string | null;
  show: (message: string) => void;
  clear: () => void;
};

export const useFlash = create<FlashState>()((set) => ({
  message: null,
  show: (message) => set({ message }),
  clear: () => set({ message: null }),
}));
