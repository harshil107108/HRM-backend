const express = require("express");

const router = express.Router();

const cityMasterController = require("../../controllers/Master/CityMaster");


router.post("/getCity", cityMasterController.getCity);

router.post("/getCityById", cityMasterController.getCityById);

router.post("/addEditCity", cityMasterController.addEditCity);

router.post("/deleteCityById", cityMasterController.deleteCityById);

router.post("/getCityHelp", cityMasterController.getCityHelp);


module.exports = router;