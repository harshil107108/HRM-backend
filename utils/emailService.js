const nodemailer = require("nodemailer");
const SystemSetting = require("../modals/Settings/SystemSettingModel");
const OfferLetter = require("../modals/Recruitment/OfferLetterModel");

/**
 * Format date to readable string (e.g. 25 Oct 2026)
 */
const formatDate = (dateVal) => {
    if (!dateVal) return "N/A";
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return String(dateVal);
    return d.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    });
};

/**
 * Format currency in Indian standard (e.g. ₹ 12,00,000)
 */
const formatCurrency = (val) => {
    const num = Number(val) || 0;
    return "₹ " + num.toLocaleString("en-IN");
};

/**
 * Resolve SMTP transport configuration from Environment variables or SystemSetting
 */
const resolveSmtpConfig = async () => {
    // 1. Check environment variables
    const envHost = process.env.SMTP_HOST || process.env.EMAIL_HOST;
    const envPort = Number(process.env.SMTP_PORT || process.env.EMAIL_PORT) || 587;
    const envUser = process.env.SMTP_USER || process.env.EMAIL_USER;
    const envPass = process.env.SMTP_PASS || process.env.SMTP_PASSWORD || process.env.EMAIL_PASS || process.env.EMAIL_PASSWORD;
    const envSecure = process.env.SMTP_SECURE === "true" || envPort === 465;
    const envSenderEmail = process.env.SMTP_FROM || process.env.SMTP_SENDER_EMAIL || envUser;
    const envSenderName = process.env.SMTP_SENDER_NAME || "Orvexa HRM";

    if (envHost && envUser && envPass) {
        return {
            host: envHost,
            port: envPort,
            secure: envSecure,
            auth: { user: envUser, pass: envPass },
            senderEmail: envSenderEmail || envUser,
            senderName: envSenderName,
            isConfigured: true,
        };
    }

    // 2. Fallback to SystemSetting database configuration
    try {
        const emailSettingDoc = await SystemSetting.findOne({ category: "Email" }).lean();
        const settings = emailSettingDoc?.settings || {};

        if (settings.smtpHost && (settings.smtpUser || settings.senderEmail)) {
            const port = Number(settings.smtpPort) || 587;
            const user = settings.smtpUser || settings.senderEmail;
            const pass = settings.smtpPassword || settings.smtpPass || "";

            return {
                host: settings.smtpHost,
                port,
                secure: settings.enableSsl === true || port === 465,
                auth: user && pass ? { user, pass } : undefined,
                senderEmail: settings.senderEmail || user,
                senderName: settings.senderName || "Orvexa HRM System",
                isConfigured: Boolean(user && pass),
            };
        }
    } catch (err) {
        console.warn("[EmailService] Notice: Could not read Email settings from database:", err.message);
    }

    // 3. Fallback default configuration for development
    return {
        host: "smtp.gmail.com",
        port: 587,
        secure: false,
        senderEmail: "hrm@orvexa.io",
        senderName: "Orvexa HRM System",
        isConfigured: false,
    };
};

/**
 * Create a Nodemailer transporter instance
 */
const createTransporter = async (config) => {
    // If SMTP has live credentials, configure standard SMTP transporter
    if (config.isConfigured && config.auth?.user && config.auth?.pass) {
        const transportOpts = {
            host: config.host,
            port: config.port,
            secure: config.secure,
            auth: config.auth,
            connectionTimeout: 20000,
            greetingTimeout: 20000,
            tls: {
                rejectUnauthorized: false,
            },
        };

        if (
            config.host?.includes("gmail.com") ||
            config.service === "gmail" ||
            process.env.SMTP_SERVICE === "gmail"
        ) {
            transportOpts.service = "gmail";
        }

        return nodemailer.createTransport(transportOpts);
    }

    // Fallback: in development when no SMTP password is set in .env or settings,
    // generate an ephemeral Ethereal test account or stream transport
    try {
        const testAccount = await nodemailer.createTestAccount();
        console.log("[EmailService] Note: No SMTP password in .env or settings. Using temporary Ethereal test mailer for development:", testAccount.user);
        return nodemailer.createTransport({
            host: "smtp.ethereal.email",
            port: 587,
            secure: false,
            auth: {
                user: testAccount.user,
                pass: testAccount.pass,
            },
        });
    } catch (etherealErr) {
        // Safe fallback: stream transporter that logs without throwing
        console.warn("[EmailService] Creating JSON fallback transport:", etherealErr.message);
        return nodemailer.createTransport({
            jsonTransport: true,
        });
    }
};

