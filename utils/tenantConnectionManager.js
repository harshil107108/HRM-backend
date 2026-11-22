const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const { runWithTenant } = require("./tenantContext");

// Cache for active tenant connections
const tenantConnections = new Map();

// Default System Menus template
const DEFAULT_MENUS = [
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
            ["TASK_MANAGEMENT", "Task Management", "/employees/task-management"],
            ["TASK_CREATE", "Task Creation", "/employees/task-creation"],
            ["EMP_DAY_REPORT", "Day Report", "/employees/day-report"],
            ["EMP_DAY_REPORT_UNLOCK", "Day Report Unlock", "/employees/day-report-unlock"],
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
            ["LEAVE_BALANCE", "Leave Balances", "/leave/balance"],
        ],
    },
    {
        code: "PAYROLL", name: "Payroll", path: "/payroll", icon: "Receipt",
        children: [
            ["PAY_STRUCTURE", "Salary Structure", "/payroll/salary-structure"],
            ["PAY_PROCESS", "Payroll Processing", "/payroll/process"],
            ["PAY_SLIP", "Payslips", "/payroll/payslips"],
            ["PAY_CALENDAR", "Payroll Calendar", "/payroll/calendar"],
            ["PAY_LOAN", "Loans & Advances", "/payroll/loans"],
            ["PAY_REIMBURSEMENT", "Reimbursements", "/payroll/reimbursements"],
            ["PAY_TAX", "Tax Management", "/payroll/tax"],
        ],
    },
    {
        code: "RECRUITMENT", name: "Recruitment", path: "/recruitment", icon: "Briefcase",
        children: [
            ["REC_JOB", "Job Openings", "/recruitment/job-openings"],
            ["REC_CANDIDATE", "Candidates", "/recruitment/candidates"],
            ["REC_INTERVIEW", "Interviews", "/recruitment/interviews"],
            ["REC_OFFER", "Offer Letters", "/recruitment/offer-letters"],
            ["REC_ONBOARDING", "Onboarding", "/recruitment/onboarding"],
        ],
    },
    {
        code: "PERFORMANCE", name: "Performance", path: "/performance", icon: "TrendingUp",
        children: [
            ["PERF_GOAL", "Goal Tracking", "/performance/goals"],
            ["PERF_REVIEW", "Performance Reviews", "/performance/reviews"],
            ["PERF_APPRAISAL", "Appraisals", "/performance/appraisals"],
            ["PERF_FEEDBACK", "360 Feedback", "/performance/feedback"],
        ],
    },
    {
        code: "REPORTS", name: "Reports & Analytics", path: "/reports", icon: "BarChart3",
        children: [
            ["REP_EMPLOYEE", "Employee Reports", "/reports/employees"],
            ["REP_ATTENDANCE", "Attendance Reports", "/reports/attendance"],
            ["REP_PAYROLL", "Payroll Reports", "/reports/payroll"],
            ["REP_LEAVE", "Leave Reports", "/reports/leave"],
            ["REP_RECRUITMENT", "Recruitment Reports", "/reports/recruitment"],
        ],
    },
    {
        code: "ADMINISTRATION", name: "Administration", path: "/administration", icon: "Shield",
        children: [
            ["ADM_USER", "User Accounts", "/administration/users"],
            ["ADM_ROLE", "Roles & Permissions", "/administration/roles"],
            ["ADM_MATRIX", "Permission Matrix", "/administration/permissions"],
            ["ADM_AUDIT", "Audit Logs", "/administration/audit-logs"],
            ["ADM_ACTIVITY", "Activity Feed", "/administration/activity-logs"],
        ],
    },
    {
        code: "SETTINGS", name: "Settings", path: "/settings", icon: "Settings",
        children: [
            ["SET_GENERAL", "General Settings", "/settings/general"],
            ["SET_NOTIFICATION", "Notifications", "/settings/notifications"],
            ["SET_EMAIL", "Email Templates", "/settings/email"],
            ["SET_INTEGRATION", "Integrations", "/settings/integrations"],
            ["SET_SECURITY", "Security", "/settings/security"],
        ],
    },
];

/**
 * Get or create a cached tenant database connection
 */
function getTenantDb(tenantDbName) {
    if (!tenantDbName) {
        throw new Error("Tenant database name is required");
    }

    if (tenantConnections.has(tenantDbName)) {
        return tenantConnections.get(tenantDbName);
    }

    const tenantDb = mongoose.connection.useDb(tenantDbName, { useCache: true });
    tenantConnections.set(tenantDbName, tenantDb);
    return tenantDb;
}

/**
 * Provision an isolated tenant database:
 * 1. Seeds default roles (ADMIN, MANAGER, EMPLOYEE, SUPER_ADMIN)
 * 2. Seeds standard menus & permission structures
 * 3. Creates the Client Admin account in EmployeeMaster
 */
