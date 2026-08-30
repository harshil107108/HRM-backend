const express = require("express");
const router = express.Router();
const bankMasterController = require("../../controllers/Master/BankMaster");

router.post("/getBank", bankMasterController.getBank);
router.post("/getBankById", bankMasterController.getBankById);
router.post("/getBankHelp", bankMasterController.getBankHelp);
router.post("/addEditBank", bankMasterController.addEditBank);
router.post("/deleteBankById", bankMasterController.deleteBankById);


module.exports = router;