const express = require("express");
const router = express.Router();
const requestController = require("../../controllers/Leave/LeaveRequest");
const { authenticate, authorizeRequest } = require("../../middlewares/auth");

router.use(authenticate, authorizeRequest);
router.post("/updateLeaveRequestStatus", requestController.updateLeaveRequestStatus);

module.exports = router;
