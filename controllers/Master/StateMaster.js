const StateMaster = require("../../modals/Master/StateMasterModal");


// GET ALL STATE
module.exports.getState = async (req, res) => {
    try {
        const states = await StateMaster.find({})
            .populate("countryId", "countryName countryCode");

        res.status(200).json({
            success: true,
            data: states
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};


// GET STATE BY ID
module.exports.getStateById = async (req, res) => {
    try {
        const { _id } = req.body;

        const state = await StateMaster.findById(_id)
            .populate("countryId", "countryName countryCode");

        if (!state) {
            return res.status(404).json({
                success: false,
                message: "State not found"
            });
        }

        res.status(200).json({
            success: true,
            data: state
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};


// ADD / EDIT STATE
module.exports.addEditState = async (req, res) => {
    try {
        const { _id, ...stateData } = req.body;

        let state;

        // EDIT STATE
        if (_id) {
            state = await StateMaster.findByIdAndUpdate(
                _id,
                stateData,
                {
                    new: true,
                    runValidators: true
                }
            );

            if (!state) {
                return res.status(404).json({
                    success: false,
                    message: "State not found"
                });
            }

            return res.status(200).json({
                success: true,
                message: "State updated successfully",
                data: state
            });
        }

        // ADD STATE
        state = await StateMaster.create(stateData);

        res.status(201).json({
            success: true,
            message: "State added successfully",
            data: state
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};


// DELETE STATE
module.exports.deleteStateById = async (req, res) => {
    try {
        const { _id } = req.body;

        const state = await StateMaster.findByIdAndDelete(_id);

        if (!state) {
            return res.status(404).json({
                success: false,
                message: "State not found"
            });
        }

        res.status(200).json({
            success: true,
            message: "State deleted successfully"
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// GET STATE DROPDOWN
module.exports.getStateHelp = async (req, res) => {
    try {
        const { countryId } = req.body;

        const filter = {
            isActive: true
        };

        // If countryId is provided, get states of that country only
        if (countryId) {
            filter.countryId = countryId;
        }

        const states = await StateMaster.find(
            filter,
            {
                _id: 1,
                stateName: 1,
                stateCode: 1
            }
        ).sort({ stateName: 1 });

        res.status(200).json({
            success: true,
            data: states
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};