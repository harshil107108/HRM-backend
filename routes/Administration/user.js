const express = require("express");
const router = express.Router();
const userController = require("../../controllers/Administration/User");

router.post("/getUsers", userController.getUsers);
router.post("/getUserById", userController.getUserById);
router.post("/addEditUser", userController.addEditUser);
router.post("/deleteUserById", userController.deleteUserById);

module.exports = router;
