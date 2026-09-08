const AssetMaster = require("../../modals/Employee/AssetModel");

module.exports.getAsset = async (req, res) => {
    try {
        const { assetStatus } = req.body;

        const filter = {};

        if (assetStatus) {
            filter.assetStatus = assetStatus;
        }

        const assets = await AssetMaster.find(filter)
            .populate(
                "assetCategory",
                "categoryName categoryCode"
            )
            .populate(
                "company",
                "companyName companyCode"
            )
            .populate(
                "branch",
                "branchname branchcode"
            )
            .populate(
                "department",
                "departmentname departmentcode"
            )
            .populate(
                "assignedEmployee",
                "firstName lastName employeeCode"
            )
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            data: assets,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};
// =========================================================
// GET ASSET BY ID
// =========================================================

module.exports.getAssetById = async (req, res) => {
    try {
        const { _id } = req.body;

        if (!_id) {
            return res.status(400).json({
                success: false,
                message: "Asset ID is required",
            });
        }

        const asset = await AssetMaster.findById(_id)
            .populate(
                "assetCategory",
                "categoryName categoryCode"
            )
            .populate(
                "company",
                "companyName companyCode"
            )
            .populate(
                "branch",
                "branchname branchcode"
            )
            .populate(
                "department",
                "departmentname departmentcode"
            )
            .populate(
                "assignedEmployee",
                "firstName lastName employeeCode"
            );

        if (!asset) {
            return res.status(404).json({
                success: false,
                message: "Asset not found",
            });
        }

        res.status(200).json({
            success: true,
            data: asset,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

// =========================================================
// ADD / EDIT ASSET
// =========================================================

module.exports.addEditAsset = async (req, res) => {
    try {
        const {
            _id,

            // Basic
            assetName,
            assetCode,
            assetCategory,
            assetTag,

            // Details
            brand,
            model,
            serialNumber,
            condition,

            // Purchase
            purchaseDate,
            purchaseCost,
            vendor,
            invoiceNumber,
            warrantyStartDate,
            warrantyEndDate,

            // Organization
            company,
            branch,
            department,

            // Assignment
            assignedEmployee,
            assignedDate,
            expectedReturnDate,

            // Status
            assetStatus,

            // Additional
            description,
        } = req.body;

        // =========================================================
        // REQUIRED VALIDATION
        // =========================================================

        if (!assetName) {
            return res.status(400).json({
                success: false,
                message: "Asset Name is required",
            });
        }

        if (!assetCode) {
            return res.status(400).json({
                success: false,
                message: "Asset Code is required",
            });
        }

        if (!assetCategory) {
            return res.status(400).json({
                success: false,
                message: "Asset Category is required",
            });
        }

        if (!assetTag) {
            return res.status(400).json({
                success: false,
                message: "Asset Tag is required",
            });
        }

        if (!condition) {
            return res.status(400).json({
                success: false,
                message: "Condition is required",
            });
        }

        if (!company) {
            return res.status(400).json({
                success: false,
                message: "Company is required",
            });
        }

        // =========================================================
        // ASSET DATA
        // =========================================================

        const assetData = {
            assetName: assetName.trim(),

            assetCode: assetCode
                .trim()
                .toUpperCase(),

            assetCategory,
            assetTag: assetTag.trim(),

            brand: brand || "",
            model: model || "",
            serialNumber: serialNumber || "",

            condition,

            purchaseDate:
                purchaseDate || null,

            purchaseCost:
                purchaseCost !== undefined &&
                purchaseCost !== ""
                    ? Number(purchaseCost)
                    : 0,

            vendor: vendor || "",
            invoiceNumber: invoiceNumber || "",

            warrantyStartDate:
                warrantyStartDate || null,

            warrantyEndDate:
                warrantyEndDate || null,

            company,

            branch: branch || null,

            department:
                department || null,

            assignedEmployee:
                assignedEmployee || null,

            assignedDate:
                assignedDate || null,

            expectedReturnDate:
                expectedReturnDate || null,

            assetStatus:
                assetStatus || "AVAILABLE",

            description: description || "",
        };

        // =========================================================
        // FILE UPLOADS
        // =========================================================

        if (req.files) {
            if (req.files.assetImage?.[0]) {
                assetData.assetImage =
                    `/uploads/assets/${req.files.assetImage[0].filename}`;
            }

            if (req.files.purchaseInvoice?.[0]) {
                assetData.purchaseInvoice =
                    `/uploads/assets/${req.files.purchaseInvoice[0].filename}`;
            }

            if (req.files.warrantyDocument?.[0]) {
                assetData.warrantyDocument =
                    `/uploads/assets/${req.files.warrantyDocument[0].filename}`;
            }

            if (req.files.otherDocument?.[0]) {
                assetData.otherDocument =
                    `/uploads/assets/${req.files.otherDocument[0].filename}`;
            }
        }

        // =========================================================
        // EDIT
        // =========================================================

        if (_id) {
            const existingAsset =
                await AssetMaster.findById(_id);

            if (!existingAsset) {
                return res.status(404).json({
                    success: false,
                    message: "Asset not found",
                });
            }

            const updatedAsset =
                await AssetMaster.findByIdAndUpdate(
                    _id,
                    assetData,
                    {
                        new: true,
                        runValidators: true,
                    }
                );

            return res.status(200).json({
                success: true,
                message: "Asset updated successfully",
                data: updatedAsset,
            });
        }

        // =========================================================
        // ADD
        // =========================================================

        const newAsset =
            await AssetMaster.create(assetData);

        res.status(201).json({
            success: true,
            message: "Asset added successfully",
            data: newAsset,
        });
    } catch (error) {
        // Duplicate assetCode / assetTag
        if (error.code === 11000) {
            const duplicateField =
                Object.keys(error.keyPattern || {})[0];

            return res.status(409).json({
                success: false,
                message: `${duplicateField} already exists`,
            });
        }

        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

// =========================================================
// DELETE ASSET
// =========================================================

module.exports.deleteAssetById = async (req, res) => {
    try {
        const { _id } = req.body;

        if (!_id) {
            return res.status(400).json({
                success: false,
                message: "Asset ID is required",
            });
        }

        const deletedAsset =
            await AssetMaster.findByIdAndDelete(_id);

        if (!deletedAsset) {
            return res.status(404).json({
                success: false,
                message: "Asset not found",
            });
        }

        res.status(200).json({
            success: true,
            message: "Asset deleted successfully",
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

// =========================================================
// ASSET HELP
// =========================================================

module.exports.getAssetHelp = async (req, res) => {
    try {
        const assets = await AssetMaster.find(
            { isActive: true },
            {
                _id: 1,
                assetName: 1,
                assetCode: 1,
                assetTag: 1,
            }
        ).sort({
            assetName: 1,
        });

        res.status(200).json({
            success: true,
            data: assets,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};