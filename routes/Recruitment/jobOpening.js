const express = require("express");
const router = express.Router();
const jobOpeningMasterController = require("../../controllers/Recruitment/JobOpening");

router.post("/getJobOpening",jobOpeningMasterController.getJobOpening);
router.post( "/getJobOpeningById", jobOpeningMasterController.getJobOpeningById );
router.post( "/getJobOpeningHelp", jobOpeningMasterController.getJobOpeningHelp );
router.post( "/addEditJobOpening", jobOpeningMasterController.addEditJobOpening );
router.post( "/deleteJobOpeningById", jobOpeningMasterController.deleteJobOpeningById );

module.exports = router;