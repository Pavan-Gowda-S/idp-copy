const asyncHandler = require('../utils/asyncHandler');
const { ok } = require('../utils/apiResponse');
const builderService = require('../services/builder.service');

exports.listCustomers = asyncHandler(async (req, res) => {
  const customers = await builderService.getBuilderCustomers(req.user._id);
  ok(res, { customers }, 'Builder customers loaded');
});
