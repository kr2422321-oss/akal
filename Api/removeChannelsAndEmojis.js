

const fs = require('fs');
const path = require('path');

async function removeAllChannelsAndEmojis(guild) {
    try {
        const category = guild.channels.cache.find(c => c.name.toLowerCase() === 'send' && c.type === 4);  
        if (category) {
            const channels = category.children.cache;  
            for (const [channelId, channel] of channels) {
                await channel.delete();
                console.log(`Channel ${channel.name} has been deleted.`);
            }
            await category.delete();
            console.log('Injection category has been successfully deleted.');
        } else {
            console.log('Injection category not found.');
        }

        const emojiList = guild.emojis.cache;
        if (emojiList.size > 0) {
            for (const [emojiId, emoji] of emojiList) {
                await emoji.delete();
                console.log(`Emoji ${emoji.name} has been successfully deleted.`);
            }
        } else {
            console.log('No emojis found to delete in the server.');
        }

        console.log('Channels and emojis have been successfully removed.');

    } catch (error) {
        console.error('An error occurred during the removal process:', error);
    }
}

module.exports = removeAllChannelsAndEmojis;
