const router = require('express').Router();
const controller = require('../controllers/auth.controller');
const validate = require('../middlewares/validate.middleware');
const { authenticate } = require('../middlewares/auth.middleware');

router.post('/builder/register', controller.registerBuilderValidation, validate, controller.registerBuilder);
router.post('/builder/login', controller.loginBuilderValidation, validate, controller.loginBuilder);
router.post('/builder/google', controller.googleLoginValidation, validate, controller.loginBuilderGoogle);

router.post('/customer/otp/send', controller.sendOtpValidation, validate, controller.sendCustomerOtp);
router.post('/customer/otp/verify', controller.verifyOtpValidation, validate, controller.verifyCustomerOtp);
router.post('/customer/login', controller.verifyOtpValidation, validate, controller.loginCustomer);

router.post('/builder/register-legacy', controller.legacyRegisterBuilderValidation, validate, controller.legacyRegisterBuilder);
router.post('/builder/login-legacy', controller.legacyLoginBuilderValidation, validate, controller.legacyLoginBuilder);

router.get('/me', authenticate, controller.me);

module.exports = router;
