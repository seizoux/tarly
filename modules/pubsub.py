import base64
import json
import logging
import re
from quart import Quart
import tempfile
import boto3
import aioboto3
import settings
from botocore.client import Config

def fill_template(template, values):
    for key, value in template.items():
        if isinstance(value, dict):
            fill_template(value, values.get(key, {}))
        else:
            template[key] = values.get(key)

_data_structure = {
        "user": None, # dict
        "message": None, # str
        "type": None, # str
        "type_data": None, # dict
        "files": None, # dict
        "bot": None, # bool
        "bot_data": None, # dict
        "embeds": None, # list
        "user_color": None, # str
        "badges": None # list
    }

class RedisPubSub:
    def __init__(self):
        ...
        
    async def publish_message(self, app: Quart, log: logging.Logger, session, s: str):
        user_data = await app.redis.get(session.get("user_id"))
        _data = json.loads(user_data.decode("utf-8"))

        log.info(_data)

        # Prepare the values
        values = {
            "user": _data,
            "message": str(s),
            "type": None,
            "type_data": None,
            "files": {},
            "bot": None,
            "bot_data": {},
            "embeds": [],
            "user_color": None,
            "badges": []
        }

        # Fill the template with the actual data
        data_structure = _data_structure.copy()
        fill_template(data_structure, values)

        await app.redis.publish('broadcast', json.dumps(data_structure))
        log.info(f"[REDIS] Published message: {s}")
        
    async def publish_description(self, app: Quart, data: dict):
        description = data.get('description')
        
        # Prepare the values
        values = {
            "user": None,
            "message": None,
            "type": "description",
            "type_data": description,
            "files": {},
            "bot": None,
            "bot_data": {},
            "embeds": [],
            "user_color": None,
            "badges": []
        }

        # Fill the template with the actual data
        data_structure = _data_structure.copy()
        fill_template(data_structure, values)
        
        await app.redis.publish('broadcast', json.dumps(data_structure))
        
    async def publish_title(self, app: Quart, data: dict):
        title = data.get('title')
        
        # Prepare the values
        values = {
            "user": None,
            "message": None,
            "type": "title",
            "type_data": title,
            "files": {},
            "bot": None,
            "bot_data": {},
            "embeds": [],
            "user_color": None,
            "badges": []
        }

        # Fill the template with the actual data
        data_structure = _data_structure.copy()
        fill_template(data_structure, values)
        
        await app.redis.publish('broadcast', json.dumps(data_structure))
        
    async def publish_typing(self, app: Quart, data: dict, session):
        user_data = await app.redis.get(session.get("user_id"))
        _data = json.loads(user_data.decode("utf-8"))
        
        # Prepare the values
        values = {
            "user": None,
            "message": None,
            "type": "typing",
            "type_data": {"action": data.get('action'), "username": _data['username']},
            "files": {},
            "bot": None,
            "bot_data": {},
            "embeds": [],
            "user_color": None,
            "badges": []
        }

        # Fill the template with the actual data
        data_structure = _data_structure.copy()
        fill_template(data_structure, values)
        
        await app.redis.publish('broadcast', json.dumps(data_structure))
        
    async def publish_notification(self, app: Quart, data: dict, session):
        # Publish the file data to the Redis channel
        user_data = await app.redis.get(session.get("user_id"))
        _data = json.loads(user_data.decode("utf-8"))
        
        # Prepare the values
        values = {
            "user": _data,
            "message": data.get('message'),
            "type": "notification",
            "type_data": {"users": data.get('users'), "from": {'username': _data['username'], 'userImage': _data['image_url']}},
            "files": {},
            "bot": None,
            "bot_data": {},
            "embeds": [],
            "user_color": None,
            "badges": []
        }

        # Fill the template with the actual data
        data_structure = _data_structure.copy()
        fill_template(data_structure, values)
        
        await app.redis.publish('broadcast', json.dumps(data_structure))
        
    async def publish_file(self, app: Quart, log: logging.Logger, data: dict, session, s: str):
        # The data is a file
        file_info = data.get('fileData')
        file_name = data.get('fileName')
        file_type = data.get('fileType')
        
        log.info(f"File info: {file_info} {file_name} {file_type}")

        # Decode the base64 data to bytes
        file_data = base64.b64decode(file_info)

        # Write the file data to a temporary file
        with tempfile.NamedTemporaryFile(delete=False) as temp_file:
            temp_file.write(file_data)
            temp_file_path = temp_file.name

        _s3 = aioboto3.Session(
            aws_access_key_id=settings.CF_ACCESS_KEY,
            aws_secret_access_key=settings.CF_SECRET_KEY,
        )
        
        _file_url = None

        async with _s3.client('s3', endpoint_url='https://980a51450a94985d4207be762678dac1.r2.cloudflarestorage.com', region_name='auto') as s3:
            _verify_ex = await app.session.get(f"https://cdn.tarly.gg/{file_name}")
            if not _verify_ex.status == 200:
                try:
                    await s3.upload_file(
                        Filename=temp_file_path,
                        Bucket="palshomeuploads",
                        Key=file_name,
                        ExtraArgs={
                            'ContentType': file_type,  # Set the content type
                            'ContentDisposition': 'inline',  # Set the content disposition
                        },
                    )

                    # Generate a presigned URL for the uploaded file
                    _file_url = "https://cdn.tarly.gg/" + file_name
                except Exception as e:
                    log.info(f'Exception in R2: {e}')
            else:
                _file_url = f"https://cdn.tarly.gg/{file_name}"

        # Publish the file data to the Redis channel
        user_data = await app.redis.get(session.get("user_id"))
        _data = json.loads(user_data.decode("utf-8"))
        
        # Prepare the values
        values = {
            "user": _data,
            "message": None,
            "type": "file",
            "type_data": None,
            "files": {"fileName": file_name, "fileType": file_type, "fileUrl": _file_url, "fileSize": len(file_data)},
            "bot": None,
            "bot_data": {},
            "embeds": [],
            "user_color": None,
            "badges": []
        }

        # Fill the template with the actual data
        data_structure = _data_structure.copy()
        fill_template(data_structure, values)
        
        await app.redis.publish('broadcast', json.dumps(data_structure))
        log.info(f"[REDIS] Sent data: {data_structure}")