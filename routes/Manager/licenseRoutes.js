const express = require("express");
const router = express.Router();
const licenseController = require("../../controllers/Manager/licenseController");

router.get("/getLicenses", licenseController.getAllLicenses);
router.get("/stats", licenseController.getLicenseStats);
router.get("/active", licenseController.getActiveLicense);
router.get("/verify", licenseController.verifyLicense);
router.post("/verify", licenseController.verifyLicense);
router.post("/generate", licenseController.generateLicense);
router.post("/activate", licenseController.activateLicense);
router.patch("/toggle-active/:id", licenseController.toggleLicenseActive);
router.put("/update/:id", licenseController.updateLicense);
router.patch("/status/:id", licenseController.updateLicenseStatus);
router.post("/extend/:id", licenseController.extendLicenseExpiry);
router.get("/download/:id", licenseController.downloadLicenseFile);
router.delete("/deleteLicenseById/:id", licenseController.deleteLicense);

module.exports = router;

