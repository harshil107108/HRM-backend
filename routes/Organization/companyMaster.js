const express = require("express");
const router = express.Router();
const companyMasterController = require("../../controllers/Organization/CompanyMaster");
const uploadImage = require("../../middlewares/uploadImage");


router.post("/getCompany", companyMasterController.getCompany);
router.post("/getCompanyById", companyMasterController.getCompanyById);
router.post("/getCompanyHelp", companyMasterController.getCompanyHelp);
router.post("/addEditCompany", uploadImage("company", "company").single("companyImage"), companyMasterController.addEditCompany);
router.post("/deleteCompanyById", companyMasterController.deleteCompanyById);


module.exports = router;