import discord
from discord_webhook import DiscordWebhook, DiscordEmbed
import os
import json
import sys

token = sys.argv[1]
webhook_url = sys.argv[2]
client = discord.Client()

badge_counts = {
    'partner': {'emoji': '<:partner:1267857105294065715>', 'count': 0},
    'hypesquad': {'emoji': '<:events:1267857100202049607>', 'count': 0},
    'bug_hunter': {'emoji': '<:greenhunter:1267857102492405810>', 'count': 0},
    'bug_hunter_level_2': {'emoji': '<:shinyhunter:1267857251100528744>', 'count': 0},
    'verified_bot_developer': {'emoji': '<:developer:1267857463047360593>', 'count': 0},
    'early_supporter': {'emoji': '<:early:1267857097358446665>', 'count': 0},
    'staff': {'emoji': '<:staff:1267857284583788709>', 'count': 0},
    'discord_certified_moderator': {'emoji': '<:alumni:1267857282696351848>', 'count': 0}
}

def send_summary_embed(total_scanned, badge_counts):
    summary_content = f"{total_scanned} users found with badges in voice channels.\n\n"
    for badge, data in badge_counts.items():
        if data['count'] > 0:
            summary_content += f"{data['emoji']} | {data['count']}x\n"

    summary_embed = DiscordEmbed(
        title="Scanning Successful ✔",
        description=summary_content,
        color=0x00ff00
    )
    summary_embed.set_footer(text="AKAL - VC Scraper")
    webhook = DiscordWebhook(url=webhook_url)
    webhook.add_embed(summary_embed)
    webhook.execute()

def send_embed_paginated(scanned_list):
    MAX_CHARACTERS = 2048  
    page = 1
    current_embed_content = ""
    webhook = DiscordWebhook(url=webhook_url)

    for user_info in scanned_list:
        user_details = f"{user_info['username']}: {user_info['details']}\n"

        if len(current_embed_content) + len(user_details) > MAX_CHARACTERS:
            embed = DiscordEmbed(
                title=f"Scanned List - Page {page}",
                description=current_embed_content,
                color=0x00ff00
            )
            embed.set_footer(text="AKAL - VC Scraper")
            webhook.add_embed(embed)
            webhook.execute()

            current_embed_content = ""
            page += 1
            webhook.remove_embeds()  

        current_embed_content += user_details

    if current_embed_content:
        embed = DiscordEmbed(
            title=f"Scanned List - Page {page}",
            description=current_embed_content,
            color=0x00ff00
        )
        embed.set_footer(text="AKAL - VC Scraper")
        webhook.add_embed(embed)
        webhook.execute()

def load_database():
    if not os.path.exists("database.txt"):
        with open("database.txt", "w", encoding="utf-8") as db:
            pass
    with open("database.txt", "r", encoding="utf-8") as db:
        return set(db.read().splitlines())

def save_to_database(username):
    with open("database.txt", "a", encoding="utf-8") as db:
        db.write(f"{username}\n")

def load_blacklist():
    if not os.path.exists("blacklist.txt"):
        return set()
    with open("blacklist.txt", "r", encoding="utf-8") as bl_file:
        return set(bl_file.read().splitlines())

async def scan_voice_channels():
    print('Scanning all servers...')

    database = load_database()
    blacklist = load_blacklist()
    scanned_list = []
    total_scanned = 0

    for guild in client.guilds:
        for member in guild.members:
            if member.voice and member.voice.channel:
                if member.name in blacklist or member.bot:
                    continue

                badges = member.public_flags
                badge_list = []

                if badges.partner:
                    badge_list.append(badge_counts['partner']['emoji'])
                    badge_counts['partner']['count'] += 1
                if badges.hypesquad:
                    badge_list.append(badge_counts['hypesquad']['emoji'])
                    badge_counts['hypesquad']['count'] += 1
                if badges.bug_hunter:
                    badge_list.append(badge_counts['bug_hunter']['emoji'])
                    badge_counts['bug_hunter']['count'] += 1
                if badges.bug_hunter_level_2:
                    badge_list.append(badge_counts['bug_hunter_level_2']['emoji'])
                    badge_counts['bug_hunter_level_2']['count'] += 1
                if badges.verified_bot_developer:
                    badge_list.append(badge_counts['verified_bot_developer']['emoji'])
                    badge_counts['verified_bot_developer']['count'] += 1
                if badges.early_supporter:
                    badge_list.append(badge_counts['early_supporter']['emoji'])
                    badge_counts['early_supporter']['count'] += 1
                if badges.staff:
                    badge_list.append(badge_counts['staff']['emoji'])
                    badge_counts['staff']['count'] += 1
                if badges.discord_certified_moderator:
                    badge_list.append(badge_counts['discord_certified_moderator']['emoji'])
                    badge_counts['discord_certified_moderator']['count'] += 1

                if badge_list: 
                    mute_status = '✔' if member.voice.self_mute else '❌'
                    deaf_status = '✔' if member.voice.self_deaf else '❌'

                    new_user = ""
                    if member.name not in database:
                        save_to_database(member.name)
                        new_user = "New! "

                    user_info = {
                        'username': f"**@{member.name}** {' '.join(badge_list)}",
                        'details': f"\n**VC:** <#{member.voice.channel.id}>\n**Mute:** {mute_status} **|** **Deaf:** {deaf_status} **|** [view](https://discordlookup.com/user/{member.id})\n"
                    }
                    scanned_list.append(user_info)
                    total_scanned += 1

    if scanned_list:
        send_summary_embed(total_scanned, badge_counts) 
        send_embed_paginated(scanned_list) 
    else:
        print("No users with badges found in voice channels.")

@client.event
async def on_ready():
    print(f'Logged in as {client.user}')
    await scan_voice_channels()  

client.run(token)
