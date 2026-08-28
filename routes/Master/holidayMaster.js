const express = require("express");
const router = express.Router();
const holidayMasterController = require("../../controllers/Master/HolidayMaster");


// Get all holidays
router.post(
    "/getHoliday",
    holidayMasterController.getHoliday
);


// Get holiday by ID
router.post(
    "/getHolidayById",
    holidayMasterController.getHolidayById
);


// Get holiday dropdown / help
router.post(
    "/getHolidayHelp",
    holidayMasterController.getHolidayHelp
);


// Add / Edit holiday
router.post(
    "/addEditHoliday",
    holidayMasterController.addEditHoliday
);


// Delete holiday by ID
router.post(
    "/deleteHolidayById",
    holidayMasterController.deleteHolidayById
);


module.exports = router;