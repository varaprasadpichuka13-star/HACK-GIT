/*
 * FeeFlow repository layer.
 * All reads and writes go through the action helpers returned by useStore.
 * The localStorage calls and the in-memory updates here can later be replaced
 * with Supabase calls without changing any consumer of this hook.
 * Derived values are not stored; compute them with selectors.js.
 */
import { createContext, createElement, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { createSeedState } from "./seed.js";
import { balanceOf, formatINR } from "./selectors.js";

const STORAGE_KEY = "feeflow.v1";
const COLLECTIONS = ["students", "invoices", "payments", "expenses"];

const StoreContext = createContext(null);

function isValidState(value) {
  return (
    value !== null &&
    typeof value === "object" &&
    COLLECTIONS.every((key) => Array.isArray(value[key]))
  );
}

function loadState() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return createSeedState();
    const parsed = JSON.parse(raw);
    return isValidState(parsed) ? parsed : createSeedState();
  } catch {
    return createSeedState();
  }
}

function saveState(state) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Storage is unavailable or full; the in-memory state still works.
  }
}

function generateId(prefix) {
  return `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

function nextInvoiceId(invoices, year) {
  const taken = new Set(invoices.map((inv) => inv.id));
  let n = invoices.length + 1;
  let id = `INV-${year}-${String(n).padStart(4, "0")}`;
  while (taken.has(id)) {
    n += 1;
    id = `INV-${year}-${String(n).padStart(4, "0")}`;
  }
  return id;
}

export function StoreProvider({ children }) {
  const [state, setState] = useState(loadState);

  useEffect(() => {
    saveState(state);
  }, [state]);

  const addStudent = useCallback((data) => {
    const name = String(data.name ?? "").trim();
    const monthlyFee = Number(data.monthlyFee);
    if (!name) throw new Error("Student name is required.");
    if (!(monthlyFee > 0)) throw new Error("Monthly fee must be greater than zero.");

    const student = {
      id: generateId("stu"),
      name,
      parentName: data.parentName ?? "",
      phone: data.phone ?? "",
      monthlyFee,
      joiningDate: data.joiningDate ?? "",
      notes: data.notes ?? "",
    };
    setState((prev) => ({ ...prev, students: [...prev.students, student] }));
    return student;
  }, []);

  const createInvoice = useCallback(
    ({ studentId, billingMonth, amount, issueDate, dueDate, notes = "", status = "draft" }) => {
      const value = Number(amount);
      if (!(value > 0)) throw new Error("Invoice amount must be greater than zero.");
      if (!state.students.some((s) => s.id === studentId)) throw new Error("Student not found.");

      const invoice = {
        id: nextInvoiceId(state.invoices, String(issueDate).slice(0, 4)),
        studentId,
        billingMonth,
        issueDate,
        dueDate,
        amount: value,
        notes,
        status,
      };
      setState((prev) => ({ ...prev, invoices: [...prev.invoices, invoice] }));
      return invoice;
    },
    [state.students, state.invoices]
  );

  const recordPayment = useCallback(
    ({ invoiceId, amount, date, method, note = "" }) => {
      const invoice = state.invoices.find((inv) => inv.id === invoiceId);
      if (!invoice) throw new Error("Invoice not found.");
      if (invoice.status === "draft") throw new Error("Issue the invoice before recording a payment.");

      const value = Number(amount);
      if (!(value > 0)) throw new Error("Payment amount must be greater than zero.");

      const remaining = balanceOf(invoice, state.payments);
      if (value > remaining) {
        throw new Error(`Payment exceeds the remaining balance of ${formatINR(remaining)}.`);
      }

      const payment = { id: generateId("pay"), invoiceId, amount: value, date, method, note };
      setState((prev) => ({ ...prev, payments: [...prev.payments, payment] }));
      return payment;
    },
    [state.invoices, state.payments]
  );

  const addExpense = useCallback((data) => {
    const name = String(data.name ?? "").trim();
    const amount = Number(data.amount);
    if (!name) throw new Error("Expense name is required.");
    if (!(amount > 0)) throw new Error("Expense amount must be greater than zero.");

    const expense = {
      id: generateId("exp"),
      name,
      amount,
      dueDate: data.dueDate ?? "",
      frequency: data.frequency ?? "One-time",
    };
    setState((prev) => ({ ...prev, expenses: [...prev.expenses, expense] }));
    return expense;
  }, []);

  const resetDemoData = useCallback(() => {
    setState(createSeedState());
  }, []);

  const value = useMemo(
    () => ({
      students: state.students,
      invoices: state.invoices,
      payments: state.payments,
      expenses: state.expenses,
      addStudent,
      createInvoice,
      recordPayment,
      addExpense,
      resetDemoData,
    }),
    [state, addStudent, createInvoice, recordPayment, addExpense, resetDemoData]
  );

  return createElement(StoreContext.Provider, { value }, children);
}

export function useStore() {
  const context = useContext(StoreContext);
  if (!context) throw new Error("useStore must be used within a StoreProvider.");
  return context;
}
