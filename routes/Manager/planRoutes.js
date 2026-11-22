const express = require("express");
const router = express.Router();
const planController = require("../../controllers/Manager/planController");
const jwt = require("jsonwebtoken");

// Guard: Only Super Admin can access Plan management
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
        message: "Access Denied: Plan Management is restricted strictly to Super Administrators.",
    });
};

router.get("/getPlans", planController.getAllPlans);
router.get("/getPlanById/:id", planController.getPlanById);
router.post("/addEditPlan", requireSuperAdminManager, planController.createPlan);
router.put("/updatePlan/:id", requireSuperAdminManager, planController.updatePlan);
router.delete("/deletePlanById/:id", requireSuperAdminManager, planController.deletePlan);
router.post("/seedDefaults", requireSuperAdminManager, planController.seedDefaultPlans);

module.exports = router;

