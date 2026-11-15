import type { DisplayStatus } from "@/domain/invoice-status";
import { cn } from "@/lib/utils";

const STYLES: Record<DisplayStatus, { label: string; className: string }> = {
  draft: {
    label: "Draft",
    // Same shade pairing as the others; muted-on-muted was 4.34:1, under AA (found in T18).
    className:
      "bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-200",
  },
  sent: {
    label: "Sent",
    className: "bg-blue-100 text-blue-900 dark:bg-blue-950 dark:text-blue-200",
  },
  overdue: {
    label: "Overdue",
    className: "bg-red-100 text-red-900 dark:bg-red-950 dark:text-red-200",
  },
  paid: {
    label: "Paid",
    className:
      "bg-green-100 text-green-900 dark:bg-green-950 dark:text-green-200",
  },
};

/** Invoice status as text (never color alone), so it reads the same for everyone. */
export function StatusBadge({ status }: { status: DisplayStatus }) {
  const { label, className } = STYLES[status];
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
        className,
      )}
    >
      {label}
    </span>
  );
}
