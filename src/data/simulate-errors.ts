/**
 * Demo switch for error states (ADR-002). Open the app with:
 * - `?simulateErrors=writes`: every save fails (shows optimistic rollback and save errors)
 * - `?simulateErrors=all`: every call fails (shows load error states)
 * - `?simulateErrors=off`: back to normal
 * The choice is remembered for the browser tab (sessionStorage), because in-app links drop the query string.
 */
export type SimulateErrorsMode = "off" | "writes" | "all";

const PARAM = "simulateErrors";
const SESSION_KEY = "invoice-tracker:simulateErrors";
const READ_OPERATIONS: ReadonlySet<string> = new Set([
  "listClients",
  "getClient",
  "listInvoices",
  "getInvoice",
]);

export function parseSimulateErrors(
  value: string | null,
): SimulateErrorsMode | null {
  return value === "off" || value === "writes" || value === "all"
    ? value
    : null;
}

export function shouldFailFor(
  mode: SimulateErrorsMode,
  operation: string,
): boolean {
  if (mode === "all") return true;
  if (mode === "writes") return !READ_OPERATIONS.has(operation);
  return false;
}

/** Reads the mode from the URL (and remembers it), or from the tab's earlier choice. */
export function resolveSimulateErrors(
  search: string,
  session: Pick<Storage, "getItem" | "setItem"> | undefined,
): SimulateErrorsMode {
  const fromUrl = parseSimulateErrors(new URLSearchParams(search).get(PARAM));
  try {
    if (fromUrl) {
      session?.setItem(SESSION_KEY, fromUrl);
      return fromUrl;
    }
    return parseSimulateErrors(session?.getItem(SESSION_KEY) ?? null) ?? "off";
  } catch {
    // sessionStorage can throw when site data is blocked; the URL value still applies.
    return fromUrl ?? "off";
  }
}

/** A `shouldFail` for the repository. Resolves the mode on first call, in the browser only. */
export function createShouldFail(): (operation: string) => boolean {
  let mode: SimulateErrorsMode | undefined;
  return (operation) => {
    if (typeof window === "undefined") return false;
    mode ??= resolveSimulateErrors(
      window.location.search,
      safeSessionStorage(),
    );
    return shouldFailFor(mode, operation);
  };
}

function safeSessionStorage(): Storage | undefined {
  try {
    return window.sessionStorage;
  } catch {
    return undefined;
  }
}
