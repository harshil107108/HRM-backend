const bcrypt = require("bcryptjs");
const LicenseKey = require("../../modals/Manager/LicenseKeyModel");
const Plan = require("../../modals/Manager/PlanModel");
const LicenseAuditLog = require("../../modals/Manager/LicenseAuditLogModel");
const EmployeeMaster = require("../../modals/Employee/EmployeeMasterModel");
const User = require("../../modals/Administration/UserModel");
const { provisionTenantDatabase } = require("../../utils/tenantConnectionManager");
const { invalidateLicenseKeyCache } = require("../../middlewares/tenantResolver");
const {
    generateFormattedKey,
    signLicensePayload,
    evaluateLicenseStatus,
    generateLicenseFileContent,
    invalidateLicenseCache,
    verifyLicenseSignature,
} = require("../../utils/licenseCrypto");

/**
 * Provision or update Client Admin Employee account from License Credentials
 */
async function provisionClientAdminUser(clientInfo, adminCredentials) {
    if (!adminCredentials?.username || !adminCredentials?.password) return null;
    const cleanUsername = String(adminCredentials.username).trim().toLowerCase();
    const rawPassword = String(adminCredentials.password);

    try {
        const hashedPassword = await bcrypt.hash(rawPassword, 10);
        let employee = await EmployeeMaster.findOne({ username: cleanUsername });

        if (employee) {
            employee.password = hashedPassword;
            employee.primaryRole = "ADMIN";
            employee.isActive = true;
            employee.employeeStatus = "ACTIVE";
            if (clientInfo?.email) {
                employee.officialEmail = clientInfo.email;
                if (!employee.personalEmail) employee.personalEmail = clientInfo.email;
            }
            if (clientInfo?.name) employee.firstName = clientInfo.name;
            await employee.save({ validateBeforeSave: false });
            return employee;
        }

        let randNum = Math.floor(1000 + Math.random() * 9000);
        let employeeId = `ADM${randNum}`;
        while (await EmployeeMaster.exists({ employeeId })) {
            randNum = Math.floor(1000 + Math.random() * 9000);
            employeeId = `ADM${randNum}`;
        }

        const newAdminDoc = {
            employeeId,
            username: cleanUsername,
            password: hashedPassword,
            primaryRole: "ADMIN",
            firstName: clientInfo?.name || "Client",
            lastName: "Admin",
            officialEmail: clientInfo?.email || `${cleanUsername}@hrm.local`,
            personalEmail: clientInfo?.email || `${cleanUsername}@hrm.local`,
            gender: "other",
            dateOfBirth: new Date("1995-01-01"),
            employmentType: "FULL_TIME",
            employeeStatus: "ACTIVE",
            joiningDate: new Date(),
            mobileNumber: "9999999999",
            emergencyContactName: "Client Admin",
            emergencyContactNumber: "9999999999",
            postalCode: "000000",
            currentAddress: clientInfo?.companyName || "Client Head Office",
            aadhaarNumber: "000000000000",
            panNumber: "AAAAA0000A",
            isActive: true,
        };

        const adminEmployee = new EmployeeMaster(newAdminDoc);
        await adminEmployee.save({ validateBeforeSave: false });
        return adminEmployee;
    } catch (err) {
        console.error("Warning: provisionClientAdminUser encountered an error:", err);
        return null;
    }
}

/**
 * 1. Generate new License Key with dynamic Add-Ons and Cryptographic Signing
 */
