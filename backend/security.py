import jwt
from datetime import datetime, timedelta
from typing import Optional
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from database import get_db
import models
from google.oauth2 import id_token
from google.auth.transport import requests

SECRET_KEY = "business-os-master-key-secure"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7 # 1 week token

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def get_current_user(db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.role == 'admin').first()
    if not user:
        user = models.User(username="admin", role="admin", hashed_password="NA")
        db.add(user)
        db.commit()
        db.refresh(user)
    return user

def require_admin(current_user: models.User = Depends(get_current_user)):
    if current_user.role != 'admin':
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin Privileges Required")
    return current_user

def verify_google_token(token: str, client_id: str):
    try:
        idinfo = id_token.verify_oauth2_token(token, requests.Request(), client_id)
        return idinfo
    except ValueError:
        return None
