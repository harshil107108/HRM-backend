const express = require("express");
const router = express.Router();
const onboardingController = require("../../controllers/Recruitment/Onboarding");

router.post("/getOnboarding", onboardingController.getOnboarding);
router.post("/getOnboardingById", onboardingController.getOnboardingById);
router.post("/addEditOnboarding", onboardingController.addEditOnboarding);
router.post("/deleteOnboardingById", onboardingController.deleteOnboardingById);

module.exports = router;
