const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const ChatMessage = require("../modals/Chat/ChatMessageModel");

// Active online users: userId -> Set of socket IDs
const onlineUsers = new Map();

function setupChatSocket(httpServer) {
    const io = new Server(httpServer, {
        cors: {
            origin: [
                "http://localhost:5173",
                "http://localhost:5174",
                "https://orvexa-hrm.netlify.app",
            ],
            credentials: true,
        },
        pingTimeout: 30000,
        pingInterval: 25000,
    });

    // Authentication middleware for socket connections
    io.use(async (socket, next) => {
        try {
            const rawToken =
                socket.handshake.auth?.token ||
                socket.handshake.headers?.authorization;

            if (!rawToken) {
                return next(new Error("Authentication failed: No token provided"));
            }

            const token = rawToken.startsWith("Bearer ") ? rawToken.slice(7) : rawToken;
            const payload = jwt.verify(token, process.env.JWT_SECRET);

            if (!payload || !payload.sub) {
                return next(new Error("Authentication failed: Invalid token payload"));
            }

            socket.userId = String(payload.sub);
            socket.role = payload.role;
            next();
        } catch (err) {
            console.warn("[ChatSocket] Auth failure:", err.message);
            next(new Error("Authentication failed: " + err.message));
        }
    });

    io.on("connection", (socket) => {
        const userId = socket.userId;
        const userRoom = `user:${userId}`;

        socket.join(userRoom);

        // Update online status
        const isFirstSocket = !onlineUsers.has(userId) || onlineUsers.get(userId).size === 0;
        if (!onlineUsers.has(userId)) {
            onlineUsers.set(userId, new Set());
        }
        onlineUsers.get(userId).add(socket.id);

        if (isFirstSocket) {
            // Broadcast to other users that this user is now online
            socket.broadcast.emit("user_online", { userId });
        }

        // Send current list of online users to the newly connected socket
        const currentOnlineList = Array.from(onlineUsers.keys());
        socket.emit("initial_online_users", currentOnlineList);

        // Handle sending a real-time message
        socket.on("send_message", async (data, callback) => {
            try {
                const { recipientId, message, tempId } = data || {};

                if (!recipientId || !message || !message.trim()) {
                    if (callback) callback({ error: "Invalid message payload" });
                    return;
                }
                if (String(recipientId) === String(userId)) {
                    if (callback) callback({ error: "Cannot send message to self" });
                    return;
                }

                // Persist to database
                const newMsg = await ChatMessage.create({
                    sender: userId,
                    recipient: recipientId,
                    message: message.trim(),
                    messageType: "text",
                    isRead: false,
                    createdAt: new Date(),
                });

                const populatedMsg = await ChatMessage.findById(newMsg._id)
                    .populate("sender", "firstName middleName lastName profileImage employeeId")
                    .lean();

                const responseData = {
                    ...populatedMsg,
                    tempId,
                };

                // Emit to recipient's room
                io.to(`user:${recipientId}`).emit("new_message", responseData);

                // Sync to sender's all open tabs/sockets
                io.to(userRoom).emit("message_sent", responseData);

                if (callback) {
                    callback({ success: true, message: responseData });
                }
            } catch (err) {
                console.error("[ChatSocket] send_message error:", err);
                if (callback) callback({ error: "Failed to send message: " + err.message });
            }
        });

        // Typing indicator relay
        socket.on("typing", ({ recipientId, isTyping }) => {
            if (!recipientId) return;
            io.to(`user:${recipientId}`).emit("user_typing", {
                userId,
                isTyping: Boolean(isTyping),
            });
        });

        // Mark messages as read in real-time
        socket.on("mark_as_read", async ({ senderId }, callback) => {
            try {
                if (!senderId) return;

                const expiryThreshold = new Date(Date.now() - 24 * 60 * 60 * 1000);
                await ChatMessage.updateMany(
                    {
                        sender: senderId,
                        recipient: userId,
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

                // Notify sender that their messages have been read
                io.to(`user:${senderId}`).emit("messages_read", {
                    readBy: userId,
                    readAt: new Date(),
                });

                if (callback) callback({ success: true });
            } catch (err) {
                console.error("[ChatSocket] mark_as_read error:", err);
                if (callback) callback({ error: err.message });
            }
        });

        // Handle disconnect
        socket.on("disconnect", () => {
            const userSockets = onlineUsers.get(userId);
            if (userSockets) {
                userSockets.delete(socket.id);
                if (userSockets.size === 0) {
                    onlineUsers.delete(userId);
                    // Broadcast offline event to everyone
                    io.emit("user_offline", { userId });
                }
            }
        });
    });

    return io;
}

module.exports = { setupChatSocket };
