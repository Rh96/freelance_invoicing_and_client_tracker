"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRef, useState } from "react";
import {
  useFieldArray,
  useForm,
  useWatch,
  type FieldPath,
} from "react-hook-form";
import { FormField } from "@/components/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { invoiceDefaults } from "@/config/business";
import { isRepositoryError } from "@/data/repository";
import type { Client } from "@/domain/client";
import { addDays } from "@/domain/dates";
import type { InvoiceInput } from "@/domain/invoice";
import { formatMoney } from "@/domain/money";
import {
  emptyLineItem,
  invoiceFormSchema,
  previewLineTotal,
  previewTotals,
  toFormField,
  toInvoiceInput,
  type InvoiceFormData,
  type InvoiceFormValues,
} from "./invoice-form-schema";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const FORM_FIELD =
  /^(clientId|issueDate|dueDate|taxRatePercent|notes|lineItems\.\d+\.(description|quantity|unitPrice))$/;

const selectClassName =
  "h-9 w-full rounded-md border border-input bg-background px-3 text-sm aria-invalid:border-destructive";

export type InvoiceFormProps = {
  /** Clients that can be billed (active ones). */
  clients: readonly Client[];
  defaultValues: InvoiceFormValues;
  submitLabel: string;
  cancelHref: string;
  /** Saves the converted input. Throw a `RepositoryError` to show errors in the form. */
  onSubmit: (input: InvoiceInput) => Promise<void>;
  paymentTermsDays?: number;
};

