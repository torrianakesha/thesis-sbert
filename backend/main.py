from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import Column, Integer, String, JSON, create_engine
from sqlalchemy.orm import sessionmaker, Session, declarative_base
from passlib.context import CryptContext
from typing import List
from contextlib import asynccontextmanager
import pandas as pd
import os

from sbert import SBERTModel  # ✅ Your model logic

# Password hashing setup
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Database setup
Base = declarative_base()
DATABASE_URL = "sqlite:///./hackathon_app.db"
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)

# Global model & cache
bert_model = None
hackathons_cache = None

# ✅ Function to load and clean CSV data
def load_raw_hackathons(csv_name: str):
    csv_path = os.path.join(os.path.dirname(__file__), csv_name)
    if not os.path.exists(csv_path):
        raise FileNotFoundError(f"CSV file not found: {csv_path}")

    df = pd.read_csv(csv_path, encoding="utf-8")

    # Normalize column names
    df.columns = [col.strip().lower() for col in df.columns]

    # Optional renaming
    if "desc" in df.columns and "description" not in df.columns:
        df.rename(columns={"desc": "description"}, inplace=True)
    if "name" in df.columns and "title" not in df.columns:
        df.rename(columns={"name": "title"}, inplace=True)

    # Validate required columns
    required = {"title", "description"}
    if not required.issubset(set(df.columns)):
        raise ValueError(f"Missing required columns: {required - set(df.columns)}")

    df.dropna(subset=["title", "description"], inplace=True)
    df.drop_duplicates(subset=["title", "description"], inplace=True)

    return df.to_dict(orient="records")

# ✅ FastAPI app with lifespan handler
@asynccontextmanager
async def lifespan(app: FastAPI):
    global bert_model, hackathons_cache
    try:
        print("📂 Loading hackathons...")
        hackathons_cache = load_raw_hackathons("Final Hackathon Dataset.csv")
        print(f"✅ {len(hackathons_cache)} hackathons loaded")

        print("🚀 Loading SBERT model...")
        bert_model = SBERTModel()
        print("✅ SBERT model initialized")

        with engine.begin() as conn:
            Base.metadata.create_all(bind=conn)

        yield  # Important for FastAPI lifespan
    except Exception as e:
        print(f"❌ Startup error: {e}")
        yield  # Prevent FastAPI crash

app = FastAPI(lifespan=lifespan)

# ✅ Enable CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust for deployment
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ✅ SQLAlchemy user model
class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    email = Column(String, unique=True, index=True)
    password = Column(String)
    skills = Column(JSON)

# ✅ Dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# ✅ Register
@app.post("/users/")
async def create_user(user_data: dict, db: Session = Depends(get_db)):
    existing = db.query(User).filter(
        (User.username == user_data["username"]) |
        (User.email == user_data["email"])
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Username or email already exists.")

    hashed = pwd_context.hash(user_data["password"])
    new_user = User(
        username=user_data["username"],
        email=user_data["email"],
        password=hashed,
        skills=user_data.get("skills", [])
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return {"id": new_user.id, "username": new_user.username}

# ✅ Login
@app.post("/login")
async def login(user_data: dict, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == user_data["username"]).first()
    if not user or not pwd_context.verify(user_data["password"], user.password):
        raise HTTPException(status_code=401, detail="Invalid credentials.")
    return {"id": user.id, "username": user.username}

# ✅ Get User
@app.get("/users/{user_id}")
async def get_user(user_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    return {
        "username": user.username,
        "email": user.email,
        "skills": user.skills
    }

# ✅ Update User
@app.put("/users/{user_id}")
async def update_user(user_id: int, user_data: dict, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    if "username" in user_data:
        user.username = user_data["username"]
    if "skills" in user_data:
        user.skills = user_data["skills"]

    db.commit()
    return {
        "username": user.username,
        "email": user.email,
        "skills": user.skills
    }

# ✅ Recommendations
@app.get("/recommendations/{user_id}")
async def get_recommendations(user_id: int, db: Session = Depends(get_db)):
    global bert_model, hackathons_cache

    if bert_model is None or hackathons_cache is None:
        raise HTTPException(status_code=500, detail="Model or data not initialized.")

    user = db.query(User).filter(User.id == user_id).first()
    if not user or not user.skills:
        raise HTTPException(status_code=404, detail="User not found or missing skills.")

    try:
        recommendations = bert_model.analyze_hackathons(hackathons_cache, user.skills)
        return JSONResponse(content=recommendations)
    except Exception as e:
        print(f"❌ Recommendation failed: {e}")
        raise HTTPException(status_code=500, detail=f"Service error: {e}")

# ✅ Local Dev Server
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
