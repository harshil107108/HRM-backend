const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const app = express();
const mongoose = require('mongoose');
dotenv.config();
const port = process.env.PORT || 5000;


// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());


mongoose.connect('mongodb://127.0.0.1:27017/HRM').then(() => {
    console.log("DB Connected")
}).catch(() => {
    console.log("Errror in Connecting DB")
});

const CountryMasterRouter = require("./routes/Master/countryMaster");
const CityMasterRouter = require("./routes/Master/cityMaster");
const StateMasterRouter = require("./routes/Master/stateMaster");

app.use("/master/country", CountryMasterRouter);
app.use("/master/city", CityMasterRouter);
app.use("/master/state", StateMasterRouter);


// Server
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});