const express = require("express");
const router = express.Router();
const logController = require("../../controllers/Attendance/AttendanceLog");

router.post("/getAttendanceLogs", logController.getAttendanceLogs);
router.post("/getAttendanceLogById", logController.getAttendanceLogById);
router.post("/addEditAttendanceLog", logController.addEditAttendanceLog);
router.post("/deleteAttendanceLogById", logController.deleteAttendanceLogById);

module.exports = router;
