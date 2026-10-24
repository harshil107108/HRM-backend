const express = require("express");
const router = express.Router();
const { authenticate } = require("../../middlewares/auth");
const chatController = require("../../controllers/Chat/ChatController");

// Require authentication for all chat routes
router.use(authenticate);

router.get("/colleagues", chatController.getColleagues);
router.get("/messages/:targetUserId", chatController.getMessages);
router.post("/send", chatController.sendMessage);
router.post("/mark-as-read", chatController.markAsRead);
router.get("/unread-count", chatController.getUnreadCount);

module.exports = router;
