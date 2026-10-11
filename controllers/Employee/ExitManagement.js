const ExitManagement = require("../../modals/Employee/ExitManagementModel");
const AssetMaster = require("../../modals/Employee/AssetModel");
const EmployeeMaster = require("../../modals/Employee/EmployeeMasterModel");
const User = require("../../modals/Administration/UserModel");
const mongoose = require("mongoose");

module.exports.getExit = async (req, res) => {
    try {
        const exits = await ExitManagement.find({})
            .populate("employeeId", "employeeId firstName middleName lastName officialEmail")
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            data: exits,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

module.exports.getExitById = async (req, res) => {
    try {
        const { _id } = req.body;
        const exit = await ExitManagement.findById(_id)
            .populate("employeeId", "employeeId firstName middleName lastName");

        if (!exit) {
            return res.status(404).json({
                success: false,
                message: "Exit record not found",
            });
        }

        res.status(200).json({
            success: true,
            data: exit,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

// Assets currently assigned to `employeeId` among `assetIds`.
const findAssignedAssets = (assetIds, employeeId) =>
    AssetMaster.find(
        { _id: { $in: assetIds }, assignedEmployee: employeeId, assetStatus: "ASSIGNED" },
        { _id: 1, assetName: 1, assetCode: 1 }
    );

module.exports.addEditExit = async (req, res) => {
    try {
        // returnedAssets and the employee snapshot are server-managed; never
        // accept them from the client.
        const {
            _id,
            returnedAssetIds,
            returnedAssets: _history,
            employeeName: _name,
            employeeCode: _code,
            ...exitData
        } = req.body;

        // ---------------------------------------------------------
        // Validate the assets to return BEFORE saving anything, so a
        // bad request never leaves the exit saved but assets untouched.
        // ---------------------------------------------------------
        const assetIds = [...new Set((Array.isArray(returnedAssetIds) ? returnedAssetIds : []).map(String))];

        if (assetIds.some((id) => !mongoose.Types.ObjectId.isValid(id))) {
            return res.status(400).json({
                success: false,
                message: "One or more selected assets are invalid",
            });
        }

        let existingExit = null;
        if (_id) {
            existingExit = await ExitManagement.findById(_id);
            if (!existingExit) {
                return res.status(404).json({
                    success: false,
                    message: "Exit record not found",
                });
            }

            // Completing an exit deletes the employee, so it's final.
            if (existingExit.overallStatus === "Completed") {
                return res.status(409).json({
                    success: false,
                    message:
                        "This exit is completed and the employee has been removed, so it can no longer be changed.",
                });
            }
        }

        const employeeId = exitData.employeeId || existingExit?.employeeId;

        // One open exit per employee: completing one deletes the employee,
        // which would leave any other open exit for them pointing at nothing.
        if (employeeId && mongoose.Types.ObjectId.isValid(String(employeeId))) {
            const duplicate = await ExitManagement.findOne({
                employeeId,
                overallStatus: { $ne: "Rejected" },
                ...(existingExit ? { _id: { $ne: existingExit._id } } : {}),
            });
            if (duplicate) {
                return res.status(409).json({
                    success: false,
                    message:
                        "This employee already has an exit record. Update that record instead of creating another.",
                });
            }
        }

        let assetsToReturn = [];

        if (assetIds.length > 0) {
            if (!employeeId || !mongoose.Types.ObjectId.isValid(String(employeeId))) {
                return res.status(400).json({
                    success: false,
                    message: "Employee is required to return assets",
                });
            }

            assetsToReturn = await findAssignedAssets(assetIds, employeeId);

            if (assetsToReturn.length !== assetIds.length) {
                return res.status(409).json({
                    success: false,
                    message:
                        "Some selected assets are no longer assigned to this employee. Please reopen the exit record and try again.",
                });
            }
        }

        // ---------------------------------------------------------
        // Completing: every asset must be back, and we snapshot the
        // employee's name/code before the employee record is deleted.
        // ---------------------------------------------------------
        const isCompleting =
            (exitData.overallStatus ?? existingExit?.overallStatus) === "Completed";
        let employeeToRemove = null;

        if (isCompleting) {
            if (!employeeId || !mongoose.Types.ObjectId.isValid(String(employeeId))) {
                return res.status(400).json({
                    success: false,
                    message: "Employee is required to complete an exit",
                });
            }

            employeeToRemove = await EmployeeMaster.findById(employeeId, {
                employeeId: 1,
                firstName: 1,
                middleName: 1,
                lastName: 1,
            });
            if (!employeeToRemove) {
                return res.status(404).json({
                    success: false,
                    message:
                        "This exit's employee no longer exists in the Employee module (for example, another exit for them was already completed). Delete this exit record.",
                });
            }

            const stillAssigned = await AssetMaster.countDocuments({
                assignedEmployee: employeeId,
                assetStatus: "ASSIGNED",
                _id: { $nin: assetsToReturn.map((a) => a._id) },
            });
            if (stillAssigned > 0) {
                return res.status(409).json({
                    success: false,
                    message: `${stillAssigned} asset${stillAssigned > 1 ? "s are" : " is"} still assigned to this employee. Mark all assets as returned before completing the exit.`,
                });
            }

            exitData.employeeName = [
                employeeToRemove.firstName,
                employeeToRemove.middleName,
                employeeToRemove.lastName,
            ]
                .filter(Boolean)
                .join(" ");
            exitData.employeeCode = employeeToRemove.employeeId || "";
        }

        // ---------------------------------------------------------
        // Save the exit record
        // ---------------------------------------------------------
        let exit;
        if (existingExit) {
            exit = await ExitManagement.findByIdAndUpdate(_id, exitData, {
                new: true,
                runValidators: true,
            });
        } else {
            exit = await ExitManagement.create(exitData);
        }

        // ---------------------------------------------------------
        // Return the assets: mark AVAILABLE and clear the assignment.
        // The filter re-checks ownership/status so an asset changed in
        // the meantime is never touched.
        // ---------------------------------------------------------
        let returnedCount = 0;
        if (assetsToReturn.length > 0) {
            const returnFilter = {
                _id: { $in: assetsToReturn.map((a) => a._id) },
                assignedEmployee: employeeId,
                assetStatus: "ASSIGNED",
            };

            const result = await AssetMaster.updateMany(returnFilter, {
                $set: {
                    assetStatus: "AVAILABLE",
                    assignedEmployee: null,
                    assignedDate: null,
                    expectedReturnDate: null,
                },
            });
            returnedCount = result.modifiedCount || 0;

            const returnedDate = new Date();
            exit = await ExitManagement.findByIdAndUpdate(
                exit._id,
                {
                    $push: {
                        returnedAssets: {
                            $each: assetsToReturn.map((a) => ({
                                asset: a._id,
                                assetName: a.assetName || "",
                                assetCode: a.assetCode || "",
                                returnedDate,
                            })),
                        },
                    },
                },
                { new: true }
            );
        }

        // ---------------------------------------------------------
        // Completed: permanently remove the employee. Runs last, after
        // the exit (with its snapshot) and the asset returns are saved.
        // Leftover links on non-assigned assets are cleared too, so
        // nothing points at the deleted employee.
        // ---------------------------------------------------------
        let employeeRemoved = false;
        if (employeeToRemove) {
            await AssetMaster.updateMany(
                { assignedEmployee: employeeToRemove._id },
                { $set: { assignedEmployee: null } }
            );
            // A login linked to this employee must not stay usable.
            await User.updateMany(
                { employeeRef: employeeToRemove._id },
                { $set: { status: "Inactive", employeeRef: null } }
            );
            const deleted = await EmployeeMaster.findByIdAndDelete(employeeToRemove._id);
            employeeRemoved = Boolean(deleted);
        }

        const assetNote = returnedCount
            ? ` ${returnedCount} asset${returnedCount > 1 ? "s" : ""} marked as available.`
            : "";
        const employeeNote = employeeRemoved
            ? " Employee removed from the Employee module."
            : "";

        res.status(existingExit ? 200 : 201).json({
            success: true,
            message: existingExit
                ? `Exit record updated successfully.${assetNote}${employeeNote}`
                : `Exit request submitted successfully.${assetNote}${employeeNote}`,
            data: exit,
            returnedCount,
            employeeRemoved,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

module.exports.deleteExitById = async (req, res) => {
    try {
        const { _id } = req.body;
        const exit = await ExitManagement.findByIdAndDelete(_id);

        if (!exit) {
            return res.status(404).json({
                success: false,
                message: "Exit record not found",
            });
        }

        res.status(200).json({
            success: true,
            message: "Exit record deleted successfully",
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};
