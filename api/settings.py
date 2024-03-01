from dotenv import load_dotenv
import os

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
DB = os.getenv("DB")
SECRET_KEY = os.getenv("SECRET_KEY")
API_VERSION = "v1"

ALGORITHM = "HS256"
SALT = "email-confirm"
MAX_AGE = 1800  # 30 minutes

API_DOCS_DESCRIPTION = """
Private API for tarly.gg. No public documentation is available.
"""

CF_BUCKET_ID = os.getenv("CF_BUCKET_ID")
CF_SECRET_KEY = os.getenv("CF_SECRET_KEY")
CF_ACCESS_KEY = os.getenv("CF_ACCESS_KEY")
CF_REGION = os.getenv("CF_REGION")
CF_EMAIL = os.getenv("CF_EMAIL")
CF_API_KEY = os.getenv("CF_API_KEY")
CF_ZONE_ID = os.getenv("CF_ZONE_ID")

EMAIL = os.getenv("EMAIL")
EMAIL_PASSWORD = os.getenv("EMAIL_PASSWORD")
EMAIL_HOST = os.getenv("EMAIL_HOST")
EMAIL_PORT = os.getenv("EMAIL_PORT")