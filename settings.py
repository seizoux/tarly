from dotenv import load_dotenv
import os

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
DB = os.getenv("DB")
API_DATABASE_URL = os.getenv("API_DB")

DISCORD_TOKEN = os.getenv("DISCORD_TOKEN")
DISCORD_CLIENT_ID = os.getenv("DISCORD_CLIENT_ID")
DISCORD_CLIENT_SECRET = os.getenv("DISCORD_CLIENT_SECRET")
DISCORD_REDIRECT_URI = os.getenv("DISCORD_REDIRECT_URI")

CF_BUCKET_ID = os.getenv("CF_BUCKET_ID")
CF_SECRET_KEY = os.getenv("CF_SECRET_KEY")
CF_ACCESS_KEY = os.getenv("CF_ACCESS_KEY")
CF_REGION = os.getenv("CF_REGION")
CF_EMAIL = os.getenv("CF_EMAIL")
CF_API_KEY = os.getenv("CF_API_KEY")
CF_ZONE_ID = os.getenv("CF_ZONE_ID")