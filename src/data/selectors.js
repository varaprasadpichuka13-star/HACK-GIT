// Pure derivations over the FeeFlow state. No React, no side effects.
// Dates are ISO strings (YYYY-MM-DD) and compare correctly as strings.

const DAY_MS = 24 * 60 * 60 * 1000;

function toUtcMs(isoDate) {
  const [year, month, day] = isoDate.split("-").map(Number);
  return Date.UTC(year, month - 1, day);
}

function daysBetween(fromIso, toIso) {
  return Math.round((toUtcMs(toIso) - toUtcMs(fromIso)) / DAY_MS);
}

function addDays(isoDate, days) {
  return new Date(toUtcMs(isoDate) + days * DAY_MS).toISOString().slice(0, 10);
}

export function paidAmountOf(invoiceId, payments) {
  return payments
    .filter((p) => p.invoiceId === invoiceId)
    .reduce((sum, p) => sum + Number(p.amount), 0);
}

export function balanceOf(invoice, payments = []) {
  return Math.max(0, Number(invoice.amount) - paidAmountOf(invoice.id, payments));
}

// Whole days past the due date; 0 when not yet due.
export function daysOverdue(invoice, today) {
  return Math.max(0, daysBetween(invoice.dueDate, today));
}

export function statusOf(invoice, today, payments = []) {
  if (balanceOf(invoice, payments) === 0) return "paid";
  if (invoice.status === "draft") return "draft";
  if (daysOverdue(invoice, today) > 0) return "overdue";
  if (paidAmountOf(invoice.id, payments) > 0) return "partial";
  return "pending";
}

// Returns "0-7" | "8-30" | "30+" for open overdue invoices, otherwise null.
export function ageingBucket(invoice, today, payments = []) {
  if (invoice.status === "draft" || balanceOf(invoice, payments) === 0) return null;
  const days = daysOverdue(invoice, today);
  if (days <= 0) return null;
  if (days <= 7) return "0-7";
  if (days <= 30) return "8-30";
  return "30+";
}

function isOpen(invoice, payments) {
  return invoice.status !== "draft" && balanceOf(invoice, payments) > 0;
}

function openInvoicesFor(studentId, invoices, payments) {
  return invoices.filter((inv) => inv.studentId === studentId && isOpen(inv, payments));
}

// Non-draft invoices only.
// pending = open balances not yet overdue; overdue = open balances past due.
export function totals(invoices, payments, today) {
  const result = { totalInvoiced: 0, paid: 0, pending: 0, overdue: 0 };
  for (const invoice of invoices) {
    if (invoice.status === "draft") continue;
    result.totalInvoiced += Number(invoice.amount);
    result.paid += paidAmountOf(invoice.id, payments);
    const balance = balanceOf(invoice, payments);
    if (balance === 0) continue;
    if (daysOverdue(invoice, today) > 0) {
      result.overdue += balance;
    } else {
      result.pending += balance;
    }
  }
  return result;
}

// Expected collections: open balances due on or before today + windowDays
// (this includes anything already overdue).
export function expectedIncome(invoices, payments, today, windowDays = 30) {
  const horizon = addDays(today, windowDays);
  return invoices
    .filter((inv) => isOpen(inv, payments) && inv.dueDate <= horizon)
    .reduce((sum, inv) => sum + balanceOf(inv, payments), 0);
}

export function formatINR(n) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(n) || 0);
}

export function studentOutstanding(studentId, invoices, payments) {
  return openInvoicesFor(studentId, invoices, payments).reduce(
    (sum, inv) => sum + balanceOf(inv, payments),
    0
  );
}

// "paid" | "pending" | "overdue" | "none" (none = no non-draft invoices).
export function studentPaymentStatus(studentId, invoices, payments, today) {
  const own = invoices.filter((inv) => inv.studentId === studentId && inv.status !== "draft");
  if (own.length === 0) return "none";
  const open = own.filter((inv) => balanceOf(inv, payments) > 0);
  if (open.length === 0) return "paid";
  return open.some((inv) => daysOverdue(inv, today) > 0) ? "overdue" : "pending";
}

// Earliest open due date on or after today; falls back to the earliest
// open due date (overdue) when nothing is upcoming. Null when nothing is open.
export function nextDueDate(studentId, invoices, payments, today) {
  const dues = openInvoicesFor(studentId, invoices, payments)
    .map((inv) => inv.dueDate)
    .sort();
  if (dues.length === 0) return null;
  return dues.find((d) => d >= today) ?? dues[0];
}

// Latest payment date across all of the student's invoices, or null.
export function lastPaymentDate(studentId, invoices, payments) {
  const ids = new Set(
    invoices.filter((inv) => inv.studentId === studentId).map((inv) => inv.id)
  );
  let last = null;
  for (const p of payments) {
    if (ids.has(p.invoiceId) && (last === null || p.date > last)) last = p.date;
  }
  return last;
}

// Sum of monthly fees. Pass { status, invoices, payments, today } to count only
// students whose studentPaymentStatus matches `status`.
export function monthlyExpectedFees(students, { status, invoices = [], payments = [], today } = {}) {
  const selected = status
    ? students.filter(
        (s) => studentPaymentStatus(s.id, invoices, payments, today) === status
      )
    : students;
  return selected.reduce((sum, s) => sum + Number(s.monthlyFee), 0);
}
