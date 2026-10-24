const http = require("http");
const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");

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

            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.detail || data.message || `Face service HTTP ${res.status}`);
            }
            return data;
        }
    } catch (httpErr) {
        // Fall back to CLI execution if HTTP service is unreachable
        console.warn(`[FaceClient] HTTP request to ${endpoint} failed (${httpErr.message}). Attempting CLI fallback...`);
        return executeFaceCli(endpoint, bodyData);
    }
}

/**
 * Fallback: executes the Python face_engine.py directly via child_process.
 */
function executeFaceCli(endpoint, bodyData) {
    return new Promise((resolve, reject) => {
        let mode = endpoint === "/enroll" ? "enroll" : "recognize";
        let args = [PYTHON_SCRIPT_PATH, "--mode", mode, "--image", bodyData.image];

        if (mode === "enroll") {
            args.push("--employee_id", String(bodyData.employeeId || ""));
        } else if (mode === "recognize") {
            args.push("--candidates", JSON.stringify(bodyData.candidates || []));
        }

        const pyProc = spawn(PYTHON_CMD, args, { windowsHide: true });
        let stdout = "";
        let stderr = "";

        pyProc.stdout.on("data", (data) => {
            stdout += data.toString();
        });

        pyProc.stderr.on("data", (data) => {
            stderr += data.toString();
        });

        pyProc.on("close", (code) => {
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
            reject(
                new Error(
                    `Python face engine is not accessible. Please start the service: run 'run_face_service.bat' in 'services/face_service'. (${procErr.message})`
                )
            );
        });
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
