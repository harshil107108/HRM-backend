const Role = require("../../modals/Administration/RoleModel");

module.exports.getRoles = async (req, res) => {
    try {
        const roles = await Role.find({}).sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            data: roles,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

module.exports.getRoleById = async (req, res) => {
    try {
        const { _id } = req.body;
        const role = await Role.findById(_id);

        if (!role) {
            return res.status(404).json({
                success: false,
                message: "Role not found",
            });
        }

        res.status(200).json({
            success: true,
            data: role,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

module.exports.addEditRole = async (req, res) => {
    try {
        const { _id, ...roleData } = req.body;

        if (_id) {
            const role = await Role.findByIdAndUpdate(_id, roleData, {
                new: true,
                runValidators: true,
            });

            if (!role) {
                return res.status(404).json({
                    success: false,
                    message: "Role not found",
                });
            }

            return res.status(200).json({
                success: true,
                message: "Role updated successfully",
                data: role,
            });
        }

        const role = await Role.create(roleData);
        res.status(201).json({
            success: true,
            message: "Role created successfully",
            data: role,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

module.exports.deleteRoleById = async (req, res) => {
    try {
        const { _id } = req.body;
        const role = await Role.findByIdAndDelete(_id);

        if (!role) {
            return res.status(404).json({
                success: false,
                message: "Role not found",
            });
        }

        res.status(200).json({
            success: true,
            message: "Role deleted successfully",
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

module.exports.getRoleHelp = async (req, res) => {
    try {
        const roles = await Role.find({}, { _id: 1, roleName: 1, roleCode: 1 }).sort({ roleName: 1 });
        res.status(200).json({
            success: true,
            data: roles,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};
