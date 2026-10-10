const express = require("express");
const router = express.Router();
const requestController = require("../../controllers/Attendance/AttendanceRequest");

router.post("/getAttendanceRequests", requestController.getAttendanceRequests);
router.post("/getAttendanceRequestById", requestController.getAttendanceRequestById);
router.post("/addEditAttendanceRequest", requestController.addEditAttendanceRequest);
router.post("/deleteAttendanceRequestById", requestController.deleteAttendanceRequestById);

module.exports = router;
