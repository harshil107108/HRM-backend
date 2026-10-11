const express = require("express");
const router = express.Router();
const roleController = require("../../controllers/Administration/Role");

router.post("/getRoles", roleController.getRoles);
router.post("/getRoleById", roleController.getRoleById);
router.post("/addEditRole", roleController.addEditRole);
router.post("/deleteRoleById", roleController.deleteRoleById);
router.post("/updateRolePermissions", roleController.updateRolePermissions);
router.post("/getRoleHelp", roleController.getRoleHelp);

module.exports = router;
