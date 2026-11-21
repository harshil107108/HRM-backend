const { test, describe } = require("node:test");
const assert = require("node:assert/strict");

const {
    generateFormattedKey,
    signLicensePayload,
    verifyLicenseSignature,
    detectClockRollback,
    evaluateLicenseStatus,
    generateLicenseFileContent,
} = require("../utils/licenseCrypto");

describe("🔐 HRM Enterprise Licensing & Crypto Engine", () => {
    test("1. Generates standard-compliant formatted license keys", () => {
        const key = generateFormattedKey("Industry", "AcmeCorp", 2026);
        assert.match(
            key,
            /^HRM-IND-ACMEC-2026-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{4}$/,
            "License key should match HRM-[TIER]-[CLIENT]-[YEAR]-[XXXX-XXXX-XXXX]"
        );
    });

    test("2. Signs payload and verifies authentic digital signature", () => {
        const payload = {
            licenseId: "LIC-TEST-001",
            licenseKey: "HRM-IND-CORP-2026-A1B2-C3D4-E5F6",
            clientId: "CLI-001",
            companyName: "Acme Enterprise Inc.",
            effectiveLimits: {
                totalActiveUsers: 50,
                totalEmployeeRecords: 500,
                totalStorageGB: 50,
                allAllowedModules: ["EMPLOYEES", "PAYROLL", "LEAVE"],
            },
            dates: {
                issuedAt: new Date("2026-01-01T00:00:00Z"),
                expiresAt: new Date("2027-01-01T00:00:00Z"),
                gracePeriodDays: 7,
            },
        };

        const { signaturePayload, signature } = signLicensePayload(payload);
        assert.ok(signature, "Signature should be produced");
        assert.ok(signaturePayload, "Base64 signed token produced");

        const verification = verifyLicenseSignature(signaturePayload);
        assert.equal(verification.isValid, true, "Signature verification should pass for authentic payload");
        assert.equal(verification.data.totalActiveUsers, 50);
        assert.equal(verification.data.totalEmployeeRecords, 500);
    });

    test("3. Detects tampering when payload fields are modified", () => {
        const payload = {
            licenseId: "LIC-TEST-TAMPER",
            licenseKey: "HRM-BAS-CLIENT-2026-A1B2-C3D4-E5F6",
            clientId: "CLI-002",
            companyName: "Client A",
            effectiveLimits: {
                totalActiveUsers: 5,
                totalEmployeeRecords: 25,
                totalStorageGB: 5,
                allAllowedModules: ["EMPLOYEES"],
            },
            dates: {
                issuedAt: new Date("2026-01-01T00:00:00Z"),
                expiresAt: new Date("2026-06-01T00:00:00Z"),
                gracePeriodDays: 7,
            },
        };

        const { signaturePayload } = signLicensePayload(payload);

        // Tamper: Decode base64, maliciously modify user seats from 5 to 500, and re-encode
        const decoded = JSON.parse(Buffer.from(signaturePayload, "base64").toString("utf8"));
        decoded.canonicalData.totalActiveUsers = 500; // Malicious hack attempt!
        const tamperedPayload = Buffer.from(JSON.stringify(decoded)).toString("base64");

        const verification = verifyLicenseSignature(tamperedPayload);
        assert.equal(verification.isValid, false, "Tampered payload must fail signature check");
        assert.match(verification.reason, /mismatch/i);
    });

    test("4. Detects clock rollback / time-machine tampering", () => {
        const lastActionTimestamp = new Date("2026-06-15T12:00:00Z");
        const normalCurrentTime = new Date("2026-06-15T12:05:00Z");
        const rolledBackCurrentTime = new Date("2026-06-15T10:00:00Z"); // Rolled back 2 hours

        assert.equal(detectClockRollback(lastActionTimestamp, normalCurrentTime), false);
        assert.equal(detectClockRollback(lastActionTimestamp, rolledBackCurrentTime), true);
    });

    test("5. Correctly calculates Active, Grace Period, Soft Lock, and Hard Lock states", () => {
        const baseLicense = {
            status: "ACTIVE",
            dates: {
                issuedAt: new Date("2026-01-01T00:00:00Z"),
                expiresAt: new Date("2026-06-01T00:00:00Z"),
                gracePeriodDays: 7,
            },
            metadata: {
                lastActionTimestamp: new Date("2026-01-01T00:00:00Z"),
            },
        };

        // Case A: Before expiration -> ACTIVE (FULL)
        const activeEval = evaluateLicenseStatus(baseLicense, new Date("2026-05-15T00:00:00Z"));
        assert.equal(activeEval.status, "ACTIVE");
        assert.equal(activeEval.accessLevel, "FULL");
        assert.equal(activeEval.canWrite, true);

        // Case B: During 7-day Grace Period -> GRACE_PERIOD (canWrite = true with warning)
        const graceEval = evaluateLicenseStatus(baseLicense, new Date("2026-06-04T00:00:00Z"));
        assert.equal(graceEval.status, "GRACE_PERIOD");
        assert.equal(graceEval.accessLevel, "GRACE");
        assert.equal(graceEval.canWrite, true);
        assert.ok(graceEval.warning.includes("Grace period active"));

        // Case C: 15 days post-expiry (post-grace, < 30 days) -> SOFT_LOCKED (Read-Only)
        const softLockEval = evaluateLicenseStatus(baseLicense, new Date("2026-06-16T00:00:00Z"));
        assert.equal(softLockEval.accessLevel, "READ_ONLY");
        assert.equal(softLockEval.canWrite, false);

        // Case D: 45 days post-expiry -> HARD_LOCKED
        const hardLockEval = evaluateLicenseStatus(baseLicense, new Date("2026-07-20T00:00:00Z"));
        assert.equal(hardLockEval.accessLevel, "LOCKED");
        assert.equal(hardLockEval.canWrite, false);
    });

    test("6. Revoked and Suspended licenses immediately lock access", () => {
        const revokedLicense = {
            status: "REVOKED",
            dates: { expiresAt: new Date("2030-01-01") },
            metadata: { revocationReason: "Breach of Contract" },
        };
        const suspendedLicense = {
            status: "SUSPENDED",
            dates: { expiresAt: new Date("2030-01-01") },
        };

        const revokedEval = evaluateLicenseStatus(revokedLicense);
        assert.equal(revokedEval.accessLevel, "LOCKED");
        assert.ok(revokedEval.message.includes("revoked"));

        const suspendedEval = evaluateLicenseStatus(suspendedLicense);
        assert.equal(suspendedEval.accessLevel, "LOCKED");
        assert.ok(suspendedEval.message.includes("suspended"));
    });

    test("7. Generates valid downloadable .lic cryptographic file", () => {
        const licenseDoc = {
            licenseKey: "HRM-IND-CORP-2026-A1B2-C3D4-E5F6",
            licenseId: "LIC-001",
            clientId: "CLI-001",
            clientInfo: { name: "John Doe", companyName: "Corp" },
            effectiveLimits: { totalActiveUsers: 50, allAllowedModules: ["EMPLOYEES"] },
            dates: { expiresAt: new Date("2027-01-01") },
            signaturePayload: "eyJhbGciOiJIUzI1NiJ9...",
        };

        const fileJson = generateLicenseFileContent(licenseDoc);
        const parsed = JSON.parse(fileJson);
        assert.equal(parsed.licenseKey, licenseDoc.licenseKey);
        assert.ok(parsed.checksum, "Checksum should be present");
        assert.equal(parsed.version, "1.0");
    });
});

