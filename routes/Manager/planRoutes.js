const express = require("express");
const router = express.Router();
const planController = require("../../controllers/Manager/planController");

router.get("/getPlans", planController.getAllPlans);
router.get("/getPlanById/:id", planController.getPlanById);
router.post("/addEditPlan", planController.createPlan);
router.put("/updatePlan/:id", planController.updatePlan);
router.delete("/deletePlanById/:id", planController.deletePlan);
router.post("/seedDefaults", planController.seedDefaultPlans);

module.exports = router;

