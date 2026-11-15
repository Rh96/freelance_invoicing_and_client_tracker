"use client"; // Error boundaries must be Client Components

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

// Next 16 passes `retry` (not `reset`): it re-fetches and re-renders the segment.
export default function ErrorPage({
  error,
  retry,
}: {
  error: unknown;
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error); // TBD: error reporting service (ARCHITECTURE: monitoring)
  }, [error]);

  return (
    <section aria-labelledby="error-title" className="space-y-4">
      <h1 id="error-title" className="text-2xl font-semibold">
        Something went wrong
      </h1>
      <p className="text-muted-foreground">
        This page couldn&apos;t be displayed. Try again, or use &ldquo;Reset
        demo data&rdquo; below if the problem continues.
      </p>
      <Button onClick={() => retry()}>Try again</Button>
    </section>
  );
}
