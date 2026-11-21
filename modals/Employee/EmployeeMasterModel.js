const mongoose = require("mongoose");

// Helper: Regular staff requires full employee onboarding details (branch, dept, PAN, etc.)
// Administrators (SUPER_ADMIN and client ADMIN provisioned from License) are exempt.
const isRegularStaff = function () {
    return !["SUPER_ADMIN", "ADMIN"].includes(this.primaryRole);
};

const employeeMasterSchema = new mongoose.Schema(
    {
        // =========================
        // PERSONAL INFORMATION
        // =========================

        employeeId: {
            type: String,
            required: true,
            unique: true,
            trim: true,
        },

        profileImage: {
            type: String,
            default: "",
        },

        firstName: {
            type: String,
            required: true,
            trim: true,
        },

        middleName: {
            type: String,
            trim: true,
            default: "",
        },

        lastName: {
            type: String,
            required: true,
            trim: true,
        },

        gender: {
            type: String,
            required: true,
            enum: ["male", "female", "other"],
            default: "other",
        },

        dateOfBirth: {
            type: Date,
            required: isRegularStaff,
            default: () => new Date("1995-01-01"),
        },

        maritalStatus: {
            type: String,
            enum: [
                "single",
                "married",
                "divorced",
                "widowed",
            ],
            default: null,
        },

        bloodGroup: {
            type: String,
            enum: [
                "A+",
                "A-",
                "B+",
                "B-",
                "AB+",
                "AB-",
                "O+",
                "O-",
            ],
            default: null,
        },


        // =========================
        // ORGANIZATION INFORMATION
        // =========================

        companyId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "CompanyMaster",
            required: isRegularStaff,
        },

        branchId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "BranchMaster",
            required: isRegularStaff,
        },

        departmentId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "DepartmentMaster",
            required: isRegularStaff,
        },

        designationId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "DesignationMaster",
            required: isRegularStaff,
        },

        reportingManager: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "EmployeeMaster",
            default: null,
        },

        employmentType: {
            type: String,
            required: isRegularStaff,
            enum: [
                "FULL_TIME",
                "PART_TIME",
                "CONTRACT",
                "INTERN",
            ],
            default: "FULL_TIME",
        },

        employeeStatus: {
            type: String,
            required: true,
            enum: [
                "ACTIVE",
                "INACTIVE",
                "NOTICE",
            ],
            default: "ACTIVE",
        },

        currentStatus: {
            type: String,
            default: "Active",
            trim: true,
        },

        joiningDate: {
            type: Date,
            required: isRegularStaff,
            default: Date.now,
        },

        confirmationDate: {
            type: Date,
            default: null,
        },

        probationPeriod: {
            type: Number,
            default: 0,
        },


        // =========================
        // CONTACT INFORMATION
        // =========================

        officialEmail: {
            type: String,
            required: true,
            trim: true,
            lowercase: true,
        },

        personalEmail: {
            type: String,
            required: isRegularStaff,
            trim: true,
            lowercase: true,
            default: "",
        },

        mobileNumber: {
            type: String,
            required: isRegularStaff,
            trim: true,
            default: "",
        },

        alternateMobile: {
            type: String,
            trim: true,
            default: "",
        },

        emergencyContactName: {
            type: String,
            required: isRegularStaff,
            trim: true,
            default: "",
        },

        emergencyContactNumber: {
            type: String,
            required: isRegularStaff,
            trim: true,
            default: "",
        },

        countryId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "CountryMaster",
            required: isRegularStaff,
        },

        stateId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "StateMaster",
            required: isRegularStaff,
        },

        cityId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "CityMaster",
            required: isRegularStaff,
        },

        postalCode: {
            type: String,
            required: isRegularStaff,
            trim: true,
            default: "",
        },

        currentAddress: {
            type: String,
            required: isRegularStaff,
            trim: true,
            default: "",
        },


        // =========================
        // DOCUMENT INFORMATION
        // =========================

        aadhaarNumber: {
            type: String,
            required: isRegularStaff,
            trim: true,
            default: "",
        },

        panNumber: {
            type: String,
            required: isRegularStaff,
            trim: true,
            uppercase: true,
            default: "",
        },

        passportNumber: {
            type: String,
            trim: true,
            default: "",
        },

        drivingLicenseNumber: {
            type: String,
            trim: true,
            default: "",
        },


        // =========================
        // PAYROLL INFORMATION
        // =========================

        bankName: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "BankMaster",
            default: null,
        },

        accountNumber: {
            type: String,
            trim: true,
            default: "",
        },

        ifscCode: {
            type: String,
            trim: true,
            uppercase: true,
            default: "",
        },

        uanNumber: {
            type: String,
            trim: true,
            default: "",
        },

        pfNumber: {
            type: String,
            trim: true,
            default: "",
        },

        esiNumber: {
            type: String,
            trim: true,
            default: "",
        },

        salaryStructure: {
            type: String,
            default: null,
        },

        ctc: {
            type: Number,
            default: 0,
        },

        basicSalary: {
            type: Number,
            default: 0,
        },

        // Uploaded Documents
        resume: {
            type: String,
            default: "",
        },

        offerLetter: {
            type: String,
            default: "",
        },

        appointmentLetter: {
            type: String,
            default: "",
        },

        otherDocuments: {
            type: String,
            default: "",
        },


        // =========================
        // ACCESS INFORMATION
        // =========================

        username: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            lowercase: true,
        },

        password: {
            type: String,
            required: true,
        },

        // Role code from the Role master (e.g. SUPER_ADMIN, ADMIN, HR, MANAGER, EMPLOYEE).
        primaryRole: {
            type: String,
            required: true,
            trim: true,
            uppercase: true,
        },

        userGroup: {
            type: String,
            default: null,
        },

        isActive: {
            type: Boolean,
            default: true,
        },

        candidateId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Candidate",
            default: null,
        },

        permissions: {
            financialView: {
                type: Boolean,
                default: false,
            },

            leaveApproval: {
                type: Boolean,
                default: false,
            },

            orgChartAdmin: {
                type: Boolean,
                default: false,
            },

            directoryAccess: {
                type: Boolean,
                default: false,
            },
        },
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model(
    "EmployeeMaster",
    employeeMasterSchema
);