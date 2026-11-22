const { test, describe } = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");
const { enableTenantProxy, runWithTenant, getActiveTenantConnection } = require("../utils/tenantContext");

describe("🏢 Multi-Tenant Database Isolation Engine", () => {
    test("1. Successfully intercepts and proxies models per tenant", () => {
        enableTenantProxy();

        const conn = mongoose.createConnection();
        mongoose.connection = conn;

        const dummySchema = new mongoose.Schema({ title: String });
        const Project = mongoose.model("ProjectTest", dummySchema);

        const tenantDbAlpha = conn.useDb("HRM_tenant_Alpha_test", { useCache: true });
        const tenantDbBeta = conn.useDb("HRM_tenant_Beta_test", { useCache: true });

        // Outside context
        assert.equal(getActiveTenantConnection(), null);

        // Inside Tenant Alpha context
        runWithTenant({ tenantDb: tenantDbAlpha, tenantId: "ALPHA" }, () => {
            assert.equal(Project.db.name, "HRM_tenant_Alpha_test");
        });

        // Inside Tenant Beta context
        runWithTenant({ tenantDb: tenantDbBeta, tenantId: "BETA" }, () => {
            assert.equal(Project.db.name, "HRM_tenant_Beta_test");
        });
    });

    test("2. Keeps Master Models (LicenseKey, Plan) out of tenant redirection", () => {
        enableTenantProxy();

        const conn = mongoose.createConnection();
        mongoose.connection = conn;

        const licenseSchema = new mongoose.Schema({ key: String });
        const LicenseKey = mongoose.model("LicenseKey", licenseSchema);

        const tenantDb = conn.useDb("HRM_tenant_Isolated", { useCache: true });

        runWithTenant({ tenantDb, tenantId: "ISOLATED" }, () => {
            // Master model should NOT redirect to tenant database
            assert.notEqual(LicenseKey.db.name, "HRM_tenant_Isolated");
        });
    });
});
