const express = require("express");
const router = express.Router();
const auditController = require("../../controllers/Administration/AuditLog");

router.post("/getAuditLogs", auditController.getAuditLogs);
router.post("/createAuditLog", auditController.createAuditLog);

module.exports = router;
