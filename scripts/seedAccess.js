/**
 * One-time (and re-runnable) access setup:
 *   node scripts/seedAccess.js
 *
 * - Menus: creates every sidebar menu that doesn't exist yet (by menuCode).
 *   Existing menus are never overwritten, so edits made in Menu Master stay.
 * - Roles: creates the system roles (SUPER_ADMIN, ADMIN, HR, MANAGER,
 *   EMPLOYEE) with starter permissions. Existing roles keep their permissions.
 * - Super Admin login: if no employee has the SUPER_ADMIN role, creates
 *   username "superadmin" with a random password and prints it once.
 */
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");
const Menu = require("../modals/Administration/MenuModel");
const Role = require("../modals/Administration/RoleModel");

const MONGO_URL = "mongodb://127.0.0.1:27017/HRM";

// Mirrors the current sidebar (src/utils/Routes.js) + Menu Master.
const MENUS = [
    { code: "DASHBOARD", name: "Dashboard", path: "/dashboard", icon: "LayoutDashboard" },
    {
        code: "MASTER", name: "Master", path: "/master", icon: "Database",
        children: [
            ["MASTER_COUNTRY", "Country Master", "/master/countries"],
            ["MASTER_STATE", "State Master", "/master/states"],
            ["MASTER_CITY", "City Master", "/master/cities"],
            ["MASTER_HOLIDAY", "Holiday Master", "/master/holidays"],
            ["MASTER_BANK", "Bank Master", "/master/bank"],
            ["MASTER_MENU", "Menu Master", "/master/menus"],
        ],
    },
    {
        code: "ORGANIZATION", name: "Organization", path: "/organization", icon: "Building2",
        children: [
            ["ORG_COMPANY", "Companies", "/organization/companies"],
            ["ORG_BRANCH", "Branches", "/organization/branches"],
            ["ORG_DEPARTMENT", "Departments", "/organization/departments"],
            ["ORG_DESIGNATION", "Designations", "/organization/designations"],
        ],
    },
    {
        code: "EMPLOYEES", name: "Employees", path: "/employees", icon: "Users",
        children: [
            ["EMP_DIRECTORY", "Employee Directory", "/employees/directory"],
            ["EMP_ASSET", "Assets", "/employees/assets"],
            ["EMP_EXIT", "Exit Management", "/employees/exit"],
        ],
    },
    {
        code: "ATTENDANCE", name: "Attendance", path: "/attendance", icon: "CalendarDays",
        children: [
            ["ATT_LOG", "Attendance Logs", "/attendance/logs"],
            ["ATT_SHIFT", "Shift Management", "/attendance/shifts"],
            ["ATT_HOLIDAY", "Holiday Calendar", "/attendance/holidays"],
            ["ATT_REQUEST", "Attendance Requests", "/attendance/requests"],
        ],
    },
    {
        code: "LEAVE", name: "Leave Management", path: "/leave", icon: "CalendarCheck2",
        children: [
            ["LEAVE_REQUEST", "Leave Requests", "/leave/requests"],
            ["LEAVE_APPROVAL", "Leave Approvals", "/leave/approvals"],
            ["LEAVE_TYPE", "Leave Types", "/leave/types"],
            ["LEAVE_POLICY", "Leave Policies", "/leave/policies"],
            ["LEAVE_BALANCE", "Leave Balance", "/leave/balance"],
        ],
    },
    {
        code: "PAYROLL", name: "Payroll", path: "/payroll", icon: "Wallet",
        children: [
            ["PAY_STRUCTURE", "Salary Structure", "/payroll/salary-structure"],
            ["PAY_PROCESS", "Payroll Processing", "/payroll/process"],
            ["PAY_PAYSLIP", "Payslips", "/payroll/payslips"],
            ["PAY_LOAN", "Loans", "/payroll/loans"],
            ["PAY_REIMBURSEMENT", "Reimbursements", "/payroll/reimbursements"],
            ["PAY_TAX", "Tax Management", "/payroll/taxes"],
        ],
    },
    {
        code: "RECRUITMENT", name: "Recruitment", path: "/recruitment", icon: "BriefcaseBusiness",
        children: [
            ["REC_JOB", "Job Openings", "/recruitment/jobs"],
            ["REC_CANDIDATE", "Candidates", "/recruitment/candidates"],
            ["REC_INTERVIEW", "Interviews", "/recruitment/interviews"],
            ["REC_OFFER", "Offer Letters", "/recruitment/offers"],
            ["REC_ONBOARDING", "Onboarding", "/recruitment/onboarding"],
        ],
    },
    {
        code: "PERFORMANCE", name: "Performance", path: "/performance", icon: "TrendingUp",
        children: [
            ["PERF_GOAL", "Goals", "/performance/goals"],
            ["PERF_REVIEW", "Reviews", "/performance/reviews"],
            ["PERF_APPRAISAL", "Appraisals", "/performance/appraisals"],
            ["PERF_FEEDBACK", "Feedback", "/performance/feedback"],
        ],
    },
    {
        code: "REPORTS", name: "Reports", path: "/reports", icon: "BarChart3",
        children: [
            ["REP_EMPLOYEE", "Employee Reports", "/reports/employees"],
            ["REP_ATTENDANCE", "Attendance Reports", "/reports/attendance"],
            ["REP_PAYROLL", "Payroll Reports", "/reports/payroll"],
            ["REP_LEAVE", "Leave Reports", "/reports/leave"],
            ["REP_RECRUITMENT", "Recruitment Reports", "/reports/recruitment"],
        ],
    },
    {
        code: "ADMINISTRATION", name: "Administration", path: "/administration", icon: "ShieldCheck",
        children: [
            ["ADMIN_USER", "Users", "/administration/users"],
            ["ADMIN_ROLE", "Roles", "/administration/roles"],
            ["ADMIN_PERMISSION", "Permissions", "/administration/permissions"],
            ["ADMIN_AUDIT", "Audit Logs", "/administration/audit-logs"],
            ["ADMIN_ACTIVITY", "Activity Logs", "/administration/activity-logs"],
        ],
    },
    {
        code: "SETTINGS", name: "Settings", path: "/settings", icon: "Settings",
        children: [
            ["SET_GENERAL", "General", "/settings/general"],
            ["SET_NOTIFICATION", "Notifications", "/settings/notifications"],
            ["SET_EMAIL", "Email Templates", "/settings/email"],
            ["SET_INTEGRATION", "Integrations", "/settings/integrations"],
            ["SET_SECURITY", "Security", "/settings/security"],
        ],
    },
];

