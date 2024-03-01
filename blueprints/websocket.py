from quart import Quart, Blueprint, request, jsonify, session, websocket
import json
from modules.pubsub import RedisPubSub
from modules.methods import Websocket
import asyncio
import uuid
import logging
import quart
import secrets

_ws = Websocket()
_pubsub = RedisPubSub()
bp = Blueprint('websockets', __name__)

log = logging.getLogger("hypercorn")

lock = asyncio.Lock()

async def receive_messages(app: Quart):
    while True:
        async with lock:
            message = await app.pubsub.get_message(ignore_subscribe_messages=True)
            # Listen for messages from Redis
            if message is not None:
                # Extract the data from the message
                data = message['data']

                # Check if data is a bytes object
                if isinstance(data, bytes):
                    # Decode the data from bytes to string
                    data_str = data.decode('utf-8')

                    # Parse the string back into a JSON object
                    data_json = json.loads(data_str)

                    # Handle user_count message type
                    if data_json.get('type') == 'user_count':
                        await _ws.send_user_count(app, log, data_json)
                        
                    # Handle file message type
                    elif data_json.get('type') == 'file':
                        await _ws.send_file(app, log, data_json)
                        
                    # Handle notification message type
                    elif data_json.get('type') == 'notification':
                        log.info(f"[WEBSOCKET] Sending notification to: {data_json}")
                        for user in data_json['type_data'].get('users'):
                            ws_id = await app.redis.get(f'user:{user}:ws_id')
                            data_json['ws_id'] = ws_id.decode('utf-8')
                            await _ws.send_notification(app, log, data_json)
                    else:
                        await _ws.send_message(app, log, data_json)

async def start_receiver():
    await receive_messages()

async def start_receiver_task(websocket, ws_id, app):
    try:
        while True:
            # Wait for a message from the WebSocket connection
            s = await websocket.receive()
            data = json.loads(s)

            # Handle the different message types
            _data_types = {
                "title": {'func': _pubsub.publish_title, 'args': [app, data]},
                "description": {'func': _pubsub.publish_description, 'args': [app, data]},
                'typing': {'func': _pubsub.publish_typing, 'args': [app, data, session]},
                'notification': {'func': _pubsub.publish_notification, 'args': [app, data, session]},
                "keep_alive": {'func': websocket.send, 'args': [json.dumps({"keep_alive": "true"})]},
                "file": {'func': _pubsub.publish_file, 'args': [app, log, data, session, s]}
            }

            if data.get('type') in _data_types:
                await _data_types[data.get('type')]['func'](*_data_types[data.get('type')]['args'])
            else:
                await _pubsub.publish_message(app, log, session, data['message'])
        
    except asyncio.CancelledError:
        try:
            await websocket.close(1000)
        except Exception:
            pass
        # Remove the WebSocket object from the local dictionary when the WebSocket connection is closed
        if ws_id in app.sockets:
            app.sockets.pop(ws_id, None)
        await app.redis.srem('sockets', ws_id)
        await app.redis.set(f'state:{ws_id}', 'false')
        raise

async def get_online_users(app):
    online_user = await app.redis.lrange('online_users', 0, -1)
    return [json.loads(user.decode('utf-8')) for user in online_user]

async def handle_user(type: bool, app: Quart):
    # Get user data
    user_data = await app.redis.get(session.get("user_id"))
    decoded = json.loads(user_data.decode('utf-8'))

    if type == True:
        log.info(decoded)

        # Get the list of online users
        online_users = await get_online_users(app)
        log.info(online_users)

        # Check if the new user is already in the list
        if any(user['username'] == decoded['username'] and user['id'] == decoded['id'] for user in online_users):
            # If user is already in the list, remove the user
            await app.redis.lrem('online_users', 0, json.dumps(decoded))

        # Add user to the list
        await app.redis.rpush('online_users', json.dumps(decoded))

        # Increment the user count
        await app.redis.incr('user_count')

    else:
        # Remove user from Redis list of online users
        await app.redis.lrem('online_users', 0, json.dumps(decoded))

        # Decrement the user count
        await app.redis.decr('user_count')

    # Get the updated list of online users
    online_users = await get_online_users(app)

    # Publish the new user count and online users list
    await app.redis.publish('broadcast', json.dumps({'type': 'user_count', 'count': (await app.redis.get('user_count')).decode('utf-8'), 'users_data': online_users}))


async def generate_unique_id(app):
    id = secrets.token_hex(16)
    while await app.redis.exists(id):
        id = secrets.token_hex(16)
    return id

@bp.websocket('/ws')
async def ws():
    app = quart.current_app
    bot_header = websocket.headers.get('X-Bot-Auth')
    if bot_header:
        _user_decoded = json.loads(bot_header)
        log.info(f"[WEBSOCKET] Received X-Bot-Auth: {_user_decoded}")

        if not _user_decoded['user'].get('bot'):
            return "", 401
        elif not _user_decoded['user'].get('bot') == True:
            return "Not authenticated as bot when X-Bot-Auth is being sent.", 401

        id = await generate_unique_id(app)

        # Store the user data in Redis
        await app.redis.set(id, json.dumps(_user_decoded))

        session["user_id"] = id
    else:
        user = await app.redis.get(session.get("user_id"))
        _user_decoded = json.loads(user.decode('utf-8'))

    ws_id = str(uuid.uuid4())

    app.sockets[ws_id] = {'websocket': websocket._get_current_object(), 'user': _user_decoded['username']}
    await app.redis.sadd('sockets', ws_id)

    await app.redis.set(f'user:{_user_decoded['username']}:ws_id', ws_id)

    await handle_user(type=True, app=app)

    await app.redis.set(f'state:{ws_id}', 'true')

    if not hasattr(bp, 'receiver_task') or app.receiver_task is None or app.receiver_task.done():
        app.receiver_task = asyncio.create_task(receive_messages(app))

    receiver_task = asyncio.create_task(start_receiver_task(websocket, ws_id, app))

    try:
        done, pending = await asyncio.wait(
            {app.receiver_task, receiver_task},
            return_when=asyncio.FIRST_COMPLETED,
        )

        if receiver_task in done:
            app.receiver_task.cancel()

        if app.receiver_task in done:
            receiver_task.cancel()
    finally:
        app.sockets.pop(ws_id, None)
        await app.redis.srem('sockets', ws_id)
        await app.redis.delete(f'state:{ws_id}')
        await app.redis.delete(f'user:{_user_decoded['username']}:ws_id')
        
        await handle_user(type=False, app=app)
        
        try:
            await websocket.close(1000)
        except Exception:
            pass