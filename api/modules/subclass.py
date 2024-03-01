from __future__ import annotations
import aiohttp
from fastapi import Depends, HTTPException, FastAPI
import json
import settings as _APIconst
import asyncpg
import asyncio
import settings as _APIconst
from redis import asyncio as aioredis
from fastapi import FastAPI, HTTPException
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from datetime import datetime
import json
import logging

log = logging.getLogger(__name__)
log.setLevel(logging.INFO)
hand = logging.StreamHandler()
hand.setLevel(logging.INFO)
log.addHandler(hand)

class Tarly(FastAPI):
    def __init__(self, *, loop: asyncio.AbstractEventLoop | None = None, pool: asyncpg.Pool | None = None):
        self.loop: asyncio.AbstractEventLoop = loop or asyncio.get_event_loop_policy().get_event_loop()
        self.redis: aioredis.Redis = None
        self.pool: asyncpg.Pool = pool or None
        self.session: aiohttp.ClientSession = None
        super().__init__(
            title="tarly.gg API",
            description=_APIconst.API_DOCS_DESCRIPTION,
            summary="Private API for tarly.gg. No public documentation is available.",
            version="1.0.0",
            terms_of_service="http://tarly.gg/terms/",
            redoc_url="/",
            docs_url="/docs",
            contact={
                "name": "Support",
                "url": "http://tarly.gg/contact/",
                "email": "help@tarly.gg",
            }
        )

        self.add_event_handler("startup", func=self.app_startup)

    async def app_startup(self):
        self.redis = await aioredis.from_url("redis://localhost:6379")
        self.pool = await asyncpg.create_pool(_APIconst.DATABASE_URL)
        log.info(f"[DATABASE] Connected: {self.pool}")
        self.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
        self.session = aiohttp.ClientSession()