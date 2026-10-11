const mongoose = require("mongoose");
const Menu = require("../../modals/Administration/MenuModel");
const Role = require("../../modals/Administration/RoleModel");

const fail = (res, status, message) => res.status(status).json({ success: false, message });

const DEFAULT_MENUS = [
    {
        menuName: "Dashboard",
        menuCode: "DASHBOARD",
        path: "/dashboard",
        icon: "LayoutDashboard",
        sortOrder: 1,
        children: [],
    },
    {
        menuName: "Master",
        menuCode: "MASTER",
        path: "/master",
        icon: "Database",
        sortOrder: 2,
        children: [
            { menuName: "Country Master", menuCode: "MASTER_COUNTRY", path: "/master/countries", sortOrder: 1 },
            { menuName: "State Master", menuCode: "MASTER_STATE", path: "/master/states", sortOrder: 2 },
            { menuName: "City Master", menuCode: "MASTER_CITY", path: "/master/cities", sortOrder: 3 },
            { menuName: "Holiday Master", menuCode: "MASTER_HOLIDAY", path: "/master/holidays", sortOrder: 4 },
            { menuName: "Bank Master", menuCode: "MASTER_BANK", path: "/master/banks", sortOrder: 5 },
            { menuName: "Route Master", menuCode: "MASTER_MENU", path: "/master/routes", sortOrder: 6 },
        ],
    },
    {
        menuName: "Organization",
        menuCode: "ORGANIZATION",
        path: "/organization",
        icon: "Building2",
        sortOrder: 3,
        children: [
            { menuName: "Company Master", menuCode: "ORG_COMPANY", path: "/organization/company", sortOrder: 1 },
            { menuName: "Branch Master", menuCode: "ORG_BRANCH", path: "/organization/branch", sortOrder: 2 },
            { menuName: "Department Master", menuCode: "ORG_DEPARTMENT", path: "/organization/department", sortOrder: 3 },
            { menuName: "Designation Master", menuCode: "ORG_DESIGNATION", path: "/organization/designation", sortOrder: 4 },
        ],
    },
    {
        menuName: "Employee",
        menuCode: "EMPLOYEE",
        path: "/employee",
        icon: "Users",
        sortOrder: 4,
        children: [
            { menuName: "Employee Directory", menuCode: "EMP_DIRECTORY", path: "/employee/directory", sortOrder: 1 },
            { menuName: "Asset Management", menuCode: "EMP_ASSET", path: "/employee/assets", sortOrder: 2 },
            { menuName: "Exit Management", menuCode: "EMP_EXIT", path: "/employee/exit", sortOrder: 3 },
        ],
    },
    {
        menuName: "Recruitment",
        menuCode: "RECRUITMENT",
        path: "/recruitment",
        icon: "Briefcase",
        sortOrder: 5,
        children: [
            { menuName: "Job Openings", menuCode: "REC_JOB", path: "/recruitment/job-openings", sortOrder: 1 },
            { menuName: "Candidates", menuCode: "REC_CANDIDATE", path: "/recruitment/candidates", sortOrder: 2 },
            { menuName: "Interviews", menuCode: "REC_INTERVIEW", path: "/recruitment/interviews", sortOrder: 3 },
            { menuName: "Offer Letters", menuCode: "REC_OFFER", path: "/recruitment/offers", sortOrder: 4 },
            { menuName: "Onboarding", menuCode: "REC_ONBOARDING", path: "/recruitment/onboarding", sortOrder: 5 },
        ],
    },
    {
        menuName: "Attendance",
        menuCode: "ATTENDANCE",
        path: "/attendance",
        icon: "Clock",
        sortOrder: 6,
        children: [
            { menuName: "Attendance Logs", menuCode: "ATT_LOG", path: "/attendance/logs", sortOrder: 1 },
            { menuName: "Shift Management", menuCode: "ATT_SHIFT", path: "/attendance/shifts", sortOrder: 2 },
            { menuName: "Weekend Policy", menuCode: "ATT_WEEKEND", path: "/attendance/weekend-policy", sortOrder: 3 },
            { menuName: "Attendance Requests", menuCode: "ATT_REQUEST", path: "/attendance/requests", sortOrder: 4 },
        ],
    },
    {
        menuName: "Leave",
        menuCode: "LEAVE",
        path: "/leave",
        icon: "Calendar",
        sortOrder: 7,
        children: [
            { menuName: "Leave Types", menuCode: "LEAVE_TYPE", path: "/leave/types", sortOrder: 1 },
            { menuName: "Leave Policies", menuCode: "LEAVE_POLICY", path: "/leave/policies", sortOrder: 2 },
            { menuName: "Leave Requests", menuCode: "LEAVE_REQUEST", path: "/leave/requests", sortOrder: 3 },
            { menuName: "Leave Balances", menuCode: "LEAVE_BALANCE", path: "/leave/balances", sortOrder: 4 },
        ],
    },
    {
        menuName: "Payroll",
        menuCode: "PAYROLL",
        path: "/payroll",
        icon: "DollarSign",
        sortOrder: 8,
        children: [
            { menuName: "Salary Structures", menuCode: "PAY_STRUCTURE", path: "/payroll/structures", sortOrder: 1 },
            { menuName: "Payroll Processing", menuCode: "PAY_PROCESS", path: "/payroll/process", sortOrder: 2 },
            { menuName: "Payslips", menuCode: "PAY_PAYSLIP", path: "/payroll/payslips", sortOrder: 3 },
            { menuName: "Loans & Advances", menuCode: "PAY_LOAN", path: "/payroll/loans", sortOrder: 4 },
            { menuName: "Reimbursements", menuCode: "PAY_REIMBURSEMENT", path: "/payroll/reimbursements", sortOrder: 5 },
            { menuName: "Tax Management", menuCode: "PAY_TAX", path: "/payroll/tax", sortOrder: 6 },
        ],
    },
    {
        menuName: "Performance",
        menuCode: "PERFORMANCE",
        path: "/performance",
        icon: "Award",
        sortOrder: 9,
        children: [
            { menuName: "Goals", menuCode: "PERF_GOAL", path: "/performance/goals", sortOrder: 1 },
            { menuName: "Reviews", menuCode: "PERF_REVIEW", path: "/performance/reviews", sortOrder: 2 },
            { menuName: "Appraisals", menuCode: "PERF_APPRAISAL", path: "/performance/appraisals", sortOrder: 3 },
            { menuName: "Feedback", menuCode: "PERF_FEEDBACK", path: "/performance/feedback", sortOrder: 4 },
        ],
    },
    {
        menuName: "Administration",
        menuCode: "ADMINISTRATION",
        path: "/administration",
        icon: "Shield",
        sortOrder: 10,
        children: [
            { menuName: "Users", menuCode: "ADMIN_USER", path: "/administration/users", sortOrder: 1 },
            { menuName: "Roles & Permissions", menuCode: "ADMIN_ROLE", path: "/administration/roles", sortOrder: 2 },
            { menuName: "Audit Logs", menuCode: "ADMIN_AUDIT", path: "/administration/audit-logs", sortOrder: 3 },
        ],
    },
    {
        menuName: "Settings",
        menuCode: "SETTINGS",
        path: "/settings",
        icon: "Settings",
        sortOrder: 11,
        children: [
            { menuName: "General Settings", menuCode: "SET_GENERAL", path: "/settings/general", sortOrder: 1 },
            { menuName: "Notification Settings", menuCode: "SET_NOTIFICATION", path: "/settings/notifications", sortOrder: 2 },
            { menuName: "Email Templates", menuCode: "SET_EMAIL", path: "/settings/email-templates", sortOrder: 3 },
            { menuName: "Integration Settings", menuCode: "SET_INTEGRATION", path: "/settings/integrations", sortOrder: 4 },
            { menuName: "Security Settings", menuCode: "SET_SECURITY", path: "/settings/security", sortOrder: 5 },
        ],
    },
];

