const express = require("express");
const router = express.Router();
const taxController = require("../../controllers/Payroll/TaxManagement");

router.post("/getTaxDeclarations", taxController.getTaxDeclarations);
router.post("/getTaxDeclarationById", taxController.getTaxDeclarationById);
router.post("/addEditTaxDeclaration", taxController.addEditTaxDeclaration);
router.post("/deleteTaxDeclarationById", taxController.deleteTaxDeclarationById);

module.exports = router;
