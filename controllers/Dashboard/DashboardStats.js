const EmployeeMaster = require("../../modals/Employee/EmployeeMasterModel");
const CompanyMaster = require("../../modals/Organization/CompanyMasterModel");
const BranchMaster = require("../../modals/Organization/BranchMasterModel");
const DepartmentMaster = require("../../modals/Organization/DepartmentMasterModel");
const DesignationMaster = require("../../modals/Organization/DesignationMaster");
const JobOpening = require("../../modals/Recruitment/jobOpeningModel");
const LeaveRequest = require("../../modals/Leave/LeaveRequestModel");
const AttendanceRequest = require("../../modals/Attendance/AttendanceRequestModel");

module.exports.getDashboardStats = async (req, res) => {
    try {
        const [
            employeeCount,
            companyCount,
            branchCount,
            departmentCount,
            designationCount,
            jobOpeningCount,
            pendingLeaves,
            pendingAttendance,
            recentEmployees,
        ] = await Promise.all([
            EmployeeMaster.countDocuments(),
            CompanyMaster.countDocuments(),
            BranchMaster.countDocuments(),
            DepartmentMaster.countDocuments(),
            DesignationMaster.countDocuments(),
            JobOpening.countDocuments(),
            LeaveRequest.countDocuments({ status: "Pending" }),
            AttendanceRequest.countDocuments({ status: "Pending" }),
            EmployeeMaster.find({})
                .select("employeeId firstName lastName profileImage departmentId designationId")
                .populate("departmentId", "departmentname")
                .populate("designationId", "designationname")
                .sort({ createdAt: -1 })
                .limit(5),
        ]);

        res.status(200).json({
            success: true,
            data: {
                employeeCount,
                companyCount,
                branchCount,
                departmentCount,
                designationCount,
                jobOpeningCount,
                pendingLeaves,
                pendingAttendance,
                recentEmployees,
            },
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};
