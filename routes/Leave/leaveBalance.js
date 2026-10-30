const express = require("express");
const router = express.Router();
const balanceController = require("../../controllers/Leave/LeaveBalance");
const { authenticate, authorizeRequest } = require("../../middlewares/auth");

router.use(authenticate, authorizeRequest);

router.post("/getLeaveBalances", balanceController.getLeaveBalances);
router.post("/getLeaveBalanceById", balanceController.getLeaveBalanceById);
router.post("/addEditLeaveBalance", balanceController.addEditLeaveBalance);
router.post("/deleteLeaveBalanceById", balanceController.deleteLeaveBalanceById);

module.exports = router;

