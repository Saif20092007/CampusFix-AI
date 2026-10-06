import os
import time
import bcrypt
from collections import defaultdict
from datetime import datetime, timedelta
from typing import List, Optional
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User

JWT_SECRET = os.getenv("JWT_SECRET", "campusfix_jwt_super_secret_key_2026")
JWT_ALGORITHM = "HS256"
JWT_EXPIRE_MINUTES = int(os.getenv("JWT_EXPIRE_MINUTES", "480"))

security_scheme = HTTPBearer(auto_error=False)

# --- Password Hashing using direct bcrypt ---
def hash_password(password: str) -> str:
    salt = bcrypt.gensalt(rounds=10)
    hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
    return hashed.decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))
    except Exception:
        return False

# --- JWT Generation & Verification ---
def create_access_token(user_id: int) -> str:
    expires_delta = timedelta(minutes=JWT_EXPIRE_MINUTES)
    expire = datetime.utcnow() + expires_delta
    payload = {
        "user_id": user_id,
        "exp": expire
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_scheme),
    db: Session = Depends(get_db)
) -> User:
    if not credentials or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid authorization token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    token = credentials.credentials
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id: Optional[int] = payload.get("user_id")
        if user_id is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token payload",
            )
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token is expired or invalid",
        )

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account not found",
        )
    return user

def require_role(allowed_roles: List[str]):
    def role_checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient operational permissions",
            )
        return current_user
    return role_checker

# --- In-Memory Rate Limiter ---
class InMemoryRateLimiter:
    def __init__(self, requests_per_minute: int = 30):
        self.requests_per_minute = requests_per_minute
        self.history = defaultdict(list)

    def check(self, request: Request, identifier: str = ""):
        client_ip = request.client.host if request.client else "127.0.0.1"
        key = f"{client_ip}:{identifier}"
        now = time.time()
        window_start = now - 60

        self.history[key] = [t for t in self.history[key] if t > window_start]

        if len(self.history[key]) >= self.requests_per_minute:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Rate limit exceeded. Please wait before retrying.",
            )
        self.history[key].append(now)

login_rate_limiter = InMemoryRateLimiter(requests_per_minute=20)
register_rate_limiter = InMemoryRateLimiter(requests_per_minute=10)
analyze_rate_limiter = InMemoryRateLimiter(requests_per_minute=20)