/**
 * Generate a responsive, professional HTML email template for Offer Letter
 */
const generateOfferLetterHtml = ({
    candidateName,
    jobTitle,
    designationName,
    departmentName,
    companyName,
    companyEmail,
    companyPhone,
    companyWebsite,
    companyAddress,
    offeredCtc,
    joiningDate,
    validUntil,
    branchName,
    remarks,
}) => {
    const formattedCtc = formatCurrency(offeredCtc);
    const formattedJoining = formatDate(joiningDate);
    const formattedDeadline = formatDate(validUntil);

    return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Job Offer - ${designationName || jobTitle}</title>
</head>
<body style="margin: 0; padding: 20px; background-color: #f4f6f8; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #2d3748; line-height: 1.6;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; border: 1px solid #e2e8f0;">
    <!-- Header -->
    <tr>
      <td style="background-color: #1a365d; padding: 24px 30px; text-align: left;">
        <h1 style="margin: 0; color: #ffffff; font-size: 20px; font-weight: 700; letter-spacing: 0.5px;">${companyName}</h1>
        <p style="margin: 4px 0 0 0; color: #bee3f8; font-size: 13px;">Human Resources & Talent Acquisition</p>
      </td>
    </tr>

    <!-- Body -->
    <tr>
      <td style="padding: 30px;">
        <p style="margin: 0 0 16px 0; font-size: 16px; font-weight: 600; color: #1a202c;">Dear ${candidateName},</p>
        
        <p style="margin: 0 0 20px 0; font-size: 14px; color: #4a5568;">
          We are pleased to extend an offer for the position of <strong>${designationName || jobTitle}</strong> with <strong>${companyName}</strong>. 
          Below is a summary of the key terms for this role:
        </p>

        <!-- Terms Card -->
        <table width="100%" border="0" cellspacing="0" cellpadding="10" style="background-color: #f7fafc; border: 1px solid #edf2f7; border-radius: 6px; margin-bottom: 22px;">
          <tr>
            <td width="40%" style="font-size: 13px; color: #718096; border-bottom: 1px solid #edf2f7; font-weight: 600;">Position:</td>
            <td width="60%" style="font-size: 14px; color: #1a202c; border-bottom: 1px solid #edf2f7; font-weight: 600; text-align: right;">${designationName || jobTitle}</td>
          </tr>
          ${departmentName ? `
          <tr>
            <td style="font-size: 13px; color: #718096; border-bottom: 1px solid #edf2f7; font-weight: 600;">Department:</td>
            <td style="font-size: 14px; color: #1a202c; border-bottom: 1px solid #edf2f7; text-align: right;">${departmentName}</td>
          </tr>` : ""}
          <tr>
            <td style="font-size: 13px; color: #718096; border-bottom: 1px solid #edf2f7; font-weight: 600;">Annual CTC:</td>
            <td style="font-size: 15px; color: #2b6cb0; border-bottom: 1px solid #edf2f7; font-weight: 700; text-align: right;">${formattedCtc}</td>
          </tr>
          <tr>
            <td style="font-size: 13px; color: #718096; border-bottom: 1px solid #edf2f7; font-weight: 600;">Joining Date:</td>
            <td style="font-size: 14px; color: #1a202c; border-bottom: 1px solid #edf2f7; text-align: right;">${formattedJoining}</td>
          </tr>
          <tr>
            <td style="font-size: 13px; color: #718096; font-weight: 600;">Offer Valid Until:</td>
            <td style="font-size: 14px; color: #c53030; font-weight: 600; text-align: right;">${formattedDeadline}</td>
          </tr>
          ${branchName ? `
          <tr>
            <td style="font-size: 13px; color: #718096; border-top: 1px solid #edf2f7; font-weight: 600;">Location:</td>
            <td style="font-size: 14px; color: #1a202c; border-top: 1px solid #edf2f7; text-align: right;">${branchName}</td>
          </tr>` : ""}
        </table>

        ${remarks && remarks.trim() ? `
        <div style="background-color: #ebf8ff; border-left: 3px solid #3182ce; padding: 12px 16px; margin-bottom: 22px; border-radius: 4px;">
          <p style="margin: 0; font-size: 13px; color: #2b6cb0; font-weight: 600;">Notes & Remarks:</p>
          <p style="margin: 4px 0 0 0; font-size: 13px; color: #2d3748;">${remarks.trim()}</p>
        </div>` : ""}

        <p style="margin: 0 0 16px 0; font-size: 14px; color: #4a5568;">
          Please review the above terms. To accept, kindly reply to this email before <strong>${formattedDeadline}</strong>. 
          If you have any questions regarding the offer, please do not hesitate to contact us.
        </p>

        <p style="margin: 0 0 24px 0; font-size: 14px; color: #4a5568;">
          We look forward to welcoming you to the team.
        </p>

        <!-- Signoff -->
        <div style="border-top: 1px solid #edf2f7; padding-top: 16px;">
          <p style="margin: 0; font-size: 14px; color: #718096;">Best regards,</p>
          <p style="margin: 4px 0 0 0; font-size: 14px; font-weight: 700; color: #1a202c;">${companyName} Team</p>
          ${companyEmail ? `<p style="margin: 4px 0 0 0; font-size: 12px; color: #718096;">Email: <a href="mailto:${companyEmail}" style="color: #3182ce; text-decoration: none;">${companyEmail}</a></p>` : ""}
          ${companyPhone ? `<p style="margin: 2px 0 0 0; font-size: 12px; color: #718096;">Phone: ${companyPhone}</p>` : ""}
          ${companyWebsite ? `<p style="margin: 2px 0 0 0; font-size: 12px; color: #718096;">Website: ${companyWebsite}</p>` : ""}
        </div>
      </td>
    </tr>

    <!-- Footer -->
    <tr>
      <td style="background-color: #f7fafc; padding: 16px 30px; text-align: center; border-top: 1px solid #edf2f7;">
        <p style="margin: 0; font-size: 11px; color: #a0aec0;">
          Confidential: This message is intended solely for ${candidateName}.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`;
};

/**
 * Generate clean plain-text version of Offer Letter
 */
const generateOfferLetterPlainText = ({
    candidateName,
    jobTitle,
    designationName,
    departmentName,
    companyName,
    companyEmail,
    companyPhone,
    companyWebsite,
    offeredCtc,
    joiningDate,
    validUntil,
    branchName,
    remarks,
}) => {
    return `Dear ${candidateName},

We are pleased to extend a formal offer of employment for the position of ${designationName || jobTitle} in the ${departmentName || "Operations"} department at ${companyName}.

SUMMARY OF OFFER:
---------------------------------------------
Position: ${designationName || jobTitle}
Department: ${departmentName || "General"}
Annual CTC: ${formatCurrency(offeredCtc)}
Expected Joining Date: ${formatDate(joiningDate)}
Offer Valid Until: ${formatDate(validUntil)}
${branchName ? `Location: ${branchName}\n` : ""}
${remarks ? `Special Terms & Notes:\n${remarks}\n` : ""}
Please confirm your acceptance by replying to this email on or before ${formatDate(validUntil)}.

Sincerely,
Talent Acquisition Team
${companyName}
${companyEmail ? `Email: ${companyEmail}\n` : ""}${companyPhone ? `Phone: ${companyPhone}\n` : ""}${companyWebsite ? `Website: ${companyWebsite}\n` : ""}`;
};

/**
 * Dispatch Offer Letter Email to candidate using Nodemailer
 * @param {string|ObjectId} offerLetterId
 * @param {object} [options]
 * @param {boolean} [options.resend=false]
 */
const sendOfferLetterEmail = async (offerLetterId, options = {}) => {
    try {
        if (!offerLetterId) {
            throw new Error("Offer Letter ID is required for sending email");
        }

        // 1. Fetch populated Offer Letter document
        const offer = await OfferLetter.findById(offerLetterId)
            .populate("candidate")
            .populate({
                path: "jobOpening",
                populate: [
                    { path: "company", model: "CompanyMaster" },
                    { path: "branch", model: "BranchMaster" },
                ],
            })
            .populate("offeredDesignation")
            .populate("offeredDepartment");

        if (!offer) {
            throw new Error(`Offer letter with ID ${offerLetterId} not found`);
        }

        const candidate = offer.candidate;
        if (!candidate) {
            throw new Error("No candidate associated with this offer letter");
        }

        const recipientEmail = (candidate.email || "").trim();
        if (!recipientEmail) {
            const errStr = `Candidate "${candidate.candidateName || candidate.firstName || "Unknown"}" does not have an email address.`;
            await OfferLetter.findByIdAndUpdate(offer._id, {
                $set: {
                    emailError: errStr,
                    emailSent: false,
                },
            });
            return {
                success: false,
                error: errStr,
            };
        }

        // 2. Extract Company & Job details
        const job = offer.jobOpening || {};
        const company = job.company || {};
        const branch = job.branch || {};
        const designation = offer.offeredDesignation || {};
        const department = offer.offeredDepartment || {};

        const companyName = company.companyName || company.legalName || "Orvexa Enterprise";
        const companyEmail = company.businessEmail || "";
        const companyPhone = company.phone || "";
        const companyWebsite = company.website || "";
        const companyAddress = [company.addressLine1, company.city, company.state].filter(Boolean).join(", ");
        const companyLogo = company.companyImage || "";

        const candidateName =
            candidate.candidateName ||
            [candidate.firstName, candidate.middleName, candidate.lastName].filter(Boolean).join(" ") ||
            "Candidate";

        const designationName = designation.designationname || job.jobTitle || "Selected Role";
        const departmentName = department.departmentname || "";
        const branchName = branch.branchname || "";

        // 3. Resolve SMTP transporter
        const smtpConfig = await resolveSmtpConfig();
        const transporter = await createTransporter(smtpConfig);

        // 4. Construct email parameters
        // Sender format: "CompanyName" <senderEmail>
        const senderName = companyName || smtpConfig.senderName || "Orvexa HRM";
        const senderEmailAddress = smtpConfig.senderEmail || smtpConfig.auth?.user || companyEmail || "hrm@orvexa.io";
        const fromHeader = `"${senderName}" <${senderEmailAddress}>`;

        // If company has its own business email, route replies straight to company email
        const replyToHeader = companyEmail || senderEmailAddress;

        const subject = `Job Offer: ${designationName} - ${companyName}`;

        const html = generateOfferLetterHtml({
            candidateName,
            jobTitle: job.jobTitle || designationName,
            designationName,
            departmentName,
            companyName,
            companyEmail,
            companyPhone,
            companyWebsite,
            companyAddress,
            offeredCtc: offer.offeredCtc,
            joiningDate: offer.joiningDate,
            validUntil: offer.validUntil,
            branchName,
            remarks: offer.remarks,
        });

        const text = generateOfferLetterPlainText({
            candidateName,
            jobTitle: job.jobTitle || designationName,
            designationName,
            departmentName,
            companyName,
            companyEmail,
            companyPhone,
            companyWebsite,
            offeredCtc: offer.offeredCtc,
            joiningDate: offer.joiningDate,
            validUntil: offer.validUntil,
            branchName,
            remarks: offer.remarks,
        });

        // 5. Send Email via Nodemailer
        console.log(`[EmailService] Dispatching Offer Letter to: ${recipientEmail} from: ${fromHeader}`);
        const mailOptions = {
            from: fromHeader,
            to: recipientEmail,
            replyTo: replyToHeader,
            subject,
            text,
            html,
            headers: {
                "X-Priority": "1",
                "X-MSMail-Priority": "High",
                Importance: "High",
            },
        };

        const info = await transporter.sendMail(mailOptions);
        console.log(`[EmailService] Email sent successfully. MessageId: ${info.messageId || "generated"}`);

        // If Ethereal test account was used, log the preview URL for developer convenience
        if (nodemailer.getTestMessageUrl && info) {
            const previewUrl = nodemailer.getTestMessageUrl(info);
            if (previewUrl) {
                console.log(`[EmailService] Dev Preview URL: ${previewUrl}`);
            }
        }

        // 6. Update Offer Letter record with success metrics
        await OfferLetter.findByIdAndUpdate(offer._id, {
            $set: {
                emailSent: true,
                emailSentAt: new Date(),
                emailSentTo: recipientEmail,
                emailMessageId: info.messageId || String(Date.now()),
                emailError: "",
            },
        });

        return {
            success: true,
            isLive: Boolean(smtpConfig.isConfigured),
            messageId: info.messageId,
            recipient: recipientEmail,
            companyEmail: replyToHeader,
            previewUrl: nodemailer.getTestMessageUrl ? nodemailer.getTestMessageUrl(info) : null,
        };
    } catch (error) {
        console.error("[EmailService] Failed to send Offer Letter email:", error);

        // Update offer letter with error details so UI and database have clear audit trail
        try {
            await OfferLetter.findByIdAndUpdate(offerLetterId, {
                $set: {
                    emailError: error.message || "Failed to dispatch email",
                },
            });
        } catch (dbErr) {
            console.error("[EmailService] Failed to record error on offer document:", dbErr);
        }

        return {
            success: false,
            error: error.message || "Failed to dispatch email",
        };
    }
};

module.exports = {
    sendOfferLetterEmail,
    resolveSmtpConfig,
    generateOfferLetterHtml,
};
