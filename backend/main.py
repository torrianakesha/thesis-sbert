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
import numpy as np
import re

from sbert import SBERTModel  # Your model logic

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

# Function to load and clean CSV data
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

# FastAPI app with lifespan handler
@asynccontextmanager
async def lifespan(app: FastAPI):
    global bert_model, hackathons_cache
    try:
        print("📂 Loading hackathons...")
        hackathons_cache = load_raw_hackathons("Final Hackathon Dataset.csv")
        print(f" {len(hackathons_cache)} hackathons loaded")

        print("Loading SBERT model...")
        bert_model = SBERTModel()
        print("SBERT model initialized")

        with engine.begin() as conn:
            Base.metadata.create_all(bind=conn)

        yield  # Important for FastAPI lifespan
    except Exception as e:
        print(f"Startup error: {e}")
        yield  # Prevent FastAPI crash

app = FastAPI(lifespan=lifespan)

# Enable CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust for deployment
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# SQLAlchemy user model
class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    email = Column(String, unique=True, index=True)
    password = Column(String)
    skills = Column(JSON)

# Dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Register
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

# Login
@app.post("/login")
async def login(user_data: dict, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == user_data["username"]).first()
    if not user or not pwd_context.verify(user_data["password"], user.password):
        raise HTTPException(status_code=401, detail="Invalid credentials.")
    return {"id": user.id, "username": user.username}

# Get User
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

# Update User
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

# Recommendations
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

