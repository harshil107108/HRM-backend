const express = require("express");
const router = express.Router();
const policyController = require("../../controllers/Attendance/WeekendPolicy");

router.post("/getWeekendPolicies", policyController.getWeekendPolicies);
router.post("/getWeekendPolicyById", policyController.getWeekendPolicyById);
router.post("/addEditWeekendPolicy", policyController.addEditWeekendPolicy);
router.post("/deleteWeekendPolicyById", policyController.deleteWeekendPolicyById);

module.exports = router;
