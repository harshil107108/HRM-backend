const express = require("express");
const router = express.Router();
const policyController = require("../../controllers/Leave/LeavePolicy");

router.post("/getLeavePolicies", policyController.getLeavePolicies);
router.post("/getLeavePolicyById", policyController.getLeavePolicyById);
router.post("/addEditLeavePolicy", policyController.addEditLeavePolicy);
router.post("/deleteLeavePolicyById", policyController.deleteLeavePolicyById);

module.exports = router;
