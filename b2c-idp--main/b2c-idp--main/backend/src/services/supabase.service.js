const { getSupabase } = require('../supabase/client');

// Controllers use friendly JavaScript names; Supabase tables use snake_case columns.
const FIELD_MAP = {
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  passwordHash: 'password_hash',
  companyName: 'company_name',
  isActive: 'is_active',
  projectCode: 'project_code',
  customerName: 'customer_name',
  customerPhone: 'customer_phone',
  customerEmail: 'customer_email',
  workDate: 'work_date',
  dueDate: 'due_date',
  startDate: 'start_date',
  endDate: 'end_date',
  targetCompletionDate: 'target_completion_date',
  completionPercentage: 'completion_percentage',
  spentAmount: 'spent_amount',
  dprStatus: 'dpr_status',
  uploadedBy: 'uploaded_by',
  uploadedByModel: 'uploaded_by_model',
  originalName: 'original_name',
  mimeType: 'mime_type',
  recipientModel: 'recipient_model',
  readAt: 'read_at',
  actorModel: 'actor_model',
  sourceFile: 'source_file',
  refId: 'ref_id',
  customerComment: 'customer_comment',
  decidedAt: 'decided_at',
  phoneNumber: 'phone_number',
  projectId: 'project_id',
  userId: 'user_id',
  mediaUrls: 'media_urls',
  milestoneName: 'milestone_name',
  baseAmount: 'base_amount',
  totalAmountInr: 'total_amount_inr',
  invoiceUrl: 'invoice_url',
  otpCode: 'otp_code',
  expiresAt: 'expires_at',
  googleId: 'google_id'
};

const REVERSE_FIELD_MAP = Object.fromEntries(
  Object.entries(FIELD_MAP).map(([camel, snake]) => [snake, camel])
);

function toColumn(field) {
  return FIELD_MAP[field] || field;
}

function normalizeValue(value) {
  if (Array.isArray(value)) return value.map(normalizeValue);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, normalizeValue(item)]));
  }
  return value;
}

function toRow(data = {}) {
  return Object.fromEntries(
    Object.entries(data)
      .filter(([, value]) => value !== undefined)
      .map(([key, value]) => [toColumn(key), normalizeValue(value)])
  );
}

function fromRow(row) {
  if (!row) return null;
  const normalized = Object.fromEntries(
    Object.entries(row).map(([key, value]) => [REVERSE_FIELD_MAP[key] || key, normalizeValue(value)])
  );
  return { _id: row.id, ...normalized };
}

function applyFilters(query, filters = []) {
  return filters.reduce((current, [field, operator, value]) => {
    const column = toColumn(field);
    if (operator === '==') return current.eq(column, value);
    if (operator === '!=') return current.neq(column, value);
    if (operator === '>') return current.gt(column, value);
    if (operator === '>=') return current.gte(column, value);
    if (operator === '<') return current.lt(column, value);
    if (operator === '<=') return current.lte(column, value);
    if (operator === 'in') return current.in(column, value);
    return current.eq(column, value);
  }, query);
}

function handleError(error) {
  if (error) throw new Error(error.message || 'Supabase request failed');
}

function now() {
  return new Date().toISOString();
}

async function create(table, data) {
  const { data: row, error } = await getSupabase()
    .from(table)
    .insert(toRow(data))
    .select('*')
    .single();
  handleError(error);
  return fromRow(row);
}

async function setWithId(table, id, data) {
  const { data: row, error } = await getSupabase()
    .from(table)
    .upsert({ id, ...toRow(data) }, { onConflict: 'id' })
    .select('*')
    .single();
  handleError(error);
  return fromRow(row);
}

async function getById(table, id) {
  const { data: row, error } = await getSupabase()
    .from(table)
    .select('*')
    .eq('id', id)
    .maybeSingle();
  handleError(error);
  return fromRow(row);
}

async function update(table, id, data) {
  const { data: row, error } = await getSupabase()
    .from(table)
    .update({ ...toRow(data), updated_at: now() })
    .eq('id', id)
    .select('*')
    .single();
  handleError(error);
  return fromRow(row);
}

async function findOne(table, field, operator, value) {
  const query = applyFilters(getSupabase().from(table).select('*'), [[field, operator, value]]).limit(1);
  const { data, error } = await query;
  handleError(error);
  return fromRow((data || [])[0]);
}

async function list(table, filters = [], options = {}) {
  let query = applyFilters(getSupabase().from(table).select('*'), filters);
  if (options.orderBy) query = query.order(toColumn(options.orderBy), { ascending: options.direction !== 'desc' });
  if (options.limit) query = query.limit(options.limit);
  const { data, error } = await query;
  handleError(error);
  return (data || []).map(fromRow);
}

module.exports = {
  now,
  create,
  setWithId,
  getById,
  update,
  findOne,
  list
};

