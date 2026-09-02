const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require('path')
const app = express();
const mongoose = require('mongoose');
dotenv.config();
const port = process.env.PORT || 5000;


// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({
    origin: [
        "http://localhost:5173",
        "https://orvexa-hrm.netlify.app"
    ],
    credentials: true
}));
app.use(
    "/uploads",
    express.static(path.join(__dirname, "uploads"))
);


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


app.use("/master/country", CountryMasterRouter);
app.use("/master/city", CityMasterRouter);
app.use("/master/state", StateMasterRouter);
app.use("/master/holiday", HolidayMasterRouter);
app.use("/employee", EmployeeMasterRouter);
app.use("/master/bank", BankMasterRouter);
app.use("/organization/company", CompanyMasterRouter);
app.use("/organization/branch", BranchMasterRouter);
app.use("/organization/department", DepartmentMasterRouter);
app.use("/organization/designation", DesignationMasterRouter);




// Server
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});