const jwt = require("jsonwebtoken");
const EmployeeMaster = require("../modals/Employee/EmployeeMasterModel");
const Role = require("../modals/Administration/RoleModel");
const Menu = require("../modals/Administration/MenuModel");
const {
    SUPER_ADMIN_ROLE,
    effectivePermissions,
    can,
} = require("../utils/accessControl");

// =========================================================
// API path -> menu code(s)
// ---------------------------------------------------------
// Longest prefix wins. `codes`: rights checked for every action.
// `viewAlso`: extra menus that may READ this data (e.g. reports).
// =========================================================
const API_ACCESS = [
    { prefix: "/dashboard", codes: ["DASHBOARD"] },

    { prefix: "/master/country", codes: ["MASTER_COUNTRY"] },
    { prefix: "/master/state", codes: ["MASTER_STATE"] },
    { prefix: "/master/city", codes: ["MASTER_CITY"] },
    { prefix: "/master/holiday", codes: ["MASTER_HOLIDAY"], viewAlso: ["ATT_HOLIDAY"] },
    { prefix: "/master/bank", codes: ["MASTER_BANK"] },
    { prefix: "/master/menu", codes: ["MASTER_MENU"] },

    { prefix: "/organization/company", codes: ["ORG_COMPANY"] },
    { prefix: "/organization/branch", codes: ["ORG_BRANCH"] },
    { prefix: "/organization/department", codes: ["ORG_DEPARTMENT"] },
    { prefix: "/organization/designation", codes: ["ORG_DESIGNATION"] },

    { prefix: "/employee/asset", codes: ["EMP_ASSET"] },
    { prefix: "/employee/exit", codes: ["EMP_EXIT"] },
    { prefix: "/employee", codes: ["EMP_DIRECTORY"], viewAlso: ["REP_EMPLOYEE"] },
    { prefix: "/tasks/getProjects", codes: ["TASK_CREATE"] },
    { prefix: "/tasks/addEditProject", codes: ["TASK_CREATE"] },
    { prefix: "/tasks/deleteProject", codes: ["TASK_CREATE"] },
    { prefix: "/tasks/getAssignableEmployees", codes: ["TASK_CREATE"] },
    { prefix: "/tasks/createTask", codes: ["TASK_CREATE"] },
    { prefix: "/tasks/getTasks", codes: ["TASK_MANAGEMENT", "TASK_CREATE"] },
    { prefix: "/tasks/updateTaskStatus", codes: ["TASK_MANAGEMENT", "TASK_CREATE"] },
    { prefix: "/tasks/deleteTask", codes: ["TASK_CREATE"] },
    { prefix: "/tasks", codes: ["TASK_MANAGEMENT"] },

    { prefix: "/recruitment/jobopening", codes: ["REC_JOB"] },
    { prefix: "/recruitment/candidate", codes: ["REC_CANDIDATE"], viewAlso: ["REP_RECRUITMENT"] },
    { prefix: "/recruitment/interview", codes: ["REC_INTERVIEW"] },
    { prefix: "/recruitment/offer", codes: ["REC_OFFER"] },
    { prefix: "/recruitment/onboarding", codes: ["REC_ONBOARDING"] },

    { prefix: "/attendance/log", codes: ["ATT_LOG"], viewAlso: ["REP_ATTENDANCE"] },
    { prefix: "/attendance/shift", codes: ["ATT_SHIFT"] },
    { prefix: "/attendance/request", codes: ["ATT_REQUEST"] },

    { prefix: "/leave/type", codes: ["LEAVE_TYPE"] },
    { prefix: "/leave/policy", codes: ["LEAVE_POLICY"] },
    { prefix: "/leave/approval", codes: ["LEAVE_APPROVAL"] },
    { prefix: "/leave/request", codes: ["LEAVE_REQUEST"], viewAlso: ["REP_LEAVE", "LEAVE_APPROVAL"] },
    { prefix: "/leave/balance", codes: ["LEAVE_BALANCE"] },

    { prefix: "/payroll/salary-structure", codes: ["PAY_STRUCTURE"] },
    { prefix: "/payroll/process", codes: ["PAY_PROCESS"] },
    { prefix: "/payroll/payslip", codes: ["PAY_PAYSLIP"], viewAlso: ["REP_PAYROLL"] },
    { prefix: "/payroll/loan", codes: ["PAY_LOAN"] },
    { prefix: "/payroll/reimbursement", codes: ["PAY_REIMBURSEMENT"] },
    { prefix: "/payroll/tax", codes: ["PAY_TAX"] },

    { prefix: "/performance/goal", codes: ["PERF_GOAL"] },
    { prefix: "/performance/review", codes: ["PERF_REVIEW"] },
    { prefix: "/performance/appraisal", codes: ["PERF_APPRAISAL"] },
    { prefix: "/performance/feedback", codes: ["PERF_FEEDBACK"] },

    { prefix: "/administration/user", codes: ["ADMIN_USER"] },
    { prefix: "/administration/role", codes: ["ADMIN_ROLE", "ADMIN_PERMISSION"] },
    { prefix: "/administration/audit", codes: ["ADMIN_AUDIT"] },

    {
        prefix: "/settings/system",
        codes: ["SET_GENERAL", "SET_NOTIFICATION", "SET_EMAIL", "SET_INTEGRATION", "SET_SECURITY"],
    },
].sort((a, b) => b.prefix.length - a.prefix.length);