const ALL = ["view", "add", "edit", "delete"];
const VIEW = ["view"];
const groupCodes = MENUS.map((m) => m.code);
const childCodes = (group) => (MENUS.find((m) => m.code === group)?.children || []).map((c) => c[0]);
const grant = (target, codes, actions) => codes.forEach((c) => (target[c] = actions));

const buildPermissions = (spec) => {
    const perms = {};
    spec(perms);
    // A group must be viewable for anything under it to show.
    MENUS.forEach((m) => {
        if (m.children && m.children.some(([c]) => perms[c]?.includes("view"))) {
            perms[m.code] = perms[m.code] || VIEW;
        }
    });
    return perms;
};

const ROLES = [
    { code: "SUPER_ADMIN", name: "Super Admin", description: "Full access to everything. Can't be restricted.", permissions: {} },
    {
        code: "ADMIN", name: "Admin", description: "Full access to all modules.",
        permissions: buildPermissions((p) => {
            grant(p, groupCodes, VIEW);
            MENUS.forEach((m) => grant(p, m.children ? childCodes(m.code) : [m.code], ALL));
        }),
    },
    {
        code: "HR", name: "HR", description: "Runs people operations.",
        permissions: buildPermissions((p) => {
            grant(p, ["DASHBOARD"], VIEW);
            grant(p, childCodes("MASTER").filter((c) => c !== "MASTER_MENU"), VIEW);
            grant(p, childCodes("ORGANIZATION"), VIEW);
            ["EMPLOYEES", "ATTENDANCE", "LEAVE", "PAYROLL", "RECRUITMENT", "PERFORMANCE"].forEach((g) => grant(p, childCodes(g), ALL));
            grant(p, childCodes("REPORTS"), VIEW);
            grant(p, ["ADMIN_USER"], VIEW);
        }),
    },
    {
        code: "MANAGER", name: "Manager", description: "Manages a team: approvals, hiring and performance.",
        permissions: buildPermissions((p) => {
            grant(p, ["DASHBOARD", "EMP_DIRECTORY", "ATT_LOG", "ATT_HOLIDAY", "LEAVE_BALANCE"], VIEW);
            grant(p, ["ATT_REQUEST", "LEAVE_REQUEST"], ["view", "add", "edit"]);
            grant(p, ["LEAVE_APPROVAL"], ["view", "edit"]);
            grant(p, ["REC_CANDIDATE", "REC_INTERVIEW"], ["view", "add", "edit"]);
            grant(p, childCodes("PERFORMANCE"), ["view", "add", "edit"]);
            grant(p, childCodes("REPORTS"), VIEW);
        }),
    },
    {
        code: "EMPLOYEE", name: "Employee", description: "Self-service: requests, payslips and goals.",
        permissions: buildPermissions((p) => {
            grant(p, ["DASHBOARD", "ATT_HOLIDAY", "LEAVE_BALANCE", "PAY_PAYSLIP", "PERF_GOAL"], VIEW);
            grant(p, ["ATT_REQUEST", "LEAVE_REQUEST", "PERF_FEEDBACK"], ["view", "add"]);
        }),
    },
];

