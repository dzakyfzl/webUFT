import hashlib

def check_password_hash(hashed_password: str, password: str, salt: str) -> bool:
    return hashlib.sha256((password + salt).encode()).hexdigest() == hashed_password