import { useState, useEffect } from 'react';
import styles from '../styles/Recommendations.module.css';

interface Hackathon {
  title: string;
  url: string;
  description: string;
  required_skills: string[];
  match_score: number;
}

export default function Recommendations() {
  const [recommendations, setRecommendations] = useState<Hackathon[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRecommendations = async () => {
      const userId = localStorage.getItem('userId');
      if (!userId) return;

      try {
        const response = await fetch(`http://localhost:8000/recommendations/${userId}`);
        if (response.ok) {
          const data = await response.json();
          setRecommendations(data);
        }
      } catch (error) {
        console.error('Error fetching recommendations:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchRecommendations();
  }, []);

  if (loading) return <div>Loading...</div>;

  return (
    <div className={styles.container}>
      <h1>Your Hackathon Recommendations</h1>
      <div className={styles.recommendationsList}>
        {recommendations.map((hackathon, index) => (
          <div key={index} className={styles.hackathonCard}>
            <h2>{hackathon.title}</h2>
            <p>{hackathon.description}</p>
            <div className={styles.skills}>
              <h3>Required Skills:</h3>
              <ul>
                {hackathon.required_skills && Array.isArray(hackathon.required_skills) && hackathon.required_skills.map((skill, i) => (
                  <li key={i}>{skill}</li>
                ))}
              </ul>
            </div>
            <p>Match Score: {(hackathon.match_score * 100).toFixed(1)}%</p>
            <a href={hackathon.url} target="_blank" rel="noopener noreferrer">
              View Hackathon
            </a>
          </div>
        ))}
      </div>
    </div>
  );
} 