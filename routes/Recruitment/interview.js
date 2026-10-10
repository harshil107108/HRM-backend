const express = require("express");
const router = express.Router();
const interviewController = require("../../controllers/Recruitment/Interview");

router.post("/getInterviews", interviewController.getInterviews);
router.post("/getInterviewById", interviewController.getInterviewById);
router.post("/addEditInterview", interviewController.addEditInterview);
router.post("/deleteInterviewById", interviewController.deleteInterviewById);

module.exports = router;
