const express = require("express");
const router = express.Router();
const menuController = require("../../controllers/Administration/Menu");

router.post("/getMenus", menuController.getMenus);
router.post("/getMenu", menuController.getMenus);
router.post("/getMenuById", menuController.getMenuById);
router.post("/getMenuHelp", menuController.getMenuHelp);
router.post("/getMenuTree", menuController.getMenuTree);
router.post("/addEditMenu", menuController.addEditMenu);
router.post("/deleteMenuById", menuController.deleteMenuById);
router.post("/seedDefaults", menuController.seedDefaults);

module.exports = router;
