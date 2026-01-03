const fs = require('fs');
const path = require('path');

async function uploadEmojis(guild, channel) {
    console.log('Emoji upload function started'); 
    
    const emojiFilePath = path.join(__dirname, '../emojis.json'); 
    let existingEmojis = {};

    try {
        const data = fs.readFileSync(emojiFilePath, 'utf8');
        existingEmojis = JSON.parse(data);
        console.log('emojis.json successfully read'); 
    } catch (err) {
        console.log("Could not read emojis.json, a new file will be created:", err);
    }

    const emojiDir = path.join(__dirname, './emojis'); 
    console.log(`Emoji directory: ${emojiDir}`); 
    const files = fs.readdirSync(emojiDir).filter(file => file.endsWith('.png'));
    console.log(`Files found: ${files}`); 

    if (files.length === 0) {
        console.log('No PNG files found'); 
        return channel.send("No PNG files found in the `./emojis/` folder.");
    }

    await channel.send("Uploading emojis, please wait...");
    console.log('Emoji upload started...');

    for (const file of files) {
        const emojiName = path.basename(file, '.png');
        const emojiPath = path.join(emojiDir, file); 

        try {
            console.log(`Uploading emoji: ${emojiName}`); 
            const emoji = await guild.emojis.create({ attachment: emojiPath, name: emojiName });
            console.log(`Emoji created: ${emojiName}, ID: ${emoji.id}`); 

            existingEmojis[emojiName] = `<:${emojiName}:${emoji.id}>`;
            await channel.send(`Successfully created emoji: ${emojiName}.`);
        } catch (err) {
            console.log(`Error occurred while uploading emoji ${emojiName}:`, err);
            await channel.send(`Error occurred while uploading emoji ${emojiName}.`);
        }

        console.log(`Updating emojis.json with: ${emojiName}`);
        try {
            fs.writeFileSync(emojiFilePath, JSON.stringify(existingEmojis, null, 2));
            console.log(`${emojiName} successfully saved to emojis.json.`);
        } catch (writeErr) {
            console.log(`Error occurred while writing to emojis.json:`, writeErr);
        }
    }

    console.log('All emojis uploaded. Emoji setup completed.'); 
    await channel.send("Emoji setup completed!");
}

module.exports = uploadEmojis;
