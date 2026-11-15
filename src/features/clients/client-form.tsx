"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { FormField } from "@/components/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { isRepositoryError } from "@/data/repository";
import {
  clientInputSchema,
  type ClientData,
  type ClientInput,
} from "@/domain/client";

type ClientField = keyof ClientInput;
const CLIENT_FIELDS: readonly ClientField[] = [
  "name",
  "email",
  "company",
  "address",
];

function isClientField(key: string): key is ClientField {
  return (CLIENT_FIELDS as readonly string[]).includes(key);
}

export type ClientFormProps = {
  defaultValues?: Partial<ClientInput>;
  submitLabel: string;
  /** Saves the validated data. Throw a `RepositoryError` to show errors in the form. */
  onSubmit: (data: ClientData) => Promise<void>;
  cancelHref: string;
};

/** Shared by "New client" and "Edit client". Validates on blur, then on every change, and on submit. */
export function ClientForm({
  defaultValues,
  submitLabel,
  onSubmit,
  cancelHref,
}: ClientFormProps) {
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ClientInput, unknown, ClientData>({
    resolver: zodResolver(clientInputSchema),
    mode: "onTouched",
    defaultValues: {
      name: "",
      email: "",
      company: "",
      address: "",
      ...defaultValues,
    },
  });
  const [formError, setFormError] = useState<string | null>(null);

  const submit = handleSubmit(async (data) => {
    setFormError(null);
    try {
      await onSubmit(data);
    } catch (error) {
      if (isRepositoryError(error) && error.code === "validation") {
        // The data layer re-validates; show its field errors where they belong.
        const fields = Object.entries(error.fieldErrors).filter(([key]) =>
          isClientField(key),
        );
        fields.forEach(([key, messages], index) =>
          setError(
            key as ClientField,
            { message: messages[0] },
            { shouldFocus: index === 0 },
          ),
        );
        if (fields.length > 0) return;
      }
      setFormError("Couldn't save the client. Please try again.");
    }
  });

  return (
    <form onSubmit={submit} noValidate className="max-w-lg space-y-5">
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

      <FormField id="client-name" label="Name" required error={errors.name}>
        {(aria) => (
          <Input
            id="client-name"
            autoComplete="name"
            {...aria}
            {...register("name")}
          />
        )}
      </FormField>

      <FormField id="client-email" label="Email" required error={errors.email}>
        {(aria) => (
          <Input
            id="client-email"
            type="email"
            autoComplete="email"
            {...aria}
            {...register("email")}
          />
        )}
      </FormField>

      <FormField id="client-company" label="Company" error={errors.company}>
        {(aria) => (
          <Input
            id="client-company"
            autoComplete="organization"
            {...aria}
            {...register("company")}
          />
        )}
      </FormField>

      <FormField
        id="client-address"
        label="Address"
        hint="Shown under “Bill to” on printed invoices."
        error={errors.address}
      >
        {(aria) => (
          <Textarea
            id="client-address"
            rows={3}
            autoComplete="street-address"
            {...aria}
            {...register("address")}
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
