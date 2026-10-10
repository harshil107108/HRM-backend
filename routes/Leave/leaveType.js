const express = require("express");
const router = express.Router();
const typeController = require("../../controllers/Leave/LeaveType");

router.post("/getLeaveTypes", typeController.getLeaveTypes);
router.post("/getLeaveTypeById", typeController.getLeaveTypeById);
router.post("/addEditLeaveType", typeController.addEditLeaveType);
router.post("/deleteLeaveTypeById", typeController.deleteLeaveTypeById);
router.post("/getLeaveTypeHelp", typeController.getLeaveTypeHelp);

module.exports = router;
