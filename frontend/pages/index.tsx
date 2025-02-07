import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import styles from '../styles/Home.module.css';

export default function Home() {
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    // Check if user is logged in
    const userId = localStorage.getItem('userId');
    setIsLoggedIn(!!userId);
  }, []);

  return (
    <div className={styles.container}>
      <h1>Hackathon Recommendation System</h1>
      {!isLoggedIn ? (
        <div>
          <button onClick={() => router.push('/login')}>Login</button>
          <button onClick={() => router.push('/register')}>Register</button>
        </div>
      ) : (
        <button onClick={() => router.push('/recommendations')}>
          View Recommendations
        </button>
      )}
    </div>
  );
} 