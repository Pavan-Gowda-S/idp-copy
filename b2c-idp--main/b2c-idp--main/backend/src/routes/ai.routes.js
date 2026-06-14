const router = require('express').Router();
const controller = require('../controllers/ai.controller');
const validate = require('../middlewares/validate.middleware');
const { authenticate } = require('../middlewares/auth.middleware');

router.use(authenticate);
router.post('/:code/image-analysis', controller.codeParam, validate, controller.imageAnalysis);
router.post('/:code/progress-estimation', controller.codeParam, validate, controller.progressEstimation);
router.post('/:code/timeline-prediction', controller.codeParam, validate, controller.timelinePrediction);
router.post('/:code/material-prediction', controller.codeParam, validate, controller.materialPrediction);
router.post('/:code/chatbot', controller.codeParam, validate, controller.chatbot);

module.exports = router;

