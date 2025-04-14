import google.generativeai as genai
from typing import List, Dict
import os
from dotenv import load_dotenv
import re
from collections import Counter
import spacy

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
        
        # Update tech keywords to match your CSV data
        self.tech_keywords = {
            'python': ['python', 'django', 'flask', 'fastapi', 'pytorch', 'tensorflow', 'pandas', 'numpy'],
            'javascript': ['javascript', 'js', 'node.js', 'react', 'vue', 'angular', 'typescript', 'frontend'],
            'web': ['web', 'frontend', 'backend', 'fullstack', 'html', 'css', 'web development'],
            'mobile': ['mobile', 'ios', 'android', 'react native', 'flutter', 'app development'],
            'ai': ['ai', 'artificial intelligence', 'machine learning', 'ml', 'deep learning', 'nlp'],
            'data': ['data science', 'data analysis', 'big data', 'data visualization', 'analytics'],
            'cloud': ['aws', 'azure', 'gcp', 'cloud computing', 'serverless', 'cloud'],
            'devops': ['devops', 'docker', 'kubernetes', 'ci/cd', 'jenkins', 'deployment'],
            'blockchain': ['blockchain', 'web3', 'smart contracts', 'cryptocurrency', 'crypto'],
            'security': ['cybersecurity', 'security', 'encryption', 'authentication', 'privacy'],
            'game': ['game development', 'unity', 'unreal', 'gaming', 'game design'],
            'ar/vr': ['augmented reality', 'virtual reality', 'ar', 'vr', 'mixed reality'],
            'iot': ['internet of things', 'iot', 'embedded systems', 'hardware'],
            'ui/ux': ['ui design', 'ux design', 'user interface', 'user experience', 'design'],
            'database': ['sql', 'mongodb', 'postgresql', 'mysql', 'database', 'nosql'],
        }

    def extract_keywords(self, text: str) -> List[str]:
        # Process text with spaCy
        doc = self.nlp(text.lower())
        
        # Extract noun phrases and technical terms
        keywords = []
        
        # Extract from noun chunks
        for chunk in doc.noun_chunks:
            keywords.append(chunk.text)
        
        # Add individual technical terms
        for token in doc:
            if token.pos_ in ['NOUN', 'PROPN'] and len(token.text) > 2:
                keywords.append(token.text)
        
        # Match with known technology categories
        tech_matches = []
        for category, terms in self.tech_keywords.items():
            for term in terms:
                if term in text.lower():
                    tech_matches.append(category)
                    # Also add the specific term that matched
                    tech_matches.append(term)
                    break
        
        # Combine and deduplicate
        all_keywords = list(set(keywords + tech_matches))
        
        # Filter out common non-technical words
        filtered_keywords = [k for k in all_keywords if len(k) > 2]  # Filter out short words
        
        return filtered_keywords

    def calculate_match_score(self, hackathon_keywords: List[str], user_skills: List[str]) -> float:
        # Convert everything to lowercase and clean
        hackathon_keywords = [k.lower().strip() for k in hackathon_keywords if k]
        user_skills = [s.lower().strip() for s in user_skills if s]
        
        # Expand user skills with related terms
        expanded_skills = set()
        for skill in user_skills:
            expanded_skills.add(skill)
            # Add related terms from tech_keywords
            for category, terms in self.tech_keywords.items():
                if skill in terms or skill == category or any(term in skill for term in terms):
                    expanded_skills.update(terms)
        
        # Calculate matches
        matches = set(hackathon_keywords) & expanded_skills
        
        if not hackathon_keywords:
            return 0.0
        
        # Base score on direct matches
        base_score = len(matches) / max(len(hackathon_keywords), 1)
        
        # Bonus for matching important skills
        bonus = 0
        for skill in matches:
            # Give higher weight to AI/ML, cloud, and other advanced skills
            if any(term in skill for term in ['ai', 'machine learning', 'cloud', 'blockchain', 'security']):
                bonus += 0.1
            # Give medium weight to web/mobile development skills
            elif any(term in skill for term in ['web', 'mobile', 'fullstack', 'frontend', 'backend']):
                bonus += 0.05
        
        final_score = min(1.0, base_score + bonus)
        return final_score

    def calculate_evaluation_metrics(self, hackathon_keywords: List[str], user_skills: List[str]) -> Dict[str, float]:
        # Convert everything to lowercase and clean
        hackathon_keywords = [k.lower().strip() for k in hackathon_keywords if k]
        user_skills = [s.lower().strip() for s in user_skills if s]
        
        # Expand user skills with related terms
        expanded_skills = set()
        for skill in user_skills:
            expanded_skills.add(skill)
            for category, terms in self.tech_keywords.items():
                if skill in terms or skill == category or any(term in skill for term in terms):
                    expanded_skills.update(terms)
        
        # Calculate true positives, false positives, and false negatives
        true_positives = len(set(hackathon_keywords) & expanded_skills)
        false_positives = len(set(hackathon_keywords) - expanded_skills)
        false_negatives = len(expanded_skills - set(hackathon_keywords))
        
        # Calculate precision
        precision = true_positives / (true_positives + false_positives) if (true_positives + false_positives) > 0 else 0
        
        # Calculate recall
        recall = true_positives / (true_positives + false_negatives) if (true_positives + false_negatives) > 0 else 0
        
        # Calculate F1 score
        f1_score = 2 * (precision * recall) / (precision + recall) if (precision + recall) > 0 else 0
        
        # Calculate cosine similarity
        # Create binary vectors for keywords and skills
        all_terms = list(set(hackathon_keywords + list(expanded_skills)))
        hackathon_vector = [1 if term in hackathon_keywords else 0 for term in all_terms]
        skills_vector = [1 if term in expanded_skills else 0 for term in all_terms]
        
        # Calculate dot product
        dot_product = sum(a * b for a, b in zip(hackathon_vector, skills_vector))
        
        # Calculate magnitudes
        hackathon_magnitude = sum(a ** 2 for a in hackathon_vector) ** 0.5
        skills_magnitude = sum(b ** 2 for b in skills_vector) ** 0.5
        
        # Calculate cosine similarity
        cosine_similarity = dot_product / (hackathon_magnitude * skills_magnitude) if (hackathon_magnitude * skills_magnitude) > 0 else 0
        
        # Calculate accuracy
        total_terms = len(all_terms)
        accuracy = (true_positives + (total_terms - (false_positives + false_negatives))) / total_terms if total_terms > 0 else 0
        
        return {
            "precision": precision,
            "recall": recall,
            "f1_score": f1_score,
            "cosine_similarity": cosine_similarity,
            "accuracy": accuracy
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
                
                # Calculate match score
                match_score = self.calculate_match_score(all_keywords, user_skills)
                
                # Calculate evaluation metrics
                metrics = self.calculate_evaluation_metrics(all_keywords, user_skills)
                
                # Only include hackathons with some skill match
                if match_score > 0:
                    recommendations.append({
                        "title": hackathon["title"],
                        "description": hackathon["description"],
                        "requirements": hackathon.get('requirements', []),
                        "prize": hackathon.get('prize', "Not specified"),
                        "criteria": hackathon.get('criteria', ""),
                        "deadline": hackathon.get('deadline', "No deadline specified"),
                        "keywords": all_keywords,
                        "match_score": match_score,
                        "evaluation_metrics": metrics
                    })
            except Exception as e:
                print(f"Error processing hackathon: {e}")
                continue
        
        # Sort recommendations by match score
        recommendations.sort(key=lambda x: x["match_score"], reverse=True)
        return recommendations[:5]  # Return top 5 recommendations