"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useRepository } from "@/data/repository-context";
import { ConfirmAction } from "./confirm-action";

/** Restores the demo data (story S6). Also the way out when stored data is corrupt. */
export function ResetDemoDataButton() {
  const repository = useRepository();
  const queryClient = useQueryClient();

  return (
    <ConfirmAction
      triggerLabel="Reset demo data"
      triggerSize="sm"
      title="Reset demo data?"
      description="This replaces all clients and invoices in this browser with the original demo data. Your changes will be lost."
      confirmLabel="Reset data"
      pendingLabel="Resetting…"
      errorMessage="Couldn't reset the data. Please try again."
      successMessage="Demo data restored."
      destructive
      onConfirm={async () => {
        await repository.resetData();
        await queryClient.invalidateQueries();
      }}
    />
  );
}
