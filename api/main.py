from fastapi import Depends, HTTPException, Request, FastAPI, Form, Header, UploadFile, File
from fastapi.responses import JSONResponse
import settings as _APIconst
import settings as _APIconst
from fastapi.security import APIKeyHeader
from fastapi.staticfiles import StaticFiles
import logging
from fastapi.middleware.cors import CORSMiddleware
import colorlog
from modules.subclass import Tarly
from datetime import datetime
from fastapi_mail import FastMail, MessageSchema, ConnectionConfig
from pydantic import BaseModel, EmailStr
from itsdangerous import URLSafeTimedSerializer, SignatureExpired, BadTimeSignature
import aioboto3
import random
import os
import time
import bcrypt
import tempfile
import settings

conf = ConnectionConfig(
    MAIL_USERNAME = settings.EMAIL,  # Your Zoho email
    MAIL_PASSWORD = settings.EMAIL_PASSWORD,  # Your Zoho password
    MAIL_FROM = "staff@tarly.gg",
    MAIL_FROM_NAME = "Tarly",
    MAIL_PORT = settings.EMAIL_PORT,
    MAIL_SERVER = settings.EMAIL_HOST,
    MAIL_STARTTLS = False,
    MAIL_SSL_TLS = True,
    USE_CREDENTIALS = True,
    VALIDATE_CERTS = True
)


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
            
app = Tarly()

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"]
)

app.mount(f"/{_APIconst.API_VERSION}/img", StaticFiles(directory="static"), name="static")

API_KEY_NAME = "api-key"
RATE_LIMIT = 10  # The number of requests a user can make per 5 seconds
TIME_WINDOW = 5  # The time window for the rate limit in seconds
ALGORITHM = _APIconst.ALGORITHM
API_VERSION = _APIconst.API_VERSION

api_key_header = APIKeyHeader(name=API_KEY_NAME, auto_error=True)

def get_app(request: Request):
    return request.app

class Token(BaseModel):
    token: str

class User(BaseModel):
    email: EmailStr
    username: str
    password: str
    image_url: str

class SnowflakeIDGenerator:
    """
    A class to generate unique IDs using the Snowflake algorithm.
    The Snowflake algorithm is used to generate unique IDs at a large scale in a distributed environment without the need for a central authority to allocate IDs.
    This class is a Python implementation of the Snowflake algorithm that generates unique IDs using the worker ID, timestamp, and sequence number.
    """
    def __init__(self):
        self.worker_id = os.getpid()
        self.sequence = 0
        self.last_timestamp = -1

    def generate_id(self):
        timestamp = int(time.time() * 1000)

        if timestamp == self.last_timestamp:
            self.sequence = (self.sequence + 1) & 4095
        else:
            self.sequence = 0

        self.last_timestamp = timestamp

        return (timestamp << 22) | (self.worker_id << 12) | self.sequence

idgen = SnowflakeIDGenerator()

@app.post(f"/{_APIconst.API_VERSION}/auth", include_in_schema=False)
async def complete_auth(user = Header(None), 
                        token: str = Form(...), 
                        username: str = Form(...), 
                        password: str = Form(...), 
                        email: str = Form(...), 
                        image: UploadFile = File(...)):
    _token = await app.redis.get(int(token))
    if _token is None:
        raise HTTPException(status_code=400, detail="Token is invalid, please request a new one.")
    
    serializer = URLSafeTimedSerializer(_APIconst.SECRET_KEY)

    try:
        email = serializer.loads(_token.decode("utf-8"), salt=_APIconst.SALT, max_age=_APIconst.MAX_AGE)
    except SignatureExpired:
        await app.redis.delete(int(token))
        raise HTTPException(status_code=400, detail="Token has expired, please request a new one.")
    except BadTimeSignature:
        await app.redis.delete(int(token))
        raise HTTPException(status_code=400, detail="Token is invalid, please request a new one.")

    await app.redis.delete(int(token))

    # Generate a new snowflake ID
    user_id = idgen.generate_id()

    # Handle the image file
    image_contents = await image.read()
    image_filename = image.filename

    _s3 = aioboto3.Session(
        aws_access_key_id=_APIconst.CF_ACCESS_KEY,
        aws_secret_access_key=_APIconst.CF_SECRET_KEY,
    )
    
    _file_url = None

    # Write the file data to a temporary file
    with tempfile.NamedTemporaryFile(delete=False) as temp_file:
        temp_file.write(image_contents)
        temp_file_path = temp_file.name

    async with _s3.client('s3', endpoint_url='https://980a51450a94985d4207be762678dac1.r2.cloudflarestorage.com', region_name='auto') as s3:
        _verify_ex = await app.session.get(f"https://cdn.tarly.gg/assets/{user_id}/pfp/{image_filename}")
        if not _verify_ex.status == 200:
            try:
                # Construct the file key from the user ID and filename
                file_key = f"assets/{user_id}/pfp/{image_filename}"

                await s3.upload_file(
                    Filename=temp_file_path,
                    Bucket="palshomeuploads",
                    Key=file_key,
                    ExtraArgs={
                        'ContentType': image.content_type,  # Set the content type
                        'ContentDisposition': 'inline',  # Set the content disposition
                    },
                )

                # Generate a presigned URL for the uploaded file
                _file_url = "https://cdn.tarly.gg/" + file_key
            except Exception as e:
                log.info(f'Exception in R2: {e}')
        else:
            _file_url = f"https://cdn.tarly.gg/assets/{user_id}/pfp/{image_filename}"

    
    _hs = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt())

    # Store the user's information in the database
    _ds = await app.pool.execute("INSERT INTO users (id, email, username, password, image_url) VALUES ($1, $2, $3, $4, $5)", user_id, email, username, _hs.decode("utf-8"), _file_url)

    return {"status": "Token is valid.", "email": email, "data": {"username": username, "password": password, "image": _file_url, "user_id": user_id}}

