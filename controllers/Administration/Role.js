const mongoose = require("mongoose");
const Role = require("../../modals/Administration/RoleModel");
const EmployeeMaster = require("../../modals/Employee/EmployeeMasterModel");
const { toPlainPermissions, SUPER_ADMIN_ROLE } = require("../../utils/accessControl");

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

        // Only valid actions are stored.
        if (roleData.permissions !== undefined) {
            roleData.permissions = toPlainPermissions(roleData.permissions);
        }

        if (_id) {
            const existing = await Role.findById(_id).lean();
            if (!existing) {
                return res.status(404).json({ success: false, message: "Role not found" });
            }
            // Employees reference roles by code; system role codes are fixed.
            if (
                existing.isSystemDefault &&
                roleData.roleCode &&
                String(roleData.roleCode).toUpperCase() !== existing.roleCode
            ) {
                return res.status(400).json({ success: false, message: "The code of a system role can't be changed" });
            }
            delete roleData.isSystemDefault;

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

        delete roleData.isSystemDefault;
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
        const target = await Role.findById(_id).lean();
        if (!target) {
            return res.status(404).json({ success: false, message: "Role not found" });
        }
        if (target.isSystemDefault) {
            return res.status(400).json({ success: false, message: "System built-in roles cannot be deleted." });
        }
        const assigned = await EmployeeMaster.countDocuments({ primaryRole: target.roleCode });
        if (assigned > 0) {
            return res.status(409).json({
                success: false,
                message: `${assigned} employee${assigned > 1 ? "s are" : " is"} assigned this role. Change their role first.`,
            });
        }
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

// Permission matrix save: replaces one role's permissions.
module.exports.updateRolePermissions = async (req, res) => {
    try {
        const { _id, permissions } = req.body;
        if (!mongoose.Types.ObjectId.isValid(_id)) {
            return res.status(400).json({ success: false, message: "A valid Role ID is required" });
        }
        const role = await Role.findById(_id);
        if (!role) {
            return res.status(404).json({ success: false, message: "Role not found" });
        }
        if (role.roleCode === SUPER_ADMIN_ROLE) {
            return res.status(400).json({ success: false, message: "Super Admin always has every permission" });
        }
        role.permissions = toPlainPermissions(permissions);
        await role.save();
        res.status(200).json({ success: true, message: "Permissions updated successfully", data: role });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
