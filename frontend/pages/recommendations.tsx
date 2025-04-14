import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import styles from '../styles/Recommendations.module.css';

interface Hackathon {
  title: string;
  description: string;
  requirements: string[];
  prize: string;
  criteria: string;
  deadline: string;
  keywords: string[];
  match_score: number;
  evaluation_metrics: {
    precision: number;
    recall: number;
    f1_score: number;
    cosine_similarity: number;
    accuracy: number;
  };
}

interface User {
  username: string;
  email: string;
  skills: string[];
}

export default function Recommendations() {
  const router = useRouter();
  const [recommendations, setRecommendations] = useState<Hackathon[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchUserData = async (userId: string) => {
    try {
      const response = await fetch(`http://localhost:8000/users/${userId}`);
      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
      }
    } catch (err) {
      console.error('Error fetching user data:', err);
    }
  };

  const fetchRecommendations = async () => {
    setIsRefreshing(true);
    setError('');
    
    const userId = localStorage.getItem('userId');
    if (!userId) {
      router.push('/login');
      return;
    }

    try {
      await fetchUserData(userId);
      const response = await fetch(`http://localhost:8000/recommendations/${userId}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to fetch recommendations');
      }
      
      const data = await response.json();
      setRecommendations(data);
    } catch (err) {
      console.error('Error fetching recommendations:', err);
      setError(err.message || 'Failed to load recommendations');
    } finally {
      setIsRefreshing(false);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecommendations();
  }, []);

  const handleRefresh = () => {
    fetchRecommendations();
  };

  const saveAndNavigateToHackathon = (hackathon: Hackathon, index: number) => {
    // Save hackathons to localStorage
    localStorage.setItem('hackathons', JSON.stringify(recommendations));
    // Navigate to hackathon details page
    router.push(`/hackathon/${index}`);
  };

  if (loading && !isRefreshing) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="container mx-auto px-4 py-8 min-h-screen bg-gray-50"
    >
      <div className="flex justify-between items-center mb-8">
        <motion.h1 
          initial={{ x: -20 }}
          animate={{ x: 0 }}
          className="text-3xl font-bold text-gray-800"
        >
          Hackathon Recommendations
        </motion.h1>
        <div className="flex gap-4">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleRefresh}
            disabled={isRefreshing}
            className={`bg-blue-500 text-white px-4 py-2 rounded-lg flex items-center gap-2 
                     ${isRefreshing ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-600'}`}
          >
            {isRefreshing ? (
              <>
                <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Refreshing...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh
              </>
            )}
          </motion.button>
          <Link 
            href="/settings" 
            className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 
                     transition-colors duration-200 flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Settings
          </Link>
        </div>
      </div>

      {user && (
        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="bg-white p-6 rounded-xl shadow-md mb-8 border border-gray-100"
        >
          <h2 className="font-semibold text-xl mb-4">Your Profile</h2>
          <div className="space-y-2">
            <p className="flex items-center gap-2">
              <span className="font-medium text-gray-700">Username:</span>
              <span className="text-gray-600">{user.username}</span>
            </p>
            <div className="flex flex-wrap gap-2">
              <span className="font-medium text-gray-700">Skills:</span>
              {user.skills.map((skill, index) => (
                <span 
                  key={index}
                  className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm"
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {error && (
        <div className="mb-6 p-4 bg-red-100 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6">
        {recommendations.map((hackathon, index) => (
          <motion.div
            key={index}
            className={`${styles.hackathonCard} cursor-pointer transform hover:scale-[1.02] 
                       transition-all duration-200`}
            onClick={() => saveAndNavigateToHackathon(hackathon, index)}
            whileHover={{ y: -4 }}
          >
            <div className="flex justify-between items-start">
              <h2 className="text-xl font-bold mb-2 text-gray-800">{hackathon.title}</h2>
              <span className={`${styles.matchBadge} ${
                hackathon.match_score > 0.7 ? styles.matchBadgeHigh :
                hackathon.match_score > 0.4 ? styles.matchBadgeMedium :
                styles.matchBadgeLow
              }`}>
                Match: {Math.round(hackathon.match_score * 100)}%
              </span>
            </div>
            
            <p className="text-gray-600 mb-4 line-clamp-2">{hackathon.description}</p>
            
            <div className="mb-4">
              <h3 className="font-semibold mb-2 text-gray-700">Required Skills:</h3>
              <div className="flex flex-wrap gap-2">
                {hackathon.requirements.slice(0, 3).map((skill, skillIndex) => (
                  <span key={skillIndex} className={styles.skillTag}>
                    {skill}
                  </span>
                ))}
                {hackathon.requirements.length > 3 && (
                  <span className={styles.skillTag}>
                    +{hackathon.requirements.length - 3} more
                  </span>
                )}
              </div>
            </div>

            <div className="mb-4">
              <h3 className="font-semibold mb-2 text-gray-700">Evaluation Metrics:</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-sm text-gray-600">Precision</p>
                  <p className="text-lg font-semibold text-blue-600">
                    {Math.round(hackathon.evaluation_metrics.precision * 100)}%
                  </p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-sm text-gray-600">Recall</p>
                  <p className="text-lg font-semibold text-blue-600">
                    {Math.round(hackathon.evaluation_metrics.recall * 100)}%
                  </p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-sm text-gray-600">F1 Score</p>
                  <p className="text-lg font-semibold text-blue-600">
                    {Math.round(hackathon.evaluation_metrics.f1_score * 100)}%
                  </p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-sm text-gray-600">Cosine Similarity</p>
                  <p className="text-lg font-semibold text-blue-600">
                    {Math.round(hackathon.evaluation_metrics.cosine_similarity * 100)}%
                  </p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-sm text-gray-600">Accuracy</p>
                  <p className="text-lg font-semibold text-blue-600">
                    {Math.round(hackathon.evaluation_metrics.accuracy * 100)}%
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex justify-between items-center mt-4">
              <p className="text-sm text-gray-600">
                Deadline: {hackathon.deadline}
              </p>
              <span className="text-blue-500 hover:text-blue-700">
                View Details →
              </span>
            </div>
          </motion.div>
        ))}
      </div>

      {recommendations.length === 0 && !loading && !error && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-12"
        >
          <p className="text-gray-600 text-lg">No recommendations found. Try updating your skills!</p>
          <Link
            href="/settings"
            className="inline-block mt-4 text-blue-500 hover:text-blue-700 font-medium"
          >
            Update Skills →
          </Link>
        </motion.div>
      )}
    </motion.div>
  );
} 