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
        let companies = await CompanyMaster.find(
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

        // If no company exists yet for this tenant, auto-seed the primary company from the active license clientInfo
        if (companies.length === 0 && req.license?.clientInfo?.companyName) {
            const compName = req.license.clientInfo.companyName;
            const compCode = compName.replace(/[^a-zA-Z0-9]/g, "").slice(0, 6).toUpperCase() || "CORP";

            const CountryMaster = require("../../modals/Master/CountryMasterModel");
            const StateMaster = require("../../modals/Master/StateMasterModel");
            const CityMaster = require("../../modals/Master/CityMasterModel");

            let country = await CountryMaster.findOne({ isActive: true });
            if (!country) {
                country = await CountryMaster.create({
                    countryName: "India",
                    countryCode: "IN",
                    isoCode: "IND",
                    phoneCode: "91",
                    nationality: "Indian",
                    isActive: true,
                });
            }

            let state = await StateMaster.findOne({ country: country._id });
            if (!state) {
                state = await StateMaster.create({
                    stateName: "Default State",
                    stateCode: "DS",
                    country: country._id,
                    isActive: true,
                });
            }

            let city = await CityMaster.findOne({ state: state._id });
            if (!city) {
                city = await CityMaster.create({
                    cityName: "Default City",
                    state: state._id,
                    country: country._id,
                    isActive: true,
                });
            }

            const primaryCompany = await CompanyMaster.create({
                companyName: compName,
                legalName: compName,
                companyCode: compCode,
                businessEmail: req.license.clientInfo.email || "admin@organization.local",
                phone: "9999999999",
                website: "https://example.com",
                gstNumber: "22AAAAA0000A1Z5",
                panNumber: "AAAAA0000A",
                registrationNumber: "REG0001",
                establishDate: new Date("2020-01-01"),
                addressLine1: "Headquarters",
                country: country._id,
                state: state._id,
                city: city._id,
                postalCode: "380001",
                isActive: true,
            });

            const BranchMaster = require("../../modals/Organization/BranchMasterModel");
            const DepartmentMaster = require("../../modals/Organization/DepartmentMasterModel");
            const DesignationMaster = require("../../modals/Organization/DesignationMaster");

            let branch = await BranchMaster.findOne({ parentcompany: primaryCompany._id });
            if (!branch) {
                branch = await BranchMaster.create({
                    branchcode: `${compCode}-HQ`,
                    branchname: "Head Office",
                    parentcompany: primaryCompany._id,
                    branchtype: "Headquarters",
                    addressLine1: "Headquarters",
                    country: country._id,
                    state: state._id,
                    city: city._id,
                    postalCode: "380001",
                    isActive: true,
                });
            }

            let dept = await DepartmentMaster.findOne({ company: primaryCompany._id });
            if (!dept) {
                dept = await DepartmentMaster.create({
                    departmentname: "Administration",
                    departmentcode: "ADM",
                    company: primaryCompany._id,
                    branch: branch._id,
                    isActive: true,
                });
            }

            let desig = await DesignationMaster.findOne({ company: primaryCompany._id });
            if (!desig) {
                await DesignationMaster.create({
                    designationname: "Administrator",
                    designationcode: "ADM",
                    shortname: "Admin",
                    company: primaryCompany._id,
                    branch: branch._id,
                    department: dept._id,
                    isActive: true,
                });
            }

            companies = [
                {
                    _id: primaryCompany._id,
                    companyName: primaryCompany.companyName,
                    companyCode: primaryCompany.companyCode,
                },
            ];
        }

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