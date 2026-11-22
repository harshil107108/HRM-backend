// =========================================================
// Role-based access control helpers
// ---------------------------------------------------------
// Permissions live on Role.permissions as { [menuCode]: ["view","add","edit","delete"] }.
// A group's "view" gates everything under it: turning a group off hides and
// blocks all of its items, whatever the items themselves allow.
// =========================================================

const ACTIONS = ["view", "add", "edit", "delete"];
const SUPER_ADMIN_ROLE = "SUPER_ADMIN";

const toPlainPermissions = (permissions) => {
    if (!permissions) return {};
    const entries = permissions instanceof Map ? [...permissions.entries()] : Object.entries(permissions);
    const result = {};
    entries.forEach(([code, actions]) => {
        const list = (Array.isArray(actions) ? actions : []).filter((a) => ACTIONS.includes(a));
        if (list.length) result[code] = [...new Set(list)];
    });
    return result;
};

// Effective rights per active menu code, applying the parent-group rule.
// Super Admin gets every action on every active menu without requiring a license key.
// Tenant Administrator (ADMIN) gets every action on every menu allowed by the tenant license.
// Non-Super-Admin users are strictly bounded by activeLicense.effectiveLimits.allAllowedModules.
const effectivePermissions = (menus, rolePermissions, isSuperAdmin, activeLicense, roleCode = "") => {
    const isTenantAdmin = isSuperAdmin || roleCode === "SUPER_ADMIN" || roleCode === "ADMIN";
    const perms = toPlainPermissions(rolePermissions);
    const byId = new Map(menus.map((m) => [String(m._id), m]));
    const result = {};

    // Helper: is this module code permitted by the active license?
    const isLicensed = (code) => {
        if (isSuperAdmin) return true;
        if (!activeLicense || !activeLicense.isActive) return false;
        const allowed = activeLicense.effectiveLimits?.allAllowedModules;
        if (!Array.isArray(allowed) || allowed.length === 0) return true;
        return allowed.includes(code);
    };

    menus.forEach((menu) => {
        if (!menu.isActive) return;
        if (!isLicensed(menu.menuCode)) return;

        const parent = menu.parentMenu ? byId.get(String(menu.parentMenu)) : null;
        if (parent && !parent.isActive) return;
        if (parent && !isLicensed(parent.menuCode)) return;

        if (isTenantAdmin) {
            result[menu.menuCode] = [...ACTIONS];
            return;
        }

        const own = perms[menu.menuCode] || [];
        if (!own.includes("view")) return;
        if (parent && !(perms[parent.menuCode] || []).includes("view")) return;
        result[menu.menuCode] = own;
    });

    return result;
};

// Sidebar tree the user may see: groups -> items, sorted, inactive and
// not-permitted entries removed, empty groups dropped.
const buildMenuTree = (menus, effective) => {
    const sort = (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || String(a.menuName).localeCompare(String(b.menuName));
    const visible = (m) => Boolean(effective[m.menuCode]);
    const shape = (m) => ({
        _id: String(m._id),
        menuName: m.menuName,
        menuCode: m.menuCode,
        path: m.path,
        icon: m.icon,
        sortOrder: m.sortOrder,
    });

    const roots = menus.filter((m) => !m.parentMenu).sort(sort);
    return roots
        .filter(visible)
        .map((root) => {
            const children = menus
                .filter((m) => m.parentMenu && String(m.parentMenu) === String(root._id))
                .filter(visible)
                .sort(sort)
                .map(shape);
            return { ...shape(root), children };
        })
        // A group with children configured but none visible is hidden;
        // a leaf (e.g. Dashboard) stays.
        .filter((node) => {
            const hasConfiguredChildren = menus.some(
                (m) => m.parentMenu && String(m.parentMenu) === node._id && m.isActive
            );
            return !hasConfiguredChildren || node.children.length > 0;
        });
};

const can = (effective, menuCode, action) => Boolean(effective?.[menuCode]?.includes(action));

module.exports = {
    ACTIONS,
    SUPER_ADMIN_ROLE,
    toPlainPermissions,
    effectivePermissions,
    buildMenuTree,
    can,
};
