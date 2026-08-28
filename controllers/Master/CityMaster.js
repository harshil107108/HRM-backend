const CityMaster = require("../../modals/Master/CityMasterModal");


// GET ALL CITY
// GET ALL CITY
module.exports.getCity = async (req, res) => {
    try {
        const cities = await CityMaster.find({})
            .populate("countryId")
            .populate("stateId");

        res.status(200).json({
            success: true,
            data: cities
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};


// GET CITY BY ID
module.exports.getCityById = async (req, res) => {
    try {
        const { _id } = req.body;

        const city = await CityMaster.findById(_id)
            .populate("countryId");

        if (!city) {
            return res.status(404).json({
                success: false,
                message: "City not found"
            });
        }

        res.status(200).json({
            success: true,
            data: city
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};


// ADD / EDIT CITY
module.exports.addEditCity = async (req, res) => {
    try {
        const { _id, ...cityData } = req.body;

        let city;

        // EDIT
        if (_id) {
            city = await CityMaster.findByIdAndUpdate(
                _id,
                cityData,
                {
                    new: true,
                    runValidators: true
                }
            );

            if (!city) {
                return res.status(404).json({
                    success: false,
                    message: "City not found"
                });
            }

            return res.status(200).json({
                success: true,
                message: "City updated successfully",
                data: city
            });
        }

        // ADD
        city = await CityMaster.create(cityData);

        res.status(201).json({
            success: true,
            message: "City added successfully",
            data: city
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};


// DELETE CITY
module.exports.deleteCityById = async (req, res) => {
    try {
        const { _id } = req.body;

        const city = await CityMaster.findByIdAndDelete(_id);

        if (!city) {
            return res.status(404).json({
                success: false,
                message: "City not found"
            });
        }

        res.status(200).json({
            success: true,
            message: "City deleted successfully"
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// GET CITY DROPDOWN
module.exports.getCityHelp = async (req, res) => {
    try {
        const { countryId, stateId } = req.body;

        const filter = {
            isActive: true
        };

        // Filter by country
        if (countryId) {
            filter.countryId = countryId;
        }

        // Filter by state
        if (stateId) {
            filter.stateId = stateId;
        }

        const cities = await CityMaster.find(
            filter,
            {
                _id: 1,
                cityName: 1,
                cityCode: 1
            }
        ).sort({ cityName: 1 });

        res.status(200).json({
            success: true,
            data: cities
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};