export function InvoiceForm({
  clients,
  defaultValues,
  submitLabel,
  cancelHref,
  onSubmit,
  paymentTermsDays = invoiceDefaults.paymentTermsDays,
}: InvoiceFormProps) {
  const {
    register,
    control,
    handleSubmit,
    setError,
    setValue,
    getFieldState,
    formState: { errors, isSubmitting },
  } = useForm<InvoiceFormValues, unknown, InvoiceFormData>({
    resolver: zodResolver(invoiceFormSchema),
    mode: "onTouched",
    defaultValues,
  });
  const { fields, append, remove } = useFieldArray({
    control,
    name: "lineItems",
  });
  const lineItems = useWatch({ control, name: "lineItems" });
  const taxRatePercent = useWatch({ control, name: "taxRatePercent" });
  const totals = previewTotals(lineItems ?? [], taxRatePercent);
  const addButton = useRef<HTMLButtonElement>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const submit = handleSubmit(async (data) => {
    setFormError(null);
    try {
      await onSubmit(toInvoiceInput(data));
    } catch (error) {
      if (isRepositoryError(error) && error.code === "validation") {
        const fieldErrors = Object.entries(error.fieldErrors)
          .map(([path, messages]) => [toFormField(path), messages] as const)
          .filter(([field]) => FORM_FIELD.test(field));
        fieldErrors.forEach(([field, messages], index) =>
          setError(
            // Checked against FORM_FIELD above; the path comes from runtime data.
            field as FieldPath<InvoiceFormValues>,
            { message: messages[0] },
            { shouldFocus: index === 0 },
          ),
        );
        if (fieldErrors.length > 0) return;
      }
      setFormError("Couldn't save the invoice. Please try again.");
    }
  });

  return (
    <form onSubmit={submit} noValidate className="max-w-3xl space-y-6">
      <p className="text-sm text-muted-foreground">
        Fields marked <span aria-hidden="true">*</span>
        <span className="sr-only">as required</span> are required.
      </p>

      {formError && (
        <p
          role="alert"
          className="rounded-md border border-destructive/50 p-3 text-sm text-destructive"
        >
          {formError}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          id="invoice-client"
          label="Client"
          required
          error={errors.clientId}
          className="sm:col-span-2"
        >
          {(aria) => (
            <select
              id="invoice-client"
              className={selectClassName}
              {...aria}
              {...register("clientId")}
            >
              <option value="">Choose a client…</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.company
                    ? `${client.name} (${client.company})`
                    : client.name}
                </option>
              ))}
            </select>
          )}
        </FormField>

        <FormField
          id="invoice-issue-date"
          label="Issue date"
          required
          error={errors.issueDate}
        >
          {(aria) => (
            <Input
              id="invoice-issue-date"
              type="date"
              {...aria}
              {...register("issueDate", {
                onChange: (event: { target: { value: string } }) => {
                  // Keep the due date at issue + terms until the user sets it themselves.
                  const issueDate = event.target.value;
                  const due = getFieldState("dueDate");
                  if (!due.isDirty && ISO_DATE.test(issueDate)) {
                    setValue("dueDate", addDays(issueDate, paymentTermsDays), {
                      shouldValidate: due.isTouched,
                    });
                  }
                },
              })}
            />
          )}
        </FormField>

        <FormField
          id="invoice-due-date"
          label="Due date"
          required
          hint={`Defaults to ${paymentTermsDays} days after the issue date.`}
          error={errors.dueDate}
        >
          {(aria) => (
            <Input
              id="invoice-due-date"
              type="date"
              {...aria}
              {...register("dueDate")}
            />
          )}
        </FormField>

        <FormField
          id="invoice-tax-rate"
          label="Tax rate (%)"
          required
          error={errors.taxRatePercent}
        >
          {(aria) => (
            <Input
              id="invoice-tax-rate"
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              max="100"
              {...aria}
              {...register("taxRatePercent", { valueAsNumber: true })}
            />
          )}
        </FormField>
      </div>

      <fieldset className="space-y-3">
        <legend className="text-base font-semibold">Line items</legend>
        {fields.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No line items. The invoice will be saved as an empty draft.
          </p>
        )}
        <ol className="space-y-3">
          {fields.map((field, index) => {
            const lineErrors = errors.lineItems?.[index];
            const prefix = `invoice-line-${index}`;
            return (
              <li key={field.id}>
                <fieldset className="grid items-start gap-3 rounded-md border p-3 sm:grid-cols-[1fr_6rem_8rem_7rem_auto]">
                  <legend className="sr-only">Line {index + 1}</legend>
                  <FormField
                    id={`${prefix}-description`}
                    label="Description"
                    required
                    error={lineErrors?.description}
                  >
                    {(aria) => (
                      <Input
                        id={`${prefix}-description`}
                        {...aria}
                        {...register(`lineItems.${index}.description`)}
                      />
                    )}
                  </FormField>
                  <FormField
                    id={`${prefix}-quantity`}
                    label="Quantity"
                    required
                    error={lineErrors?.quantity}
                  >
                    {(aria) => (
                      <Input
                        id={`${prefix}-quantity`}
                        type="number"
                        inputMode="decimal"
                        step="0.01"
                        min="0"
                        {...aria}
                        {...register(`lineItems.${index}.quantity`, {
                          valueAsNumber: true,
                        })}
                      />
                    )}
                  </FormField>
                  <FormField
                    id={`${prefix}-price`}
                    label="Unit price ($)"
                    required
                    error={lineErrors?.unitPrice}
                  >
                    {(aria) => (
                      <Input
                        id={`${prefix}-price`}
                        type="number"
                        inputMode="decimal"
                        step="0.01"
                        min="0"
                        {...aria}
                        {...register(`lineItems.${index}.unitPrice`, {
                          valueAsNumber: true,
                        })}
                      />
                    )}
                  </FormField>
                  <div className="flex flex-col gap-1.5">
                    <span className="text-sm font-medium">Line total</span>
                    <span className="h-9 py-2 text-sm tabular-nums">
                      {formatMoney(previewLineTotal(lineItems?.[index] ?? {}))}
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    className="sm:mt-6"
                    aria-label={`Remove line ${index + 1}`}
                    onClick={() => {
                      remove(index);
                      addButton.current?.focus(); // the removed button can't keep focus
                    }}
                  >
                    Remove
                  </Button>
                </fieldset>
              </li>
            );
          })}
        </ol>
        <Button
          ref={addButton}
          type="button"
          variant="outline"
          onClick={() =>
            append(emptyLineItem(), {
              focusName: `lineItems.${fields.length}.description`,
            })
          }
        >
          Add line item
        </Button>
      </fieldset>

      <dl className="ml-auto grid w-full max-w-xs grid-cols-[1fr_auto] gap-x-6 gap-y-1 text-sm">
        <dt>Subtotal</dt>
        <dd className="text-right tabular-nums">
          {formatMoney(totals.subtotalCents)}
        </dd>
        <dt>Tax</dt>
        <dd className="text-right tabular-nums">
          {formatMoney(totals.taxCents)}
        </dd>
        <dt className="font-semibold">Total</dt>
        <dd className="text-right font-semibold tabular-nums">
          {formatMoney(totals.totalCents)}
        </dd>
      </dl>

      <FormField id="invoice-notes" label="Notes" error={errors.notes}>
        {(aria) => (
          <Textarea
            id="invoice-notes"
            rows={3}
            {...aria}
            {...register("notes")}
          />
        )}
      </FormField>

      <div className="flex gap-2">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving…" : submitLabel}
        </Button>
        <Button variant="outline" asChild>
          <Link href={cancelHref}>Cancel</Link>
        </Button>
      </div>
    </form>
  );
}