const run = async () => {
    await mongoose.connect(MONGO_URL);
    const summary = { menusCreated: 0, rolesCreated: 0 };

    // Menus
    for (const [groupIndex, group] of MENUS.entries()) {
        const res = await Menu.updateOne(
            { menuCode: group.code },
            {
                $setOnInsert: {
                    menuName: group.name, path: group.path, icon: group.icon,
                    parentMenu: null, sortOrder: (groupIndex + 1) * 10, isActive: true,
                },
            },
            { upsert: true }
        );
        summary.menusCreated += res.upsertedCount;
        const parent = await Menu.findOne({ menuCode: group.code }).lean();

        for (const [childIndex, [code, name, path]] of (group.children || []).entries()) {
            const r = await Menu.updateOne(
                { menuCode: code },
                {
                    $setOnInsert: {
                        menuName: name, path, icon: "", parentMenu: parent._id,
                        sortOrder: (childIndex + 1) * 10, isActive: true,
                    },
                },
                { upsert: true }
            );
            summary.menusCreated += r.upsertedCount;
        }
    }

    // Roles
    for (const role of ROLES) {
        const res = await Role.updateOne(
            { roleCode: role.code },
            {
                $setOnInsert: {
                    roleName: role.name, description: role.description,
                    permissions: role.permissions, isSystemDefault: true,
                },
            },
            { upsert: true }
        );
        summary.rolesCreated += res.upsertedCount;
        // Existing roles: still mark the five as system roles.
        await Role.updateOne({ roleCode: role.code }, { $set: { isSystemDefault: true } });
        if (role.permissions.LEAVE_APPROVAL) {
            await Role.updateOne(
                {
                    roleCode: role.code,
                    "permissions.LEAVE_APPROVAL": { $exists: false },
                },
                { $set: { "permissions.LEAVE_APPROVAL": role.permissions.LEAVE_APPROVAL } },
            );
        }
    }

    // Super Admin login (raw insert: the employee form's HR fields don't apply)
    const employees = mongoose.connection.collection("employeemasters");
    const existingAdmin = await employees.findOne({ primaryRole: "SUPER_ADMIN" });
    let createdCredentials = null;
    if (!existingAdmin) {
        let username = "superadmin";
        if (await employees.findOne({ username })) username = `superadmin${crypto.randomInt(100, 999)}`;
        const password = `${crypto.randomBytes(9).toString("base64url")}#9a`;
        await employees.insertOne({
            employeeId: "SA0001",
            firstName: "Super",
            lastName: "Admin",
            username,
            password: await bcrypt.hash(password, 10),
            primaryRole: "SUPER_ADMIN",
            employeeStatus: "ACTIVE",
            isActive: true,
            joiningDate: new Date(),
            profileImage: "",
            createdAt: new Date(),
            updatedAt: new Date(),
        });
        createdCredentials = { username, password };
    }

    console.log(`Menus created: ${summary.menusCreated}, roles created: ${summary.rolesCreated}`);
    if (createdCredentials) {
        console.log("Super Admin login created (shown once, change it after signing in):");
        console.log(`  username: ${createdCredentials.username}`);
        console.log(`  password: ${createdCredentials.password}`);
    } else {
        console.log(`Super Admin login already exists (username: ${existingAdmin.username}).`);
    }
    await mongoose.disconnect();
};

run().catch(async (error) => {
    console.error("Seeding failed:", error.message);
    await mongoose.disconnect();
    process.exit(1);
});
