const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require('path')
const app = express();
const mongoose = require('mongoose');
dotenv.config();
const port = process.env.PORT || 5000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({
    origin: [
        "http://localhost:5173",
        "http://localhost:5174",
        "https://orvexa-hrm.netlify.app"
    ],
    credentials: true
}));
app.use("/uploads",express.static(path.join(__dirname, "uploads")));

mongoose.connect('mongodb://127.0.0.1:27017/HRM').then(() => {
    console.log("DB Connected")
}).catch(() => {
    console.log("Errror in Connecting DB")
});

const CountryMasterRouter = require("./routes/Master/countryMaster");
const CityMasterRouter = require("./routes/Master/cityMaster");
const StateMasterRouter = require("./routes/Master/stateMaster");
const HolidayMasterRouter = require("./routes/Master/holidayMaster");
const BankMasterRouter = require("./routes/Master/bankMaster");
const EmployeeMasterRouter = require("./routes/Employee/employeeMaster");
const CompanyMasterRouter = require("./routes/Organization/companyMaster");
const BranchMasterRouter = require("./routes/Organization/branchMaster");
const DepartmentMasterRouter = require("./routes/Organization/departmentMaster");
const DesignationMasterRouter = require("./routes/Organization/designation");
const JobOpeningRouter = require("./routes/Recruitment/jobOpening");
const AssetMasterRouter = require("./routes/Employee/asset");
const ExitRouter = require("./routes/Employee/exit");
const TaskRouter = require("./routes/Employee/task");
const DayReportRouter = require("./routes/Employee/dayReport");

// Recruitment
const CandidateRouter = require("./routes/Recruitment/candidate");
const InterviewRouter = require("./routes/Recruitment/interview");
const OfferLetterRouter = require("./routes/Recruitment/offerLetter");
const OnboardingRouter = require("./routes/Recruitment/onboarding");

// Attendance
const AttendanceLogRouter = require("./routes/Attendance/attendanceLog");
const ShiftRouter = require("./routes/Attendance/shift");
const AttendanceRequestRouter = require("./routes/Attendance/attendanceRequest");

// Leave
const LeaveTypeRouter = require("./routes/Leave/leaveType");
const LeavePolicyRouter = require("./routes/Leave/leavePolicy");
const LeaveRequestRouter = require("./routes/Leave/leaveRequest");
const LeaveApprovalRouter = require("./routes/Leave/leaveApproval");
const LeaveBalanceRouter = require("./routes/Leave/leaveBalance");

// Payroll
const SalaryStructureRouter = require("./routes/Payroll/salaryStructure");
const PayrollProcessRouter = require("./routes/Payroll/payrollProcess");
const PayslipRouter = require("./routes/Payroll/payslip");
const LoanRouter = require("./routes/Payroll/loan");
const ReimbursementRouter = require("./routes/Payroll/reimbursement");
const TaxManagementRouter = require("./routes/Payroll/taxManagement");

// Performance
const GoalRouter = require("./routes/Performance/goal");
const ReviewRouter = require("./routes/Performance/review");
const AppraisalRouter = require("./routes/Performance/appraisal");
const FeedbackRouter = require("./routes/Performance/feedback");

// Administration
const UserRouter = require("./routes/Administration/user");
const RoleRouter = require("./routes/Administration/role");
const AuditLogRouter = require("./routes/Administration/auditLog");
const MenuRouter = require("./routes/Administration/menu");

// Auth
const AuthRouter = require("./routes/auth");

// Settings
const SystemSettingRouter = require("./routes/Settings/systemSetting");

// Dashboard
const DashboardRouter = require("./routes/Dashboard/dashboard");

// Auth Endpoints
app.use("/auth", AuthRouter);

//Master
app.use("/master/country", CountryMasterRouter);
app.use("/master/city", CityMasterRouter);
app.use("/master/state", StateMasterRouter);
app.use("/master/holiday", HolidayMasterRouter);
app.use("/master/bank", BankMasterRouter);
app.use("/master/menu", MenuRouter);
app.use("/master/route", MenuRouter);

//Employee
app.use("/employee", EmployeeMasterRouter);
app.use("/employee/asset", AssetMasterRouter);
app.use("/employee/exit", ExitRouter);
app.use("/employee/day-report", DayReportRouter);
app.use("/tasks", TaskRouter);

//Organization
app.use("/organization/company", CompanyMasterRouter);
app.use("/organization/branch", BranchMasterRouter);
app.use("/organization/department", DepartmentMasterRouter);
app.use("/organization/designation", DesignationMasterRouter);

//Recruitment
app.use("/recruitment/jobopening", JobOpeningRouter);
app.use("/recruitment/candidate", CandidateRouter);
app.use("/recruitment/interview", InterviewRouter);
app.use("/recruitment/offer", OfferLetterRouter);
app.use("/recruitment/onboarding", OnboardingRouter);

// Attendance
app.use("/attendance/log", AttendanceLogRouter);
app.use("/attendance/shift", ShiftRouter);
app.use("/attendance/request", AttendanceRequestRouter);

// Leave
app.use("/leave/type", LeaveTypeRouter);
app.use("/leave/policy", LeavePolicyRouter);
app.use("/leave/request", LeaveRequestRouter);
app.use("/leave/approval", LeaveApprovalRouter);
app.use("/leave/balance", LeaveBalanceRouter);

// Payroll
app.use("/payroll/salary-structure", SalaryStructureRouter);
app.use("/payroll/process", PayrollProcessRouter);
app.use("/payroll/payslip", PayslipRouter);
app.use("/payroll/loan", LoanRouter);
app.use("/payroll/reimbursement", ReimbursementRouter);
app.use("/payroll/tax", TaxManagementRouter);

// Performance
app.use("/performance/goal", GoalRouter);
app.use("/performance/review", ReviewRouter);
app.use("/performance/appraisal", AppraisalRouter);
app.use("/performance/feedback", FeedbackRouter);

// Administration
app.use("/administration/user", UserRouter);
app.use("/administration/role", RoleRouter);
app.use("/administration/audit", AuditLogRouter);
app.use("/administration/menu", MenuRouter);

// Settings
app.use("/settings/system", SystemSettingRouter);

// Dashboard
app.use("/dashboard", DashboardRouter);

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});