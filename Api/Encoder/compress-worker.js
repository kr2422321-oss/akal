const { parentPort, workerData } = require('worker_threads');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const { input, outputDir, newname } = workerData;

(async () => {
    try {
        if (!fs.existsSync(input)) throw new Error('Dosya bulunamadı: ' + input);

        const outputFile = path.join(outputDir, newname + '.br');

        const fileData = fs.readFileSync(input);
        const compressed = zlib.brotliCompressSync(fileData, {
            params: {
                [zlib.constants.BROTLI_PARAM_QUALITY]: 11 
            }
        });

        fs.writeFileSync(outputFile, compressed);

        parentPort.postMessage({ status: 'done', file: input, output: outputFile });
    } catch (err) {
        parentPort.postMessage({ status: 'error', file: input, error: err.message });
    }
})();
