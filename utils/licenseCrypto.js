const crypto = require("crypto");

const MASTER_SECRET = process.env.LICENSE_MASTER_SECRET || "hrm-super-enterprise-license-signing-secret-2026-xyz";

/**
 * Clean & normalize a string into an uppercase alphanumeric code
 */
function sanitizeCode(str, maxLen = 6) {
    if (!str) return "CLIENT";
    const cleaned = str.toUpperCase().replace(/[^A-Z0-9]/g, "");
    return cleaned.slice(0, maxLen) || "CLIENT";
}

/**
 * Generate formatted human-readable product key:
 * HRM-[TIER]-[CLIENT_CODE]-[YEAR]-[XXXX-XXXX-XXXX]
 * Example: HRM-IND-CORP7-2026-F93A-89DC-10BE
 */
function generateFormattedKey(tier, clientCode, year) {
    const tierCode = (tier || "STD").slice(0, 3).toUpperCase();
    const cCode = sanitizeCode(clientCode, 5);
    const yr = year || new Date().getFullYear();

    const part1 = crypto.randomBytes(2).toString("hex").toUpperCase();
    const part2 = crypto.randomBytes(2).toString("hex").toUpperCase();
    const part3 = crypto.randomBytes(2).toString("hex").toUpperCase();

    return `HRM-${tierCode}-${cCode}-${yr}-${part1}-${part2}-${part3}`;
}

/**
 * Create a deterministic canonical string from the license payload for signing
 */
function createCanonicalString(payload) {
    return JSON.stringify({
        licenseId: payload.licenseId,
        licenseKey: payload.licenseKey,
        clientId: payload.clientId,
        companyName: payload.companyName,
        totalActiveUsers: payload.effectiveLimits?.totalActiveUsers,
        totalEmployeeRecords: payload.effectiveLimits?.totalEmployeeRecords,
        totalStorageGB: payload.effectiveLimits?.totalStorageGB,
        allAllowedModules: (payload.effectiveLimits?.allAllowedModules || []).slice().sort(),
        issuedAt: new Date(payload.dates?.issuedAt).toISOString(),
        expiresAt: new Date(payload.dates?.expiresAt).toISOString(),
        gracePeriodDays: payload.dates?.gracePeriodDays ?? 7,
    });
}

/**
 * Generate cryptographic signature and signed token
 */
function signLicensePayload(payload) {
    const canonical = createCanonicalString(payload);
    const hmac = crypto.createHmac("sha256", MASTER_SECRET);
    hmac.update(canonical);
    const signature = hmac.digest("hex");

    const tokenPayload = {
        canonicalData: JSON.parse(canonical),
        signature,
        signedAt: new Date().toISOString(),
    };

    const signaturePayload = Buffer.from(JSON.stringify(tokenPayload)).toString("base64");
    return { signature, signaturePayload };
}

/**
 * Verify cryptographic signature against payload.
 * Prevents tampering with quotas, dates, or modules.
 */
function verifyLicenseSignature(signaturePayload) {
    try {
        if (!signaturePayload) return { isValid: false, reason: "Missing signature payload" };
        const decodedStr = Buffer.from(signaturePayload, "base64").toString("utf8");
        const parsed = JSON.parse(decodedStr);

        const canonical = JSON.stringify(parsed.canonicalData);
        const hmac = crypto.createHmac("sha256", MASTER_SECRET);
        hmac.update(canonical);
        const expectedSignature = hmac.digest("hex");

        if (crypto.timingSafeEqual(Buffer.from(parsed.signature, "hex"), Buffer.from(expectedSignature, "hex"))) {
            return { isValid: true, data: parsed.canonicalData };
        } else {
            return { isValid: false, reason: "Digital signature mismatch - license payload has been tampered with!" };
        }
    } catch (err) {
        return { isValid: false, reason: `Verification error: ${err.message}` };
    }
}

/**
 * Detect clock rollback / time machine tampering
 */
function detectClockRollback(lastActionTimestamp, currentServerTime = new Date()) {
    if (!lastActionTimestamp) return false;
    const lastTime = new Date(lastActionTimestamp).getTime();
    const currTime = new Date(currentServerTime).getTime();

    // If server time is more than 60 seconds behind the last recorded action time, clock was rolled back
    return currTime < lastTime - 60000;
}

/**
 * Comprehensive License Lifecycle & Status Evaluator:
 * Returns: { status, accessLevel, daysRemaining, warningMessage }
 * accessLevel: 'FULL' | 'GRACE' | 'READ_ONLY' | 'LOCKED'
 */
