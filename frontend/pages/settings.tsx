import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { motion } from 'framer-motion';

interface User {
  id: number;
  username: string;
  email: string;
  skills: string[];
}

export default function Settings() {
  const router = useRouter(); 
  const [user, setUser] = useState<User | null>(null);
  const [username, setUsername] = useState('');
  const [skills, setSkills] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    // Get user ID from localStorage or your auth system
    const userId = localStorage.getItem('userId');
    if (!userId) {
      router.push('/login');
      return;
    }

    // Fetch user data
    fetch(`http://localhost:8000/users/${userId}`)
      .then(res => res.json())
      .then(data => {
        setUser(data);
        setUsername(data.username);
        setSkills(data.skills.join(', '));
      })
      .catch(err => {
        console.error('Error fetching user data:', err);
        setMessage('Error loading user data');
      });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const userId = localStorage.getItem('userId');
    if (!userId) {
      setMessage('Error: User not logged in');
      return;
    }

    try {
      const response = await fetch(`http://localhost:8000/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: username,
          skills: skills.split(',').map(skill => skill.trim()).filter(skill => skill !== ''),
        }),
      });

      if (response.ok) {
        const updatedUser = await response.json();
        setUser(updatedUser);
        setMessage('Settings updated successfully!');
        // Clear message after 3 seconds
        setTimeout(() => setMessage(''), 3000);
      } else {
        const errorData = await response.json();
        setMessage(`Error updating settings: ${errorData.detail || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error:', error);
      setMessage('Error updating settings. Please try again.');
    }
  };

  const handleLogout = () => {
    // Clear user data from localStorage
    localStorage.removeItem('userId');
    // Redirect to login page
    router.push('/login');
  };

  if (!user) {
    return <div>Loading...</div>;
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="container mx-auto px-4 py-8 min-h-screen bg-gray-50"
    >
      <div className="max-w-2xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <motion.h1 
            initial={{ x: -20 }}
            animate={{ x: 0 }}
            className="text-3xl font-bold text-gray-800"
          >
            User Settings
          </motion.h1>
          <div className="flex gap-4">
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Link 
                href="/recommendations" 
                className="text-blue-500 hover:text-blue-700 flex items-center gap-2
                         transition-colors duration-200"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                        d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back to Recommendations
              </Link>
            </motion.div>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleLogout}
              className="text-red-500 hover:text-red-700 flex items-center gap-2
                       transition-colors duration-200"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                      d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Logout
            </motion.button>
          </div>
        </div>
        
        {message && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`mb-6 p-4 rounded-lg ${
              message.includes('Error') 
                ? 'bg-red-100 text-red-700 border border-red-200'
                : 'bg-green-100 text-green-700 border border-green-200'
            }`}
          >
            {message}
          </motion.div>
        )}

        <motion.form 
          onSubmit={handleSubmit}
          className="bg-white p-6 rounded-xl shadow-md"
        >
          <div className="mb-6">
            <label htmlFor="username" className="block text-gray-700 text-sm font-medium mb-2">
              Username
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 
                       focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
              placeholder="Enter your username"
              aria-label="Username"
            />
          </div>

          <div className="mb-6">
            <label htmlFor="skills" className="block text-gray-700 text-sm font-medium mb-2">
              Skills
            </label>
            <textarea
              id="skills"
              value={skills}
              onChange={(e) => setSkills(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 
                       focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
              rows={4}
              placeholder="Enter your skills (e.g., Python, JavaScript, React)"
              aria-label="Skills"
            />
            <p className="mt-2 text-sm text-gray-500">
              Separate multiple skills with commas (e.g., Python, JavaScript, React)
            </p>
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="submit"
            className="w-full bg-blue-500 text-white py-3 px-6 rounded-lg hover:bg-blue-600 
                     transition-colors duration-200 font-medium shadow-md"
          >
            Save Changes
          </motion.button>
        </motion.form>
      </div>
    </motion.div>
  );
} 