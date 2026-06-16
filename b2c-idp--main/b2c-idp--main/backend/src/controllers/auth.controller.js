const { body } = require('express-validator');
const authService = require('../services/auth.service');
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
  email: builder.email,
  companyName: builder.companyName
});

exports.registerBuilderValidation = [
  body('name').trim().notEmpty(),
  body('email').trim().isEmail(),
  body('password').isLength({ min: 6 }),
  body('companyName').optional({ checkFalsy: true }).trim(),
  body('phone').optional({ checkFalsy: true }).trim()
];

exports.loginBuilderValidation = [
  body('email').trim().isEmail(),
  body('password').isLength({ min: 6 })
];

exports.googleLoginValidation = [
  body('email').trim().isEmail(),
  body('googleId').trim().notEmpty(),
  body('name').optional({ checkFalsy: true }).trim()
];

exports.sendOtpValidation = [
  body('phoneNumber').trim().notEmpty()
];

exports.verifyOtpValidation = [
  body('phoneNumber').trim().notEmpty(),
  body('otp').trim().isLength({ min: 4, max: 8 })
];

exports.registerBuilder = asyncHandler(async (req, res) => {
  const result = await authService.registerBuilder(req.body);
  created(res, result, 'Builder registered');
});

exports.loginBuilder = asyncHandler(async (req, res) => {
  const result = await authService.loginBuilderWithPassword(req.body);
  ok(res, result, 'Builder login successful');
});

exports.loginBuilderGoogle = asyncHandler(async (req, res) => {
  const result = await authService.loginBuilderWithGoogle(req.body);
  ok(res, result, 'Google login successful');
});

exports.sendCustomerOtp = asyncHandler(async (req, res) => {
  const result = await authService.sendCustomerOtp(req.body.phoneNumber);
  ok(res, result, 'OTP sent');
});

exports.verifyCustomerOtp = asyncHandler(async (req, res) => {
  const result = await authService.verifyCustomerOtp(req.body.phoneNumber, req.body.otp);
  ok(res, result, 'Customer login successful');
});

exports.loginCustomer = asyncHandler(async (req, res) => {
  const result = await authService.verifyCustomerOtp(req.body.phoneNumber, req.body.otp || '123456');
  ok(res, result, 'Customer login successful');
});

exports.me = asyncHandler(async (req, res) => {
  const { passwordHash, ...safeUser } = req.user;
  const response = { role: req.userRole, user: safeUser };

  if (req.userRole === 'customer' && req.authUserId) {
    response.projects = await authService.getCustomerProjects(req.authUserId);
  }

  ok(res, response, 'Profile loaded');
});

// Legacy username login kept for backward compatibility
exports.legacyLoginBuilderValidation = [
  body('username').trim().notEmpty(),
  body('password').isLength({ min: 6 })
];

exports.legacyLoginBuilder = asyncHandler(async (req, res) => {
  const bcrypt = require('bcryptjs');
  const builder = await store.findOne(collections.builders, 'username', '==', req.body.username.toLowerCase());
  if (!builder) throw new AppError('Invalid builder credentials', 401);
  const valid = await bcrypt.compare(req.body.password, builder.passwordHash);
  if (!valid) throw new AppError('Invalid builder credentials', 401);
  const payload = builderPayload(builder);
  ok(res, { token: signToken(payload), user: payload }, 'Builder login successful');
});

exports.legacyRegisterBuilderValidation = [
  body('name').trim().notEmpty(),
  body('username').trim().isLength({ min: 3 }),
  body('password').isLength({ min: 6 }),
  body('email').optional({ checkFalsy: true }).isEmail()
];

exports.legacyRegisterBuilder = asyncHandler(async (req, res) => {
  const bcrypt = require('bcryptjs');
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
    role: 'BUILDER',
    refId: builder._id,
    name: builder.name,
    username: builder.username,
    email: builder.email || '',
    phoneNumber: builder.phone || '',
    phone: builder.phone || ''
  });
  const payload = builderPayload(builder);
  created(res, { token: signToken(payload), user: payload }, 'Builder registered');
});
