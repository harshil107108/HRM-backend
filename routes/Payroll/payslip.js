const express = require("express");
const router = express.Router();
const payslipController = require("../../controllers/Payroll/Payslip");

router.post("/getPayslips", payslipController.getPayslips);
router.post("/getPayslipById", payslipController.getPayslipById);
router.post("/addEditPayslip", payslipController.addEditPayslip);
router.post("/deletePayslipById", payslipController.deletePayslipById);

module.exports = router;
