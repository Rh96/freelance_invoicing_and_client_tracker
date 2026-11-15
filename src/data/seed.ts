import type { Client } from "@/domain/client";
import { addDays } from "@/domain/dates";
import type { Invoice, LineItemInput } from "@/domain/invoice";
import { toIsoDate, type InvoiceStatus } from "@/domain/invoice-status";
import {
  formatInvoiceNumber,
  STORE_VERSION,
  type Store,
} from "./local-storage-repository";

/**
 * Demo data for the live site (story S6). All dates are relative to `now`, so the demo
 * always shows every status, including overdue, whenever someone opens it.
 * Names are fictional; emails use the reserved `.example` domain.
 */
export type SeedOptions = {
  now?: Date;
  generateId?: () => string;
};

const DAY_MS = 24 * 60 * 60 * 1000;

type ClientSeed = Pick<Client, "name" | "email" | "company" | "address"> & {
  key: string;
  createdDaysAgo: number;
  archivedDaysAgo?: number;
};

const CLIENTS: ClientSeed[] = [
  {
    key: "northwind",
    name: "Maya Chen",
    email: "maya@northwind.example",
    company: "Northwind Studio",
    address: "48 Harbor St\nPortland, OR 97204",
    createdDaysAgo: 120,
  },
  {
    key: "brightline",
    name: "Omar Haddad",
    email: "ap@brightline.example",
    company: "Brightline Labs",
    address: "900 Market St, Suite 300\nSan Francisco, CA 94102",
    createdDaysAgo: 100,
  },
  {
    key: "juniper",
    name: "Sofia Rossi",
    email: "sofia@juniper.example",
    company: "Juniper & Co",
    address: "12 Elm Ave\nAustin, TX 78701",
    createdDaysAgo: 75,
  },
  {
    key: "kestrel",
    name: "Liam Walsh",
    email: "liam@kestrel.example",
    company: "Kestrel Outdoor",
    address: "",
    createdDaysAgo: 50,
  },
  {
    key: "oldpier",
    name: "Ana Costa",
    email: "hello@oldpier.example",
    company: "Old Pier Bakery",
    address: "3 Wharf Rd\nBoston, MA 02110",
    createdDaysAgo: 140,
    archivedDaysAgo: 30,
  },
];

type InvoiceSeed = {
  client: string;
  status: InvoiceStatus;
  /** Days relative to today: negative is in the past. */
  issuedIn: number;
  dueIn: number;
  sentIn?: number;
  paidIn?: number;
  taxRateBps: number;
  lineItems: LineItemInput[];
  notes?: string;
};

// Listed in creation order; numbers are assigned INV-0001 upward.
const INVOICES: InvoiceSeed[] = [
  {
    client: "oldpier",
    status: "paid",
    issuedIn: -95,
    dueIn: -65,
    sentIn: -95,
    paidIn: -70,
    taxRateBps: 0,
    lineItems: [
      {
        description: "Menu and signage design",
        quantity: 1,
        unitPriceCents: 180000,
      },
    ],
  },
  {
    client: "northwind",
    status: "paid",
    issuedIn: -60,
    dueIn: -30,
    sentIn: -60,
    paidIn: -34,
    taxRateBps: 0,
    lineItems: [
      {
        description: "Brand identity design",
        quantity: 1,
        unitPriceCents: 240000,
      },
      { description: "Logo revisions", quantity: 3.5, unitPriceCents: 9500 },
    ],
  },
  {
    client: "brightline",
    status: "paid",
    issuedIn: -45,
    dueIn: -15,
    sentIn: -45,
    paidIn: -18,
    taxRateBps: 825,
    lineItems: [
      {
        description: "Landing page build",
        quantity: 24,
        unitPriceCents: 11000,
      },
      { description: "Hosting setup", quantity: 1, unitPriceCents: 15000 },
    ],
  },
  {
    client: "juniper",
    status: "sent", // overdue
    issuedIn: -40,
    dueIn: -10,
    sentIn: -40,
    taxRateBps: 825,
    lineItems: [
      {
        description: "Product photography",
        quantity: 2,
        unitPriceCents: 65000,
      },
      { description: "Photo retouching", quantity: 6.25, unitPriceCents: 8000 },
    ],
    notes: "Net 30. Thank you for your business!",
  },
  {
    client: "kestrel",
    status: "sent", // overdue
    issuedIn: -35,
    dueIn: -4,
    sentIn: -35,
    taxRateBps: 0,
    lineItems: [
      { description: "Catalog layout", quantity: 18, unitPriceCents: 9000 },
    ],
  },
  {
    client: "northwind",
    status: "sent",
    issuedIn: -7,
    dueIn: 23,
    sentIn: -7,
    taxRateBps: 0,
    lineItems: [
      {
        description: "Website design, phase 1",
        quantity: 1,
        unitPriceCents: 320000,
      },
    ],
  },
  {
    client: "brightline",
    status: "sent",
    issuedIn: -3,
    dueIn: 27,
    sentIn: -3,
    taxRateBps: 825,
    lineItems: [
      { description: "Monthly retainer", quantity: 1, unitPriceCents: 150000 },
      {
        description: "Extra support hours",
        quantity: 4.5,
        unitPriceCents: 11000,
      },
    ],
  },
  {
    client: "juniper",
    status: "draft",
    issuedIn: 0,
    dueIn: 30,
    taxRateBps: 825,
    lineItems: [
      { description: "Lookbook design", quantity: 1, unitPriceCents: 95000 },
    ],
  },
];

export function createSeedStore({
  now = new Date(),
  generateId = () => crypto.randomUUID(),
}: SeedOptions = {}): Store {
  const today = toIsoDate(now);
  const daysAgo = (days: number) =>
    new Date(now.getTime() - days * DAY_MS).toISOString();
  const atDay = (offset: number) => daysAgo(-offset);

  const idByKey = new Map<string, string>();
  const clients: Client[] = CLIENTS.map(
    ({ key, createdDaysAgo, archivedDaysAgo, ...fields }) => {
      const id = generateId();
      idByKey.set(key, id);
      const archivedAt =
        archivedDaysAgo === undefined ? null : daysAgo(archivedDaysAgo);
      return {
        ...fields,
        id,
        archivedAt,
        createdAt: daysAgo(createdDaysAgo),
        updatedAt: archivedAt ?? daysAgo(createdDaysAgo),
      };
    },
  );

  const invoices: Invoice[] = INVOICES.map((seed, index) => {
    const clientId = idByKey.get(seed.client);
    if (!clientId)
      throw new Error(
        `Seed invoice references unknown client "${seed.client}"`,
      );
    const createdAt = atDay(Math.min(seed.issuedIn, 0) - 1); // drafted the day before issue
    const sentAt = seed.sentIn === undefined ? null : atDay(seed.sentIn);
    const paidAt = seed.paidIn === undefined ? null : atDay(seed.paidIn);
    return {
      id: generateId(),
      number: formatInvoiceNumber(index + 1),
      clientId,
      status: seed.status,
      issueDate: addDays(today, seed.issuedIn),
      dueDate: addDays(today, seed.dueIn),
      taxRateBps: seed.taxRateBps,
      lineItems: seed.lineItems.map((item) => ({ ...item, id: generateId() })),
      notes: seed.notes ?? "",
      createdAt,
      updatedAt: paidAt ?? sentAt ?? createdAt,
      sentAt,
      paidAt,
    };
  });

  return {
    version: STORE_VERSION,
    clients,
    invoices,
    nextInvoiceSeq: invoices.length + 1,
  };
}
