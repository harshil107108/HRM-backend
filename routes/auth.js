const express = require("express");
const router = express.Router();
const authController = require("../controllers/Auth");
const { authenticate } = require("../middlewares/auth");

router.post("/login", authController.login);
router.post("/me", authenticate, authController.me);
router.get("/me", authenticate, authController.me);

module.exports = router;
