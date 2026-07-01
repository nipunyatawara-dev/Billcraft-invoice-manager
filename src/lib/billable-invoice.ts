import type { PaymentAttachment, PaymentRecord } from "@/data/invoices";
import { getLatestPayment } from "@/data/invoices";

type PaymentSource = {
  payments?: PaymentRecord[];
  receiptAttachments?: PaymentAttachment[];
  amountPaid?: number;
  paidAt?: string;
  paymentMethod?: string;
};

export type PreparedPaymentFields = {
  payments: PaymentRecord[];
  receiptAttachments: PaymentAttachment[];
  amountPaid: number;
  paidAt?: string;
  paymentMethod?: string;
};

export function upsertRecordById<T extends { id: string }>(records: T[], record: T): T[] {
  const existingIndex = records.findIndex((entry) => entry.id === record.id);
  return existingIndex >= 0
    ? records.map((entry) => entry.id === record.id ? record : entry)
    : [record, ...records];
}

export async function syncLinkedBillableRecords<T>(
  records: T[],
  getLinkId: (record: T) => string | undefined,
  linkId: string,
  patch: Partial<T>,
  hydrate: (record: T) => T,
  write: (records: T[]) => Promise<void>,
): Promise<void> {
  if (!records.some((record) => getLinkId(record) === linkId)) {
    return;
  }

  const nextRecords = records.map((record) => (
    getLinkId(record) === linkId ? hydrate({ ...record, ...patch }) : record
  ));

  await write(nextRecords);
}

export function buildPreparedPaymentFields(
  payments: PaymentRecord[],
  receiptAttachments: PaymentAttachment[],
  invoice: PaymentSource,
  amountPaid: number,
): PreparedPaymentFields {
  const latestPayment = getLatestPayment(payments);

  return {
    payments,
    receiptAttachments,
    amountPaid,
    paidAt: invoice.paidAt || latestPayment?.paidAt,
    paymentMethod: invoice.paymentMethod || latestPayment?.method,
  };
}
