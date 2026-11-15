import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import { AppNav, AppNavFallback } from "./app-nav";
import { ResetDemoDataButton } from "./reset-demo-data-button";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <>
      <a
        href="#main"
        className="sr-only z-50 rounded-md bg-background px-4 py-2 font-medium focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
      >
        Skip to main content
      </a>
      <header className="border-b">
        <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-2 px-4 py-3">
          <Link href="/" className="rounded-md text-base font-semibold">
            Invoice Tracker
          </Link>
          {/* usePathname can suspend under cacheComponents on dynamic routes. */}
          <Suspense fallback={<AppNavFallback />}>
            <AppNav />
          </Suspense>
        </div>
      </header>
      <main
        id="main"
        tabIndex={-1}
        className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 outline-none"
      >
        {children}
      </main>
      <footer className="border-t">
        <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm text-muted-foreground">
          <p>Demo: data is stored only in this browser.</p>
          <ResetDemoDataButton />
        </div>
      </footer>
    </>
  );
}
