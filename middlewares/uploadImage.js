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

        // ==========================================
        // IMAGE FIELDS
        // ==========================================

        const imageFields = [
            "profileImage",
            "companyImage",
            "branchImage",
            "assetImage",
        ];

        if (imageFields.includes(file.fieldname)) {

            if (imageTypes.includes(file.mimetype)) {
                return cb(null, true);
            }

            return cb(
                new Error(
                    "Image must be JPG, JPEG, PNG or WEBP"
                ),
                false
            );
        }

        // ==========================================
        // DOCUMENT FIELDS
        // ==========================================

        const documentFields = [
            // Employee
            "resume",
            "offerLetter",
            "appointmentLetter",
            "otherDocuments",

            // Asset
            "purchaseInvoice",
            "warrantyDocument",
            "otherDocument",
        ];

        if (documentFields.includes(file.fieldname)) {

            if (
                imageTypes.includes(file.mimetype) ||
                documentTypes.includes(file.mimetype)
            ) {
                return cb(null, true);
            }

            return cb(
                new Error(
                    "Document must be PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, JPG, JPEG, PNG or WEBP"
                ),
                false
            );
        }

        // ==========================================
        // UNSUPPORTED FIELD
        // ==========================================

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