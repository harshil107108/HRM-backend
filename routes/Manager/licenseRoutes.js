const express = require("express");
const router = express.Router();
const licenseController = require("../../controllers/Manager/licenseController");
const jwt = require("jsonwebtoken");

// Guard: Only Super Admin can access Manager suite operations
const requireSuperAdminManager = (req, res, next) => {
    if (req.isSuperAdmin) return next();
    const authHeader = req.headers.authorization || "";
    if (authHeader.startsWith("Bearer ")) {
        try {
            const token = authHeader.slice(7);
            const decoded = jwt.decode(token);
            if (
                decoded &&
                (decoded.role === "SUPER_ADMIN" ||
                    decoded.roleCode === "SUPER_ADMIN" ||
                    decoded.primaryRole === "SUPER_ADMIN" ||
                    decoded.isSuperAdmin === true)
            ) {
                req.isSuperAdmin = true;
                return next();
            }
        } catch {}
    }
    return res.status(403).json({
        success: false,
        message: "Access Denied: The Manager module is restricted strictly to Super Administrators.",
    });
};

// Client and activation routes
router.get("/active", licenseController.getActiveLicense);
router.get("/verify", licenseController.verifyLicense);
router.post("/verify", licenseController.verifyLicense);
router.post("/activate", licenseController.activateLicense);
router.get("/download/:id", licenseController.downloadLicenseFile);

// Super-Admin only routes
router.get("/getLicenses", requireSuperAdminManager, licenseController.getAllLicenses);
router.get("/stats", requireSuperAdminManager, licenseController.getLicenseStats);
router.post("/generate", requireSuperAdminManager, licenseController.generateLicense);
router.patch("/toggle-active/:id", requireSuperAdminManager, licenseController.toggleLicenseActive);
router.put("/update/:id", requireSuperAdminManager, licenseController.updateLicense);
router.patch("/status/:id", requireSuperAdminManager, licenseController.updateLicenseStatus);
router.post("/extend/:id", requireSuperAdminManager, licenseController.extendLicenseExpiry);
router.delete("/deleteLicenseById/:id", requireSuperAdminManager, licenseController.deleteLicense);

module.exports = router;

