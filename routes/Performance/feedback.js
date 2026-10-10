const express = require("express");
const router = express.Router();
const feedbackController = require("../../controllers/Performance/Feedback");

router.post("/getFeedbacks", feedbackController.getFeedbacks);
router.post("/getFeedbackById", feedbackController.getFeedbackById);
router.post("/addEditFeedback", feedbackController.addEditFeedback);
router.post("/deleteFeedbackById", feedbackController.deleteFeedbackById);

module.exports = router;
