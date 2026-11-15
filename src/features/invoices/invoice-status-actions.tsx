"use client";

import { useState, type RefObject } from "react";
import { ConfirmAction } from "@/components/confirm-action";
import { Button } from "@/components/ui/button";
import type { Invoice } from "@/domain/invoice";
import type { InvoiceStatus } from "@/domain/invoice-status";
import { useSetInvoiceStatus } from "./mutations";

type Action = {
  to: InvoiceStatus;
  label: string;
  /** Past tense for messages: "marked as paid". */
  done: string;
  description: string;
};

/** The single next step for each stored status (overdue invoices are "sent"). */
const NEXT_ACTION: Record<InvoiceStatus, Action> = {
  draft: {
    to: "sent",
    label: "Mark as sent",
    done: "sent",
    description:
      "It will be locked for editing. Print or save it as a PDF to send it to the client.",
  },
  sent: {
    to: "paid",
    label: "Mark as paid",
    done: "paid",
    description: "Records today as the payment date.",
  },
  paid: {
    to: "sent",
    label: "Mark as unpaid",
    done: "unpaid",
    description: "Moves it back to Sent and clears the payment date.",
  },
};

const STATUS_LABEL: Record<InvoiceStatus, string> = {
  draft: "Draft",
  sent: "Sent",
  paid: "Paid",
};

export function InvoiceStatusActions({
  invoice,
  headingRef,
}: {
  invoice: Invoice;
  /** Focus goes here after confirming, because the clicked button is replaced. */
  headingRef: RefObject<HTMLElement | null>;
}) {
  const setStatus = useSetInvoiceStatus();
  const [announcement, setAnnouncement] = useState("");
  const action = NEXT_ACTION[invoice.status];
  const failed = setStatus.isError ? setStatus.variables : undefined;

  return (
    <>
      <ConfirmAction
        mode="close-immediately"
        // The next action appears instantly (optimistic); wait for this save to land first,
        // or e.g. "paid" could reach the repository before "sent" and be rejected.
        triggerDisabled={setStatus.isPending}
        returnFocusRef={headingRef}
        triggerLabel={action.label}
        triggerVariant={action.to === "paid" ? "default" : "outline"}
        title={`${action.label.replace("Mark", "Mark " + invoice.number)}?`}
        description={action.description}
        confirmLabel={action.label}
        pendingLabel={action.label}
        onConfirm={async () => {
          setAnnouncement("");
          await setStatus.mutateAsync({ invoice, to: action.to });
          setAnnouncement(`${invoice.number} marked as ${action.done}.`);
        }}
      />
      {failed && (
        <div
          role="alert"
          className="flex basis-full items-center justify-between gap-2 rounded-md border border-destructive/50 px-3 py-2 text-sm text-destructive"
        >
          <p>
            Couldn&apos;t mark {failed.invoice.number} as{" "}
            {NEXT_ACTION[failed.invoice.status].done}. It&apos;s back to{" "}
            {STATUS_LABEL[failed.invoice.status]}.
          </p>
          <Button variant="ghost" size="sm" onClick={() => setStatus.reset()}>
            Dismiss
          </Button>
        </div>
      )}
      <p role="status" className="sr-only">
        {announcement}
      </p>
    </>
  );
}
