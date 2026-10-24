const http = require("http");
const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");
const os = require("os");
const crypto = require("crypto");

const FACE_SERVICE_URL = process.env.FACE_SERVICE_URL || "http://127.0.0.1:5001";
const PYTHON_SCRIPT_PATH = path.join(__dirname, "..", "services", "face_service", "face_engine.py");

const USER_PYTHON = path.join(
    process.env.LOCALAPPDATA || "C:\\Users\\harsh\\AppData\\Local",
    "Programs",
    "Python",
    "Python311",
    "python.exe"
);
const PYTHON_CMD = fs.existsSync(USER_PYTHON) ? USER_PYTHON : "python";

/**
 * Sends an HTTP POST request to the Python microservice.
 */
async function postToFaceService(endpoint, bodyData) {
    let httpRes = null;
    try {
        if (typeof fetch === "function") {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000);

            const res = await fetch(`${FACE_SERVICE_URL}${endpoint}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(bodyData),
                signal: controller.signal,
            });
            clearTimeout(timeoutId);
            httpRes = res;

            const data = await res.json();
            if (!res.ok) {
                // The service answered with a status error (e.g. 400 Bad Request: "No face detected in the image")
                // Do NOT fall back to CLI — return the meaningful error message directly.
                return {
                    success: false,
                    error: data.detail || data.message || `Face service HTTP ${res.status}`,
                    message: data.detail || data.message || `Face service HTTP ${res.status}`,
                };
            }
            return data;
        }
    } catch (httpErr) {
        // If the server answered with an HTTP response, don't execute CLI fallback
        if (httpRes) {
            return {
                success: false,
                error: httpErr.message,
                message: httpErr.message,
            };
        }
        // Fall back to CLI execution ONLY if HTTP service is unreachable (connection refused, network error, timeout)
        console.warn(`[FaceClient] HTTP request to ${endpoint} failed (${httpErr.message}). Attempting CLI fallback...`);
        return executeFaceCli(endpoint, bodyData);
    }
}

/**
 * Fallback: executes the Python face_engine.py directly via child_process.
 * Writes large payloads (image base64, candidate arrays) to temporary files
 * to prevent Windows OS "spawn ENAMETOOLONG" command-line length limits.
 */
function executeFaceCli(endpoint, bodyData) {
    return new Promise((resolve, reject) => {
        let mode = endpoint === "/enroll" ? "enroll" : "recognize";
        const tempFiles = [];

        try {
            // Write image to a temp file to avoid command-line buffer overflow
            const randomSuffix = crypto.randomBytes(6).toString("hex");
            const tempImgPath = path.join(os.tmpdir(), `hrm_face_${Date.now()}_${randomSuffix}.jpg`);
            
            const rawBase64 = typeof bodyData.image === "string" && bodyData.image.includes(",")
                ? bodyData.image.split(",")[1]
                : bodyData.image || "";

            fs.writeFileSync(tempImgPath, Buffer.from(rawBase64, "base64"));
            tempFiles.push(tempImgPath);

            let args = [PYTHON_SCRIPT_PATH, "--mode", mode, "--image", tempImgPath];

            if (mode === "enroll") {
                args.push("--employee_id", String(bodyData.employeeId || ""));
            } else if (mode === "recognize") {
                const tempCandidatesPath = path.join(os.tmpdir(), `hrm_cand_${Date.now()}_${randomSuffix}.json`);
                fs.writeFileSync(tempCandidatesPath, JSON.stringify(bodyData.candidates || []));
                tempFiles.push(tempCandidatesPath);
                args.push("--candidates", tempCandidatesPath);
            }

            const pyProc = spawn(PYTHON_CMD, args, { windowsHide: true });
            let stdout = "";
            let stderr = "";

            const cleanupTempFiles = () => {
                for (const f of tempFiles) {
                    try {
                        if (fs.existsSync(f)) fs.unlinkSync(f);
                    } catch (_) {}
                }
            };

            pyProc.stdout.on("data", (data) => {
                stdout += data.toString();
            });

            pyProc.stderr.on("data", (data) => {
                stderr += data.toString();
            });

            pyProc.on("close", (code) => {
                cleanupTempFiles();
                if (code !== 0 && !stdout) {
                    return reject(
                        new Error(
                            `Face engine execution failed (code ${code}). Ensure Python face service is running on ${FACE_SERVICE_URL}. ${stderr}`
                        )
                    );
                }
                try {
                    const parsed = JSON.parse(stdout.trim());
                    resolve(parsed);
                } catch (err) {
                    reject(
                        new Error(
                            `Failed to parse face engine output. Please start Python face service at ${FACE_SERVICE_URL}. Details: ${stdout || stderr}`
                        )
                    );
                }
            });

            pyProc.on("error", (procErr) => {
                cleanupTempFiles();
                reject(
                    new Error(
                        `Python face engine is not accessible. Please start the service: run 'run_face_service.bat' in 'services/face_service'. (${procErr.message})`
                    )
                );
            });
        } catch (setupErr) {
            for (const f of tempFiles) {
                try {
                    if (fs.existsSync(f)) fs.unlinkSync(f);
                } catch (_) {}
            }
            reject(setupErr);
        }
    });
}

/**
 * Extract face embedding for an employee and image.
 */
async function enrollEmployeeFace(employeeId, imageBase64) {
    return postToFaceService("/enroll", { employeeId: String(employeeId), image: imageBase64 });
}

/**
 * Recognize an unknown face snapshot against a list of enrolled candidate embeddings.
 * candidates: [{ employeeId: string, embedding: number[] }]
 */
async function recognizeEmployeeFace(imageBase64, candidates) {
    return postToFaceService("/recognize", { image: imageBase64, candidates });
}

module.exports = {
    enrollEmployeeFace,
    recognizeEmployeeFace,
    FACE_SERVICE_URL,
};
