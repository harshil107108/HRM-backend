const jwt = require("jsonwebtoken");
const LicenseKey = require("../modals/Manager/LicenseKeyModel");
const EmployeeMaster = require("../modals/Employee/EmployeeMasterModel");
const User = require("../modals/Administration/UserModel");
const {
    evaluateLicenseStatus,
    getCachedLicense,
    setCachedLicense,
    verifyLicenseSignature,
} = require("../utils/licenseCrypto");

/**
 * Fetch current system active license (cached with DB fallback)
 */
async function getSystemLicense() {
    let license = getCachedLicense();
    if (license && license.isActive) return license;

    // Retrieve the current active license
    license = await LicenseKey.findOne({
        isActive: true,
        status: { $in: ["ACTIVE", "GRACE_PERIOD"] },
    })
        .populate("planId")
        .sort({ updatedAt: -1 });

    if (license) {
        setCachedLicense(license);
    }
    return license || null;
}

/**
 * Global License Verification Middleware:
 * Inspects system license validity, detects tampering, handles Grace Period & Lockout
 */
async function validateLicense(req, res, next) {
    try {
        // Excluded routes from license lock (Super-Admin Manager, Auth login/logout, Public assets, Menu definitions)
        const rawPath = req.originalUrl || req.path || req.url || "";
        const path = rawPath.split("?")[0];

        let isBypassed =
            path.startsWith("/manager") ||
            path.startsWith("/auth") ||
            path.startsWith("/uploads") ||
            path.startsWith("/chat") ||
            path.includes("/menu") ||
            path.startsWith("/administration/menu") ||
            path.startsWith("/master/menu") ||
            path.startsWith("/master/route");

        // Allow authenticated Super Admin to completely bypass license locks
        const authHeader = req.headers.authorization || "";
        if (authHeader.startsWith("Bearer ")) {
            try {
                const token = authHeader.slice(7);
                const decoded = jwt.decode(token);
                if (
                    decoded &&
                    (decoded.role === "SUPER_ADMIN" ||
                        decoded.roleCode === "SUPER_ADMIN" ||
                        decoded.primaryRole === "SUPER_ADMIN" ||
                        decoded.isSuperAdmin === true)
                ) {
                    req.isSuperAdmin = true;
                    return next(); // Super Admin has unrestricted access without needing an active license
                }
            } catch (e) {
                // ignore invalid token format here, authenticate middleware handles 401
            }
        }

        if (isBypassed) {
            return next();
        }

        const license = req.license || (await getSystemLicense());

        // If no license is registered yet, allow manager routes and auth to set it up
        if (!license) {
            req.license = null;
            req.licenseHealth = {
                status: "UNLICENSED",
                accessLevel: "LOCKED",
                canWrite: false,
                message: "No license configured yet.",
            };

            if (isBypassed) return next();

            return res.status(403).json({
                success: false,
                code: "SYSTEM_UNLICENSED",
                message: "System has no active license configured. Please log in as Super Admin to activate a license.",
            });
        }

        // 1. Verify Cryptographic Signature (Tamper Resistance)
        const sigCheck = verifyLicenseSignature(license.signaturePayload);
        if (!sigCheck.isValid) {
            license.status = "REVOKED";
            license.metadata.revocationReason = "Cryptographic signature tampering detected";
            await license.save();

            if (isBypassed) return next();
            return res.status(403).json({
                success: false,
                code: "LICENSE_TAMPERED",
                message: "Security violation: License cryptographic signature is invalid or tampered with.",
            });
        }

        // 2. Evaluate License Lifecycle & Time Health
        const evalHealth = evaluateLicenseStatus(license, new Date());
        req.license = license;
        req.licenseHealth = evalHealth;

        // If status changed in DB (e.g. from ACTIVE to GRACE_PERIOD or EXPIRED), persist update
        if (license.status !== evalHealth.status && ["ACTIVE", "GRACE_PERIOD", "EXPIRED"].includes(evalHealth.status)) {
            license.status = evalHealth.status;
            await license.save();
        }

        // 3. Bypass manager and auth operations
        if (isBypassed) {
            return next();
        }

        // 4. Enforce HARD LOCK (Completely locked)
        if (evalHealth.accessLevel === "LOCKED") {
            return res.status(403).json({
                success: false,
                code: "LICENSE_LOCKED",
                licenseStatus: evalHealth.status,
                message: evalHealth.message,
            });
        }

        // 5. Enforce SOFT LOCK (Read-only mode after grace period ends)
        if (evalHealth.accessLevel === "READ_ONLY") {
            const isWriteMethod = ["POST", "PUT", "PATCH", "DELETE"].includes(req.method.toUpperCase());
            if (isWriteMethod) {
                return res.status(403).json({
                    success: false,
                    code: "LICENSE_READ_ONLY",
                    licenseStatus: "EXPIRED_READ_ONLY",
                    message: "Grace period expired. System is strictly in Read-Only mode. Modifications are locked.",
                });
            }
        }

        // Attach warning headers if nearing expiration or in grace period
        if (evalHealth.warning) {
            res.setHeader("X-License-Warning", evalHealth.warning);
        }

        next();
    } catch (err) {
        console.error("License Validation Middleware Error:", err);
        next();
    }
}

