const express = require("express");
const router = express.Router();
const shiftController = require("../../controllers/Attendance/Shift");

router.post("/getShifts", shiftController.getShifts);
router.post("/getShiftById", shiftController.getShiftById);
router.post("/addEditShift", shiftController.addEditShift);
router.post("/deleteShiftById", shiftController.deleteShiftById);
router.post("/getShiftHelp", shiftController.getShiftHelp);

module.exports = router;
