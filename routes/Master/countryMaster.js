const express = require("express");

const router = express.Router();

const countryMasterController = require("../../controllers/Master/CountryMaster");

// Get all countries
router.post("/getCountry", countryMasterController.getCountry);

// Get country by ID
router.post("/getCountryById", countryMasterController.getCountryById);

// Add / Edit country
router.post("/addEditCountry", countryMasterController.addEditCountry);

// Delete country by ID
router.post("/deleteCountryById", countryMasterController.deleteCountryById);

// Get country dropdown
router.post("/getCountryHelp", countryMasterController.getCountryHelp);

module.exports = router;