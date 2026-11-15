"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useFlash } from "@/stores/flash";

/** Shows a message left by the previous page (e.g. "Maya Chen added.") once. */
export function FlashMessage() {
  const pending = useFlash((state) => state.message);
  // Captured on first render; state survives Strict Mode's re-run of effects.
  const [message] = useState(pending);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (message === null) return;
    useFlash.getState().clear(); // so it doesn't show again on a later visit
    // Insert the text after the empty live region is on screen, so screen readers announce it.
    const frame = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(frame);
  }, [message]);

  return (
    <div aria-live="polite">
      {visible && message && (
        <div className="flex items-center justify-between gap-2 rounded-md border bg-muted/50 px-3 py-2 text-sm">
          <p>{message}</p>
          <Button variant="ghost" size="sm" onClick={() => setVisible(false)}>
            Dismiss
          </Button>
        </div>
      )}
    </div>
  );
}
