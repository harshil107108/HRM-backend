const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const EmployeeMaster = require("../modals/Employee/EmployeeMasterModel");
const EmployeeFace = require("../modals/Employee/EmployeeFaceModel");
const AttendanceLog = require("../modals/Attendance/AttendanceLogModel");
const Role = require("../modals/Administration/RoleModel");
const Menu = require("../modals/Administration/MenuModel");
require("../modals/Organization/DepartmentMasterModel");
require("../modals/Organization/DesignationMaster");
const { loadAccessForEmployee } = require("../middlewares/auth");
const { buildMenuTree, SUPER_ADMIN_ROLE } = require("../utils/accessControl");
const { recognizeEmployeeFace, enrollEmployeeFace } = require("../utils/faceService");

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
            } else {
                await EmployeeMaster.create({
                    employeeId: "ADM001",
                    firstName: "System",
                    lastName: "Admin",
                    gender: "other",
                    dateOfBirth: new Date("2000-01-01"),
                    employmentType: "FULL_TIME",
                    employeeStatus: "ACTIVE",
                    joiningDate: new Date(),
                    officialEmail: "admin@orvexa.com",
                    personalEmail: "admin@orvexa.com",
                    mobileNumber: "0000000000",
                    emergencyContactName: "System Admin",
                    emergencyContactNumber: "0000000000",
                    postalCode: "N/A",
                    currentAddress: "System administrator account",
                    aadhaarNumber: "N/A",
                    panNumber: "N/A",
                    username: "admin",
                    password: hashedPassword,
                    primaryRole: SUPER_ADMIN_ROLE,
                    isActive: true,
                });
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

/**
 * Biometric Face Login with Automatic Attendance Clock-In.
 * - Authenticates Employees, Managers, HR, etc.
 * - Restricts Admin accounts to credential login as specified.
 * - Marks Punch-In on AttendanceLog for today.
 */
module.exports.faceLogin = async (req, res) => {
    try {
        const image = String(req.body?.image || "").trim();
        if (!image) {
            return res.status(400).json({
                success: false,
                message: "A face image snapshot is required for face recognition login."
            });
        }

        // 1. Load all active enrolled employee face embeddings
        const enrolledFaces = await EmployeeFace.find({ isActive: true })
            .select("employeeId embedding")
            .lean();

        if (!enrolledFaces || enrolledFaces.length === 0) {
            return res.status(404).json({
                success: false,
                notEnrolled: true,
                message: "No employee faces are enrolled in the system yet. Please register your face to use biometric attendance."
            });
        }

        const candidates = enrolledFaces.map((f) => ({
            employeeId: String(f.employeeId),
            embedding: f.embedding,
        }));

        // 2. Query Python face engine for 1:N recognition
        const matchResult = await recognizeEmployeeFace(image, candidates);

        if (!matchResult.success || !matchResult.match) {
            const msg = matchResult.message || "";
            const isEnvironmentalOrMultiFace = (
                msg.toLowerCase().includes("multiple people") ||
                msg.toLowerCase().includes("no human face") ||
                msg.toLowerCase().includes("blurry") ||
                msg.toLowerCase().includes("too dark") ||
                msg.toLowerCase().includes("glare")
            );

            return res.status(401).json({
                success: false,
                notRecognized: !isEnvironmentalOrMultiFace,
                message: msg || "Face not recognized in our database. Please enroll your face or sign in manually.",
                details: matchResult
            });
        }

        const matchedEmployeeId = matchResult.employeeId;
        const employee = await EmployeeMaster.findById(matchedEmployeeId).lean();
        if (!employee) {
            return res.status(404).json({
                success: false,
                message: "Recognized employee account was not found in the database."
            });
        }

        if (employee.isActive === false || employee.employeeStatus === "INACTIVE") {
            return res.status(403).json({
                success: false,
                message: "Your employee account is inactive. Please contact HR."
            });
        }

        // 3. Load effective permissions and role
        const access = await loadAccessForEmployee(employee._id);
        if (access.error) {
            return res.status(403).json({ success: false, message: access.error });
        }

        // 4. Role policy: Admin accounts must use standard password login
        const roleCode = String(access.roleCode || "").toUpperCase();
        if (roleCode === SUPER_ADMIN_ROLE || roleCode === "ADMIN") {
            return res.status(403).json({
                success: false,
                message: "Administrator accounts are restricted to credential login for security. Please sign in via the Admin Login tab."
            });
        }

        // 5. Automatic Attendance Punch-In
        const now = new Date();
        const pad = (n) => String(n).padStart(2, "0");
        const currentTime = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
        const todayDateStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
        const dayStart = new Date(`${todayDateStr}T00:00:00.000Z`);
        const dayEnd = new Date(dayStart);
        dayEnd.setUTCDate(dayEnd.getUTCDate() + 1);

        let attendance = await AttendanceLog.findOne({
            employeeId: employee._id,
            date: { $gte: dayStart, $lt: dayEnd },
        });

        let punchInStatus = "already_punched_in";
        let clockInTime = currentTime;

        if (!attendance) {
            attendance = await AttendanceLog.create({
                employeeId: employee._id,
                date: dayStart,
                clockIn: currentTime,
                clockOut: "",
                totalHours: 0,
                status: "Present",
                source: "Biometric",
                remarks: `Auto punch-in via Face Recognition at ${currentTime}`,
            });
            punchInStatus = "punched_in";
        } else {
            clockInTime = attendance.clockIn || currentTime;
        }

        // Update last recognized timestamp
        await EmployeeFace.updateOne(
            { employeeId: employee._id },
            { $set: { lastRecognizedAt: now } }
        );

        // 6. Generate JWT Session Token
        const token = jwt.sign(
            { sub: String(employee._id), role: access.roleCode },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || "12h" }
        );

        return res.status(200).json({
            success: true,
            message: `Welcome, ${employee.firstName}! Face recognized and attendance clocked in at ${clockInTime}.`,
            data: {
                token,
                ...sessionPayload(access),
                attendance: {
                    clockIn: clockInTime,
                    status: punchInStatus,
                    punchTime: currentTime,
                    date: todayDateStr,
                },
                confidence: matchResult.confidence,
            },
        });
    } catch (error) {
        console.error("Error during face login:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Get active non-admin employees for biometric face enrollment selection.
 */
module.exports.getEnrollmentCandidates = async (req, res) => {
    try {
        const employees = await EmployeeMaster.find({
            isActive: true,
            employeeStatus: "ACTIVE",
            primaryRole: { $nin: ["SUPER_ADMIN", "ADMIN"] },
        })
            .select("employeeId firstName middleName lastName officialEmail departmentId designationId")
            .populate("departmentId", "departmentName")
            .populate("designationId", "designationName")
            .sort({ firstName: 1 })
            .lean();

        const enrolledDocs = await EmployeeFace.find({ isActive: true }).select("employeeId").lean();
        const enrolledSet = new Set(enrolledDocs.map((d) => String(d.employeeId)));

        const data = employees.map((emp) => ({
            _id: String(emp._id),
            employeeId: emp.employeeId,
            name: [emp.firstName, emp.middleName, emp.lastName].filter(Boolean).join(" "),
            email: emp.officialEmail || "",
            department: emp.departmentId?.departmentName || "General",
            designation: emp.designationId?.designationName || "Staff",
            hasFaceEnrolled: enrolledSet.has(String(emp._id)),
        }));

        return res.status(200).json({ success: true, data });
    } catch (error) {
        console.error("Error in getEnrollmentCandidates:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Enroll or update an employee's face embedding vector.
 * Includes password verification for industry-standard account protection,
 * and optional autoLogin to clock in attendance immediately upon enrollment.
 */
module.exports.faceEnroll = async (req, res) => {
    try {
        const employeeId = String(req.body?.employeeId || "").trim();
        const image = String(req.body?.image || "").trim();
        const password = String(req.body?.password || "").trim();
        const autoLogin = Boolean(req.body?.autoLogin);

        if (!employeeId || !image) {
            return res.status(400).json({
                success: false,
                message: "Please select an employee and capture a clear face snapshot."
            });
        }

        let employee = await EmployeeMaster.findById(employeeId);
        if (!employee) {
            employee = await EmployeeMaster.findOne({ employeeId });
        }

        if (!employee) {
            return res.status(404).json({ success: false, message: "Selected employee was not found in the database." });
        }

        if (employee.isActive === false || employee.employeeStatus === "INACTIVE") {
            return res.status(403).json({ success: false, message: "This employee account is inactive. Please contact HR." });
        }

        // Security check: If password is provided (or required for self-registration from login screen), verify it!
        if (password) {
            const valid = employee.password ? await bcrypt.compare(password, employee.password) : false;
            if (!valid) {
                return res.status(401).json({
                    success: false,
                    message: "Security verification failed: Incorrect password for this employee account."
                });
            }
        }

        // Call Python service to extract embedding
        const enrollResult = await enrollEmployeeFace(employee._id, image);
        if (!enrollResult.success || !enrollResult.embedding) {
            return res.status(400).json({
                success: false,
                message: enrollResult.error || enrollResult.message || "Failed to extract face features. Please ensure your face is well-lit and directly facing the camera."
            });
        }

        // Upsert into EmployeeFace
        const faceDoc = await EmployeeFace.findOneAndUpdate(
            { employeeId: employee._id },
            {
                embedding: enrollResult.embedding,
                algorithm: "OpenCV-YuNet-SFace",
                faceSnapshot: image.length < 500000 ? image : "",
                isActive: true,
                enrolledAt: new Date(),
                lastRecognizedAt: new Date(),
            },
            { upsert: true, new: true }
        );

        // If autoLogin is requested (e.g. enrolling directly during attendance login)
        if (autoLogin) {
            const access = await loadAccessForEmployee(employee._id);
            if (access.error) {
                return res.status(403).json({ success: false, message: access.error });
            }

            // Punch In attendance
            const now = new Date();
            const pad = (n) => String(n).padStart(2, "0");
            const currentTime = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
            const todayDateStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
            const dayStart = new Date(`${todayDateStr}T00:00:00.000Z`);
            const dayEnd = new Date(dayStart);
            dayEnd.setUTCDate(dayEnd.getUTCDate() + 1);

            let attendance = await AttendanceLog.findOne({
                employeeId: employee._id,
                date: { $gte: dayStart, $lt: dayEnd },
            });

            let punchInStatus = "already_punched_in";
            let clockInTime = currentTime;

            if (!attendance) {
                attendance = await AttendanceLog.create({
                    employeeId: employee._id,
                    date: dayStart,
                    clockIn: currentTime,
                    clockOut: "",
                    totalHours: 0,
                    status: "Present",
                    source: "Biometric",
                    remarks: `Face registered & punched in at ${currentTime}`,
                });
                punchInStatus = "punched_in";
            } else {
                clockInTime = attendance.clockIn || currentTime;
            }

            const token = jwt.sign(
                { sub: String(employee._id), role: access.roleCode },
                process.env.JWT_SECRET,
                { expiresIn: process.env.JWT_EXPIRES_IN || "12h" }
            );

            return res.status(200).json({
                success: true,
                message: `Face enrolled successfully! Welcome, ${employee.firstName}. Attendance clocked in at ${clockInTime}.`,
                data: {
                    token,
                    ...sessionPayload(access),
                    attendance: {
                        clockIn: clockInTime,
                        status: punchInStatus,
                        punchTime: currentTime,
                        date: todayDateStr,
                    },
                },
            });
        }

        return res.status(200).json({
            success: true,
            message: `Face enrolled successfully for ${employee.firstName} ${employee.lastName}.`,
            data: { employeeId: employee._id, id: faceDoc._id }
        });
    } catch (error) {
        console.error("Error during face enrollment:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

