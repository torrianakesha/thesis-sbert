import google.generativeai as genai
from typing import List, Dict
import os
from dotenv import load_dotenv
import re
from collections import Counter
import spacy
from backend.sbert import SBERTModel
from functools import lru_cache

# Load environment variables from .env file
load_dotenv()

class GeminiAPI:
    def __init__(self):
        # Initialize the Gemini API with your API key
        api_key = os.getenv('GOOGLE_API_KEY')
        if not api_key:
            raise ValueError("GOOGLE_API_KEY environment variable is not set")
        
        genai.configure(api_key=api_key)
        self.model = genai.GenerativeModel('gemini-pro')
        
        # Load spaCy model for better text processing
        try:
            self.nlp = spacy.load('en_core_web_sm')
        except:
            os.system('python -m spacy download en_core_web_sm')
            self.nlp = spacy.load('en_core_web_sm')
        
        # Initialize SBERT model
        self.sbert = SBERTModel()
        
        # Update tech keywords to match your CSV data
        self.tech_keywords = {
            "web": ["html", "css", "javascript", "react", "angular", "vue", "node", "express", "django", "flask"],
            "mobile": ["android", "ios", "flutter", "react native", "swift", "kotlin"],
            "ai": ["machine learning", "deep learning", "neural networks", "tensorflow", "pytorch", "scikit-learn"],
            "cloud": ["aws", "azure", "gcp", "docker", "kubernetes", "serverless"],
            "blockchain": ["ethereum", "solidity", "smart contracts", "web3", "defi"],
            "data": ["sql", "nosql", "mongodb", "postgresql", "data analysis", "data science"],
            "security": ["cybersecurity", "penetration testing", "encryption", "authentication", "authorization"]
        }

    @lru_cache(maxsize=1000)
    def extract_keywords(self, text: str) -> List[str]:
        """Extract keywords from text with caching"""
        if not text:
            return []
        
        doc = self.nlp(text.lower())
        keywords = set()
        
        # Extract named entities and noun phrases
        for ent in doc.ents:
            if ent.label_ in ['ORG', 'PRODUCT', 'TECH']:
                keywords.add(ent.text.lower())
        
        for chunk in doc.noun_chunks:
            keywords.add(chunk.text.lower())
        
        # Extract technical terms
        for token in doc:
            if token.pos_ in ['NOUN', 'PROPN'] and len(token.text) > 2:
                keywords.add(token.text.lower())
        
        return list(keywords)

    def calculate_match_score(self, hackathon_keywords: List[str], user_skills: List[str]) -> Dict:
        # Convert everything to lowercase and clean
        hackathon_keywords = [k.lower().strip() for k in hackathon_keywords if k]
        user_skills = [s.lower().strip() for s in user_skills if s]
        
        if not hackathon_keywords or not user_skills:
            return {
                "match_score": 0.0,
                "sbert_similarity": 0.0,
                "skill_matches": {},
                "precision": 0.0,
                "recall": 0.0,
                "f1_score": 0.0
            }
        
        # Use SBERT to analyze skill matches
        sbert_results = self.sbert.analyze_skill_matches(user_skills, hackathon_keywords)
        
        # Calculate traditional match score
        expanded_skills = set()
        for skill in user_skills:
            expanded_skills.add(skill)
            for category, terms in self.tech_keywords.items():
                if skill in terms or skill == category or any(term in skill for term in terms):
                    expanded_skills.update(terms)
        
        # Calculate matches
        matches = set(hackathon_keywords) & expanded_skills
        
        # Base score on direct matches
        base_score = len(matches) / max(len(hackathon_keywords), 1)
        
        # Bonus for matching important skills
        bonus = 0
        for skill in matches:
            if any(term in skill for term in ['ai', 'machine learning', 'cloud', 'blockchain', 'security']):
                bonus += 0.1
            elif any(term in skill for term in ['web', 'mobile', 'fullstack', 'frontend', 'backend']):
                bonus += 0.05
        
        final_score = min(1.0, base_score + bonus)
        
        # Combine traditional score with SBERT score
        combined_score = (final_score + sbert_results['overall_similarity']) / 2
        
        return {
            "match_score": combined_score,
            "sbert_similarity": sbert_results['overall_similarity'],
            "skill_matches": sbert_results['skill_matches'],
            "precision": sbert_results['precision'],
            "recall": sbert_results['recall'],
            "f1_score": sbert_results['f1_score']
        }

    def analyze_hackathons(self, hackathons: List[Dict], user_skills: List[str]) -> List[Dict]:
        recommendations = []
        
        for hackathon in hackathons:
            try:
                # Extract keywords from hackathon description and other fields
                predefined_keywords = hackathon.get('keywords', [])
                extracted_keywords = self.extract_keywords(hackathon['full_text'])
                requirement_keywords = []
                
                for req in hackathon.get('requirements', []):
                    requirement_keywords.extend(self.extract_keywords(req))
                
                # Combine all keywords
                all_keywords = list(set(
                    predefined_keywords + 
                    extracted_keywords + 
                    requirement_keywords
                ))
                
                # Calculate match score with SBERT integration
                match_results = self.calculate_match_score(all_keywords, user_skills)
                
                # Only include hackathons with some skill match
                if match_results["match_score"] > 0:
                    recommendations.append({
                        "title": hackathon["title"],
                        "description": hackathon["description"],
                        "requirements": hackathon.get('requirements', []),
                        "prize": hackathon.get('prize', "Not specified"),
                        "criteria": hackathon.get('criteria', ""),
                        "deadline": hackathon.get('deadline', "No deadline specified"),
                        "keywords": all_keywords,
                        "match_score": match_results["match_score"],
                        "evaluation_metrics": {
                            "precision": match_results["precision"],
                            "recall": match_results["recall"],
                            "f1_score": match_results["f1_score"],
                            "cosine_similarity": match_results["sbert_similarity"],
                            "accuracy": match_results["match_score"]
                        },
                        "skill_matches": match_results["skill_matches"]
                    })
            except Exception as e:
                print(f"Error processing hackathon: {e}")
                continue
        
        # Sort recommendations by match score
        recommendations.sort(key=lambda x: x["match_score"], reverse=True)
        return recommendations[:5]  # Return top 5 recommendations