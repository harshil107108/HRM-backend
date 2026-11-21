const Plan = require("../../modals/Manager/PlanModel");
const LicenseKey = require("../../modals/Manager/LicenseKeyModel");

// Starter defaults for seeding
const DEFAULT_PLANS = [
    {
        name: "Basic Starter",
        code: "PLAN-BASIC-2026",
        tier: "Basic",
        description: "Essential HR toolkit for small teams and startups getting organized.",
        badgeColor: "emerald",
        pricing: {
            monthly: 49,
            annually: 490,
            currency: "USD",
            billingFrequencies: ["Monthly", "Annual"],
        },
        includedModules: ["DASHBOARD", "MASTER", "ORGANIZATION", "EMPLOYEES", "LEAVE"],
        quotas: {
            maxActiveUsers: 5,
            maxEmployeeRecords: 25,
            storageQuotaGB: 5,
            apiRateLimitPerMonth: 10000,
        },
        status: "Active",
        isPopular: false,
    },
    {
        name: "Standard Professional",
        code: "PLAN-STD-2026",
        tier: "Standard",
        description: "Complete attendance, leave, and payroll processing for growing organizations.",
        badgeColor: "indigo",
        pricing: {
            monthly: 149,
            annually: 1490,
            currency: "USD",
            billingFrequencies: ["Monthly", "Annual"],
        },
        includedModules: [
            "DASHBOARD",
            "MASTER",
            "ORGANIZATION",
            "EMPLOYEES",
            "ATTENDANCE",
            "LEAVE",
            "PAYROLL",
            "REPORTS",
            "SETTINGS",
        ],
        quotas: {
            maxActiveUsers: 25,
            maxEmployeeRecords: 150,
            storageQuotaGB: 25,
            apiRateLimitPerMonth: 50000,
        },
        status: "Active",
        isPopular: true,
    },
    {
        name: "Industry Enterprise",
        code: "PLAN-IND-2026",
        tier: "Industry",
        description: "Full-spectrum HRM suite with Recruitment/ATS, Performance appraisals, and unlimited scaling.",
        badgeColor: "purple",
        pricing: {
            monthly: 399,
            annually: 3990,
            currency: "USD",
            billingFrequencies: ["Monthly", "Annual", "Lifetime"],
        },
        includedModules: [
            "DASHBOARD",
            "MASTER",
            "ORGANIZATION",
            "EMPLOYEES",
            "ATTENDANCE",
            "LEAVE",
            "PAYROLL",
            "RECRUITMENT",
            "PERFORMANCE",
            "REPORTS",
            "ADMINISTRATION",
            "SETTINGS",
        ],
        quotas: {
            maxActiveUsers: 100,
            maxEmployeeRecords: 1000,
            storageQuotaGB: 100,
            apiRateLimitPerMonth: 200000,
        },
        status: "Active",
        isPopular: false,
    },
];

exports.getAllPlans = async (req, res) => {
    try {
        const { status, search } = req.query;
        const query = {};

        if (status && status !== "ALL") {
            query.status = status;
        }

        if (search) {
            query.$or = [
                { name: { $regex: search, $options: "i" } },
                { code: { $regex: search, $options: "i" } },
                { tier: { $regex: search, $options: "i" } },
            ];
        }

        const plans = await Plan.find(query).sort({ createdAt: -1 });
        return res.status(200).json({ success: true, count: plans.length, data: plans });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};

exports.getPlanById = async (req, res) => {
    try {
        const plan = await Plan.findById(req.params.id);
        if (!plan) {
            return res.status(404).json({ success: false, message: "Plan not found." });
        }
        return res.status(200).json({ success: true, data: plan });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};

exports.createPlan = async (req, res) => {
    try {
        const { name, code, tier, description, badgeColor, pricing, includedModules, featureFlags, quotas, status, isPopular } = req.body;

        const existing = await Plan.findOne({ code: code?.toUpperCase()?.trim() });
        if (existing) {
            return res.status(400).json({ success: false, message: `Plan code '${code}' is already in use.` });
        }

        const newPlan = new Plan({
            name,
            code,
            tier,
            description,
            badgeColor,
            pricing,
            includedModules,
            featureFlags,
            quotas,
            status,
            isPopular,
        });

        await newPlan.save();
        return res.status(201).json({ success: true, message: "Plan created successfully.", data: newPlan });
    } catch (err) {
        return res.status(400).json({ success: false, message: err.message });
    }
};

exports.updatePlan = async (req, res) => {
    try {
        const plan = await Plan.findById(req.params.id);
        if (!plan) {
            return res.status(404).json({ success: false, message: "Plan not found." });
        }

        const { name, tier, description, badgeColor, pricing, includedModules, featureFlags, quotas, status, isPopular } = req.body;

        if (name) plan.name = name;
        if (tier) plan.tier = tier;
        if (description !== undefined) plan.description = description;
        if (badgeColor) plan.badgeColor = badgeColor;
        if (pricing) plan.pricing = { ...plan.pricing, ...pricing };
        if (includedModules) plan.includedModules = includedModules;
        if (featureFlags) plan.featureFlags = featureFlags;
        if (quotas) plan.quotas = { ...plan.quotas, ...quotas };
        if (status) plan.status = status;
        if (isPopular !== undefined) plan.isPopular = isPopular;

        await plan.save();
        return res.status(200).json({ success: true, message: "Plan updated successfully.", data: plan });
    } catch (err) {
        return res.status(400).json({ success: false, message: err.message });
    }
};

exports.deletePlan = async (req, res) => {
    try {
        const plan = await Plan.findById(req.params.id);
        if (!plan) {
            return res.status(404).json({ success: false, message: "Plan not found." });
        }

        await Plan.findByIdAndDelete(req.params.id);
        return res.status(200).json({ success: true, message: "Plan deleted successfully." });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};

exports.seedDefaultPlans = async (req, res) => {
    try {
        let created = 0;
        for (const item of DEFAULT_PLANS) {
            const exists = await Plan.findOne({ code: item.code });
            if (!exists) {
                await Plan.create(item);
                created++;
            }
        }
        const allPlans = await Plan.find().sort({ createdAt: -1 });
        return res.status(200).json({
            success: true,
            message: `Seeded ${created} default subscription plans. Total available: ${allPlans.length}.`,
            data: allPlans,
        });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};

