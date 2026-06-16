const store = require('./supabase.service');
const collections = require('../supabase/tables');
const AppError = require('../utils/AppError');

const GST_RATE = 0.09;

function computeInrTotals(baseAmount) {
  const base = Number(baseAmount || 0);
  const cgst = Math.round(base * GST_RATE * 100) / 100;
  const sgst = Math.round(base * GST_RATE * 100) / 100;
  const totalAmountInr = Math.round((base + cgst + sgst) * 100) / 100;
  return { baseAmount: base, cgst, sgst, totalAmountInr };
}

function summarizeLedger(invoices = [], changeOrders = []) {
  const contractValue = invoices.reduce((sum, row) => sum + Number(row.totalAmountInr || 0), 0)
    + changeOrders.reduce((sum, row) => sum + Number(row.totalAmountInr || 0), 0);
  const paidToDate = invoices
    .filter((row) => row.status === 'Paid')
    .reduce((sum, row) => sum + Number(row.totalAmountInr || 0), 0);
  const dueNow = invoices
    .filter((row) => row.status === 'Due Now')
    .reduce((sum, row) => sum + Number(row.totalAmountInr || 0), 0);

  return { contractValue, paidToDate, dueNow };
}

async function getProjectLedger(projectId) {
  const [invoices, changeOrders] = await Promise.all([
    store.list(collections.invoices, [['projectId', '==', projectId]], { orderBy: 'createdAt', direction: 'asc' }),
    store.list(collections.changeOrders, [['projectId', '==', projectId]], { orderBy: 'createdAt', direction: 'asc' })
  ]);
  const summary = summarizeLedger(invoices, changeOrders);
  return { summary, invoices, changeOrders };
}

async function updateInvoiceStatus(invoiceId, status, builderId) {
  const invoice = await store.getById(collections.invoices, invoiceId);
  if (!invoice) throw new AppError('Invoice not found', 404);

  const project = await store.getById(collections.projects, invoice.projectId);
  if (!project || String(project.builder) !== String(builderId)) {
    throw new AppError('Insufficient permissions', 403);
  }

  const allowed = ['Paid', 'Due Now', 'Upcoming'];
  if (!allowed.includes(status)) throw new AppError('Invalid invoice status', 400);

  const updated = await store.update(collections.invoices, invoiceId, { status });
  const ledger = await getProjectLedger(invoice.projectId);
  return { invoice: updated, ...ledger };
}

async function seedDefaultMilestones(projectId) {
  const existing = await store.list(collections.invoices, [['projectId', '==', projectId]]);
  if (existing.length) return existing;

  const milestones = [
    { milestoneName: 'Booking', baseAmount: 500000, status: 'Paid' },
    { milestoneName: 'Plinth', baseAmount: 800000, status: 'Due Now' },
    { milestoneName: 'Slab', baseAmount: 1200000, status: 'Upcoming' },
    { milestoneName: 'Finishes', baseAmount: 1500000, status: 'Upcoming' }
  ];

  const rows = [];
  for (const item of milestones) {
    const totals = computeInrTotals(item.baseAmount);
    rows.push(await store.create(collections.invoices, {
      projectId,
      milestoneName: item.milestoneName,
      ...totals,
      status: item.status
    }));
  }
  return rows;
}

module.exports = {
  computeInrTotals,
  summarizeLedger,
  getProjectLedger,
  updateInvoiceStatus,
  seedDefaultMilestones
};
