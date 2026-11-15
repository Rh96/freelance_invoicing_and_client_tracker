"use client";

import {
  useRef,
  useState,
  type ComponentProps,
  type ReactNode,
  type RefObject,
} from "react";
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

type ButtonProps = ComponentProps<typeof Button>;

export type ConfirmActionProps = {
  triggerLabel: string;
  triggerVariant?: ButtonProps["variant"];
  triggerSize?: ButtonProps["size"];
  /** Disables the trigger, e.g. while a related action is still saving. */
  triggerDisabled?: boolean;
  title: string;
  description: ReactNode;
  confirmLabel: string;
  pendingLabel: string;
  /** "wait" mode: shown inside the dialog when `onConfirm` throws; the dialog stays open. */
  errorMessage?: string;
  /** Announced to screen readers after success (when this component still exists). */
  successMessage?: string;
  destructive?: boolean;
  /**
   * "wait" (default): the dialog stays open until the action finishes, and shows errors.
   * "close-immediately": for optimistic actions. The dialog closes on confirm; the caller
   * shows the outcome, since the result is already on screen and this button may be replaced.
   */
  mode?: "wait" | "close-immediately";
  /**
   * Where focus goes when the dialog closes after confirming; use it when confirming may
   * replace the trigger. Cancel and Escape still return focus to the trigger.
   */
  returnFocusRef?: RefObject<HTMLElement | null>;
  onConfirm: () => Promise<unknown>;
};

type Status = "idle" | "pending" | "error" | "done";

/**
 * A button that opens a confirm dialog and runs an async action.
 * The dialog stays open while the action runs and if it fails, so the error is visible.
 */
export function ConfirmAction({
  triggerLabel,
  triggerVariant = "outline",
  triggerSize,
  triggerDisabled = false,
  title,
  description,
  confirmLabel,
  pendingLabel,
  errorMessage,
  successMessage,
  destructive = false,
  mode = "wait",
  returnFocusRef,
  onConfirm,
}: ConfirmActionProps) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const pending = status === "pending";
  // Set just before a confirm closes the dialog; Cancel/Escape leave it false.
  const confirmed = useRef(false);

  async function confirm() {
    if (mode === "close-immediately") {
      confirmed.current = true;
      setOpen(false);
      try {
        await onConfirm();
        setStatus("done");
      } catch {
        setStatus("idle"); // the caller reports the failure
      }
      return;
    }
    setStatus("pending");
    try {
      await onConfirm();
      confirmed.current = true;
      setOpen(false);
      setStatus("done");
    } catch {
      setStatus("error");
    }
  }

  return (
    <>
      <AlertDialog
        open={open}
        onOpenChange={(next) => {
          if (pending) return; // don't close mid-action
          setOpen(next);
          if (next) setStatus("idle");
        }}
      >
        <AlertDialogTrigger asChild>
          <Button
            variant={triggerVariant}
            size={triggerSize}
            disabled={triggerDisabled}
          >
            {triggerLabel}
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent
          onCloseAutoFocus={(event) => {
            const target = confirmed.current ? returnFocusRef?.current : null;
            confirmed.current = false;
            if (!target) return; // default: back to the trigger
            event.preventDefault();
            target.focus();
          }}
        >
          <AlertDialogHeader>
            <AlertDialogTitle>{title}</AlertDialogTitle>
            <AlertDialogDescription>{description}</AlertDialogDescription>
          </AlertDialogHeader>
          {status === "error" && (
            <p role="alert" className="text-sm text-destructive">
              {errorMessage}
            </p>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant={destructive ? "destructive" : "default"}
              disabled={pending}
              onClick={(event) => {
                event.preventDefault(); // keep the dialog open until the action finishes
                void confirm();
              }}
            >
              {pending ? pendingLabel : confirmLabel}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {successMessage !== undefined && (
        <p role="status" className="sr-only">
          {status === "done" ? successMessage : ""}
        </p>
      )}
    </>
  );
}