function evaluateLicenseStatus(license, currentServerTime = new Date()) {
    if (!license) {
        return {
            status: "UNLICENSED",
            accessLevel: "LOCKED",
            daysRemaining: 0,
            canWrite: false,
            message: "No valid license key found on this system.",
        };
    }

    // 1. Check administrative overrides
    if (license.status === "REVOKED") {
        return {
            status: "REVOKED",
            accessLevel: "LOCKED",
            daysRemaining: 0,
            canWrite: false,
            message: `This license has been revoked. Reason: ${license.metadata?.revocationReason || "Administrative action"}.`,
        };
    }

    if (license.status === "SUSPENDED") {
        return {
            status: "SUSPENDED",
            accessLevel: "LOCKED",
            daysRemaining: 0,
            canWrite: false,
            message: "This license has been temporarily suspended due to payment or administrative hold.",
        };
    }

    // 2. Check Clock Rollback
    if (detectClockRollback(license.metadata?.lastActionTimestamp, currentServerTime)) {
        return {
            status: "TAMPERED",
            accessLevel: "LOCKED",
            daysRemaining: 0,
            canWrite: false,
            message: "System clock rollback detected! Access has been locked for security.",
        };
    }

    // 3. Evaluate Date Bounds
    const now = new Date(currentServerTime).getTime();
    const expiresAt = new Date(license.dates?.expiresAt).getTime();
    const gracePeriodDays = license.dates?.gracePeriodDays ?? 7;
    const graceEndAt = expiresAt + gracePeriodDays * 24 * 60 * 60 * 1000;
    const hardLockAt = expiresAt + 30 * 24 * 60 * 60 * 1000; // 30 days post-expiry

    const msPerDay = 1000 * 60 * 60 * 24;
    const daysUntilExpiry = Math.ceil((expiresAt - now) / msPerDay);

    if (now <= expiresAt) {
        // ACTIVE
        return {
            status: "ACTIVE",
            accessLevel: "FULL",
            daysRemaining: Math.max(0, daysUntilExpiry),
            canWrite: true,
            warning: daysUntilExpiry <= 14 ? `License expires in ${daysUntilExpiry} days.` : null,
            message: "License is active and valid.",
        };
    } else if (now <= graceEndAt) {
        // GRACE PERIOD
        const graceDaysLeft = Math.ceil((graceEndAt - now) / msPerDay);
        return {
            status: "GRACE_PERIOD",
            accessLevel: "GRACE",
            daysRemaining: 0,
            graceDaysLeft,
            canWrite: true,
            warning: `License expired! Grace period active: ${graceDaysLeft} days remaining before read-only lockout.`,
            message: `License expired on ${new Date(expiresAt).toLocaleDateString()}. Grace period in effect.`,
        };
    } else if (now <= hardLockAt) {
        // SOFT LOCK (Post Grace Period, Read-Only mode)
        return {
            status: "EXPIRED",
            accessLevel: "READ_ONLY",
            daysRemaining: 0,
            canWrite: false,
            message: "Grace period ended. System is in Read-Only mode. All data creation and modification is locked.",
        };
    } else {
        // HARD LOCK
        return {
            status: "EXPIRED",
            accessLevel: "LOCKED",
            daysRemaining: 0,
            canWrite: false,
            message: "License expired more than 30 days ago. System is completely locked. Please renew to continue.",
        };
    }
}

/**
 * Generate exportable .lic cryptographic file content
 */
function generateLicenseFileContent(licenseDoc) {
    return JSON.stringify(
        {
            $schema: "https://hrm.enterprise/license-schema-v1.json",
            version: "1.0",
            issuedBy: "HRM Enterprise Licensing Authority",
            licenseKey: licenseDoc.licenseKey,
            licenseId: licenseDoc.licenseId,
            clientId: licenseDoc.clientId,
            client: licenseDoc.clientInfo,
            effectiveLimits: licenseDoc.effectiveLimits,
            dates: licenseDoc.dates,
            signaturePayload: licenseDoc.signaturePayload,
            checksum: crypto.createHash("sha256").update(licenseDoc.signaturePayload).digest("hex"),
        },
        null,
        2
    );
}

// In-Memory Fast Cache with manual invalidation for high-performance route guarding
let _cachedLicense = null;
let _cachedAt = 0;
const CACHE_TTL_MS = 60 * 1000; // 1 minute TTL

function setCachedLicense(license) {
    _cachedLicense = license;
    _cachedAt = Date.now();
}

function getCachedLicense() {
    if (_cachedLicense && Date.now() - _cachedAt < CACHE_TTL_MS) {
        return _cachedLicense;
    }
    return null;
}

function invalidateLicenseCache() {
    _cachedLicense = null;
    _cachedAt = 0;
}

module.exports = {
    generateFormattedKey,
    createCanonicalString,
    signLicensePayload,
    verifyLicenseSignature,
    detectClockRollback,
    evaluateLicenseStatus,
    generateLicenseFileContent,
    setCachedLicense,
    getCachedLicense,
    invalidateLicenseCache,
};

