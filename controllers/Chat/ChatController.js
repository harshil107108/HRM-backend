const ChatMessage = require("../../modals/Chat/ChatMessageModel");
const EmployeeMaster = require("../../modals/Employee/EmployeeMasterModel");

// Helper to compute 24-hour cutoff timestamp (messages older than 24h expire and auto-delete)
const get24HourExpiryThreshold = () => new Date(Date.now() - 24 * 60 * 60 * 1000);

// Get all active colleagues with their latest message preview and unread counts (last 24 hours)
module.exports.getColleagues = async (req, res) => {
    try {
        const currentUserId = req.user?.employee?._id;
        if (!currentUserId) {
            return res.status(401).json({ success: false, message: "Unauthorized." });
        }

        const expiryThreshold = get24HourExpiryThreshold();

        // Proactive purge: delete chat messages older than 24 hours
        try {
            await ChatMessage.deleteMany({ createdAt: { $lt: expiryThreshold } });
        } catch (cleanupErr) {
            console.warn("[ChatController] Auto-purge error:", cleanupErr.message);
        }

        // Fetch active employees except current user
        const employees = await EmployeeMaster.find({
            _id: { $ne: currentUserId },
            isActive: true,
            employeeStatus: { $ne: "INACTIVE" },
        })
            .select("_id employeeId firstName middleName lastName officialEmail profileImage primaryRole departmentId designationId")
            .populate("departmentId", "departmentName")
            .populate("designationId", "designationName")
            .lean();

        // Fetch latest messages and unread counts in parallel (within the 24h retention window)
        const enrichedColleagues = await Promise.all(
            employees.map(async (emp) => {
                const colleagueId = emp._id;

                const [lastMessage, unreadCount] = await Promise.all([
                    ChatMessage.findOne({
                        $or: [
                            { sender: currentUserId, recipient: colleagueId },
                            { sender: colleagueId, recipient: currentUserId },
                        ],
                        createdAt: { $gte: expiryThreshold },
                    })
                        .sort({ createdAt: -1 })
                        .lean(),

                    ChatMessage.countDocuments({
                        sender: colleagueId,
                        recipient: currentUserId,
                        isRead: false,
                        createdAt: { $gte: expiryThreshold },
                    }),
                ]);

                const fullName = [emp.firstName, emp.middleName, emp.lastName]
                    .filter(Boolean)
                    .join(" ");

                return {
                    _id: emp._id,
                    employeeId: emp.employeeId,
                    name: fullName || "Colleague",
                    email: emp.officialEmail,
                    profileImage: emp.profileImage || "",
                    role: emp.primaryRole,
                    designation: emp.designationId?.designationName || emp.primaryRole || "",
                    department: emp.departmentId?.departmentName || "",
                    lastMessage: lastMessage
                        ? {
                              _id: lastMessage._id,
                              message: lastMessage.message,
                              sender: lastMessage.sender,
                              isRead: lastMessage.isRead,
                              createdAt: lastMessage.createdAt,
                          }
                        : null,
                    unreadCount: unreadCount || 0,
                };
            })
        );

        // Sort: colleagues with most recent messages first, then alphabetically
        enrichedColleagues.sort((a, b) => {
            if (a.lastMessage && b.lastMessage) {
                return new Date(b.lastMessage.createdAt) - new Date(a.lastMessage.createdAt);
            }
            if (a.lastMessage) return -1;
            if (b.lastMessage) return 1;
            return a.name.localeCompare(b.name);
        });

        // Compute total unread for current user in last 24h
        const totalUnread = enrichedColleagues.reduce((acc, c) => acc + (c.unreadCount || 0), 0);

        res.status(200).json({
            success: true,
            data: {
                colleagues: enrichedColleagues,
                totalUnread,
            },
        });
    } catch (error) {
        console.error("[ChatController] getColleagues error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get conversation messages between current user and target user (within last 24 hours)
module.exports.getMessages = async (req, res) => {
    try {
        const currentUserId = req.user?.employee?._id;
        const { targetUserId } = req.params;

        if (!currentUserId) {
            return res.status(401).json({ success: false, message: "Unauthorized." });
        }
        if (!targetUserId) {
            return res.status(400).json({ success: false, message: "Target user ID is required." });
        }

        const expiryThreshold = get24HourExpiryThreshold();

        const messages = await ChatMessage.find({
            $or: [
                { sender: currentUserId, recipient: targetUserId },
                { sender: targetUserId, recipient: currentUserId },
            ],
            createdAt: { $gte: expiryThreshold },
        })
            .populate("sender", "firstName middleName lastName profileImage employeeId")
            .sort({ createdAt: 1 })
            .limit(150)
            .lean();

        res.status(200).json({
            success: true,
            data: messages,
        });
    } catch (error) {
        console.error("[ChatController] getMessages error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Send a chat message (REST fallback / endpoint)
module.exports.sendMessage = async (req, res) => {
    try {
        const currentUserId = req.user?.employee?._id;
        const { recipientId, message, messageType } = req.body || {};

        if (!currentUserId) {
            return res.status(401).json({ success: false, message: "Unauthorized." });
        }
        if (!recipientId) {
            return res.status(400).json({ success: false, message: "Recipient ID is required." });
        }
        if (String(currentUserId) === String(recipientId)) {
            return res.status(400).json({ success: false, message: "Cannot send message to yourself." });
        }
        if (!message || !message.trim()) {
            return res.status(400).json({ success: false, message: "Message cannot be empty." });
        }

        const newMsg = await ChatMessage.create({
            sender: currentUserId,
            recipient: recipientId,
            message: message.trim(),
            messageType: messageType || "text",
            isRead: false,
            createdAt: new Date(),
        });

        const populatedMsg = await ChatMessage.findById(newMsg._id)
            .populate("sender", "firstName middleName lastName profileImage employeeId")
            .lean();

        res.status(201).json({
            success: true,
            data: populatedMsg,
        });
    } catch (error) {
        console.error("[ChatController] sendMessage error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Mark all unread messages from a colleague as read
module.exports.markAsRead = async (req, res) => {
    try {
        const currentUserId = req.user?.employee?._id;
        const { senderId } = req.body || {};

        if (!currentUserId) {
            return res.status(401).json({ success: false, message: "Unauthorized." });
        }
        if (!senderId) {
            return res.status(400).json({ success: false, message: "Sender ID is required." });
        }

        const expiryThreshold = get24HourExpiryThreshold();

        await ChatMessage.updateMany(
            {
                sender: senderId,
                recipient: currentUserId,
                isRead: false,
                createdAt: { $gte: expiryThreshold },
            },
            {
                $set: {
                    isRead: true,
                    readAt: new Date(),
                },
            }
        );

        const totalUnread = await ChatMessage.countDocuments({
            recipient: currentUserId,
            isRead: false,
            createdAt: { $gte: expiryThreshold },
        });

        res.status(200).json({
            success: true,
            data: { totalUnread },
        });
    } catch (error) {
        console.error("[ChatController] markAsRead error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get total unread count across all colleagues for current user (within last 24h)
module.exports.getUnreadCount = async (req, res) => {
    try {
        const currentUserId = req.user?.employee?._id;
        if (!currentUserId) {
            return res.status(200).json({ success: true, data: { unreadCount: 0 } });
        }

        const expiryThreshold = get24HourExpiryThreshold();

        const unreadCount = await ChatMessage.countDocuments({
            recipient: currentUserId,
            isRead: false,
            createdAt: { $gte: expiryThreshold },
        });

        res.status(200).json({
            success: true,
            data: { unreadCount },
        });
    } catch (error) {
        console.error("[ChatController] getUnreadCount error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};