@app.get("/health", include_in_schema=False)
async def health():
    await app.pool.execute("DELETE FROM users WHERE email = $1", "")
    return "OK"

@app.post(f"/{_APIconst.API_VERSION}/send-mail", include_in_schema=False)
async def register(email: str = Header(None)):
    # Check if the email is already in use
    _d = await app.pool.fetchrow("SELECT * FROM users WHERE email = $1", str(email))
    if _d:
        raise HTTPException(status_code=400, detail={"error_text": "email_exists"})
    
    # Create a serializer
    serializer = URLSafeTimedSerializer(_APIconst.SECRET_KEY)

    # Generate a secure token
    token = serializer.dumps(email, salt=_APIconst.SALT)

    # Generate a random integer
    code = random.randint(111111, 999999)

    # Store the association between the random integer and the token in Redis
    await app.redis.set(code, token)

    # Create message
    message = MessageSchema(
        subject="Verification Code",
        recipients=[email],  # List of recipients, as many as you can pass 
        body=f"""
        <html>
            <body style="font-family: Arial, sans-serif; background-color: #1a202c; color: #fff; display: flex; justify-content: center; align-items: center;">
                <div style="text-align: center; background-color: #2d3748; padding: 2em; border-radius: 0.5em; margin: auto;">
                    <h1 style="font-size: 2em; margin-bottom: 0.5em; color: #fff; font-weight: bold;">Tarly.gg</h1>
                    <p style="color: #718096; margin-bottom: 1em;">We're glad to have you here, let's complete your registration!</p>
                    <h2 style="margin-bottom: 1em; color: #fff; font-weight: bold;">Verification Code</h2>
                    <div style="background-color: #2d3748; border: 2px solid #718096; padding: 1em; border-radius: 0.375em;">
                        <p style="font-weight: bold; font-size: 2em;">{' '.join(str(code))}</p>
                    </div>
                </div>
            </body>
        </html>
        """,
        subtype="html",
        from_email=("Tarly", "staff@tarly.gg")
    )

    try:
        fm = FastMail(conf)
        await fm.send_message(message)
    except Exception as e:
        log.info(f"Exception: {e}")
        raise HTTPException(status_code=500, detail="An error occurred while sending the email")

    return {"message": "Email sent successfully"}

@app.post(f'/{_APIconst.API_VERSION}/authme/', include_in_schema=False)
async def authme(request: Request, app: FastAPI = Depends(get_app)):
    _d = await request.json()
    if not _d:
        raise HTTPException(status_code=400, detail="Invalid request")
    
    if not _d['Authorization']:
        raise HTTPException(status_code=401, detail="Not Authorized.")
    
    # Get the current time
    current_time = datetime.now()

    # Get the time of the user's last request from Redis
    last_request_tim = await app.redis.get(f'last_request_time:{_d["Authorization"]}')
    last_request_time = last_request_tim.decode('utf-8') if last_request_tim else None

    if last_request_time is not None:
        last_request_time = datetime.strptime(last_request_time, '%Y-%m-%d %H:%M:%S.%f')

        # Calculate the time difference between the current time and the time of the last request
        time_difference = (current_time - last_request_time).total_seconds()

        # If the time difference is less than the time window, check the request count
        if time_difference < TIME_WINDOW:
            request_count = int(await app.redis.get(f'request_count:{_d["Authorization"]}'))

            # If the request count exceeds the rate limit, return an error response
            if request_count >= RATE_LIMIT:
                retry_after = TIME_WINDOW - time_difference
                raise HTTPException(
                    status_code=429,
                    detail="Rate limit exceeded, please slow down.",
                    headers={"retry-after": str(retry_after)}
                )
        else:
            # If the time difference is greater than the time window, reset the request count
            await app.redis.set(f'request_count:{_d["Authorization"]}', 0)

    # Increment the request count
    await app.redis.incr(f'request_count:{_d["Authorization"]}')

    # Update the time of the last request
    await app.redis.set(f'last_request_time:{_d["Authorization"]}', current_time.strftime('%Y-%m-%d %H:%M:%S.%f'))

    if await app.redis.exists(_d['Authorization']):
        return JSONResponse(content={"message": "Authorized"})

    raise HTTPException(status_code=401, detail="Not Authorized.")