const seedMenusIfEmpty = async () => {
    const count = await Menu.countDocuments();
    if (count > 0) return false;

    for (const group of DEFAULT_MENUS) {
        const parent = await Menu.create({
            menuName: group.menuName,
            menuCode: group.menuCode,
            path: group.path,
            icon: group.icon,
            parentMenu: null,
            sortOrder: group.sortOrder,
            isActive: true,
        });

        if (group.children?.length) {
            for (const child of group.children) {
                await Menu.create({
                    menuName: child.menuName,
                    menuCode: child.menuCode,
                    path: child.path,
                    icon: "",
                    parentMenu: parent._id,
                    sortOrder: child.sortOrder,
                    isActive: true,
                });
            }
        }
    }

    // Also ensure default roles exist
    const defaultRoles = [
        { roleName: "Super Administrator", roleCode: "SUPER_ADMIN", isSystemDefault: true, description: "Unrestricted access to all modules" },
        { roleName: "Administrator", roleCode: "ADMIN", isSystemDefault: true, description: "Full operational access across all departments" },
        { roleName: "Manager", roleCode: "MANAGER", isSystemDefault: true, description: "Departmental and team management access" },
        { roleName: "Employee", roleCode: "EMPLOYEE", isSystemDefault: true, description: "Self-service access for regular staff" },
    ];

    for (const r of defaultRoles) {
        const exists = await Role.findOne({ roleCode: r.roleCode });
        if (!exists) {
            await Role.create(r);
        }
    }

    return true;
};

// Flat list with parent name, ordered as the sidebar shows it.
module.exports.getMenus = async (req, res) => {
    try {
        await seedMenusIfEmpty();
        const menus = await Menu.find({})
            .populate("parentMenu", "menuName menuCode")
            .sort({ sortOrder: 1, menuName: 1 })
            .lean();
        res.status(200).json({ success: true, data: menus });
    } catch (error) {
        fail(res, 500, error.message);
    }
};

module.exports.getMenuById = async (req, res) => {
    try {
        const { _id } = req.body;
        if (!mongoose.Types.ObjectId.isValid(_id)) return fail(res, 400, "A valid Menu ID is required");
        const menu = await Menu.findById(_id).lean();
        if (!menu) return fail(res, 404, "Menu not found");
        res.status(200).json({ success: true, data: menu });
    } catch (error) {
        fail(res, 500, error.message);
    }
};