async function provisionTenantDatabase(tenantDbName, { clientInfo = {}, adminCredentials = {} } = {}) {
    if (!tenantDbName) {
        throw new Error("provisionTenantDatabase: tenantDbName is required");
    }

    const tenantDb = getTenantDb(tenantDbName);

    return await runWithTenant({ tenantDb, tenantDbName }, async () => {
        const Role = require("../modals/Administration/RoleModel");
        const Menu = require("../modals/Administration/MenuModel");
        const EmployeeMaster = require("../modals/Employee/EmployeeMasterModel");

        // 1. Seed Menus if empty
        const existingMenuCount = await Menu.countDocuments();
        if (existingMenuCount === 0) {
            for (let i = 0; i < DEFAULT_MENUS.length; i++) {
                const group = DEFAULT_MENUS[i];
                const createdGroup = await Menu.create({
                    menuName: group.name,
                    menuCode: group.code,
                    path: group.path,
                    icon: group.icon,
                    parentMenu: null,
                    sortOrder: (i + 1) * 10,
                    isActive: true,
                });

                if (group.children && group.children.length > 0) {
                    for (let j = 0; j < group.children.length; j++) {
                        const [code, name, path] = group.children[j];
                        await Menu.create({
                            menuName: name,
                            menuCode: code,
                            path,
                            icon: "",
                            parentMenu: createdGroup._id,
                            sortOrder: (j + 1) * 10,
                            isActive: true,
                        });
                    }
                }
            }
        }

        // 2. Seed Default Roles
        const defaultRoles = [
            {
                roleName: "Administrator",
                roleCode: "ADMIN",
                isSystemDefault: true,
                description: "Full operational access across all modules",
            },
            {
                roleName: "Manager",
                roleCode: "MANAGER",
                isSystemDefault: true,
                description: "Departmental and team management access",
            },
            {
                roleName: "Employee",
                roleCode: "EMPLOYEE",
                isSystemDefault: true,
                description: "Self-service access for regular staff",
            },
            {
                roleName: "Super Administrator",
                roleCode: "SUPER_ADMIN",
                isSystemDefault: true,
                description: "Unrestricted master access",
            },
        ];

        for (const roleDef of defaultRoles) {
            const exists = await Role.findOne({ roleCode: roleDef.roleCode });
            if (!exists) {
                await Role.create(roleDef);
            }
        }

        // 3. Provision Client Admin Account
        if (adminCredentials.username && adminCredentials.password) {
            const cleanUsername = String(adminCredentials.username).trim().toLowerCase();
            const rawPassword = String(adminCredentials.password);
            const hashedPassword = await bcrypt.hash(rawPassword, 10);

            let adminEmployee = await EmployeeMaster.findOne({ username: cleanUsername });

            if (adminEmployee) {
                adminEmployee.password = hashedPassword;
                adminEmployee.primaryRole = "ADMIN";
                adminEmployee.isActive = true;
                adminEmployee.employeeStatus = "ACTIVE";
                if (clientInfo.email) {
                    adminEmployee.officialEmail = clientInfo.email;
                    adminEmployee.personalEmail = clientInfo.email;
                }
                if (clientInfo.name) adminEmployee.firstName = clientInfo.name;
                await adminEmployee.save({ validateBeforeSave: false });
            } else {
                let randNum = Math.floor(1000 + Math.random() * 9000);
                let employeeId = `ADM${randNum}`;
                while (await EmployeeMaster.exists({ employeeId })) {
                    randNum = Math.floor(1000 + Math.random() * 9000);
                    employeeId = `ADM${randNum}`;
                }

                adminEmployee = await EmployeeMaster.create({
                    employeeId,
                    username: cleanUsername,
                    password: hashedPassword,
                    primaryRole: "ADMIN",
                    firstName: clientInfo.name || "Client",
                    lastName: "Admin",
                    officialEmail: clientInfo.email || `${cleanUsername}@hrm.local`,
                    personalEmail: clientInfo.email || `${cleanUsername}@hrm.local`,
                    gender: "other",
                    dateOfBirth: new Date("1995-01-01"),
                    employmentType: "FULL_TIME",
                    employeeStatus: "ACTIVE",
                    joiningDate: new Date(),
                    mobileNumber: "9999999999",
                    emergencyContactName: "Client Admin",
                    emergencyContactNumber: "9999999999",
                    postalCode: "000000",
                    currentAddress: clientInfo.companyName || "Client Head Office",
                    aadhaarNumber: "000000000000",
                    panNumber: "AAAAA0000A",
                    isActive: true,
                });
            }
        }

        return {
            success: true,
            tenantDbName,
            seeded: true,
        };
    });
}

module.exports = {
    getTenantDb,
    provisionTenantDatabase,
    tenantConnections,
};
