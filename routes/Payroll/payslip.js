const express = require("express");
const router = express.Router();
const payslipController = require("../../controllers/Payroll/Payslip");
const { authenticate, authorizeRequest } = require("../../middlewares/auth");

router.use(authenticate, authorizeRequest);

router.post("/getPayslips", payslipController.getPayslips);
router.post("/getPayslipById", payslipController.getPayslipById);
router.post("/addEditPayslip", payslipController.addEditPayslip);
router.post("/deletePayslipById", payslipController.deletePayslipById);
router.post("/getSalarySettings", payslipController.getSalarySettings);
router.post("/saveSalarySettings", payslipController.saveSalarySettings);
router.post("/getEmployeeLeaveDeduction", payslipController.getEmployeeLeaveDeduction);
router.post("/getPayrollCalendarData", payslipController.getPayrollCalendarData);

module.exports = router;
