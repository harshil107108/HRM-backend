const express = require("express");
const router = express.Router();
const dayReportController = require("../../controllers/Employee/DayReport");
const { authenticate, authorizeRequest } = require("../../middlewares/auth");

router.use(authenticate, authorizeRequest);

router.post("/getDayReport", dayReportController.getDayReport);
router.post("/addActivity", dayReportController.addActivity);
router.post("/updateActivity", dayReportController.updateActivity);
router.post("/deleteActivity", dayReportController.deleteActivity);
router.post("/toggleLock", dayReportController.toggleLock);
router.post("/getAllDayReports", dayReportController.getAllDayReports);
router.post("/unlockDayReport", dayReportController.unlockDayReport);

module.exports = router;
