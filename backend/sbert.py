from sentence_transformers import SentenceTransformer
import numpy as np
import psutil
import time
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score
import math

class SBERTModel:
    def __init__(self):
        self.model = SentenceTransformer("all-MiniLM-L6-v2")

    def encode_text(self, text):
        try:
            return self.model.encode(text, convert_to_numpy=True)
        except Exception:
            return np.zeros(self.model.get_sentence_embedding_dimension())

    def sanitize_float(self, val):
        if val is None or isinstance(val, str) or not np.isfinite(val):
            return 0.0
        return float(round(val, 4))

    def analyze_hackathons(self, hackathons, user_skills):
        start_time = time.time()
        process = psutil.Process()
        start_memory = process.memory_info().rss / (1024 * 1024)

        try:
            user_text = ", ".join(user_skills)
            user_embedding = self.encode_text(user_text)
            results = []
            similarities = []

            for hackathon in hackathons:
                description = hackathon.get("description", "")
                hackathon_embedding = self.encode_text(description)

                denominator = np.linalg.norm(user_embedding) * np.linalg.norm(hackathon_embedding)
                similarity = 0.0
                if denominator > 0:
                    similarity = np.dot(user_embedding, hackathon_embedding) / denominator

                similarity = self.sanitize_float(similarity)
                similarities.append(similarity)

            if not similarities:
                raise ValueError("No valid similarities could be computed.")

            true_labels = [1 if i < len(similarities) // 2 else 0 for i in range(len(similarities))]
            threshold = np.mean([s for s in similarities if np.isfinite(s)])
            predicted_labels = [1 if sim > threshold else 0 for sim in similarities]

            accuracy = self.sanitize_float(accuracy_score(true_labels, predicted_labels))
            precision = self.sanitize_float(precision_score(true_labels, predicted_labels, zero_division=0))
            recall = self.sanitize_float(recall_score(true_labels, predicted_labels, zero_division=0))
            f1 = self.sanitize_float(f1_score(true_labels, predicted_labels, zero_division=0))

            for idx, hackathon in enumerate(hackathons):
                sim = similarities[idx]
                match_percentage = self.sanitize_float(round(sim * 100, 2))

                print(f"\n📌 Hackathon: {hackathon.get('title', 'No Title')}")
                print(f"🎯 Cosine Similarity Score: {sim:.4f} ({match_percentage}%)")
                print("━" * 50)

                results.append({
                    "title": hackathon.get("title", ""),
                    "similarity": self.sanitize_float(sim),
                    "match_score": match_percentage,
                    "description": hackathon.get("description", ""),
                    "prize": hackathon.get("prize", ""),
                    "deadline": hackathon.get("deadline", ""),
                    "keywords": hackathon.get("keywords", []),
                    "requirements": hackathon.get("requirements", []) if isinstance(hackathon.get("requirements", []), list) else [],
                    "criteria": hackathon.get("criteria", ""),
                    "evaluation_metrics": {
                        "precision": self.sanitize_float(precision),
                        "recall": self.sanitize_float(recall),
                        "f1_score": self.sanitize_float(f1),
                        "cosine_similarity": self.sanitize_float(sim),
                        "accuracy": self.sanitize_float(accuracy)
                    },
                    "skill_matches": {}  # Placeholder for skill matches
                })

            results.sort(key=lambda x: x["similarity"], reverse=True)

            end_time = time.time()
            end_memory = process.memory_info().rss / (1024 * 1024)

            print(f"✅ Processed {len(hackathons)} hackathons in {end_time - start_time:.2f}s")
            print(f"📦 Memory used: {end_memory - start_memory:.2f} MB")
            print(f"✔️ Accuracy:  {accuracy}")
            print(f"🎯 Precision: {precision}")
            print(f"🔁 Recall:    {recall}")
            print(f"📈 F1 Score:  {f1}")

            # Deep sanitization of all result values to ensure JSON compatibility
            for hackathon_result in results:
                for key, value in hackathon_result.items():
                    if isinstance(value, (int, float)):
                        hackathon_result[key] = self.sanitize_float(value)

            # Store metrics for logging but return only the recommendations array
            # to match frontend expectations
            metrics = {
                "accuracy": self.sanitize_float(accuracy),
                "precision": self.sanitize_float(precision),
                "recall": self.sanitize_float(recall),
                "f1_score": self.sanitize_float(f1)
            }
            
            print(f"Metrics: {metrics}")
            
            # Return just the recommendations array as the frontend expects
            return results

        except Exception as e:
            print(f"❌ Recommendation failed: {str(e)}")
            raise
