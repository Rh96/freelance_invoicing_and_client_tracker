import { z } from "zod";

/** What a user can enter for a client. Used by the client form (T8) and the repository. */
export const clientInputSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, { error: "Name is required" })
    .max(100, { error: "Name must be 100 characters or fewer" }),
  email: z
    .string()
    .trim()
    .pipe(z.email({ error: "Enter a valid email address" })),
  company: z
    .string()
    .trim()
    .max(100, { error: "Company must be 100 characters or fewer" })
    .default(""),
  address: z
    .string()
    .trim()
    .max(300, { error: "Address must be 300 characters or fewer" })
    .default(""),
});

/** Form values before validation (optional fields may be missing). */
export type ClientInput = z.input<typeof clientInputSchema>;
/** Validated, trimmed values. */
export type ClientData = z.output<typeof clientInputSchema>;

/** A stored client. Timestamps are full ISO strings. */
export const clientSchema = clientInputSchema.extend({
  id: z.string().min(1),
  archivedAt: z.iso.datetime().nullable(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export type Client = z.output<typeof clientSchema>;
