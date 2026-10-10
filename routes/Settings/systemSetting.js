const express = require("express");
const router = express.Router();
const settingController = require("../../controllers/Settings/SystemSetting");

router.post("/getSettingsByCategory", settingController.getSettingsByCategory);
router.post("/updateSettingsByCategory", settingController.updateSettingsByCategory);

module.exports = router;
