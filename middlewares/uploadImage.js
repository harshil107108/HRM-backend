const multer = require("multer");
const path = require("path");
const fs = require("fs");

const createFileUpload = (folderName, filePrefix) => {

    const uploadPath = path.join(
        __dirname,
        `../uploads/${folderName}`
    );

    if (!fs.existsSync(uploadPath)) {
        fs.mkdirSync(uploadPath, {
            recursive: true,
        });
    }

    const storage = multer.diskStorage({

        destination: (req, file, cb) => {
            cb(null, uploadPath);
        },

        filename: (req, file, cb) => {

            const extension =
                path.extname(file.originalname).toLowerCase();

            const fileName =
                `${filePrefix}-${file.fieldname}-${Date.now()}${extension}`;

            cb(null, fileName);
        },
    });

    const fileFilter = (req, file, cb) => {

        const imageTypes = [
            "image/jpeg",
            "image/jpg",
            "image/png",
            "image/webp",
        ];

        const documentTypes = [
            "application/pdf",

            "application/msword",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",

            "application/vnd.ms-excel",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",

            "application/vnd.ms-powerpoint",
            "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        ];

        if (
            file.fieldname === "profileImage" ||
            file.fieldname === "companyImage" ||
            file.fieldname === "branchImage"
        ) {
            if (imageTypes.includes(file.mimetype)) {
                return cb(null, true);
            }

            return cb(
                new Error("Image must be JPG, JPEG, PNG or WEBP"),
                false
            );
        }

        if (
            file.fieldname === "resume" ||
            file.fieldname === "offerLetter" ||
            file.fieldname === "appointmentLetter" ||
            file.fieldname === "otherDocuments"
        ) {

            if (
                imageTypes.includes(file.mimetype) ||
                documentTypes.includes(file.mimetype)
            ) {
                return cb(null, true);
            }

            return cb(
                new Error(
                    "Document must be PDF, DOC, DOCX, JPG, JPEG, PNG or WEBP"
                ),
                false
            );
        }

        return cb(
            new Error(
                `Unsupported file field: ${file.fieldname}`
            ),
            false
        );
    };


    return multer({
        storage,
        fileFilter,

        limits: {
            fileSize: 10 * 1024 * 1024,
            files: 5,
        },
    });
};


module.exports = createFileUpload;