// Groups only (top level) — parent options in the Menu form.
module.exports.getMenuHelp = async (req, res) => {
    try {
        await seedMenusIfEmpty();
        const groups = await Menu.find({ parentMenu: null })
            .select("menuName menuCode")
            .sort({ sortOrder: 1, menuName: 1 })
            .lean();
        res.status(200).json({ success: true, data: groups });
    } catch (error) {
        fail(res, 500, error.message);
    }
};

// Hierarchical tree for the permissions matrix: groups with their child items
module.exports.getMenuTree = async (req, res) => {
    try {
        await seedMenusIfEmpty();
        const allMenus = await Menu.find({}).sort({ sortOrder: 1, menuName: 1 }).lean();
        const groups = allMenus.filter((m) => !m.parentMenu);
        const children = allMenus.filter((m) => m.parentMenu);

        const tree = groups.map((g) => ({
            ...g,
            children: children
                .filter((c) => String(c.parentMenu) === String(g._id))
                .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)),
        }));

        res.status(200).json({ success: true, data: tree });
    } catch (error) {
        fail(res, 500, error.message);
    }
};

module.exports.addEditMenu = async (req, res) => {
    try {
        const { _id, menuName, menuCode, path, icon, parentMenu, sortOrder, isActive, description } = req.body;

        if (!menuName || !String(menuName).trim()) return fail(res, 400, "Menu Name is required");
        if (!menuCode || !String(menuCode).trim()) return fail(res, 400, "Menu Code is required");

        const code = String(menuCode).trim().toUpperCase();
        const parentId = parentMenu || null;

        if (parentId) {
            if (!mongoose.Types.ObjectId.isValid(parentId)) return fail(res, 400, "Parent menu is invalid");
            if (_id && String(parentId) === String(_id)) return fail(res, 400, "A menu can't be its own parent");
            const parent = await Menu.findById(parentId).lean();
            if (!parent) return fail(res, 400, "Parent menu not found");
            // Two levels only: group -> item.
            if (parent.parentMenu) return fail(res, 400, "Parent must be a top-level group");
        }

        if (_id && parentId) {
            const hasChildren = await Menu.exists({ parentMenu: _id });
            if (hasChildren) return fail(res, 400, "This group has menu items; it can't be moved under another group");
        }

        const duplicate = await Menu.findOne({ menuCode: code, ...(_id ? { _id: { $ne: _id } } : {}) }).lean();
        if (duplicate) return fail(res, 409, `Menu Code "${code}" is already used by "${duplicate.menuName}"`);

        const data = {
            menuName: String(menuName).trim(),
            menuCode: code,
            path: path ? String(path).trim() : "",
            icon: icon ? String(icon).trim() : "",
            parentMenu: parentId,
            sortOrder: Number.isFinite(Number(sortOrder)) ? Number(sortOrder) : 0,
            isActive: isActive === undefined ? true : isActive === true || isActive === "true",
            description: description ? String(description).trim() : "",
        };

        if (_id) {
            const existing = await Menu.findById(_id).lean();
            if (!existing) return fail(res, 404, "Menu not found");

            const menu = await Menu.findByIdAndUpdate(_id, data, { new: true, runValidators: true });

            // Keep role permissions attached if the code was renamed.
            if (existing.menuCode !== code) {
                const roles = await Role.find({ [`permissions.${existing.menuCode}`]: { $exists: true } });
                await Promise.all(
                    roles.map((role) => {
                        const actions = role.permissions.get(existing.menuCode);
                        role.permissions.delete(existing.menuCode);
                        role.permissions.set(code, actions);
                        return role.save();
                    })
                );
            }

            return res.status(200).json({ success: true, message: "Menu updated successfully", data: menu });
        }

        const menu = await Menu.create(data);
        res.status(201).json({ success: true, message: "Menu created successfully", data: menu });
    } catch (error) {
        fail(res, 500, error.message);
    }
};

module.exports.deleteMenuById = async (req, res) => {
    try {
        const { _id } = req.body;
        if (!mongoose.Types.ObjectId.isValid(_id)) return fail(res, 400, "A valid Menu ID is required");

        const children = await Menu.countDocuments({ parentMenu: _id });
        if (children > 0) {
            return fail(res, 409, `This group still has ${children} menu item${children > 1 ? "s" : ""}. Delete or move them first.`);
        }

        const menu = await Menu.findByIdAndDelete(_id);
        if (!menu) return fail(res, 404, "Menu not found");

        // Drop the menu's permissions from every role.
        await Role.updateMany({}, { $unset: { [`permissions.${menu.menuCode}`]: "" } });

        res.status(200).json({ success: true, message: "Menu deleted successfully" });
    } catch (error) {
        fail(res, 500, error.message);
    }
};

module.exports.seedDefaults = async (req, res) => {
    try {
        await Menu.deleteMany({});
        await seedMenusIfEmpty();
        res.status(200).json({ success: true, message: "Default menus and roles seeded successfully" });
    } catch (error) {
        fail(res, 500, error.message);
    }
};
