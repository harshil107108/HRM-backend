const mongoose = require("mongoose");

const payrollSettingSchema = new mongoose.Schema(
    {
        settingCode: {
            type: String,
            default: "DEFAULT_SALARY_RULES",
            unique: true,
        },
        basicSalaryPercentage: {
            type: Number,
            default: 50, // 50% of monthly CTC
        },
        hraPercentage: {
            type: Number,
            default: 40, // 40% of Basic
        },
        daPercentage: {
            type: Number,
            default: 10, // 10% of Basic (DRA / DA)
        },
        conveyanceAmount: {
            type: Number,
            default: 2000, // Monthly fixed Conveyance in ₹
        },
        specialAllowancePercentage: {
            type: Number,
            default: 15,
        },
        epfPercentage: {
            type: Number,
            default: 12, // 12% of Basic
        },
        professionalTax: {
            type: Number,
            default: 200, // Monthly fixed PT in ₹
        },
        tdsPercentage: {
            type: Number,
            default: 5, // 5% TDS
        },
        esiPercentage: {
            type: Number,
            default: 0,
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model("PayrollSetting", payrollSettingSchema);