exports.generateLicense = async (req, res) => {
    try {
        const {
            clientInfo,
            planId,
            addOns = {},
            adminCredentials = {},
            validityMonths = 12,
            customExpiresAt,
            gracePeriodDays = 7,
            renewalPolicy = "Manual",
            isActive = false,
        } = req.body;

        if (!clientInfo?.name || !clientInfo?.email || !clientInfo?.companyName) {
            return res.status(400).json({
                success: false,
                message: "Client contact name, email, and company name are required.",
            });
        }

        const basePlan = await Plan.findById(planId);
        if (!basePlan) {
            return res.status(404).json({ success: false, message: "Base plan not found." });
        }

        // Calculate Effective Limits (Base Plan + Add-Ons or Explicit Selection)
        const totalActiveUsers =
            Number(basePlan.quotas.maxActiveUsers || 10) + Number(addOns.extraActiveUsers || 0);
        const totalEmployeeRecords =
            Number(basePlan.quotas.maxEmployeeRecords || 50) + Number(addOns.extraEmployeeRecords || 0);
        const totalStorageGB =
            Number(basePlan.quotas.storageQuotaGB || 10) + Number(addOns.extraStorageGB || 0);

        const allAllowedModules = Array.isArray(req.body.allowedModules)
            ? Array.from(new Set(req.body.allowedModules))
            : Array.from(
                new Set([...(basePlan.includedModules || []), ...(addOns.extraModules || [])])
            );

        const effectiveLimits = {
            totalActiveUsers,
            totalEmployeeRecords,
            totalStorageGB,
            allAllowedModules,
        };

        // Determine Dates
        const issuedAt = new Date();
        let expiresAt;
        if (customExpiresAt) {
            expiresAt = new Date(customExpiresAt);
        } else {
            expiresAt = new Date(issuedAt);
            expiresAt.setMonth(expiresAt.getMonth() + Number(validityMonths));
        }

        // Generate formatted human-readable key
        const licenseKeyStr = generateFormattedKey(
            basePlan.tier || "STD",
            clientInfo.companyName,
            issuedAt.getFullYear()
        );

        const randId = Math.random().toString(36).substring(2, 8).toUpperCase();
        const licenseId = `LIC-${Date.now().toString(36).toUpperCase()}-${randId}`;
        const clientId = `CLI-${Date.now().toString(36).toUpperCase()}`;

        // Cryptographically Sign the Payload
        const { signaturePayload } = signLicensePayload({
            licenseId,
            licenseKey: licenseKeyStr,
            clientId,
            companyName: clientInfo.companyName,
            effectiveLimits,
            dates: {
                issuedAt,
                expiresAt,
                gracePeriodDays,
            },
        });

        // Create License Key Document
        const licenseDoc = new LicenseKey({
            licenseId,
            licenseKey: licenseKeyStr,
            signaturePayload,
            clientId,
            clientInfo: {
                name: clientInfo.name,
                email: clientInfo.email,
                companyName: clientInfo.companyName,
                allowedDomains: clientInfo.allowedDomains?.length ? clientInfo.allowedDomains : ["*"],
                machineFingerprint: clientInfo.machineFingerprint || "",
            },
            adminCredentials: {
                username: String(adminCredentials?.username || "").trim().toLowerCase(),
                password: String(adminCredentials?.password || ""),
            },
            planId: basePlan._id,
            addOns: {
                extraModules: addOns.extraModules || [],
                extraActiveUsers: Number(addOns.extraActiveUsers || 0),
                extraEmployeeRecords: Number(addOns.extraEmployeeRecords || 0),
                extraStorageGB: Number(addOns.extraStorageGB || 0),
                customFlags: addOns.customFlags || {},
            },
            effectiveLimits,
            dates: {
                issuedAt,
                activatedAt: isActive ? new Date() : null,
                expiresAt,
                gracePeriodDays: Number(gracePeriodDays || 7),
            },
            renewalPolicy,
            isActive: Boolean(isActive),
            status: isActive ? "ACTIVE" : "GENERATED",
            tenantDbName: `HRM_tenant_${licenseId.replace(/[^a-zA-Z0-9]/g, "_").toLowerCase()}`,
            metadata: {
                lastActionTimestamp: new Date(),
                ipAddress: req.ip || "",
            },
        });

        await licenseDoc.save();
        invalidateLicenseCache();
        invalidateLicenseKeyCache(licenseKeyStr);

        // Provision isolated Tenant Database with standard Roles, Menus, and Client Admin account
        try {
            await provisionTenantDatabase(licenseDoc.tenantDbName, {
                clientInfo: licenseDoc.clientInfo,
                adminCredentials: licenseDoc.adminCredentials,
            });
        } catch (provErr) {
            console.error("Warning: provisionTenantDatabase failed during generation:", provErr);
        }

        // Audit Log
        await LicenseAuditLog.create({
            licenseKey: licenseKeyStr,
            action: "GENERATED",
            details: {
                plan: basePlan.name,
                tier: basePlan.tier,
                company: clientInfo.companyName,
                effectiveLimits,
                expiresAt,
            },
            ipAddress: req.ip || "",
            performedBy: req.user?.username || "SUPER_ADMIN",
        });

        const fileContent = generateLicenseFileContent(licenseDoc);

        return res.status(201).json({
            success: true,
            message: "Enterprise License Key generated and digitally signed successfully.",
            data: licenseDoc,
            fileContent,
        });
    } catch (err) {
        console.error("Generate License Error:", err);
        return res.status(400).json({ success: false, message: err.message });
    }
};