/**
 * Route-Level Module Guard:
 * Checks if the specific HRM module is enabled in the current license
 * Example: checkModuleAccess('PAYROLL')
 */
function checkModuleAccess(moduleCode) {
    return (req, res, next) => {
        // If super admin bypass or no license check required
        if (!req.license) return next();

        const allowed = req.license.effectiveLimits?.allAllowedModules || [];
        const normalizedCode = (moduleCode || "").toUpperCase();

        if (!allowed.includes(normalizedCode)) {
            return res.status(403).json({
                success: false,
                code: "MODULE_NOT_LICENSED",
                message: `Access denied. The module '${moduleCode}' is not included in your active HRM subscription plan or add-ons.`,
                requiredModule: normalizedCode,
                allowedModules: allowed,
            });
        }

        next();
    };
}

/**
 * Pre-Save / Route Guard: Enforce Employee Directory Record Quota
 */
async function enforceEmployeeQuota(req, res, next) {
    try {
        const license = req.license || (await getSystemLicense());
        if (!license || !license.effectiveLimits?.totalEmployeeRecords) {
            return next();
        }

        const maxRecords = license.effectiveLimits.totalEmployeeRecords;
        const currentCount = await EmployeeMaster.countDocuments();

        // If adding an employee would exceed quota
        if (currentCount >= maxRecords) {
            return res.status(403).json({
                success: false,
                code: "EMPLOYEE_QUOTA_EXCEEDED",
                currentCount,
                maxAllowed: maxRecords,
                message: `Employee record quota reached (${currentCount}/${maxRecords}). Upgrade your subscription plan or purchase a Seat Booster add-on to onboard more employees.`,
            });
        }

        next();
    } catch (err) {
        console.error("Enforce Employee Quota Error:", err);
        next();
    }
}

/**
 * Pre-Save / Route Guard: Enforce Active User Seat Quota
 */
async function enforceUserSeatQuota(req, res, next) {
    try {
        const license = req.license || (await getSystemLicense());
        if (!license || !license.effectiveLimits?.totalActiveUsers) {
            return next();
        }

        const maxUsers = license.effectiveLimits.totalActiveUsers;
        const currentActiveUsers = await User.countDocuments({ status: "Active" });

        // If creating/activating user exceeds limit
        const willBeActive = req.body?.status === "Active" || !req.body?.status;
        if (willBeActive && currentActiveUsers >= maxUsers) {
            return res.status(403).json({
                success: false,
                code: "USER_SEAT_QUOTA_EXCEEDED",
                currentActiveUsers,
                maxAllowed: maxUsers,
                message: `Active user seat quota reached (${currentActiveUsers}/${maxUsers}). Upgrade your subscription plan or purchase an Active Seat Booster add-on.`,
            });
        }

        next();
    } catch (err) {
        console.error("Enforce User Seat Quota Error:", err);
        next();
    }
}

module.exports = {
    validateLicense,
    checkModuleAccess,
    enforceEmployeeQuota,
    enforceUserSeatQuota,
    getSystemLicense,
};

