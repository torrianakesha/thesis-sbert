from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import create_engine, Column, Integer, String, JSON
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from pydantic import BaseModel
import requests
from bs4 import BeautifulSoup
import os
from typing import List, Optional, Dict
from gemini import GeminiAPI  # We'll create this file next
import pandas as pd

app = FastAPI()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for development
    allow_credentials=True,
    allow_methods=["*"],  # Allow all methods
    allow_headers=["*"],  # Allow all headers
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

# Pydantic Models
class UserBase(BaseModel):
    username: str
    email: str

class UserCreate(UserBase):
    password: str
    skills: List[str]

class UserLogin(BaseModel):
    username: str
    password: str

class UserResponse(UserBase):
    id: int
    skills: List[str]

    class Config:
        from_attributes = True

class HackathonRecommendation(BaseModel):
    title: str
    description: str
    requirements: List[str]
    prize: str
    criteria: str
    deadline: str
    keywords: List[str]
    match_score: float

# Add new Pydantic model for user updates
class UserUpdate(BaseModel):
    username: Optional[str] = None
    skills: Optional[List[str]] = None

# Dependencies
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# API Routes
@app.post("/users/", response_model=UserResponse)
async def create_user(user: UserCreate, db: Session = Depends(get_db)):
    try:
        print(f"Attempting to create user: {user.username}")  # Debug log
        
        # Check if username already exists
        db_user = db.query(User).filter(User.username == user.username).first()
        if db_user:
            raise HTTPException(status_code=400, detail="Username already registered")

        # Check if email already exists
        db_user = db.query(User).filter(User.email == user.email).first()
        if db_user:
            raise HTTPException(status_code=400, detail="Email already registered")

        # Create new user
        db_user = User(
            username=user.username,
            email=user.email,
            password=user.password,  # In production, hash the password
            skills=user.skills
        )
        db.add(db_user)
        db.commit()
        db.refresh(db_user)
        print(f"Successfully created user: {db_user.username}")  # Debug log
        return db_user
    except Exception as e:
        print(f"Error creating user: {str(e)}")  # Debug log
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/login")
async def login(user_data: UserLogin, db: Session = Depends(get_db)):
    print(f"Login attempt for user: {user_data.username}")  # Debug log
    user = db.query(User).filter(User.username == user_data.username).first()
    if not user or user.password != user_data.password:  # In production, use proper password hashing
        raise HTTPException(status_code=401, detail="Invalid username or password")
    print(f"Successful login for user: {user.username}")  # Debug log
    return {"id": user.id, "username": user.username}

@app.get("/recommendations/{user_id}", response_model=List[HackathonRecommendation])
async def get_recommendations(user_id: int, db: Session = Depends(get_db)):
    try:
        # Get user skills
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        print(f"Found user {user_id} with skills: {user.skills}")  # Debug log
        
        if not user.skills or len(user.skills) == 0:
            raise HTTPException(status_code=400, detail="User has no skills specified")
        
        # Initialize Gemini API
        gemini_api = GeminiAPI()
        
        # Get hackathons from CSV
        hackathons = await get_hackathons_from_csv()
        if not hackathons:
            raise HTTPException(status_code=404, detail="No hackathons found in database")
        
        print(f"Loaded {len(hackathons)} hackathons from CSV")  # Debug log
        
        # Use Gemini to analyze and match hackathons with user skills
        recommendations = gemini_api.analyze_hackathons(hackathons, user.skills)
        print(f"Generated {len(recommendations)} recommendations")  # Debug log
        
        if not recommendations:
            print("No matches found between user skills and hackathons")  # Debug log
        
        return recommendations
    except Exception as e:
        print(f"Error in get_recommendations: {e}")
        raise HTTPException(status_code=500, detail=str(e))

async def get_hackathons_from_csv():
    try:
        # Get the absolute path to the CSV file
        current_dir = os.path.dirname(os.path.abspath(__file__))
        csv_path = os.path.join(current_dir, 'Hackathons.csv')
        
        if not os.path.exists(csv_path):
            raise FileNotFoundError(f"CSV file not found at {csv_path}")
        
        df = pd.read_csv(csv_path, encoding='utf-8')
        
        hackathons = []
        for _, row in df.iterrows():
            try:
                # Clean and process the data
                requirements = []
                if pd.notna(row['Requirements']):
                    requirements = [r.strip() for r in str(row['Requirements']).split(',') if r.strip()]

                keywords = []
                if pd.notna(row['Keywords']):
                    keywords = [k.strip() for k in str(row['Keywords']).split(',') if k.strip()]

                description = str(row['Description']).strip() if pd.notna(row['Description']) else ""
                
                hackathon = {
                    "title": str(row['Title']).strip() if pd.notna(row['Title']) else "No Title",
                    "description": description,
                    "requirements": requirements,
                    "prize": str(row['Prize']).strip() if pd.notna(row['Prize']) else "Not specified",
                    "criteria": str(row['Criteria']).strip() if pd.notna(row['Criteria']) else "",
                    "deadline": str(row['Deadline']).strip() if pd.notna(row['Deadline']) else "No deadline specified",
                    "keywords": keywords,
                    "full_text": f"""
                    {description}
                    Requirements: {', '.join(requirements)}
                    Keywords: {', '.join(keywords)}
                    """
                }
                hackathons.append(hackathon)
            except Exception as e:
                continue
        
        return hackathons
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/users/{user_id}", response_model=UserResponse)
def update_user(user_id: int, user_update: UserUpdate, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if user_update.username is not None:
        db_user.username = user_update.username
    if user_update.skills is not None:
        db_user.skills = user_update.skills
    
    try:
        db.commit()
        db.refresh(db_user)
        return db_user
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/users/{user_id}", response_model=UserResponse)
def get_user(user_id: int, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    return db_user

@app.get("/test-csv")
async def test_csv():
    try:
        hackathons = await get_hackathons_from_csv()
        return {
            "status": "success",
            "count": len(hackathons),
            "hackathons": hackathons
        }
    except Exception as e:
        return {
            "status": "error",
            "message": str(e)
        }

if __name__ == "__main__":
    import uvicorn
    print("Starting FastAPI server...")  # Add debugging
    uvicorn.run(app, host="0.0.0.0", port=8000)
