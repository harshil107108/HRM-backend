const Notification = require("../../modals/Notification/NotificationModel");
const Task = require("../../modals/Employee/TaskModel");

module.exports.getNotifications = async (req, res) => {
    try {
        const employeeId = req.user?.employee?._id;
        if (!employeeId) {
            return res.status(200).json({
                success: true,
                data: { notifications: [], unreadCount: 0 },
            });
        }

        // Auto-purge notifications older than 24 hours (next day auto-delete)
        const expiryThreshold = new Date(Date.now() - 24 * 60 * 60 * 1000);
        try {
            await Notification.deleteMany({
                recipient: employeeId,
                createdAt: { $lt: expiryThreshold },
            });
        } catch (cleanupErr) {
            console.warn("[NotificationController] Auto-purge error:", cleanupErr.message);
        }

        // Auto-sync: Check if there are tasks assigned to this employee in the last 24h that don't have a notification record yet
        try {
            const existingNotifTaskIds = await Notification.find({
                recipient: employeeId,
                "metadata.taskId": { $exists: true, $ne: null },
            }).distinct("metadata.taskId");

            const unnotifiedTasks = await Task.find({
                assignedTo: employeeId,
                _id: { $nin: existingNotifTaskIds },
                createdAt: { $gte: expiryThreshold },
            })
                .populate("createdBy", "firstName middleName lastName")
                .sort({ createdAt: -1 })
                .limit(10);

            if (unnotifiedTasks.length > 0) {
                const autoNotifs = unnotifiedTasks.map((task) => {
                    const creatorName = [
                        task.createdBy?.firstName,
                        task.createdBy?.lastName,
                    ].filter(Boolean).join(" ") || "Your Manager";

                    return {
                        recipient: employeeId,
                        sender: task.createdBy?._id || null,
                        type: "TASK_ASSIGNED",
                        title: "Task Assigned",
                        message: `${creatorName} assigned you a task: "${task.title}"`,
                        metadata: {
                            taskId: task._id,
                            projectId: task.projectId,
                            priority: task.priority || "Medium",
                            dueDate: task.dueDate,
                        },
                        isRead: false,
                        createdAt: task.createdAt || new Date(),
                    };
                });

                await Notification.insertMany(autoNotifs);
            }
        } catch (syncErr) {
            console.warn("[NotificationController] Initial task sync skipped:", syncErr.message);
        }

        const notifications = await Notification.find({
            recipient: employeeId,
            createdAt: { $gte: expiryThreshold },
        })
            .populate("sender", "firstName middleName lastName profileImage employeeId")
            .sort({ createdAt: -1 })
            .limit(50);

        const unreadCount = await Notification.countDocuments({
            recipient: employeeId,
            isRead: false,
            createdAt: { $gte: expiryThreshold },
        });

        res.status(200).json({
            success: true,
            notifications,
            unreadCount,
            data: {
                notifications,
                unreadCount,
            },
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

module.exports.markAsRead = async (req, res) => {
    try {
        const employeeId = req.user?.employee?._id;
        if (!employeeId) {
            return res.status(401).json({ success: false, message: "Unauthorized." });
        }

        const { id, all } = req.body || {};

        if (all) {
            await Notification.updateMany(
                { recipient: employeeId, isRead: false },
                { $set: { isRead: true } }
            );
        } else if (id) {
            await Notification.updateOne(
                { _id: id, recipient: employeeId },
                { $set: { isRead: true } }
            );
        }

        const unreadCount = await Notification.countDocuments({
            recipient: employeeId,
            isRead: false,
        });

        res.status(200).json({
            success: true,
            message: "Notifications marked as read.",
            data: { unreadCount },
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

module.exports.clearNotifications = async (req, res) => {
    try {
        const employeeId = req.user?.employee?._id;
        if (!employeeId) {
            return res.status(401).json({ success: false, message: "Unauthorized." });
        }

        await Notification.deleteMany({ recipient: employeeId });

        res.status(200).json({
            success: true,
            message: "All notifications cleared.",
            data: { notifications: [], unreadCount: 0 },
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};
