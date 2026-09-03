const mongoose = require("mongoose");

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
        },

        dateOfBirth: {
            type: Date,
            required: true,
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
            required: true,
        },

        branchId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "BranchMaster",
            required: true,
        },

        departmentId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "DepartmentMaster",
            required: true,
        },

        designationId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "DesignationMaster",
            required: true,
        },

        reportingManager: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "EmployeeMaster",
            default: null,
        },

        employmentType: {
            type: String,
            required: true,
            enum: [
                "FULL_TIME",
                "PART_TIME",
                "CONTRACT",
                "INTERN",
            ],
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

        joiningDate: {
            type: Date,
            required: true,
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
            required: true,
            trim: true,
            lowercase: true,
        },

        mobileNumber: {
            type: String,
            required: true,
            trim: true,
        },

        alternateMobile: {
            type: String,
            trim: true,
            default: "",
        },

        emergencyContactName: {
            type: String,
            required: true,
            trim: true,
        },

        emergencyContactNumber: {
            type: String,
            required: true,
            trim: true,
        },

        countryId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "CountryMaster",
            required: true,
        },

        stateId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "StateMaster",
            required: true,
        },

        cityId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "CityMaster",
            required: true,
        },

        postalCode: {
            type: String,
            required: true,
            trim: true,
        },

        currentAddress: {
            type: String,
            required: true,
            trim: true,
        },


        // =========================
        // DOCUMENT INFORMATION
        // =========================

        aadhaarNumber: {
            type: String,
            required: true,
            trim: true,
        },

        panNumber: {
            type: String,
            required: true,
            trim: true,
            uppercase: true,
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

        primaryRole: {
            type: String,
            required: true,
            enum: [
                "EMPLOYEE",
                "MANAGER",
                "HR",
                "ADMIN",
            ],
        },

        userGroup: {
            type: String,
            default: null,
        },

        isActive: {
            type: Boolean,
            default: true,
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