const jwt = require("jsonwebtoken");
const LicenseKey = require("../modals/Manager/LicenseKeyModel");
const { getTenantDb } = require("../utils/tenantConnectionManager");
const { runWithTenant } = require("../utils/tenantContext");
const { evaluateLicenseStatus } = require("../utils/licenseCrypto");

// In-memory cache for resolved licenses (5 minute TTL per key)
const licenseCache = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000;

function getCachedLicenseRecord(key) {
    const entry = licenseCache.get(key);
    if (!entry) return null;
    if (Date.now() - entry.cachedAt > CACHE_TTL_MS) {
        licenseCache.delete(key);
        return null;
    }
    return entry.license;
}

function setCachedLicenseRecord(key, license) {
    licenseCache.set(key, { license, cachedAt: Date.now() });
}

function invalidateLicenseKeyCache(key) {
    if (key) licenseCache.delete(key.toUpperCase().trim());
    else licenseCache.clear();
}

/**
 * Tenant Resolution Middleware:
 * Inspects incoming request for x-license-key or authenticated token,
 * resolves the physical tenant database, and establishes the async tenant context.
 */
async function resolveTenant(req, res, next) {
    try {
        const rawPath = req.originalUrl || req.path || req.url || "";
        const path = rawPath.split("?")[0].toLowerCase();

        // 1. Bypass check for Master Manager routes, public assets, and activation/verification
        const isMasterBypassed =
            path.startsWith("/uploads") ||
            path.startsWith("/manager/plans") ||
            path.startsWith("/manager/licenses/generate") ||
            path.startsWith("/manager/licenses/activate") ||
            path.startsWith("/manager/licenses/verify") ||
            path.startsWith("/manager/licenses/getlicenses") ||
            path.startsWith("/manager/licenses/stats") ||
            path.startsWith("/manager/licenses/status") ||
            path.startsWith("/manager/licenses/toggle-active") ||
            path.startsWith("/manager/licenses/update") ||
            path.startsWith("/manager/licenses/extend") ||
            path.startsWith("/manager/licenses/download") ||
            path.startsWith("/manager/licenses/deletelicensebyid") ||
            path.startsWith("/auth/license/verify") ||
            path.startsWith("/auth/license/activate");

        // 2. Allow authenticated Super Admin to bypass tenant restrictions anywhere
        const authHeader = req.headers.authorization || "";
        let tokenDecoded = null;
        if (authHeader.startsWith("Bearer ")) {
            try {
                const token = authHeader.slice(7);
                tokenDecoded = jwt.decode(token);
                if (
                    tokenDecoded &&
                    (tokenDecoded.role === "SUPER_ADMIN" ||
                        tokenDecoded.roleCode === "SUPER_ADMIN" ||
                        tokenDecoded.primaryRole === "SUPER_ADMIN" ||
                        tokenDecoded.isSuperAdmin === true)
                ) {
                    req.isSuperAdmin = true;
                    // Super Admin has unrestricted access without needing any license key
                    return next();
                }
            } catch (e) {
                // Ignore decoding error here; authenticate middleware handles token validity
            }
        }

        if (isMasterBypassed) {
            return next();
        }

        // Allow /auth/login without license key for Super Admin authentication
        if (path === "/auth/login" && !req.headers["x-license-key"] && !req.headers["x-tenant-license"] && !req.query.licenseKey) {
            return next();
        }

        // 3. Extract license key from Header, Query, or JWT
        let rawKey =
            req.headers["x-license-key"] ||
            req.headers["x-tenant-license"] ||
            req.query.licenseKey ||
            tokenDecoded?.licenseKey ||
            "";

        // Fallback 1: If user has a valid authenticated JWT token with a tenantDbName
        if ((!rawKey || !rawKey.trim()) && tokenDecoded?.tenantDbName) {
            const licByDb = await LicenseKey.findOne({ tenantDbName: tokenDecoded.tenantDbName });
            if (licByDb) {
                rawKey = licByDb.licenseKey;
            }
        }

        // Fallback 2: If user is authenticated and has user ID (sub), find active tenant license
        if ((!rawKey || !rawKey.trim()) && tokenDecoded?.sub) {
            const activeLic = await LicenseKey.findOne({ isActive: true, status: "ACTIVE" }).sort({ createdAt: -1 });
            if (activeLic) {
                rawKey = activeLic.licenseKey;
            }
        }

        if (typeof rawKey !== "string" || !rawKey.trim()) {
            return res.status(403).json({
                success: false,
                code: "LICENSE_KEY_REQUIRED",
                message: "A valid license key is required to access the application. Please activate a license key.",
            });
        }

        const cleanKey = rawKey.trim().toUpperCase();

        // 4. Resolve License from Cache or Master DB
        let license = getCachedLicenseRecord(cleanKey);
        if (!license) {
            license = await LicenseKey.findOne({ licenseKey: cleanKey });
            if (license) {
                setCachedLicenseRecord(cleanKey, license);
            }
        }

        if (!license) {
            return res.status(403).json({
                success: false,
                code: "LICENSE_KEY_INVALID",
                message: "The provided license key was not found. Please verify your license key.",
            });
        }

        // 5. Evaluate License Status (Active, Grace Period, Expired, Revoked)
        const health = evaluateLicenseStatus(license);
        if (["SUSPENDED", "REVOKED"].includes(health.status) || license.status === "REVOKED" || license.status === "SUSPENDED") {
            return res.status(403).json({
                success: false,
                code: "LICENSE_SUSPENDED",
                message: `License is ${health.status.toLowerCase()}. Access has been locked. Please contact your administrator.`,
            });
        }

        if (health.status === "EXPIRED" && health.accessLevel === "LOCKED") {
            return res.status(403).json({
                success: false,
                code: "LICENSE_EXPIRED",
                message: "Your license key has expired. Please renew your license key to restore access.",
            });
        }

        // 6. Resolve Tenant Database Name
        let tenantDbName = license.tenantDbName;
        if (!tenantDbName) {
            const cleanId = String(license.licenseId || license._id)
                .replace(/[^a-zA-Z0-9]/g, "_")
                .toLowerCase();
            tenantDbName = `HRM_tenant_${cleanId}`;
            // Persist back to Master DB
            license.tenantDbName = tenantDbName;
            await LicenseKey.updateOne({ _id: license._id }, { $set: { tenantDbName } });
        }

        // 7. Get or cache tenant database connection
        const tenantDb = getTenantDb(tenantDbName);

        req.license = license;
        req.tenantDb = tenantDb;
        req.tenantDbName = tenantDbName;
        req.licenseHealth = health;

        // 8. Run in AsyncLocalStorage tenant context
        return runWithTenant(
            {
                tenantDb,
                tenantDbName,
                licenseKey: license.licenseKey,
                tenantId: license.clientId,
                companyName: license.clientInfo?.companyName || "Organization",
            },
            next
        );
    } catch (err) {
        console.error("Tenant resolution error:", err);
        return res.status(500).json({
            success: false,
            message: "Tenant resolution error: " + err.message,
        });
    }
}

module.exports = {
    resolveTenant,
    invalidateLicenseKeyCache,
};
