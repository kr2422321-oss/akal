const express = require('express');
const path = require('path');
const config = require('../config.json');

const app = express();
const port = 1534;

app.use(express.json());

app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    next();
});

app.get('/AKAL_update.zip', (req, res) => {
    const filePath = path.join(__dirname, 'androidfiles', 'AKAL_update.zip');
    res.download(filePath, 'AKAL_update.zip', (err) => {
        if (err) {
            console.error('Download error:', err);
            res.status(500).send('File not found or download error.');
        }
    });
});

app.get('/Debug.zip', (req, res) => {
    const filePath = path.join(__dirname, 'androidfiles', 'Debug.zip');
    res.download(filePath, 'Debug.zip', (err) => {
        if (err) {
            console.error('Download error:', err);
            res.status(500).send('File not found or download error.');
        }
    });
});

async function startServer() {
    try {
        app.listen(port, () => {
            console.log(`Update download endpoint: GET /AKAL_update.zip`);
            console.log(`Debug download endpoint: GET /Debug.zip`);
        });
                
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

process.on('SIGINT', async () => {
    console.log('Shutting down server...');
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('Shutting down server...');
    process.exit(0);
});

startServer();
