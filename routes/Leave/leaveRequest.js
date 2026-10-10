const express = require("express");
const router = express.Router();
const requestController = require("../../controllers/Leave/LeaveRequest");

router.post("/getLeaveRequests", requestController.getLeaveRequests);
router.post("/getLeaveRequestById", requestController.getLeaveRequestById);
router.post("/addEditLeaveRequest", requestController.addEditLeaveRequest);
router.post("/deleteLeaveRequestById", requestController.deleteLeaveRequestById);

module.exports = router;
