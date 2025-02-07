from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import create_engine, Column, Integer, String, JSON
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from pydantic import BaseModel
from typing import List, Optional, Dict
import os
from gemini import GeminiAPI
from scraper import DevpostScraper
import asyncio

app = FastAPI()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Database configuration
SQLALCHEMY_DATABASE_URL = "sqlite:///./hackathon_app.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Database Models
class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    email = Column(String, unique=True, index=True)
    password = Column(String)
    skills = Column(JSON)

# Create database tables
Base.metadata.create_all(bind=engine)

# Dependencies
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

async def get_hackathons_from_devpost() -> List[Dict]:
    scraper = DevpostScraper()
    return await scraper.get_hackathons()

@app.post("/users/", response_model=dict)
async def create_user(user_data: dict, db: Session = Depends(get_db)):
    try:
        db_user = User(
            username=user_data["username"],
            email=user_data["email"],
            password=user_data["password"],
            skills=user_data["skills"]
        )
        db.add(db_user)
        db.commit()
        db.refresh(db_user)
        return {"id": db_user.id, "username": db_user.username}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/login")
async def login(user_data: dict, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == user_data["username"]).first()
    if not user or user.password != user_data["password"]:
        raise HTTPException(status_code=401, detail="Invalid username or password")
    return {"id": user.id, "username": user.username}

@app.get("/recommendations/{user_id}")
async def get_recommendations(user_id: int, db: Session = Depends(get_db)):
    try:
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        if not user.skills:
            raise HTTPException(status_code=400, detail="User has no skills specified")
        
        gemini_api = GeminiAPI()
        
        # Get hackathons from Devpost
        devpost_hackathons = await get_hackathons_from_devpost()
        
        if not devpost_hackathons:
            raise HTTPException(status_code=404, detail="No hackathons found")
        
        recommendations = gemini_api.analyze_hackathons(devpost_hackathons, user.skills)
        return recommendations
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/users/{user_id}")
async def get_user(user_id: int, db: Session = Depends(get_db)):
    try:
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        return {
            "username": user.username,
            "email": user.email,
            "skills": user.skills
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 