// Dropdown/lookup sources other modules' forms depend on: any signed-in
// user may read these, otherwise forms break for users without that module.
const LOOKUP_PATHS = new Set([
    "/employee/getEmployee",
    "/recruitment/candidate/getCandidates",
    "/recruitment/jobopening/getJobOpening",
    "/organization/designation/getDesignation",
    "/leave/type/getLeaveTypes",
    "/master/holiday/getHoliday",
    "/settings/system/getSettingsByCategory",
]);

const isLookup = (path) => LOOKUP_PATHS.has(path) || /help$/i.test(path.split("/").pop() || "");

const findAccessRule = (path) =>
    API_ACCESS.find((rule) => path === rule.prefix || path.startsWith(`${rule.prefix}/`));

// add / edit / delete / view from the endpoint name (+ body for add vs edit).
const resolveAction = (req) => {
    const endpoint = (req.path.split("/").pop() || "").toLowerCase();
    if (endpoint.startsWith("delete")) return "delete";
    if (/^(addedit|add|create|update|save|edit)/.test(endpoint)) {
        // Multipart bodies aren't parsed yet (multer runs in the route), so the
        // record id is unknown here: accept either right.
        if (req.is("multipart/form-data")) return "add|edit";
        return req.body && req.body._id ? "edit" : "add";
    }
    return "view";
};

// =========================================================
// authenticate: verifies the Bearer token and loads the user
// =========================================================
const loadAccessForEmployee = async (employeeId) => {
    const employee = await EmployeeMaster.findById(employeeId)
        .select("employeeId firstName middleName lastName username officialEmail profileImage primaryRole isActive employeeStatus")
        .lean();
    if (!employee) return { error: "Your account no longer exists." };
    if (employee.isActive === false || employee.employeeStatus === "INACTIVE") {
        return { error: "Your account is inactive. Contact your administrator." };
    }

    const roleCode = String(employee.primaryRole || "").toUpperCase();
    const [role, menus] = await Promise.all([
        Role.findOne({ roleCode }).lean(),
        Menu.find({}).lean(),
    ]);
    if (!role) return { error: "Your role is not configured. Contact your administrator." };

    const isSuperAdmin = roleCode === SUPER_ADMIN_ROLE;
    const permissions = effectivePermissions(menus, role.permissions, isSuperAdmin);
    return { employee, role, roleCode, isSuperAdmin, permissions, menus };
};

const authenticate = async (req, res, next) => {
    try {
        const header = req.headers.authorization || "";
        const token = header.startsWith("Bearer ") ? header.slice(7) : null;
        if (!token) {
            return res.status(401).json({ success: false, message: "Please sign in to continue." });
        }

        let payload;
        try {
            payload = jwt.verify(token, process.env.JWT_SECRET);
        } catch {
            return res.status(401).json({ success: false, message: "Your session has expired. Please sign in again." });
        }

        const access = await loadAccessForEmployee(payload.sub);
        if (access.error) {
            return res.status(401).json({ success: false, message: access.error });
        }

        req.user = access;
        next();
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// =========================================================
// authorizeRequest: checks the route's menu rights
// =========================================================
const authorizeRequest = (req, res, next) => {
    const user = req.user;
    if (!user) return res.status(401).json({ success: false, message: "Please sign in to continue." });
    if (user.isSuperAdmin) return next();

    const path = `${req.baseUrl || ""}${req.path}`;
    const action = resolveAction(req);

    if (action === "view" && isLookup(path)) return next();

    // Employees may manage only their own pending leave requests; the Leave
    // Request controller enforces ownership and pending status on mutations.
    if (
        user.roleCode === "EMPLOYEE" &&
        path.startsWith("/leave/request/") &&
        ["edit", "delete"].includes(action)
    ) {
        return next();
    }

    const rule = findAccessRule(path);
    // Endpoints not tied to a menu only need a valid session.
    if (!rule) return next();

    const actions = action.split("|");
    const codes = action === "view" ? [...rule.codes, ...(rule.viewAlso || [])] : rule.codes;
    const allowed = codes.some((code) => actions.some((a) => can(user.permissions, code, a)));

    if (!allowed) {
        const verb = { view: "view", add: "add", edit: "edit", delete: "delete", "add|edit": "save" }[action] || action;
        return res.status(403).json({
            success: false,
            message: `You don't have permission to ${verb} in this module.`,
        });
    }
    next();
};

module.exports = {
    authenticate,
    authorizeRequest,
    loadAccessForEmployee,
    API_ACCESS,
};
