// Seed data for FeeFlow. Every seeded date is relative to TODAY.
export const TODAY = "2025-11-20";

const BILLING_MONTHS = ["2025-08", "2025-09", "2025-10", "2025-11"];
const METHODS = ["Cash", "UPI", "Bank transfer"];

const STUDENT_ROWS = [
  ["Rahul Sharma", "Suresh Sharma", "+91 98450 11001", 2000, "2024-06-01", ""],
  ["Arjun Rao", "Venkatesh Rao", "+91 98450 11002", 2500, "2024-04-15", "Sibling enrolled in Grade 9"],
  ["Meera Iyer", "Lakshmi Iyer", "+91 98450 11003", 2000, "2024-06-01", ""],
  ["Kiran Kumar", "Ramesh Kumar", "+91 98450 11004", 2000, "2024-07-10", ""],
  ["Divya Menon", "Anil Menon", "+91 98450 11005", 2000, "2024-06-01", "Prefers UPI reminders"],
  ["Priya Nair", "Gopinath Nair", "+91 98450 11006", 1500, "2024-08-05", ""],
  ["Ananya Gupta", "Rajesh Gupta", "+91 98450 11007", 1800, "2024-09-02", ""],
  ["Vikram Singh", "Harpreet Singh", "+91 98450 11008", 2200, "2024-05-20", ""],
  ["Sneha Reddy", "Mohan Reddy", "+91 98450 11009", 2500, "2024-06-15", ""],
  ["Rohan Mehta", "Nilesh Mehta", "+91 98450 11010", 1500, "2024-10-01", ""],
  ["Kavya Pillai", "Sreekumar Pillai", "+91 98450 11011", 1800, "2024-06-01", ""],
  ["Aarav Patel", "Hitesh Patel", "+91 98450 11012", 2200, "2024-07-22", ""],
  ["Ishita Joshi", "Manoj Joshi", "+91 98450 11013", 1500, "2025-01-06", ""],
  ["Karthik Subramanian", "Ganesh Subramanian", "+91 98450 11014", 2500, "2024-04-15", ""],
  ["Neha Agarwal", "Sunil Agarwal", "+91 98450 11015", 1800, "2024-06-01", ""],
  ["Siddharth Bose", "Debashish Bose", "+91 98450 11016", 2000, "2024-11-11", ""],
  ["Tanvi Desai", "Kiran Desai", "+91 98450 11017", 1500, "2025-03-03", ""],
  ["Manish Tiwari", "Pradeep Tiwari", "+91 98450 11018", 2200, "2024-06-01", ""],
  ["Anjali Krishnan", "Suresh Krishnan", "+91 98450 11019", 1800, "2024-08-19", ""],
  ["Harsh Kapoor", "Vinod Kapoor", "+91 98450 11020", 2500, "2024-06-01", ""],
  ["Pooja Chatterjee", "Subhash Chatterjee", "+91 98450 11021", 1500, "2025-02-10", ""],
  ["Nikhil Shetty", "Rakesh Shetty", "+91 98450 11022", 2000, "2024-07-01", ""],
  ["Ritika Malhotra", "Ajay Malhotra", "+91 98450 11023", 2200, "2024-09-16", "Fee paid by employer"],
  ["Abhishek Das", "Partha Das", "+91 98450 11024", 1800, "2024-06-01", ""],
  ["Sanya Bhatia", "Deepak Bhatia", "+91 98450 11025", 2000, "2025-04-07", ""],
];

const EXPENSE_ROWS = [
  ["Rent", 8000, "2025-12-01", "Monthly"],
  ["Electricity", 1500, "2025-12-10", "Monthly"],
  ["Internet", 800, "2025-12-15", "Monthly"],
  ["Other", 1200, "2025-12-20", "Monthly"],
];

function pad(n, width = 4) {
  return String(n).padStart(width, "0");
}

function buildStudents() {
  return STUDENT_ROWS.map(([name, parentName, phone, monthlyFee, joiningDate, notes], i) => ({
    id: `stu-${pad(i + 1, 3)}`,
    name,
    parentName,
    phone,
    monthlyFee,
    joiningDate,
    notes,
  }));
}

// Builds invoices and payments for every student across BILLING_MONTHS.
// Outcomes are deterministic: ~60% paid, ~20% partially paid, ~20% unpaid.
// The very last invoice is left as a draft.
function buildInvoicesAndPayments(students) {
  const invoices = [];
  const payments = [];
  const lastStudentIndex = students.length - 1;
  const lastMonthIndex = BILLING_MONTHS.length - 1;

  students.forEach((student, i) => {
    BILLING_MONTHS.forEach((month, m) => {
      const isDraft = i === lastStudentIndex && m === lastMonthIndex;
      const invoice = {
        id: `INV-2025-${pad(invoices.length + 1)}`,
        studentId: student.id,
        billingMonth: month,
        issueDate: `${month}-01`,
        dueDate: `${month}-28`,
        amount: student.monthlyFee,
        notes: "",
        status: isDraft ? "draft" : "issued",
      };
      invoices.push(invoice);
      if (isDraft) return;

      const method = METHODS[(i + m) % METHODS.length];
      const bucket = (i * 7 + m * 3) % 10;
      const addPayment = (amount, date) => {
        payments.push({
          id: `PAY-${pad(payments.length + 1)}`,
          invoiceId: invoice.id,
          amount,
          date,
          method,
          note: "",
        });
      };

      if (bucket <= 5) {
        addPayment(invoice.amount, `${month}-05`);
      } else if (bucket <= 7) {
        addPayment(Math.round(invoice.amount / 200) * 100, `${month}-12`);
      }
    });
  });

  return { invoices, payments };
}

function buildExpenses() {
  return EXPENSE_ROWS.map(([name, amount, dueDate, frequency], i) => ({
    id: `EXP-${pad(i + 1, 3)}`,
    name,
    amount,
    dueDate,
    frequency,
  }));
}

// Returns a fresh copy of the full initial state.
export function createSeedState() {
  const students = buildStudents();
  const { invoices, payments } = buildInvoicesAndPayments(students);
  return {
    students,
    invoices,
    payments,
    expenses: buildExpenses(),
  };
}
