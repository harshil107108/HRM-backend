const express = require("express");
const router = express.Router();
const reimbursementController = require("../../controllers/Payroll/Reimbursement");

router.post("/getReimbursements", reimbursementController.getReimbursements);
router.post("/getReimbursementById", reimbursementController.getReimbursementById);
router.post("/addEditReimbursement", reimbursementController.addEditReimbursement);
router.post("/deleteReimbursementById", reimbursementController.deleteReimbursementById);

module.exports = router;
