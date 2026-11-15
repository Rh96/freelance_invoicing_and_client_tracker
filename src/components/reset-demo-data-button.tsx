"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useRepository } from "@/data/repository-context";

/** Restores the demo data (story S6). Also the way out when stored data is corrupt. */
export function ResetDemoDataButton() {
  const repository = useRepository();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState(false);

  const reset = useMutation({
    mutationFn: () => repository.resetData(),
    onSuccess: async () => {
      setOpen(false);
      setDone(true);
      await queryClient.invalidateQueries();
    },
  });

  return (
    <>
      <AlertDialog
        open={open}
        onOpenChange={(next) => {
          if (reset.isPending) return; // don't close mid-reset
          setOpen(next);
          if (next) {
            reset.reset();
            setDone(false);
          }
        }}
      >
        <AlertDialogTrigger asChild>
          <Button variant="outline" size="sm">
            Reset demo data
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset demo data?</AlertDialogTitle>
            <AlertDialogDescription>
              This replaces all clients and invoices in this browser with the
              original demo data. Your changes will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {reset.isError && (
            <p role="alert" className="text-sm text-destructive">
              Couldn&apos;t reset the data. Please try again.
            </p>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={reset.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={reset.isPending}
              onClick={(event) => {
                event.preventDefault(); // keep the dialog open until the reset finishes
                reset.mutate();
              }}
            >
              {reset.isPending ? "Resetting…" : "Reset data"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <p role="status" className="sr-only">
        {done ? "Demo data restored." : ""}
      </p>
    </>
  );
}
