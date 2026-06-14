const { body } = require('express-validator');
const bcrypt = require('bcryptjs');
const store = require('../services/supabase.service');
const collections = require('../supabase/tables');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { ok, created } = require('../utils/apiResponse');
const { signToken } = require('../utils/token');

const builderPayload = (builder) => ({
  id: builder._id,
  role: 'builder',
  name: builder.name,
  username: builder.username,
  companyName: builder.companyName
});

exports.registerBuilderValidation = [
  body('name').trim().notEmpty(),
  body('username').trim().isLength({ min: 3 }),
  body('password').isLength({ min: 6 }),
  body('email').optional({ checkFalsy: true }).isEmail()
];

exports.loginBuilderValidation = [
  body('username').trim().notEmpty(),
  body('password').isLength({ min: 6 })
];

exports.customerLoginValidation = [
  body('projectCode').matches(/^\d{10}$/).withMessage('Valid 10-digit project code is required')
];

exports.registerBuilder = asyncHandler(async (req, res) => {
  const exists = await store.findOne(collections.builders, 'username', '==', req.body.username.toLowerCase());
  if (exists) throw new AppError('Username already exists', 409);
  const builder = await store.create(collections.builders, {
    name: req.body.name,
    username: req.body.username.toLowerCase(),
    email: req.body.email,
    phone: req.body.phone,
    companyName: req.body.companyName,
    passwordHash: await bcrypt.hash(req.body.password, 12),
    isActive: true
  });
  await store.create(collections.users, {
    role: 'builder',
    refId: builder._id,
    name: builder.name,
    username: builder.username,
    email: builder.email || '',
    phone: builder.phone || ''
  });
  const payload = builderPayload(builder);
  created(res, { token: signToken(payload), user: payload }, 'Builder registered');
});

exports.loginBuilder = asyncHandler(async (req, res) => {
  const builder = await store.findOne(collections.builders, 'username', '==', req.body.username.toLowerCase());
  if (!builder) throw new AppError('Invalid builder credentials', 401);
  const valid = await bcrypt.compare(req.body.password, builder.passwordHash);
  if (!valid) throw new AppError('Invalid builder credentials', 401);
  const payload = builderPayload(builder);
  ok(res, { token: signToken(payload), user: payload }, 'Builder login successful');
});

exports.loginCustomer = asyncHandler(async (req, res) => {
  const customer = await store.findOne(collections.customers, 'projectCode', '==', req.body.projectCode);
  if (!customer) throw new AppError('Project code not found', 404);
  const project = await store.findOne(collections.projects, 'code', '==', req.body.projectCode);
  const payload = { id: customer._id, role: 'customer', projectCode: customer.projectCode, name: customer.name };
  ok(res, { token: signToken(payload), user: payload, project }, 'Customer login successful');
});

exports.me = asyncHandler(async (req, res) => {
  const { passwordHash, ...safeUser } = req.user;
  ok(res, { role: req.userRole, user: safeUser }, 'Profile loaded');
});