/**
 * 2. Get All Licenses (Listing with Search & Filters)
 */
exports.getAllLicenses = async (req, res) => {
    try {
        const { status, search, page = 1, limit = 50 } = req.query;
        const query = {};

        if (status && status !== "ALL") {
            query.status = status;
        }

        if (search) {
            query.$or = [
                { licenseKey: { $regex: search, $options: "i" } },
                { "clientInfo.companyName": { $regex: search, $options: "i" } },
                { "clientInfo.name": { $regex: search, $options: "i" } },
                { "clientInfo.email": { $regex: search, $options: "i" } },
            ];
        }

        const skip = (Number(page) - 1) * Number(limit);
        const [licenses, total] = await Promise.all([
            LicenseKey.find(query)
                .populate("planId", "name tier code badgeColor quotas")
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(Number(limit)),
            LicenseKey.countDocuments(query),
        ]);

        // Evaluate live status for each
        const decorated = licenses.map((lic) => {
            const health = evaluateLicenseStatus(lic, new Date());
            return {
                ...lic.toObject(),
                liveHealth: health,
            };
        });

        return res.status(200).json({
            success: true,
            total,
            page: Number(page),
            pages: Math.ceil(total / Number(limit)),
            data: decorated,
        });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};

/**
 * 3. Get Active License & System Quota Utilization
 */
exports.getActiveLicense = async (req, res) => {
    try {
        const license = await LicenseKey.findOne({
            isActive: true,
            status: { $in: ["ACTIVE", "GRACE_PERIOD"] },
        })
            .populate("planId")
            .sort({ updatedAt: -1 });

        if (!license) {
            return res.status(200).json({
                success: true,
                hasActiveLicense: false,
                message: "No active license key found on this system.",
            });
        }

        // Live counts
        const [currentEmployees, currentActiveUsers] = await Promise.all([
            EmployeeMaster.countDocuments(),
            User.countDocuments({ status: "Active" }),
        ]);

        const health = evaluateLicenseStatus(license, new Date());

        return res.status(200).json({
            success: true,
            hasActiveLicense: true,
            data: license,
            health,
            utilization: {
                employees: {
                    used: currentEmployees,
                    max: license.effectiveLimits?.totalEmployeeRecords || 0,
                    percentage: license.effectiveLimits?.totalEmployeeRecords
                        ? Math.min(100, Math.round((currentEmployees / license.effectiveLimits.totalEmployeeRecords) * 100))
                        : 0,
                },
                activeUsers: {
                    used: currentActiveUsers,
                    max: license.effectiveLimits?.totalActiveUsers || 0,
                    percentage: license.effectiveLimits?.totalActiveUsers
                        ? Math.min(100, Math.round((currentActiveUsers / license.effectiveLimits.totalActiveUsers) * 100))
                        : 0,
                },
            },
        });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};

/**
 * 4. Activate a License Key
 */
exports.activateLicense = async (req, res) => {
    try {
        const { licenseKey } = req.body;
        if (!licenseKey) {
            return res.status(400).json({ success: false, message: "License key is required." });
        }

        const license = await LicenseKey.findOne({ licenseKey: licenseKey.trim().toUpperCase() });
        if (!license) {
            return res.status(404).json({ success: false, message: "Invalid license key." });
        }

        // Verify cryptographic signature
        const sigCheck = verifyLicenseSignature(license.signaturePayload);
        if (!sigCheck.isValid) {
            return res.status(400).json({
                success: false,
                message: `License validation failed: ${sigCheck.reason}`,
            });
        }

        if (license.status === "REVOKED") {
            return res.status(400).json({
                success: false,
                message: `Cannot activate revoked license. Reason: ${license.metadata.revocationReason}`,
            });
        }

        if (!license.tenantDbName) {
            const cleanId = String(license.licenseId || license._id).replace(/[^a-zA-Z0-9]/g, "_").toLowerCase();
            license.tenantDbName = `HRM_tenant_${cleanId}`;
        }

        license.isActive = true;
        license.status = "ACTIVE";
        license.dates.activatedAt = new Date();
        license.metadata.activatedBy = req.user?.username || "CLIENT_ADMIN";
        license.metadata.lastHeartbeat = new Date();
        license.metadata.lastActionTimestamp = new Date();
        await license.save();

        invalidateLicenseCache();
        invalidateLicenseKeyCache(license.licenseKey);

        // Provision / Verify isolated Tenant Database with standard Roles, Menus, and Client Admin account
        try {
            await provisionTenantDatabase(license.tenantDbName, {
                clientInfo: license.clientInfo,
                adminCredentials: license.adminCredentials,
            });
        } catch (provErr) {
            console.error("Warning: provisionTenantDatabase failed during activation:", provErr);
        }

        await LicenseAuditLog.create({
            licenseKey: license.licenseKey,
            action: "ACTIVATED",
            details: { activatedAt: license.dates.activatedAt },
            ipAddress: req.ip || "",
            performedBy: req.user?.username || "CLIENT_ADMIN",
        });

        return res.status(200).json({
            success: true,
            message: "License activated successfully. All features and quotas are now unlocked.",
            data: {
                licenseKey: license.licenseKey,
                clientId: license.clientId,
                companyName: license.clientInfo?.companyName || "Organization",
                status: license.status,
                expiresAt: license.dates?.expiresAt,
                tenantDbName: license.tenantDbName,
                effectiveLimits: license.effectiveLimits,
            },
            adminUsername: license.adminCredentials?.username || null,
        });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};

/**
 * 4.1 Verify a License Key (Public endpoint for frontend bootstrap validation)
 */
exports.verifyLicense = async (req, res) => {
    try {
        const rawKey =
            req.body?.licenseKey ||
            req.query?.licenseKey ||
            req.headers["x-license-key"] ||
            "";

        if (!rawKey || typeof rawKey !== "string" || !rawKey.trim()) {
            return res.status(400).json({
                success: false,
                valid: false,
                message: "License key is required for verification.",
            });
        }

        const cleanKey = rawKey.trim().toUpperCase();
        const license = await LicenseKey.findOne({ licenseKey: cleanKey }).populate("planId");

        if (!license) {
            return res.status(404).json({
                success: false,
                valid: false,
                message: "The provided license key was not found.",
            });
        }

        const sigCheck = verifyLicenseSignature(license.signaturePayload);
        if (!sigCheck.isValid) {
            return res.status(400).json({
                success: false,
                valid: false,
                message: `License validation failed: ${sigCheck.reason}`,
            });
        }

        const health = evaluateLicenseStatus(license, new Date());
        const isValid =
            !["SUSPENDED", "REVOKED"].includes(health.status) &&
            license.status !== "REVOKED" &&
            license.status !== "SUSPENDED" &&
            !(health.status === "EXPIRED" && health.accessLevel === "LOCKED");

        return res.status(200).json({
            success: true,
            valid: isValid,
            status: health.status,
            accessLevel: health.accessLevel,
            companyName: license.clientInfo?.companyName || "Organization",
            clientInfo: license.clientInfo,
            dates: license.dates,
            plan: license.planId,
            effectiveLimits: license.effectiveLimits,
            tenantDbName: license.tenantDbName,
        });
    } catch (err) {
        return res.status(500).json({ success: false, valid: false, message: err.message });
    }
};

/**
 * 4.1 Toggle License Active / Inactive
 */
exports.toggleLicenseActive = async (req, res) => {
    try {
        const { id } = req.params;
        const { isActive } = req.body;
        const license = await LicenseKey.findById(id);
        if (!license) {
            return res.status(404).json({ success: false, message: "License not found." });
        }

        if (isActive) {
            // Verify signature before activating
            const sigCheck = verifyLicenseSignature(license.signaturePayload);
            if (!sigCheck.isValid) {
                return res.status(400).json({ success: false, message: `Cannot activate: ${sigCheck.reason}` });
            }
            if (license.status === "REVOKED") {
                return res.status(400).json({ success: false, message: "Cannot activate revoked license." });
            }
            // Deactivate all others
            await LicenseKey.updateMany({ _id: { $ne: license._id } }, { $set: { isActive: false } });
            license.isActive = true;
            license.status = "ACTIVE";
            if (!license.dates.activatedAt) license.dates.activatedAt = new Date();
        } else {
            license.isActive = false;
            license.status = "GENERATED";
        }

        license.metadata.lastActionTimestamp = new Date();
        await license.save();
        invalidateLicenseCache();
        invalidateLicenseKeyCache(license.licenseKey);

        // Synchronize tenant database and admin permissions
        if (license.tenantDbName) {
            try {
                await provisionTenantDatabase(license.tenantDbName, {
                    clientInfo: license.clientInfo,
                    adminCredentials: license.adminCredentials,
                });
            } catch (syncErr) {
                console.error("Warning: sync tenant DB failed during updateLicense:", syncErr);
            }
        }

        return res.status(200).json({
            success: true,
            message: license.isActive ? "License activated successfully." : "License deactivated.",
            data: license,
        });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};

/**
 * 5. Update Status (Suspend, Reactivate, Revoke)
 */
exports.updateLicenseStatus = async (req, res) => {
    try {
        const { status, revocationReason } = req.body;
        const license = await LicenseKey.findById(req.params.id);
        if (!license) {
            return res.status(404).json({ success: false, message: "License not found." });
        }

        const validTransitions = ["ACTIVE", "SUSPENDED", "REVOKED"];
        if (!validTransitions.includes(status)) {
            return res.status(400).json({
                success: false,
                message: `Invalid status. Must be one of: ${validTransitions.join(", ")}`,
            });
        }

        license.status = status;
        if (status === "REVOKED") {
            license.metadata.revocationReason = revocationReason || "Manually revoked by Super Admin";
            license.metadata.revokedAt = new Date();
        }

        await license.save();
        invalidateLicenseCache();
        invalidateLicenseKeyCache(license.licenseKey);

        // Synchronize tenant database and admin permissions
        if (license.tenantDbName) {
            try {
                await provisionTenantDatabase(license.tenantDbName, {
                    clientInfo: license.clientInfo,
                    adminCredentials: license.adminCredentials,
                });
            } catch (syncErr) {
                console.error("Warning: sync tenant DB failed during updateLicense:", syncErr);
            }
        }

        await LicenseAuditLog.create({
            licenseKey: license.licenseKey,
            action: status === "REVOKED" ? "REVOKED" : status === "SUSPENDED" ? "SUSPENDED" : "REACTIVATED",
            details: { status, reason: revocationReason },
            ipAddress: req.ip || "",
            performedBy: req.user?.username || "SUPER_ADMIN",
        });

        return res.status(200).json({
            success: true,
            message: `License status updated to ${status}.`,
            data: license,
        });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};

/**
 * 5.1 Update License Details (Client Info, Plan, Add-Ons, Modules, Credentials, Activation)
 */
exports.updateLicense = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            clientInfo,
            planId,
            addOns = {},
            adminCredentials = {},
            validityMonths,
            customExpiresAt,
            gracePeriodDays,
            isActive,
            allowedModules,
        } = req.body;

        const license = await LicenseKey.findById(id);
        if (!license) {
            return res.status(404).json({ success: false, message: "License not found." });
        }

        const targetPlanId = planId || license.planId;
        const basePlan = await Plan.findById(targetPlanId);
        if (!basePlan) {
            return res.status(404).json({ success: false, message: "Base plan not found." });
        }

        // Update client info
        if (clientInfo) {
            if (clientInfo.name) license.clientInfo.name = clientInfo.name;
            if (clientInfo.email) license.clientInfo.email = clientInfo.email;
            if (clientInfo.companyName) license.clientInfo.companyName = clientInfo.companyName;
            if (clientInfo.allowedDomains) license.clientInfo.allowedDomains = clientInfo.allowedDomains;
            if (clientInfo.machineFingerprint !== undefined) license.clientInfo.machineFingerprint = clientInfo.machineFingerprint;
        }

        license.planId = targetPlanId;

        // Update add-ons
        license.addOns = {
            extraModules: addOns.extraModules || [],
            extraActiveUsers: Number(addOns.extraActiveUsers || 0),
            extraEmployeeRecords: Number(addOns.extraEmployeeRecords || 0),
            extraStorageGB: Number(addOns.extraStorageGB || 0),
            customFlags: addOns.customFlags || {},
        };

        // Update credentials & provision admin user
        if (adminCredentials?.username) {
            license.adminCredentials = {
                username: adminCredentials.username,
                password: adminCredentials.password || license.adminCredentials?.password || "",
            };
            if (adminCredentials.password) {
                await provisionClientAdminUser(license.clientInfo, adminCredentials);
            }
        }

        // Recalculate effective limits
        const totalActiveUsers =
            Number(basePlan.quotas?.maxActiveUsers || 10) + Number(license.addOns.extraActiveUsers || 0);
        const totalEmployeeRecords =
            Number(basePlan.quotas?.maxEmployeeRecords || 50) + Number(license.addOns.extraEmployeeRecords || 0);
        const totalStorageGB =
            Number(basePlan.quotas?.storageQuotaGB || 10) + Number(license.addOns.extraStorageGB || 0);

        const allAllowed = Array.isArray(allowedModules)
            ? Array.from(new Set(allowedModules))
            : Array.from(
                new Set([...(basePlan.includedModules || []), ...(license.addOns.extraModules || [])])
            );

        license.effectiveLimits = {
            totalActiveUsers,
            totalEmployeeRecords,
            totalStorageGB,
            allAllowedModules: allAllowed,
        };

        if (gracePeriodDays !== undefined) {
            license.dates.gracePeriodDays = Number(gracePeriodDays);
        }

        if (validityMonths) {
            const issuedAt = license.dates.issuedAt || new Date();
            const expiresAt = new Date(issuedAt);
            expiresAt.setMonth(expiresAt.getMonth() + Number(validityMonths));
            license.dates.expiresAt = expiresAt;
        } else if (customExpiresAt) {
            license.dates.expiresAt = new Date(customExpiresAt);
        }

        // Handle isActive toggle
        if (typeof isActive === "boolean") {
            if (isActive) {
                await LicenseKey.updateMany({ _id: { $ne: license._id } }, { $set: { isActive: false } });
                license.isActive = true;
                license.status = "ACTIVE";
                if (!license.dates.activatedAt) license.dates.activatedAt = new Date();
            } else {
                license.isActive = false;
                if (license.status === "ACTIVE") license.status = "GENERATED";
            }
        }

        // Re-sign cryptographic payload
        const { signaturePayload } = signLicensePayload({
            licenseId: license.licenseId,
            licenseKey: license.licenseKey,
            clientId: license.clientId,
            companyName: license.clientInfo.companyName,
            effectiveLimits: license.effectiveLimits,
            dates: {
                issuedAt: license.dates.issuedAt,
                expiresAt: license.dates.expiresAt,
                gracePeriodDays: license.dates.gracePeriodDays,
            },
        });
        license.signaturePayload = signaturePayload;
        license.metadata.lastActionTimestamp = new Date();

        await license.save();
        invalidateLicenseCache();
        invalidateLicenseKeyCache(license.licenseKey);

        // Synchronize tenant database and admin permissions
        if (license.tenantDbName) {
            try {
                await provisionTenantDatabase(license.tenantDbName, {
                    clientInfo: license.clientInfo,
                    adminCredentials: license.adminCredentials,
                });
            } catch (syncErr) {
                console.error("Warning: sync tenant DB failed during updateLicense:", syncErr);
            }
        }

        return res.status(200).json({
            success: true,
            message: "License updated and re-signed successfully.",
            data: license,
        });
    } catch (err) {
        console.error("Update License Error:", err);
        return res.status(500).json({ success: false, message: err.message });
    }
};

/**
 * 6. Extend License Expiration
 */
exports.extendLicenseExpiry = async (req, res) => {
    try {
        const { additionalMonths = 12, newExpirationDate } = req.body;
        const license = await LicenseKey.findById(req.params.id);
        if (!license) {
            return res.status(404).json({ success: false, message: "License not found." });
        }

        let newExpiry;
        if (newExpirationDate) {
            newExpiry = new Date(newExpirationDate);
        } else {
            const currentExpiry = new Date(license.dates.expiresAt);
            const baseDate = currentExpiry > new Date() ? currentExpiry : new Date();
            newExpiry = new Date(baseDate);
            newExpiry.setMonth(newExpiry.getMonth() + Number(additionalMonths));
        }

        license.dates.expiresAt = newExpiry;
        if (license.status === "EXPIRED" || license.status === "GRACE_PERIOD") {
            license.status = "ACTIVE";
        }

        // Re-sign cryptographic payload to reflect extended date
        const { signaturePayload } = signLicensePayload({
            licenseId: license.licenseId,
            licenseKey: license.licenseKey,
            clientId: license.clientId,
            companyName: license.clientInfo.companyName,
            effectiveLimits: license.effectiveLimits,
            dates: {
                issuedAt: license.dates.issuedAt,
                expiresAt: newExpiry,
                gracePeriodDays: license.dates.gracePeriodDays,
            },
        });

        license.signaturePayload = signaturePayload;
        await license.save();
        invalidateLicenseCache();
        invalidateLicenseKeyCache(license.licenseKey);

        // Synchronize tenant database and admin permissions
        if (license.tenantDbName) {
            try {
                await provisionTenantDatabase(license.tenantDbName, {
                    clientInfo: license.clientInfo,
                    adminCredentials: license.adminCredentials,
                });
            } catch (syncErr) {
                console.error("Warning: sync tenant DB failed during updateLicense:", syncErr);
            }
        }

        await LicenseAuditLog.create({
            licenseKey: license.licenseKey,
            action: "EXTENDED",
            details: { newExpiresAt: newExpiry },
            ipAddress: req.ip || "",
            performedBy: req.user?.username || "SUPER_ADMIN",
        });

        return res.status(200).json({
            success: true,
            message: `License extended to ${newExpiry.toLocaleDateString()}. Cryptographic payload re-signed.`,
            data: license,
        });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};

/**
 * 7. Dashboard Metrics & Stats Overview
 */
exports.getLicenseStats = async (req, res) => {
    try {
        const [totalCount, activeCount, graceCount, expiredCount, suspendedCount, revokedCount] =
            await Promise.all([
                LicenseKey.countDocuments(),
                LicenseKey.countDocuments({ status: "ACTIVE" }),
                LicenseKey.countDocuments({ status: "GRACE_PERIOD" }),
                LicenseKey.countDocuments({ status: "EXPIRED" }),
                LicenseKey.countDocuments({ status: "SUSPENDED" }),
                LicenseKey.countDocuments({ status: "REVOKED" }),
            ]);

        // Expiring within 14 days
        const now = new Date();
        const fourteenDaysLater = new Date();
        fourteenDaysLater.setDate(now.getDate() + 14);

        const expiringSoonCount = await LicenseKey.countDocuments({
            status: "ACTIVE",
            "dates.expiresAt": { $gte: now, $lte: fourteenDaysLater },
        });

        // Total licensed employee seats across all active licenses
        const activeLicenses = await LicenseKey.find({ status: { $in: ["ACTIVE", "GRACE_PERIOD"] } });
        const totalLicensedEmployees = activeLicenses.reduce(
            (sum, lic) => sum + (lic.effectiveLimits?.totalEmployeeRecords || 0),
            0
        );
        const totalLicensedUserSeats = activeLicenses.reduce(
            (sum, lic) => sum + (lic.effectiveLimits?.totalActiveUsers || 0),
            0
        );

        return res.status(200).json({
            success: true,
            data: {
                totalCount,
                activeCount,
                graceCount,
                expiredCount,
                suspendedCount,
                revokedCount,
                expiringSoonCount,
                totalLicensedEmployees,
                totalLicensedUserSeats,
            },
        });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};

/**
 * 8. Download .lic Cryptographic Certificate
 */
exports.downloadLicenseFile = async (req, res) => {
    try {
        const license = await LicenseKey.findById(req.params.id);
        if (!license) {
            return res.status(404).json({ success: false, message: "License not found." });
        }

        const fileContent = generateLicenseFileContent(license);
        const fileName = `${license.licenseKey}.lic`;

        res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
        res.setHeader("Content-Type", "application/json");
        return res.status(200).send(fileContent);
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};

/**
 * 9. Delete License Key Permanently
 */
exports.deleteLicense = async (req, res) => {
    try {
        const { id } = req.params;
        const license = await LicenseKey.findById(id);
        if (!license) {
            return res.status(404).json({ success: false, message: "License key not found." });
        }

        if (license.isActive) {
            invalidateLicenseCache();
        }
        invalidateLicenseKeyCache(license.licenseKey);

        // If an isolated tenant database exists for this license, cleanly drop it
        if (license.tenantDbName) {
            try {
                const { getTenantDb, tenantConnections } = require("../../utils/tenantConnectionManager");
                const tenantDb = getTenantDb(license.tenantDbName);
                await tenantDb.dropDatabase();
                tenantConnections.delete(license.tenantDbName);
                console.log(`Cleanly dropped tenant database: ${license.tenantDbName}`);
            } catch (dropErr) {
                console.error("Warning: could not drop tenant database:", dropErr);
            }
        }

        await LicenseKey.findByIdAndDelete(id);

        return res.status(200).json({
            success: true,
            message: "License key deleted successfully.",
        });
    } catch (err) {
        console.error("Delete License Error:", err);
        return res.status(500).json({ success: false, message: err.message });
    }
};

