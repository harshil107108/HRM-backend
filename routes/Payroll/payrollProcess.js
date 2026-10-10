const express = require("express");
const router = express.Router();
const processController = require("../../controllers/Payroll/PayrollProcess");

router.post("/getPayrollProcesses", processController.getPayrollProcesses);
router.post("/getPayrollProcessById", processController.getPayrollProcessById);
router.post("/addEditPayrollProcess", processController.addEditPayrollProcess);
router.post("/deletePayrollProcessById", processController.deletePayrollProcessById);

module.exports = router;
