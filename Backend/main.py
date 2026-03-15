from dotenv import load_dotenv
from fastapi import FastAPI
import os
import hashlib

load_dotenv()

app = FastAPI(root_path="/api")

@app.get("/")
async def root():
    return {"message": "Hello World"}