# Text Truncation Visualization
@app.post("/text-truncation")
async def visualize_truncation(request_data: dict):
    try:
        text = request_data.get("text", "")
        max_length = request_data.get("max_length", 100)
        truncation_method = request_data.get("method", "simple")
        
        if not text:
            return JSONResponse(content={"error": "No text provided"}, status_code=400)
        
        # Method 1: Simple truncation
        simple_truncated = text[:max_length] + "..." if len(text) > max_length else text
        
        # Method 2: Word-aware truncation (don't break words)
        words = text.split()
        word_truncated = ""
        char_count = 0
        
        for word in words:
            if char_count + len(word) + 1 <= max_length:  # +1 for space
                word_truncated += word + " "
                char_count += len(word) + 1
            else:
                break
        
        word_truncated = word_truncated.strip() + "..." if len(text) > max_length else word_truncated.strip()
        
        # Method 3: Sentence-aware truncation
        sentences = re.split(r'(?<=[.!?])\s+', text)
        sentence_truncated = ""
        char_count = 0
        
        for sentence in sentences:
            if char_count + len(sentence) + 1 <= max_length:  # +1 for space
                sentence_truncated += sentence + " "
                char_count += len(sentence) + 1
            else:
                break
        
        sentence_truncated = sentence_truncated.strip() + "..." if len(text) > max_length else sentence_truncated.strip()
        
        # Calculate tokens and info about each truncation method
        def estimate_tokens(txt):
            # Simple tokenization estimate (better than just len/4)
            return len(txt.split())
        
        # Get visualization data for each method
        visualization_data = {
            "original": {
                "text": text,
                "length": len(text),
                "tokens": estimate_tokens(text),
                "sentences": len(sentences),
                "words": len(words)
            },
            "sliding_window": {
                "text": word_truncated,  # Using word_truncated as sliding window
                "length": len(word_truncated),
                "tokens": estimate_tokens(word_truncated),
                "reduction_percent": round((1 - len(word_truncated) / len(text)) * 100, 2) if len(text) > 0 else 0,
                "pooling_metrics": {
                    "mean_pooling": 0.0,
                    "attention_pooling": 0.0
                }
            },
            "sentence": {
                "text": sentence_truncated,
                "length": len(sentence_truncated),
                "tokens": estimate_tokens(sentence_truncated),
                "reduction_percent": round((1 - len(sentence_truncated) / len(text)) * 100, 2) if len(text) > 0 else 0
            },
            "sbert_viz": {
                "text": sentence_truncated,  # Use sentence truncation as base
                "length": len(sentence_truncated),
                "tokens": estimate_tokens(sentence_truncated),
                "chunks": re.split(r'(?<=[.!?])\s+', text)[:10],  # First 10 sentences as chunks
                "embeddings_preview": [[0.1, 0.2, -0.3, 0.4, -0.5, 0.6, -0.7, 0.8] for _ in range(min(10, len(re.split(r'(?<=[.!?])\s+', text))))],
                "reduction_percent": round((1 - len(sentence_truncated) / len(text)) * 100, 2) if len(text) > 0 else 0
            }
        }
        
        # Optional: If SBERT model is available, add embedding info
        if bert_model:
            # Original text embedding
            original_embedding = bert_model.encode_text(text)
            
            # Get embeddings for each truncated version
            word_embedding = bert_model.encode_text(word_truncated)
            sentence_embedding = bert_model.encode_text(sentence_truncated)
            
            # Calculate cosine similarity to original
            def cosine_similarity(a, b):
                denominator = np.linalg.norm(a) * np.linalg.norm(b)
                if denominator > 0:
                    return np.dot(a, b) / denominator
                return 0.0
            
            # Mean pooling calculation
            def calculate_mean_pooling(original_text, truncated_text):
                # Split into sentences
                original_sentences = re.split(r'(?<=[.!?])\s+', original_text)
                truncated_sentences = re.split(r'(?<=[.!?])\s+', truncated_text)
                
                # Encode each sentence
                original_sentence_embeddings = [bert_model.encode_text(s) for s in original_sentences]
                truncated_sentence_embeddings = [bert_model.encode_text(s) for s in truncated_sentences]
                
                # Mean pooling: average of sentence embeddings
                if original_sentence_embeddings:
                    original_mean = np.mean(original_sentence_embeddings, axis=0)
                else:
                    original_mean = np.zeros(bert_model.model.get_sentence_embedding_dimension())
                    
                if truncated_sentence_embeddings:
                    truncated_mean = np.mean(truncated_sentence_embeddings, axis=0)
                else:
                    truncated_mean = np.zeros(bert_model.model.get_sentence_embedding_dimension())
                
                # Calculate similarity between mean pooled embeddings
                return cosine_similarity(original_mean, truncated_mean)
            
            # Attention pooling calculation (query-aware)
            def calculate_attention_pooling(original_text, truncated_text):
                # Use truncated text as the query
                query_embedding = bert_model.encode_text(truncated_text)
                
                # Split original text into sentences
                original_sentences = re.split(r'(?<=[.!?])\s+', original_text)
                sentence_embeddings = [bert_model.encode_text(s) for s in original_sentences]
                
                # Calculate attention scores (similarity between query and each sentence)
                attention_scores = []
                for emb in sentence_embeddings:
                    sim = cosine_similarity(query_embedding, emb)
                    attention_scores.append(max(0.0, sim))  # Ensure non-negative
                
                # Normalize attention scores
                total_score = sum(attention_scores)
                if total_score > 0:
                    attention_scores = [score / total_score for score in attention_scores]
                else:
                    # Equal weights if all similarities are 0
                    attention_scores = [1.0 / len(sentence_embeddings) if len(sentence_embeddings) > 0 else 0.0] * len(sentence_embeddings)
                
                # Weighted sum of sentence embeddings
                attended_embedding = np.zeros(bert_model.model.get_sentence_embedding_dimension())
                for i, emb in enumerate(sentence_embeddings):
                    attended_embedding += attention_scores[i] * emb
                
                # Calculate similarity between query and attention-pooled embedding
                return cosine_similarity(query_embedding, attended_embedding)
            
            # Calculate pooling metrics
            mean_pooling_score = calculate_mean_pooling(text, word_truncated)
            attention_pooling_score = calculate_attention_pooling(text, word_truncated)
            
            # Add pooling metrics
            visualization_data["sliding_window"]["pooling_metrics"] = {
                "mean_pooling": float(round(mean_pooling_score, 4)),
                "attention_pooling": float(round(attention_pooling_score, 4))
            }
            
            visualization_data["semantic"] = {
                "word_similarity": float(round(cosine_similarity(original_embedding, word_embedding), 4)),
                "sentence_similarity": float(round(cosine_similarity(original_embedding, sentence_embedding), 4)),
                "sbert_similarity": float(round(cosine_similarity(original_embedding, sentence_embedding), 4)) # Using sentence embedding for SBERT too
            }
            
            # If SBERT is available, enhance the SBERT visualization with real embeddings
            real_chunks = re.split(r'(?<=[.!?])\s+', text)[:10]
            chunk_embeddings = [bert_model.encode_text(chunk) for chunk in real_chunks]
            
            # For visualization, we'll use a small subset of the embedding dimensions
            embedding_preview = []
            for emb in chunk_embeddings:
                # Take a few dimensions for preview
                preview = emb[:8].tolist() if len(emb) >= 8 else emb.tolist()
                embedding_preview.append(preview)
                
            visualization_data["sbert_viz"]["embeddings_preview"] = embedding_preview
            visualization_data["sbert_viz"]["chunks"] = real_chunks
        
        return JSONResponse(content=visualization_data)
    except Exception as e:
        print(f"Truncation visualization failed: {str(e)}")
        return JSONResponse(
            content={"error": f"Failed to process: {str(e)}"}, 
            status_code=500
        )

# Local Dev Server
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
