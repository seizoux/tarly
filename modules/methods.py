import logging
from quart import Quart
import json

class Websocket:
    def __init__(self):
        ...
    
    async def send_file(self, app: Quart, log: logging.Logger, data_json: dict):
        # Send the file to all connected clients
        ws_ids = await app.redis.smembers('sockets')
        for ws_id in ws_ids:
            ws_id = str(ws_id.decode())  # Convert bytes to str
            websocket = app.sockets.get(ws_id)
            if websocket is not None:
                websocket = websocket['websocket']
                try:
                    _state = await app.redis.get(f'state:{ws_id}')
                    # Check the state of the WebSocket connection
                    if _state.decode() == 'true':
                        #log.info("[WEBSOCKET] Sending file...")
                        await websocket.send_json(data_json)
                        #log.info("[WEBSOCKET] File sent!")
                except Exception as e:
                    log.warning(f"Failed to send file: {e}")
    
    async def send_message(self, app: Quart, log: logging.Logger, data_json: dict):
        # Send the message to all connected clients
        ws_ids = await app.redis.smembers('sockets')
        for ws_id in ws_ids:
            ws_id = str(ws_id.decode())  # Convert bytes to str
            websocket = app.sockets.get(ws_id)
            if websocket is not None:
                websocket = websocket['websocket']
                try:
                    _state = await app.redis.get(f'state:{ws_id}')
                    # Check the state of the WebSocket connection
                    if _state.decode() == 'true':
                        log.info("[WEBSOCKET] Sending message...")
                        await websocket.send_json(data_json)
                        log.info("[WEBSOCKET] Message sent!")
                    else:
                        if ws_id in app.sockets.keys():
                            app.sockets.pop(ws_id)
                        await app.redis.set(f'state:{ws_id}', 'false')
                        log.warning(f"Removed websocket {ws_id} from app.sockets in try/except block.")
                except Exception as e:
                    log.warning(f"Failed to send message: {e}")
                    if ws_id in app.sockets:
                        app.sockets.pop(ws_id)
                    await app.redis.set(f'state:{ws_id}', 'false')
                    log.error(f"Removed websocket {ws_id} from app.sockets outside of try/except block.")
        
    async def send_sticker():
        ...
        
    async def send_user_count(self, app: Quart, log: logging.Logger, data_json: dict):
        # Send the user count to all connected clients
        ws_ids = await app.redis.smembers('sockets')
        for ws_id in ws_ids:
            ws_id = str(ws_id.decode())  # Convert bytes to str
            websocket = app.sockets.get(ws_id)
            if websocket is not None:
                websocket = websocket['websocket']
                try:
                    _state = await app.redis.get(f'state:{ws_id}')
                    # Check the state of the WebSocket connection
                    if _state.decode() == 'true':
                        log.info("[WEBSOCKET] Sending user count...")
                        await websocket.send_json({'type': 'user_count', 'count': data_json['count'], 'users_data': data_json['users_data']})
                        log.info("[WEBSOCKET] User count sent!")
                except Exception as e:
                    log.warning(f"Failed to send user count: {e}")
                    
    async def send_notification(self, app: Quart, log: logging.Logger, data_json: dict):
        ws_id = data_json['ws_id']
        websocket_info = app.sockets.get(ws_id)
        try:
            _state = await app.redis.get(f'state:{ws_id}')
            # Check the state of the WebSocket connection
            if _state.decode() == 'true':
                log.info("[WEBSOCKET] Sending notification...")
                try:
                    await websocket_info['websocket'].send_json(data_json)
                    log.info("[WEBSOCKET] Notification sent!")
                except Exception as e:
                    log.warning(f"Failed to send notification: {e}")
        except Exception as e:
            log.warning(f"Failed to send notification: {e}")