const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const EmployeeMaster = require("../modals/Employee/EmployeeMasterModel");
const Role = require("../modals/Administration/RoleModel");
const Menu = require("../modals/Administration/MenuModel");
const { loadAccessForEmployee } = require("../middlewares/auth");
const { buildMenuTree, SUPER_ADMIN_ROLE } = require("../utils/accessControl");

const INVALID_LOGIN = "Invalid username or password.";

const ensureDefaultAdminAndRoles = async () => {
    try {
        // 1. Ensure Default Roles
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

        // 2. Ensure Super Admin Account
        const existingAdmin = await EmployeeMaster.findOne({
            $or: [{ username: "admin" }, { primaryRole: "SUPER_ADMIN" }]
        });

        if (!existingAdmin) {
            const hashedPassword = await bcrypt.hash("admin123", 10);
            const sample = await EmployeeMaster.findOne({});
            if (sample) {
                const sampleDoc = sample.toObject();
                delete sampleDoc._id;
                delete sampleDoc.createdAt;
                delete sampleDoc.updatedAt;
                sampleDoc.employeeId = "ADM001";
                sampleDoc.firstName = "System";
                sampleDoc.lastName = "Admin";
                sampleDoc.username = "admin";
                sampleDoc.officialEmail = "admin@orvexa.com";
                sampleDoc.personalEmail = "admin@orvexa.com";
                sampleDoc.password = hashedPassword;
                sampleDoc.primaryRole = "SUPER_ADMIN";
                sampleDoc.isActive = true;
                sampleDoc.employeeStatus = "ACTIVE";
                await EmployeeMaster.create(sampleDoc);
            }
        }
    } catch (err) {
        console.error("Bootstrapping default admin/roles error:", err);
    }
};

// Everything the frontend needs after sign-in / on reload.
const sessionPayload = ({ employee, role, roleCode, isSuperAdmin, permissions, menus }) => ({
    user: {
        _id: String(employee._id),
        employeeCode: employee.employeeId || "",
        username: employee.username,
        name: [employee.firstName, employee.middleName, employee.lastName].filter(Boolean).join(" "),
        email: employee.officialEmail || "",
        profileImage: employee.profileImage || "",
        roleCode,
        roleName: role.roleName,
        isSuperAdmin,
    },
    permissions,
    menus: buildMenuTree(menus, permissions),
    // Every active menu's route (permitted or not), so the app can tell
    // "no permission" apart from "not a menu page".
    routes: menus
        .filter((m) => m.isActive && m.path)
        .map((m) => ({ menuCode: m.menuCode, path: m.path, parent: m.parentMenu ? String(m.parentMenu) : null })),
});

module.exports.login = async (req, res) => {
    try {
        await ensureDefaultAdminAndRoles();

        const username = String(req.body?.username || "").trim().toLowerCase();
        const password = String(req.body?.password || "");

        if (!username || !password) {
            return res.status(400).json({ success: false, message: "Enter your username and password." });
        }

        const employee = await EmployeeMaster.findOne({ username }).select("_id password").lean();
        // Same message whether the username or the password is wrong.
        const valid = employee?.password ? await bcrypt.compare(password, employee.password) : false;
        if (!valid) {
            return res.status(401).json({ success: false, message: INVALID_LOGIN });
        }

        const access = await loadAccessForEmployee(employee._id);
        if (access.error) {
            return res.status(403).json({ success: false, message: access.error });
        }

        const token = jwt.sign(
            { sub: String(employee._id), role: access.roleCode },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || "12h" }
        );

        res.status(200).json({
            success: true,
            message: "Signed in successfully",
            data: { token, ...sessionPayload(access) },
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Requires `authenticate`: returns the current session (used on page reload).
module.exports.me = async (req, res) => {
    try {
        res.status(200).json({ success: true, data: sessionPayload(req.user) });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
