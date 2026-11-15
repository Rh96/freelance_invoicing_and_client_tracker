import type { ReactNode } from "react";
import type { FieldError } from "react-hook-form";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export type FieldAriaProps = {
  "aria-invalid": boolean;
  "aria-required"?: boolean;
  "aria-describedby"?: string;
};

/**
 * Label + control + hint + error, wired for assistive tech: the control gets
 * `aria-invalid`, `aria-required` and `aria-describedby` pointing at the error and hint.
 * The control is passed as a render prop so it can spread these onto any input.
 */
export function FormField({
  id,
  label,
  required = false,
  hint,
  error,
  className,
  children,
}: {
  id: string;
  label: string;
  required?: boolean;
  hint?: string;
  error?: Pick<FieldError, "message">;
  className?: string;
  children: (aria: FieldAriaProps) => ReactNode;
}) {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [errorId, hintId].filter(Boolean).join(" ") || undefined;

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <Label htmlFor={id}>
        {label}
        {required && <span aria-hidden="true">*</span>}
      </Label>
      {children({
        "aria-invalid": Boolean(error),
        "aria-required": required || undefined,
        "aria-describedby": describedBy,
      })}
      {hint && (
        <p id={hintId} className="text-sm text-muted-foreground">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="text-sm text-destructive">
          {error.message}
        </p>
      )}
    </div>
  );
}
