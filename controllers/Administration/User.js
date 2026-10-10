const User = require("../../modals/Administration/UserModel");

module.exports.getUsers = async (req, res) => {
    try {
        const users = await User.find({})
            .select("-password")
            .populate("employeeRef", "employeeId firstName middleName lastName officialEmail")
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            data: users,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

module.exports.getUserById = async (req, res) => {
    try {
        const { _id } = req.body;
        const user = await User.findById(_id).select("-password");

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }

        res.status(200).json({
            success: true,
            data: user,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

module.exports.addEditUser = async (req, res) => {
    try {
        const { _id, ...userData } = req.body;

        if (_id) {
            const user = await User.findByIdAndUpdate(_id, userData, {
                new: true,
                runValidators: true,
            }).select("-password");

            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: "User not found",
                });
            }

            return res.status(200).json({
                success: true,
                message: "User updated successfully",
                data: user,
            });
        }

        const user = await User.create(userData);
        res.status(201).json({
            success: true,
            message: "User created successfully",
            data: user,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

module.exports.deleteUserById = async (req, res) => {
    try {
        const { _id } = req.body;
        const user = await User.findByIdAndDelete(_id);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }

        res.status(200).json({
            success: true,
            message: "User deleted successfully",
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};
