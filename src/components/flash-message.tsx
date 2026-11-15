"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useFlash } from "@/stores/flash";

/**
 * Shows a one-time message left by the previous screen (e.g. "Maya Chen added.").
 *
 * Next 16 (cacheComponents) keeps recent pages mounted but hidden with React <Activity>,
 * and React pauses effects while a page is hidden. So this component can't rely on
 * mounting fresh: it reacts whenever a message is waiting while its page is visible.
 */
export function FlashMessage() {
  const pending = useFlash((state) => state.message);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (pending === null) return;
    // Taken one frame later: the empty live region is on screen first, so screen readers
    // announce the text; and clearing here (not in the effect body) survives Strict Mode's
    // effect re-run.
    const frame = requestAnimationFrame(() => {
      useFlash.getState().clear();
      setMessage(pending);
    });
    return () => cancelAnimationFrame(frame);
  }, [pending]);

  // When the page is hidden (navigated away), drop the old message so it doesn't
  // reappear when the page is shown again later.
  useEffect(() => () => setMessage(null), []);

  return (
    <div aria-live="polite">
      {message && (
        <div className="flex items-center justify-between gap-2 rounded-md border bg-muted/50 px-3 py-2 text-sm">
          <p>{message}</p>
          <Button variant="ghost" size="sm" onClick={() => setMessage(null)}>
            Dismiss
          </Button>
        </div>
      )}
    </div>
  );
}
