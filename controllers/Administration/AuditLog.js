const AuditLog = require("../../modals/Administration/AuditLogModel");

module.exports.getAuditLogs = async (req, res) => {
    try {
        const logs = await AuditLog.find({}).sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            data: logs,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

module.exports.createAuditLog = async (req, res) => {
    try {
        const log = await AuditLog.create(req.body);
        res.status(201).json({
            success: true,
            data: log,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};
