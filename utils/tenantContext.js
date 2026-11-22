const { AsyncLocalStorage } = require("async_hooks");
const mongoose = require("mongoose");

const tenantStorage = new AsyncLocalStorage();

// Master models that should always execute against the Master/Central Database (HRM_Master)
const MASTER_MODELS = new Set([
    "LicenseKey",
    "Plan",
    "LicenseAuditLog",
    "TenantRegistry",
]);

const schemaRegistry = new Map();
let isProxyInitialized = false;

/**
 * Initializes transparent dynamic model proxying.
 * Intercepts calls to mongoose.model so all queries and document instantiations
 * automatically execute on the active tenant's connection if present.
 */
function enableTenantProxy() {
    if (isProxyInitialized) return;
    isProxyInitialized = true;

    const originalModel = mongoose.model.bind(mongoose);

    mongoose.model = function (name, schema, collection, skipInit) {
        if (schema) {
            schemaRegistry.set(name, schema);
        }

        const baseModel = originalModel(name, schema, collection, skipInit);

        // Never redirect master models to tenant databases
        if (MASTER_MODELS.has(name)) {
            return baseModel;
        }

        // Return a proxy that resolves the model on the current tenant's connection
        return new Proxy(baseModel, {
            get(target, prop, receiver) {
                const store = tenantStorage.getStore();
                if (store && store.tenantDb) {
                    const modelSchema = schemaRegistry.get(name) || target.schema;
                    const tenantModel =
                        store.tenantDb.models[name] ||
                        store.tenantDb.model(name, modelSchema);

                    const value = Reflect.get(tenantModel, prop, receiver);
                    if (typeof value === "function") {
                        return value.bind(tenantModel);
                    }
                    return value;
                }

                const value = Reflect.get(target, prop, receiver);
                if (typeof value === "function") {
                    return value.bind(target);
                }
                return value;
            },
            construct(target, args, newTarget) {
                const store = tenantStorage.getStore();
                if (store && store.tenantDb) {
                    const modelSchema = schemaRegistry.get(name) || target.schema;
                    const tenantModel =
                        store.tenantDb.models[name] ||
                        store.tenantDb.model(name, modelSchema);

                    return Reflect.construct(tenantModel, args, newTarget);
                }
                return Reflect.construct(target, args, newTarget);
            },
            apply(target, thisArg, args) {
                const store = tenantStorage.getStore();
                if (store && store.tenantDb) {
                    const modelSchema = schemaRegistry.get(name) || target.schema;
                    const tenantModel =
                        store.tenantDb.models[name] ||
                        store.tenantDb.model(name, modelSchema);

                    return Reflect.apply(tenantModel, thisArg, args);
                }
                return Reflect.apply(target, thisArg, args);
            },
        });
    };
}

/**
 * Run a function with the specified tenant context
 */
function runWithTenant(context, callback) {
    return tenantStorage.run(context, callback);
}

/**
 * Get the current active tenant context
 */
function getActiveTenantContext() {
    return tenantStorage.getStore() || null;
}

/**
 * Get current active tenant connection (or null if outside tenant context)
 */
function getActiveTenantConnection() {
    return tenantStorage.getStore()?.tenantDb || null;
}

module.exports = {
    enableTenantProxy,
    runWithTenant,
    getActiveTenantContext,
    getActiveTenantConnection,
    MASTER_MODELS,
    schemaRegistry,
};
