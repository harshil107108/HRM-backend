const express = require("express");
const router = express.Router();
const dashboardController = require("../../controllers/Dashboard/DashboardStats");

router.post("/getDashboardStats", dashboardController.getDashboardStats);
router.get("/getDashboardStats", dashboardController.getDashboardStats);
router.post("/getRecentActivities", dashboardController.getRecentActivities);
router.post("/updateActivityStatus", dashboardController.updateActivityStatus);

module.exports = router;
