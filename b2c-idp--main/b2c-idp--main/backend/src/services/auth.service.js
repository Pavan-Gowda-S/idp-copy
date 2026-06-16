const bcrypt = require('bcryptjs');
const store = require('./supabase.service');
const collections = require('../supabase/tables');
const AppError = require('../utils/AppError');
const { signToken } = require('../utils/token');

const OTP_TTL_MS = 10 * 60 * 1000;
const MOCK_OTP = '123456';

function normalizePhone(phone) {
  const digits = String(phone || '').replace(/\D/g, '');
  if (digits.length === 10) return digits;
  if (digits.length === 12 && digits.startsWith('91')) return digits.slice(2);
  throw new AppError('Valid 10-digit Indian mobile number required', 400);
}

function builderTokenPayload(builder, userRecord) {
  return {
    id: builder._id,
    userId: userRecord?._id || null,
    role: 'builder',
    name: builder.name,
    email: builder.email || '',
    companyName: builder.companyName
  };
}

function customerTokenPayload(user, projects = []) {
  return {
    id: user.refId || user._id,
    userId: user._id,
    role: 'customer',
    name: user.name,
    phoneNumber: user.phoneNumber || user.phone,
    projects: projects.map((p) => ({
      id: p._id,
      code: p.code,
      title: p.title
    }))
  };
}

async function ensureBuilderUserRecord(builder) {
  let user = await store.findOne(collections.users, 'refId', '==', builder._id);
  if (!user) {
    user = await store.create(collections.users, {
      role: 'BUILDER',
      refId: builder._id,
      name: builder.name,
      email: builder.email || '',
      phoneNumber: builder.phone || '',
      phone: builder.phone || '',
      username: builder.username
    });
  }
  return user;
}

async function registerBuilder({ name, email, password, companyName, phone }) {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  const exists = await store.findOne(collections.builders, 'email', '==', normalizedEmail);
  if (exists) throw new AppError('Email already registered', 409);

  const username = normalizedEmail.split('@')[0].replace(/[^a-z0-9_]/g, '_').slice(0, 24)
    || `builder_${Date.now()}`;

  const builder = await store.create(collections.builders, {
    name,
    username,
    email: normalizedEmail,
    phone: phone || '',
    companyName: companyName || name,
    passwordHash: await bcrypt.hash(password, 12),
    isActive: true
  });

  await store.create(collections.users, {
    role: 'BUILDER',
    refId: builder._id,
    name: builder.name,
    email: normalizedEmail,
    phoneNumber: phone || '',
    phone: phone || '',
    username: builder.username
  });

  const payload = builderTokenPayload(builder);
  return { token: signToken(payload), user: payload };
}

async function loginBuilderWithPassword({ email, password }) {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  const builder = await store.findOne(collections.builders, 'email', '==', normalizedEmail);
  if (!builder || !builder.passwordHash) throw new AppError('Invalid builder credentials', 401);

  const valid = await bcrypt.compare(password, builder.passwordHash);
  if (!valid) throw new AppError('Invalid builder credentials', 401);

  await ensureBuilderUserRecord(builder);
  const payload = builderTokenPayload(builder);
  return { token: signToken(payload), user: payload };
}

async function loginBuilderWithGoogle({ email, name, googleId }) {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  if (!normalizedEmail || !googleId) throw new AppError('Google profile incomplete', 400);

  let builder = await store.findOne(collections.builders, 'email', '==', normalizedEmail);
  if (!builder) {
    const username = normalizedEmail.split('@')[0].replace(/[^a-z0-9_]/g, '_').slice(0, 24);
    builder = await store.create(collections.builders, {
      name: name || username,
      username,
      email: normalizedEmail,
      googleId,
      companyName: name || 'Builder Firm',
      passwordHash: null,
      isActive: true
    });
    await store.create(collections.users, {
      role: 'BUILDER',
      refId: builder._id,
      name: builder.name,
      email: normalizedEmail,
      username: builder.username
    });
  } else if (!builder.googleId) {
    await store.update(collections.builders, builder._id, { googleId });
  }

  const payload = builderTokenPayload(builder);
  return { token: signToken(payload), user: payload };
}

async function sendCustomerOtp(phone) {
  const phoneNumber = normalizePhone(phone);
  let user = await store.findOne(collections.users, 'phoneNumber', '==', phoneNumber);
  if (!user) user = await store.findOne(collections.users, 'phone', '==', phoneNumber);
  if (!user || String(user.role).toUpperCase() !== 'CUSTOMER') {
    throw new AppError('No customer account found for this mobile number', 404);
  }

  const otpCode = MOCK_OTP;
  const expiresAt = new Date(Date.now() + OTP_TTL_MS).toISOString();
  await store.create(collections.otpSessions, { phoneNumber, otpCode, expiresAt, verified: false });

  return {
    phoneNumber,
    message: 'OTP sent successfully',
    mockOtp: process.env.NODE_ENV === 'production' ? undefined : otpCode
  };
}

async function verifyCustomerOtp(phone, otp) {
  const phoneNumber = normalizePhone(phone);
  const sessions = await store.list(
    collections.otpSessions,
    [['phoneNumber', '==', phoneNumber]],
    { orderBy: 'createdAt', direction: 'desc', limit: 1 }
  );
  const session = sessions[0];
  if (!session) throw new AppError('OTP session expired. Request a new code.', 400);
  if (new Date(session.expiresAt).getTime() < Date.now()) throw new AppError('OTP expired', 400);
  if (String(session.otpCode) !== String(otp)) throw new AppError('Invalid OTP', 401);

  await store.update(collections.otpSessions, session._id, { verified: true });

  const user = await store.findOne(collections.users, 'phoneNumber', '==', phoneNumber)
    || await store.findOne(collections.users, 'phone', '==', phoneNumber);
  if (!user) throw new AppError('Customer account not found', 404);

  const mappings = await store.list(collections.userProjects, [['userId', '==', user._id]]);
  const projects = [];
  for (const mapping of mappings) {
    const project = await store.getById(collections.projects, mapping.projectId);
    if (project) projects.push(project);
  }

  const payload = customerTokenPayload(user, projects);
  return { token: signToken(payload), user: payload, projects };
}

async function getCustomerProjects(userId) {
  const mappings = await store.list(collections.userProjects, [['userId', '==', userId]]);
  const projects = [];
  for (const mapping of mappings) {
    const project = await store.getById(collections.projects, mapping.projectId);
    if (project) {
      projects.push({
        id: project._id,
        code: project.code,
        title: project.title
      });
    }
  }
  return projects;
}

module.exports = {
  normalizePhone,
  registerBuilder,
  loginBuilderWithPassword,
  loginBuilderWithGoogle,
  sendCustomerOtp,
  verifyCustomerOtp,
  getCustomerProjects,
  builderTokenPayload,
  customerTokenPayload
};
