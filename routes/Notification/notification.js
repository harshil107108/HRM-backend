const express = require("express");
const router = express.Router();
const { authenticate } = require("../../middlewares/auth");
const notifController = require("../../controllers/Notification/NotificationController");

router.use(authenticate);

router.get("/", notifController.getNotifications);
router.post("/getNotifications", notifController.getNotifications);
router.post("/markAsRead", notifController.markAsRead);
router.post("/clear", notifController.clearNotifications);

module.exports = router;
