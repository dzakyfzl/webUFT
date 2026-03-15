import authlib.jose
from dotenv import load_dotenv
import os 
from datetime import datetime, timezone, timedelta
import time

load_dotenv()

SECRET_KEY=os.getenv("SECRET_KEY")
ACCESS_TOKEN_EXPIRE_MINUTE=os.getenv("ACCESS_TOKEN_EXPIRE_MINUTE")
REFRESH_TOKEN_EXPIRE_DAYS = os.getenv("REFRESH_TOKEN_EXPIRE_DAYS")
ALGORITHM = "HS256"

def decode_token(token: str) -> dict | None:
    """
        Decode and verifies the token (Refresh and Access)
    """
    try:
        payload = authlib.jose.jwt.decode(token, SECRET_KEY)
        
        return payload
    
    except authlib.jose.JoseError as e:
        return None


def create_access_token(username:str,role:str) -> str:
    """
        Create access token based on JWT

        Access token are short expiring time to access content, it within 2-10 minute. as the token expire, user need to take other token with refresh token
    """
    expire = datetime.now(timezone.utc) + timedelta(minutes=int(ACCESS_TOKEN_EXPIRE_MINUTE))
    payload = {
        "sub": username,  
        "iat": int(time.time()),      
        "exp": int(expire.timestamp()),
        "role":role,
        "type":"Access"
    }
    header = {"alg": ALGORITHM}
    try:
        token = authlib.jose.jwt.encode(header, payload, SECRET_KEY)
        return token.decode('utf-8')
    except authlib.jose.JoseError as e:
        return "Error"

def create_refresh_token(username:str,role:str) -> str:
    """
        Create refresh token based on JWT

        Refresh token are long expiring time as user to stay log in, it within 10-30 days. as the token expire, user need to re-sign in to the account
    """
    expire = datetime.now(timezone.utc) + timedelta(days=int(REFRESH_TOKEN_EXPIRE_DAYS))
    

    payload = {
        "sub": username,  
        "iat": int(time.time()),      
        "exp": int(expire.timestamp()),
        "role":role,
        "type":"Refresh"
    }
    header = {"alg": ALGORITHM}
    try:
        token = authlib.jose.jwt.encode(header, payload, SECRET_KEY)
        return token.decode('utf-8')
    except authlib.jose.JoseError as e:
        print("ERROR : ",e)
        return "Error"