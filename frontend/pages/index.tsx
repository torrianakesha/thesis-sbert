import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { motion } from 'framer-motion';

export default function Home() {
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    // Check if user is logged in
    const userId = localStorage.getItem('userId');
    setIsLoggedIn(!!userId);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      {/* Navigation */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <motion.div 
                initial={{ scale: 0.95 }}
                animate={{ scale: 1 }}
                className="text-2xl font-bold text-blue-600"
              >
                HackMatch
              </motion.div>
            </div>
            <div className="flex items-center space-x-4">
              {isLoggedIn ? (
                <>
                  <Link href="/profile" className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium">
                    Profile
                  </Link>
                  <Link href="/recommendations" className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium">
                    Recommendations
                  </Link>
                  <Link 
                    href="/settings" 
                    className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                  >
                    Settings
                  </Link>
                  <Link 
                    href="/truncation-visualizer" 
                    className="text-indigo-600 hover:text-indigo-900 px-3 py-2 rounded-md text-sm font-medium"
                  >
                    Text Truncation Tool
                  </Link>
                </>
              ) : (
                <>
                  <Link 
                    href="/truncation-visualizer" 
                    className="bg-indigo-100 text-indigo-700 hover:bg-indigo-200 px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 flex items-center gap-1"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    Truncation Tool
                  </Link>
                  <Link 
                    href="/login" 
                    className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                  >
                    Log in
                  </Link>
                  <Link 
                    href="/register" 
                    className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium"
                  >
                    Sign up
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-16 pb-24 px-4">
        <div className="max-w-7xl mx-auto">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center"
          >
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-gray-900 mb-6">
              Find Your Perfect <span className="text-blue-600">Hackathon</span> Match
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-10">
              Our AI-powered platform matches your skills with the right hackathons, increasing your chances of success and enhancing your development experience.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              {isLoggedIn ? (
                <>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => router.push('/recommendations')}
                    className="bg-blue-500 hover:bg-blue-600 text-white px-8 py-4 rounded-lg text-lg font-medium shadow-lg"
                  >
                    View Recommendations
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => router.push('/truncation-visualizer')}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-4 rounded-lg text-lg font-medium shadow-lg flex items-center justify-center gap-2 transition-colors duration-200"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    Try Text Truncation Tool
                  </motion.button>
                </>
              ) : (
                <>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => router.push('/register')}
                    className="bg-blue-500 hover:bg-blue-600 text-white px-8 py-4 rounded-lg text-lg font-medium shadow-lg"
                  >
                    Get Started
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => router.push('/truncation-visualizer')}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-4 rounded-lg text-lg font-medium shadow-lg flex items-center justify-center gap-2 transition-colors duration-200"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    Try Text Truncation Tool
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => router.push('/login')}
                    className="bg-white hover:bg-gray-100 text-gray-800 px-8 py-4 rounded-lg text-lg font-medium shadow-lg border border-gray-200"
                  >
                    Log In
                  </motion.button>
                </>
              )}
            </div>
          </motion.div>
          
          {/* Hero Image */}
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mt-16 flex justify-center"
          >
            <div className="relative w-full max-w-4xl">
              <div className="bg-gradient-to-r from-blue-500 to-blue-700 rounded-xl shadow-2xl overflow-hidden p-1">
                <div className="bg-white rounded-lg p-6">
                  <div className="bg-gray-100 rounded-lg p-8 text-center">
                    <div className="text-xl font-semibold text-gray-800 mb-6">
                      Hackathon Recommendation Dashboard
                    </div>
                    <div className="flex flex-col md:flex-row gap-4">
                      <div className="flex-1 bg-white p-4 rounded-lg shadow-md">
                        <div className="h-40 bg-blue-50 rounded flex items-center justify-center">
                          <div className="text-blue-500">Skill Matching</div>
                        </div>
                      </div>
                      <div className="flex-1 bg-white p-4 rounded-lg shadow-md">
                        <div className="h-40 bg-blue-50 rounded flex items-center justify-center">
                          <div className="text-blue-500">AI Recommendations</div>
                        </div>
                      </div>
                      <div className="flex-1 bg-white p-4 rounded-lg shadow-md">
                        <div className="h-40 bg-blue-50 rounded flex items-center justify-center">
                          <div className="text-blue-500">Match Scoring</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900">How It Works</h2>
            <p className="mt-4 text-xl text-gray-600">
              Our SBert Model analyzes your skills and matches you with the perfect hackathons
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
              className="bg-gray-50 rounded-xl p-8 shadow-md"
            >
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 mb-5">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mb-3">Create Your Profile</h3>
              <p className="text-gray-600">
                Register and add your skills, technologies, and experience to help our model understand your expertise.
              </p>
            </motion.div>
            
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.2 }}
              className="bg-gray-50 rounded-xl p-8 shadow-md"
            >
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 mb-5">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mb-3">AI Processing</h3>
              <p className="text-gray-600">
                Our SBert Model uses advanced NLP to analyze hackathon descriptions and find the best matches for your skills.
              </p>
            </motion.div>
            
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.3 }}
              className="bg-gray-50 rounded-xl p-8 shadow-md"
            >
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 mb-5">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mb-3">Get Recommendations</h3>
              <p className="text-gray-600">
                Receive personalized hackathon recommendations with detailed match scores and evaluation metrics.
              </p>
            </motion.div>
          </div>
        </div>
      </section>
      
      {/* About SBert Section */}
      <section className="py-16 bg-gradient-to-b from-gray-50 to-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center gap-10">
            <motion.div 
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
              className="md:w-1/2"
            >
              <h2 className="text-3xl font-bold text-gray-900 mb-6">Powered by SBert Model</h2>
              <p className="text-lg text-gray-600 mb-6">
                Our platform uses the Sentence-BERT (SBert) model, a state-of-the-art natural language processing technology that creates semantic embeddings from text.
              </p>
              <p className="text-lg text-gray-600 mb-6">
                This allows us to analyze both your skills and hackathon requirements to find the perfect semantic matches, going beyond simple keyword matching.
              </p>
              <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
                <p className="text-blue-700 font-medium">
                  The SBert model achieves 85%+ accuracy in matching skills to hackathon requirements, outperforming traditional recommendation systems.
                </p>
              </div>
            </motion.div>
            
            <motion.div 
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
              className="md:w-1/2"
            >
              <div className="bg-white rounded-xl shadow-lg p-6 relative">
                <div className="bg-blue-500 text-white px-4 py-2 rounded-full absolute -top-3 -left-3 text-sm font-semibold">
                  SBert Technology
                </div>
                <div className="pt-6">
                  <div className="flex items-center justify-center mb-4">
                    <svg width="90%" height="180" viewBox="0 0 500 200">
                      <defs>
                        <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.8"/>
                          <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.3"/>
                        </linearGradient>
                      </defs>
                      <path d="M0,100 C150,20 350,180 500,100" stroke="url(#gradient)" strokeWidth="4" fill="none"/>
                      <circle cx="100" cy="80" r="15" fill="#3B82F6"/>
                      <circle cx="250" cy="120" r="15" fill="#3B82F6"/>
                      <circle cx="400" cy="90" r="15" fill="#3B82F6"/>
                    </svg>
                  </div>
                  <div className="space-y-3">
                    <div className="bg-gray-100 p-3 rounded-lg">
                      <div className="flex items-center">
                        <div className="w-3 h-3 bg-blue-500 rounded-full mr-3"></div>
                        <div className="text-sm font-medium">Semantic Embedding Generation</div>
                      </div>
                    </div>
                    <div className="bg-gray-100 p-3 rounded-lg">
                      <div className="flex items-center">
                        <div className="w-3 h-3 bg-blue-500 rounded-full mr-3"></div>
                        <div className="text-sm font-medium">Cosine Similarity Calculation</div>
                      </div>
                    </div>
                    <div className="bg-gray-100 p-3 rounded-lg">
                      <div className="flex items-center">
                        <div className="w-3 h-3 bg-blue-500 rounded-full mr-3"></div>
                        <div className="text-sm font-medium">Advanced Match Scoring</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>
      
      {/* CTA Section */}
      <section className="py-20 bg-blue-600">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-3xl font-bold text-white mb-6">
              Ready to find your perfect hackathon match?
            </h2>
            <p className="text-xl text-blue-100 mb-10">
              Join thousands of developers who have found their ideal hackathons using our platform.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              {isLoggedIn ? (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => router.push('/recommendations')}
                  className="bg-white text-blue-600 px-8 py-4 rounded-lg text-lg font-medium shadow-lg"
                >
                  View Your Recommendations
                </motion.button>
              ) : (
                <>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => router.push('/register')}
                    className="bg-white text-blue-600 px-8 py-4 rounded-lg text-lg font-medium shadow-lg"
                  >
                    Sign Up Now
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => router.push('/login')}
                    className="bg-transparent text-white border-2 border-white px-8 py-4 rounded-lg text-lg font-medium"
                  >
                    Log In
                  </motion.button>
                </>
              )}
            </div>
          </motion.div>
        </div>
      </section>
      
      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
            <div>
              <h3 className="text-xl font-semibold text-white mb-4">HackMatch</h3>
              <p className="text-sm">
                Connecting developers with their perfect hackathon opportunities using state-of-the-art AI technology.
              </p>
            </div>
            <div>
              <h4 className="text-lg font-medium text-white mb-4">Quick Links</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="/" className="hover:text-white">Home</Link></li>
                <li><Link href="/recommendations" className="hover:text-white">Recommendations</Link></li>
                <li><Link href="/profile" className="hover:text-white">Profile</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-lg font-medium text-white mb-4">Resources</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white">About SBert</a></li>
                <li><a href="#" className="hover:text-white">How it Works</a></li>
                <li><a href="#" className="hover:text-white">API Documentation</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-lg font-medium text-white mb-4">Contact</h4>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <a href="mailto:info@hackmatch.com" className="hover:text-white">info@hackmatch.com</a>
                </li>
                <li className="flex items-center">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  <span>+1 (555) 123-4567</span>
                </li>
              </ul>
            </div>
          </div>
          <div className="mt-12 border-t border-gray-800 pt-8 flex flex-col md:flex-row justify-between items-center">
            <p className="text-sm">© 2023 HackMatch. All rights reserved.</p>
            <div className="flex space-x-6 mt-4 md:mt-0">
              <a href="#" className="text-gray-400 hover:text-white">
                <span className="sr-only">Twitter</span>
                <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
                </svg>
              </a>
              <a href="#" className="text-gray-400 hover:text-white">
                <span className="sr-only">GitHub</span>
                <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                </svg>
              </a>
              <a href="#" className="text-gray-400 hover:text-white">
                <span className="sr-only">LinkedIn</span>
                <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path fillRule="evenodd" d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" clipRule="evenodd" />
                </svg>
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
} 