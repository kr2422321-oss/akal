import discum
import requests
import json
import sys
import random
import time
from collections import Counter
from datetime import datetime

token = sys.argv[1]
webhook_url = sys.argv[2]
guild_id = sys.argv[3]
channel_id = sys.argv[4]

bot = discum.Client(token=token, log=False)
badge_counts = Counter()
scanned_guild_name = "Unknown Guild"
scanned_guild_id = guild_id

TARGET_BADGES = {
    1 << 0: 'Discord Employee',
    1 << 1: 'Partnered Server Owner',
    1 << 2: 'HypeSquad Events',
    1 << 3: 'Bug Hunter Level 1',
    1 << 9: 'Early Supporter',
    1 << 14: 'Bug Hunter Level 2',
    1 << 17: 'Early Verified Bot Developer',
    1 << 18: 'Discord Certified Moderator'
}

BADGE_EMOJIS = {
    "ACTIVE_DEVELOPER": "<:active_developer:1294626708728709201>",
    "HOUSE_BALANCE": "<:balance:1294626711866183701>",
    "HOUSE_BRAVERY": "<:bravery:1294626735211675651>",
    "HOUSE_BRILLIANCE": "<:brilliance:1294626737031745548>",
    "BUGHUNTER_LEVEL_1": "<:bughunter:1294626739623952384>",
    "BUGHUNTER_LEVEL_2": "<:bughuntergold:1294626741326708931>",
    "DISCORD_EMPLOYEE": "<:discord_employee:1294626743100903495>",
    "EARLY_SUPPORTER": "<:early_supporter:1294626763988537376>",
    "EARLY_VERIFIED_BOT_DEVELOPER": "<:early_verified_bot_developer:1294626765825900619>",
    "HYPESQUAD_EVENTS": "<:hypesquad_events:1294626768212332544>",
    "DISCORD_CERTIFIED_MODERATOR": "<:moderatorprogramsalumni:1294626770376589372>",
    "PARTNERED_SERVER_OWNER": "<:partnered_server_owner:1294626797446500439>"
}

def __get_badges(flags) -> list[str]:
    badges = []
    for badge_flag, badge_name in TARGET_BADGES.items():
        if flags & badge_flag == badge_flag:
            badges.append(badge_name)
            badge_counts[badge_name] += 1
    return badges

def get_user_data(user_id):
    url = f"https://discordlookup.mesalytic.moe/v1/user/{user_id}"
    response = requests.get(url)
    if response.status_code == 200:
        return response.json()
    return None

def get_badge_emojis(badges):
    return "".join([BADGE_EMOJIS.get(badge.replace(' ', '_').upper(), badge) for badge in badges])

def send_embed_batch_to_webhook(embeds):
    response = requests.post(webhook_url, json={"embeds": embeds})
    if response.status_code != 204:
        print(f"Failed to send embed batch: {response.status_code}, {response.text}")

def send_summary_embed():
    badge_summary = "\n".join([
        f"{BADGE_EMOJIS.get(badge.replace(' ', '_').upper(), '')} {badge} {count}x"
        for badge, count in badge_counts.items() if count > 0
    ])
    if not badge_summary.strip():
        badge_summary = "No badges found."
    summary_embed = {
        "title": "Badge Summary",
        "description": f"{badge_summary}"
    }
    send_embed_batch_to_webhook([summary_embed])

@bot.gateway.command
def memberTest(resp):
    global scanned_guild_name
    if bot.gateway.finishedMemberFetching(guild_id):
        lenmembersfetched = len(bot.gateway.session.guild(guild_id).members)
        print(f"{lenmembersfetched} members fetched")
        bot.gateway.removeCommand(memberTest)
        bot.gateway.close()
    if resp.event.ready_supplemental:
        guild_info = getattr(resp.parsed, "guilds", None)
        if guild_info:
            scanned_guild_name = guild_info[0].get('name', 'Unknown Guild')

bot.gateway.fetchMembers(guild_id, channel_id, keep=['public_flags', 'username', 'discriminator', 'avatar', 'premium_since'], startIndex=0, method='overlap')
bot.gateway.run()

embeds_to_send = []
for memberID in bot.gateway.session.guild(guild_id).members:
    temp_flags = bot.gateway.session.guild(guild_id).members[memberID].get('public_flags')
    premium_since = bot.gateway.session.guild(guild_id).members[memberID].get('premium_since')
    target_badges = __get_badges(temp_flags) if temp_flags is not None else []
    
    if target_badges:
        user_data = get_user_data(memberID)
        if user_data:
            username = f"@{user_data.get('username', 'Unknown User')} (ID: {memberID})"
            avatar_url = user_data.get("avatar", {}).get("link", "https://cdn.discordapp.com/embed/avatars/0.png")
            all_badges = user_data.get("badges", [])
            
            creation_date = user_data.get("created_at")
            if creation_date:
                creation_date = datetime.fromisoformat(creation_date).strftime("%Y-%m-%d")
            else:
                creation_date = "Unknown"

            badges_str = get_badge_emojis(all_badges)

            nitro_status = "None"
            if premium_since:
                nitro_status = "Nitro + Boost" if "BOOST" in badges_str else "Basic Nitro"
                badges_str += "<:discord_nitro:1294626762436640768><:boost1month:1294626733517177002>"

            member_embed = {
                "title": username,
                "description": f"**Badges:** {badges_str}\n**Account Created:** {creation_date}",
                "thumbnail": {"url": avatar_url},
                "color": random.randint(0, 0xFFFFFF)
            }
            embeds_to_send.append(member_embed)

            if len(embeds_to_send) == 5:
                send_embed_batch_to_webhook(embeds_to_send)
                embeds_to_send = []

if embeds_to_send:
    send_embed_batch_to_webhook(embeds_to_send)

time.sleep(1)
send_summary_embed()
