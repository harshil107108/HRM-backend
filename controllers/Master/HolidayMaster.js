const HolidayMaster = require("../../modals/Master/HolidayMasterModel");

const normalizeHolidayDate = (value) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;

    return new Date(Date.UTC(
        date.getUTCFullYear(),
        date.getUTCMonth(),
        date.getUTCDate()
    ));
};

const findHolidayOnDate = (date, excludeId) => {
    const nextDate = new Date(date);
    nextDate.setUTCDate(nextDate.getUTCDate() + 1);

    return HolidayMaster.findOne({
        holidayDate: { $gte: date, $lt: nextDate },
        ...(excludeId ? { _id: { $ne: excludeId } } : {}),
    }).select("holidayName");
};

const isDuplicateKeyError = (error) => error?.code === 11000;

// GET ALL HOLIDAY
module.exports.getHoliday = async (req, res) => {
    try {
        const holidays = await HolidayMaster.find({})
            .sort({ holidayDate: 1 });

        res.status(200).json({
            success: true,
            data: holidays
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};


// GET HOLIDAY BY ID
module.exports.getHolidayById = async (req, res) => {
    try {
        const { _id } = req.body;

        const holiday = await HolidayMaster.findById(_id);

        if (!holiday) {
            return res.status(404).json({
                success: false,
                message: "Holiday not found"
            });
        }

        res.status(200).json({
            success: true,
            data: holiday
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};


// ADD / EDIT HOLIDAY
module.exports.addEditHoliday = async (req, res) => {
    try {
        const { _id, ...holidayData } = req.body;
        const normalizedDate = normalizeHolidayDate(holidayData.holidayDate);

        if (!normalizedDate) {
            return res.status(400).json({
                success: false,
                message: "Enter a valid holiday date.",
            });
        }

        holidayData.holidayDate = normalizedDate;

        const existingHoliday = await findHolidayOnDate(normalizedDate, _id);
        if (existingHoliday) {
            return res.status(409).json({
                success: false,
                message: `Cannot save this holiday because "${existingHoliday.holidayName}" already exists on this date.`,
            });
        }

        let holiday;

        // EDIT HOLIDAY
        if (_id) {
            holiday = await HolidayMaster.findByIdAndUpdate(
                _id,
                holidayData,
                {
                    new: true,
                    runValidators: true
                }
            );

            if (!holiday) {
                return res.status(404).json({
                    success: false,
                    message: "Holiday not found"
                });
            }

            return res.status(200).json({
                success: true,
                message: "Holiday updated successfully",
                data: holiday
            });
        }

        // ADD HOLIDAY
        holiday = await HolidayMaster.create(holidayData);

        res.status(201).json({
            success: true,
            message: "Holiday added successfully",
            data: holiday
        });

    } catch (error) {
        if (isDuplicateKeyError(error)) {
            return res.status(409).json({
                success: false,
                message: "A holiday already exists on this date. Choose another date.",
            });
        }

        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};


// DELETE HOLIDAY
module.exports.deleteHolidayById = async (req, res) => {
    try {
        const { _id } = req.body;

        const holiday = await HolidayMaster.findByIdAndDelete(_id);

        if (!holiday) {
            return res.status(404).json({
                success: false,
                message: "Holiday not found"
            });
        }

        res.status(200).json({
            success: true,
            message: "Holiday deleted successfully"
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};


// GET HOLIDAY DROPDOWN / HELP
module.exports.getHolidayHelp = async (req, res) => {
    try {
        const holidays = await HolidayMaster.find(
            { isActive: true },
            {
                _id: 1,
                holidayName: 1,
                holidayCode: 1
            }
        ).sort({ holidayName: 1 });

        res.status(200).json({
            success: true,
            data: holidays
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};