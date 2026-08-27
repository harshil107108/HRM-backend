const CountryMaster = require("../../modals/Master/CountryMasterModel");


// GET ALL COUNTRY
module.exports.getCountry = async (req, res) => {
    try {
        const countries = await CountryMaster.find({});

        res.status(200).json({
            success: true,
            data: countries
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};


// GET COUNTRY BY ID
module.exports.getCountryById = async (req, res) => {
    try {
        const { _id } = req.body;

        const country = await CountryMaster.findById(_id);

        if (!country) {
            return res.status(404).json({
                success: false,
                message: "Country not found"
            });
        }

        res.status(200).json({
            success: true,
            data: country
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};


// ADD / EDIT COUNTRY
module.exports.addEditCountry = async (req, res) => {
    try {
        const { _id, ...countryData } = req.body;

        let country;

        if (_id) {
            country = await CountryMaster.findByIdAndUpdate(
                _id,
                countryData,
                {
                    new: true,
                    runValidators: true
                }
            );

            if (!country) {
                return res.status(404).json({
                    success: false,
                    message: "Country not found"
                });
            }

            return res.status(200).json({
                success: true,
                message: "Country updated successfully",
                data: country
            });
        }

        country = await CountryMaster.create(countryData);

        res.status(201).json({
            success: true,
            message: "Country added successfully",
            data: country
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};


// DELETE COUNTRY
module.exports.deleteCountryById = async (req, res) => {
    try {
        const { _id } = req.body;

        const country = await CountryMaster.findByIdAndDelete(_id);

        if (!country) {
            return res.status(404).json({
                success: false,
                message: "Country not found"
            });
        }

        res.status(200).json({
            success: true,
            message: "Country deleted successfully"
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};