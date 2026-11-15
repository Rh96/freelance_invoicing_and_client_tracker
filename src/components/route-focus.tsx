"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

/**
 * After a client-side navigation, moves keyboard focus to the start of the page content
 * (<main>, the skip link's target) when focus was lost.
 *
 * Next 16 keeps the previous page mounted but hidden (React <Activity>), so the link or
 * submit button that was just used disappears and focus falls to <body>; the next Tab then
 * continues from wherever the browser decides (found in T18: the footer). Focus that is
 * still on something visible, like the main nav, is left alone. Next's route announcer
 * already reads out the new page, so focusing <main> rather than the <h1> avoids a double
 * announcement.
 */
export function RouteFocus() {
  const pathname = usePathname();
  const previous = useRef(pathname);

  useEffect(() => {
    if (previous.current === pathname) return;
    previous.current = pathname;
    if (focusWasLost(document.activeElement)) {
      document.getElementById("main")?.focus();
    }
  }, [pathname]);

  return null;
}

function focusWasLost(active: Element | null): boolean {
  if (active === null || active === document.body) return true;
  // Not in jsdom; there, only the <body> case is detectable.
  return typeof active.checkVisibility === "function"
    ? !active.checkVisibility()
    : false;
}
