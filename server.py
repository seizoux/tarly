# This file is the main file for the web server. It handles all the routes and the main server setup.
import aiohttp
from quart import Quart, jsonify, request, redirect, session, render_template, url_for, send_file, Request
from discord.ext import ipc
import json
import settings as _WebSettings
import asyncpg
import redis.asyncio as aioredis
import sentry_sdk
from sentry_sdk.integrations.quart import QuartIntegration
import logging
import colorlog

from blueprints.websocket import bp as websocket_app

from quartcord import DiscordOAuth2Session, requires_authorization, Unauthorized, AccessDenied
import json
import secrets
import aioboto3

class WebQuart(Quart):
    def __init__(self, name, static_folder):
        super().__init__(name, static_folder=static_folder)
        self.redis: aioredis.Redis = None
        self.pubsub: aioredis.Redis.pubsub = None
        self.pool: asyncpg.Pool = None
        self.sockets = {}
        self.discord: DiscordOAuth2Session = None
        self.s3 = None
        self.session: aiohttp.ClientSession = None

    async def get_redis(self) -> aioredis.Redis:
        return self.redis

    async def get_pool(self) -> asyncpg.Pool:
        return self.pool
    
app = WebQuart(__name__, static_folder="./templates/static")
app.register_blueprint(websocket_app)

app.secret_key = b"random bytes representing quart secret key"

log = logging.getLogger("hypercorn")
log.setLevel(logging.INFO)

handler = logging.StreamHandler()
handler.setFormatter(
    colorlog.ColoredFormatter(
        "[APP] %(log_color)s%(message)s",
        log_colors={
            "DEBUG": "cyan",
            "INFO": "green",
            "WARNING": "yellow",
            "ERROR": "red",
            "CRITICAL": "red,bg_white",
        },
    )
)

log.addHandler(handler)

app.config["DISCORD_CLIENT_ID"] = _WebSettings.DISCORD_CLIENT_ID  # Discord client ID.
app.config["DISCORD_CLIENT_SECRET"] = (
    _WebSettings.DISCORD_CLIENT_SECRET
)  # Discord client secret.
app.config["DISCORD_REDIRECT_URI"] = (
    _WebSettings.DISCORD_REDIRECT_URI
)  # URL to your callback endpoint.
app.config["DISCORD_BOT_TOKEN"] = _WebSettings.DISCORD_TOKEN

@app.before_serving
async def startup():
    app.pool = await asyncpg.create_pool(_WebSettings.DB)
    log.info(f"[DATABASE] Connected: {app.pool}")
    pool = aioredis.ConnectionPool.from_url("redis://localhost:6379")
    app.redis = await aioredis.Redis.from_pool(pool)
    log.info(f"[REDIS] Connected: {app.redis}")
    await app.redis.set('user_count', 0)
    await app.redis.delete('online_users')
    app.session = aiohttp.ClientSession()

    # Subscribe to the Redis channel for this worker
    async with app.redis.pubsub() as pubsub:
        app.pubsub = pubsub
        
    await app.pubsub.subscribe('broadcast')
    
    # Create the OAuth2Session instance
    app.discord = DiscordOAuth2Session(app)

@app.before_request
def make_session_permanent():
    session.permanent = True


@app.route("/", methods=["GET"])
async def home():
    return await render_template("index.html")


@app.route("/chat")
@requires_authorization
async def chat():
    # Retrieve the user ID from the session
    id = session.get("user_id")

    # Retrieve the user data from Redis
    user_data = await app.redis.get(id)

    # Render the chat page
    return await render_template("chat.html", user_data=user_data, user_id=id)


# FROM HERE WE HANDLE AUTH
@app.route("/login", methods=["GET"])
async def login():
    discord = app.discord
    return await discord.create_session(scope=['identify', 'guilds'])

@app.route("/logout", methods=["GET"])
@requires_authorization
async def logout():
    discord = app.discord
    discord.revoke()
    return redirect(url_for("home"))

@app.route("/callback", methods=["GET"])
async def callback():
    discord = app.discord
    try:
        await discord.callback()
    except AccessDenied:
        return redirect(url_for('home'))

    user = await discord.fetch_user()

    user_data = user.__dict__["_payload"]
    if 'email' in user_data:
        del user_data['email']
        
    user_data['image_url'] = user.avatar_url
        
    log.info(f"[DISCORD] User data: {user_data}")
        
    # Generate a unique ID for the user
    id = secrets.token_hex(16)

    while await app.redis.exists(id):
        id = secrets.token_hex(16)

    # Store the user data in Redis
    if not await app.redis.exists(id):
        await app.redis.set(
            id, json.dumps(user_data)
        )  # Use json.dumps() instead of str()
    else:
        await app.redis.delete(id)
        await app.redis.set(
            id, json.dumps(user_data)
        )  # Use json.dumps() instead of str()

    # Store the user ID in the session
    session["user_id"] = id

    return redirect(url_for("home"))

@app.route('/auth', methods=['GET'])
async def auth():
    if not request.args.get('m'):
        return await render_template('register.html')
    
    if request.args.get('m'):
        if request.args.get('m') == 'login':
            return await render_template('login.html')
        else:
            return jsonify({"error": "Invalid auth method"})