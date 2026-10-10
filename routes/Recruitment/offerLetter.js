const express = require("express");
const router = express.Router();
const offerController = require("../../controllers/Recruitment/OfferLetter");

router.post("/getOfferLetters", offerController.getOfferLetters);
router.post("/getOfferLetterById", offerController.getOfferLetterById);
router.post("/addEditOfferLetter", offerController.addEditOfferLetter);
router.post("/deleteOfferLetterById", offerController.deleteOfferLetterById);

module.exports = router;
