const express = require("express");
const router = express.Router();
const menuController = require("../../controllers/Administration/Menu");

router.post("/getMenus", menuController.getMenus);
router.post("/getMenuById", menuController.getMenuById);
router.post("/getMenuHelp", menuController.getMenuHelp);
router.post("/addEditMenu", menuController.addEditMenu);
router.post("/deleteMenuById", menuController.deleteMenuById);

module.exports = router;
