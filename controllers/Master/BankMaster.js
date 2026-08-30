const BankMaster = require("../../modals/Master/BankMasterModel");


// GET ALL BANK
module.exports.getBank = async (req, res) => {
    try {
        const banks = await BankMaster.find({})
            .sort({ bankName: 1 });

        res.status(200).json({
            success: true,
            data: banks
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};


// GET BANK BY ID
module.exports.getBankById = async (req, res) => {
    try {
        const { _id } = req.body;

        const bank = await BankMaster.findById(_id);

        if (!bank) {
            return res.status(404).json({
                success: false,
                message: "Bank not found"
            });
        }

        res.status(200).json({
            success: true,
            data: bank
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};


// ADD / EDIT BANK
module.exports.addEditBank = async (req, res) => {
    try {
        const { _id, ...bankData } = req.body;

        let bank;

        // EDIT BANK
        if (_id) {
            bank = await BankMaster.findByIdAndUpdate(
                _id,
                bankData,
                {
                    new: true,
                    runValidators: true
                }
            );

            if (!bank) {
                return res.status(404).json({
                    success: false,
                    message: "Bank not found"
                });
            }

            return res.status(200).json({
                success: true,
                message: "Bank updated successfully",
                data: bank
            });
        }

        // ADD BANK
        bank = await BankMaster.create(bankData);

        res.status(201).json({
            success: true,
            message: "Bank added successfully",
            data: bank
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};


// DELETE BANK
module.exports.deleteBankById = async (req, res) => {
    try {
        const { _id } = req.body;

        const bank = await BankMaster.findByIdAndDelete(_id);

        if (!bank) {
            return res.status(404).json({
                success: false,
                message: "Bank not found"
            });
        }

        res.status(200).json({
            success: true,
            message: "Bank deleted successfully"
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};


// GET BANK HELP / DROPDOWN
module.exports.getBankHelp = async (req, res) => {
    try {
        const banks = await BankMaster.find(
            {
                isActive: true
            },
            {
                _id: 1,
                bankName: 1,
                shortName: 1
            }
        ).sort({
            bankName: 1
        });

        res.status(200).json({
            success: true,
            data: banks
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};