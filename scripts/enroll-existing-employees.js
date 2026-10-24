require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const mongoose = require("mongoose");
const EmployeeMaster = require("../modals/Employee/EmployeeMasterModel");
const EmployeeFace = require("../modals/Employee/EmployeeFaceModel");
const { enrollEmployeeFace } = require("../utils/faceService");

async function syncEmployeeFaces() {
    try {
        console.log("Connecting to MongoDB...");
        await mongoose.connect(process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/hrm");
        console.log("Connected successfully.\n");

        const employees = await EmployeeMaster.find({
            isActive: true,
            primaryRole: { $nin: ["SUPER_ADMIN", "ADMIN"] },
        }).select("_id employeeId firstName lastName profileImage primaryRole");

        console.log(`Found ${employees.length} eligible staff/manager/HR employees.`);

        for (const emp of employees) {
            const alreadyEnrolled = await EmployeeFace.findOne({ employeeId: emp._id });
            if (alreadyEnrolled) {
                console.log(`[✔] ${emp.employeeId} (${emp.firstName} ${emp.lastName}) - Already enrolled.`);
                continue;
            }

            if (emp.profileImage && emp.profileImage.startsWith("data:image")) {
                console.log(`Enrolling face for ${emp.employeeId} from profile image...`);
                try {
                    const res = await enrollEmployeeFace(emp._id, emp.profileImage);
                    if (res.success && res.embedding) {
                        await EmployeeFace.create({
                            employeeId: emp._id,
                            embedding: res.embedding,
                            algorithm: "OpenCV-YuNet-SFace",
                            isActive: true,
                            enrolledAt: new Date(),
                        });
                        console.log(`[+] Enrolled successfully: ${emp.firstName} ${emp.lastName}`);
                    }
                } catch (err) {
                    console.log(`[-] Could not enroll ${emp.employeeId}: ${err.message}`);
                }
            } else {
                console.log(`[ ] ${emp.employeeId} (${emp.firstName} ${emp.lastName}) - No profile picture available for auto-enrollment.`);
            }
        }

        console.log("\nFinished check. Disconnecting...");
        await mongoose.disconnect();
    } catch (err) {
        console.error("Error during sync:", err);
    }
}

syncEmployeeFaces();
