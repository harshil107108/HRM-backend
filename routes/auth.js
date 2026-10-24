const express = require("express");
const router = express.Router();
const authController = require("../controllers/Auth");
const { authenticate } = require("../middlewares/auth");

router.post("/login", authController.login);
router.post("/face-login", authController.faceLogin);
router.post("/face-enroll", authController.faceEnroll);
router.get("/enrollment-candidates", authController.getEnrollmentCandidates);
router.post("/me", authenticate, authController.me);
router.get("/me", authenticate, authController.me);

module.exports = router;
