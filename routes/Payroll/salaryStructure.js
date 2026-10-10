const express = require("express");
const router = express.Router();
const structureController = require("../../controllers/Payroll/SalaryStructure");

router.post("/getSalaryStructures", structureController.getSalaryStructures);
router.post("/getSalaryStructureById", structureController.getSalaryStructureById);
router.post("/addEditSalaryStructure", structureController.addEditSalaryStructure);
router.post("/deleteSalaryStructureById", structureController.deleteSalaryStructureById);
router.post("/getSalaryStructureHelp", structureController.getSalaryStructureHelp);

module.exports = router;
