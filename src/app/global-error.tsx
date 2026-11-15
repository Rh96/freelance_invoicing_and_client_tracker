"use client"; // Error boundaries must be Client Components

import "./globals.css";

/** Replaces the root layout when it fails, so it renders its own html/body and no providers. */
export default function GlobalError({
  error,
  retry,
}: {
  error: unknown;
  retry: () => void;
}) {
  console.error(error);
  return (
    <html lang="en">
      <body className="mx-auto max-w-xl space-y-4 p-6">
        <h1 className="text-2xl font-semibold">Something went wrong</h1>
        <p>The app couldn&apos;t load. Please try again.</p>
        <button
          type="button"
          onClick={() => retry()}
          className="rounded-md border px-4 py-2 font-medium"
        >
          Try again
        </button>
      </body>
    </html>
  );
}
