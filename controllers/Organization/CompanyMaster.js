const CompanyMaster = require("../../modals/Organization/CompanyMasterModel");

module.exports.getCompany = async (req, res) => {
    try {
        const companies = await CompanyMaster.find({})
            .populate("country", "countryName")
            .populate("state", "stateName")
            .populate("city", "cityName")
            .populate("industryname", "industryName")
            .sort({ companyName: 1 });

        res.status(200).json({
            success: true,
            data: companies
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

module.exports.getCompanyById = async (req, res) => {
    try {
        const { _id } = req.body;

        const company = await CompanyMaster.findById(_id)
            .populate("country", "countryName")
            .populate("state", "stateName")
            .populate("city", "cityName")
            .populate("industryname", "industryName");

        if (!company) {
            return res.status(404).json({
                success: false,
                message: "Company not found"
            });
        }

        res.status(200).json({
            success: true,
            data: company
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};


module.exports.addEditCompany = async (req, res) => {
    try {
        const {
            _id,
            ...companyData
        } = req.body;

        // Image upload
        if (req.file) {
            companyData.companyImage =
                `/uploads/company/${req.file.filename}`;
        }

        let company;

        if (_id) {
            company = await CompanyMaster.findByIdAndUpdate(
                _id,
                companyData,
                {
                    new: true,
                    runValidators: true
                }
            );

            if (!company) {
                return res.status(404).json({
                    success: false,
                    message: "Company not found"
                });
            }

            return res.status(200).json({
                success: true,
                message: "Company updated successfully",
                data: company
            });
        }

        company = await CompanyMaster.create(
            companyData
        );

        res.status(201).json({
            success: true,
            message: "Company added successfully",
            data: company
        });

    } catch (error) {

        if (error.code === 11000) {
            return res.status(409).json({
                success: false,
                message: "Company code already exists"
            });
        }

        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};


module.exports.deleteCompanyById = async (req, res) => {
    try {
        const { _id } = req.body;

        const company =
            await CompanyMaster.findByIdAndDelete(_id);

        if (!company) {
            return res.status(404).json({
                success: false,
                message: "Company not found"
            });
        }

        res.status(200).json({
            success: true,
            message: "Company deleted successfully"
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};


module.exports.getCompanyHelp = async (req, res) => {
    try {
        const companies = await CompanyMaster.find(
            {
                isActive: true
            },
            {
                _id: 1,
                companyName: 1,
                companyCode: 1
            }
        ).sort({
            companyName: 1
        });

        res.status(200).json({
            success: true,
            data: companies
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};