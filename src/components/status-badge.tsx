import type { DisplayStatus } from "@/domain/invoice-status";
import { cn } from "@/lib/utils";

const STYLES: Record<DisplayStatus, { label: string; className: string }> = {
  draft: { label: "Draft", className: "bg-muted text-muted-foreground" },
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
