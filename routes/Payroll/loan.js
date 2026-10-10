const express = require("express");
const router = express.Router();
const loanController = require("../../controllers/Payroll/Loan");

router.post("/getLoans", loanController.getLoans);
router.post("/getLoanById", loanController.getLoanById);
router.post("/addEditLoan", loanController.addEditLoan);
router.post("/deleteLoanById", loanController.deleteLoanById);

module.exports = router;
