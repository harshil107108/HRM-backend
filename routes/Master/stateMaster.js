const express = require("express");

const router = express.Router();

const stateMasterController = require("../../controllers/Master/StateMaster");


router.post("/getState", stateMasterController.getState);

router.post("/getStateById", stateMasterController.getStateById);

router.post("/addEditState", stateMasterController.addEditState);

router.post("/deleteStateById", stateMasterController.deleteStateById);

router.post("/getStateHelp", stateMasterController.getStateHelp);

module.exports = router;