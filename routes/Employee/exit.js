const express = require("express");
const router = express.Router();
const exitController = require("../../controllers/Employee/ExitManagement");

router.post("/getExit", exitController.getExit);
router.post("/getExitById", exitController.getExitById);
router.post("/addEditExit", exitController.addEditExit);
router.post("/deleteExitById", exitController.deleteExitById);

module.exports = router;
