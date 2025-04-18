import { motion, AnimatePresence } from 'framer-motion';

interface MetricsExplanationProps {
  isOpen: boolean;
  onClose: () => void;
  metrics: {
    precision: number;
    recall: number;
    f1_score: number;
    cosine_similarity: number;
    accuracy: number;
  };
  skill_matches: {
    [key: string]: Array<[string, number]>;
  };
}

export default function MetricsExplanation({ isOpen, onClose, metrics, skill_matches }: MetricsExplanationProps) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-white rounded-xl p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto"
          onClick={e => e.stopPropagation()}
        >
          <div className="flex justify-between items-start mb-6">
            <h2 className="text-2xl font-bold text-gray-800">Metrics Explanation</h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="space-y-6">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Precision ({Math.round(metrics.precision * 100)}%)</h3>
              <p className="text-gray-600">
                Precision measures how many of the recommended skills are actually relevant to the hackathon.
                A high precision means most of the skills we matched are truly needed for the hackathon.
              </p>
              <p className="text-sm text-gray-500 mt-2">
                Formula: True Positives / (True Positives + False Positives)
              </p>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Recall ({Math.round(metrics.recall * 100)}%)</h3>
              <p className="text-gray-600">
                Recall measures how many of the hackathon's required skills we successfully identified.
                A high recall means we caught most of the skills needed for the hackathon.
              </p>
              <p className="text-sm text-gray-500 mt-2">
                Formula: True Positives / (True Positives + False Negatives)
              </p>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-lg font-semibold text-gray-800 mb-2">F1 Score ({Math.round(metrics.f1_score * 100)}%)</h3>
              <p className="text-gray-600">
                F1 Score is the harmonic mean of precision and recall. It provides a balanced measure of both metrics.
                A high F1 score indicates a good balance between precision and recall.
              </p>
              <p className="text-sm text-gray-500 mt-2">
                Formula: 2 * (Precision * Recall) / (Precision + Recall)
              </p>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Cosine Similarity ({Math.round(metrics.cosine_similarity * 100)}%)</h3>
              <p className="text-gray-600">
                Cosine Similarity measures the angle between the vectors of your skills and the hackathon's requirements.
                A high cosine similarity indicates that your skills align well with the hackathon's needs.
              </p>
              <p className="text-sm text-gray-500 mt-2">
                Formula: Dot Product / (Magnitude of Skills Vector * Magnitude of Requirements Vector)
              </p>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Accuracy ({Math.round(metrics.accuracy * 100)}%)</h3>
              <p className="text-gray-600">
                Accuracy measures the overall correctness of the skill matching.
                It considers both correct matches and correct non-matches.
              </p>
              <p className="text-sm text-gray-500 mt-2">
                Formula: (True Positives + True Negatives) / Total Skills
              </p>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Skill Matches</h3>
              <p className="text-gray-600 mb-4">
                Below are the semantic matches between your skills and the hackathon's requirements,
                calculated using SBERT (Sentence-BERT) for better understanding of skill relevance.
              </p>
              <div className="space-y-4">
                {Object.entries(skill_matches).map(([skill, matches]) => (
                  <div key={skill} className="border-l-4 border-blue-500 pl-4">
                    <h4 className="font-medium text-gray-800">{skill}</h4>
                    <div className="mt-2 space-y-2">
                      {matches.map(([match, similarity], index) => (
                        <div key={index} className="flex justify-between items-center">
                          <span className="text-gray-600">{match}</span>
                          <span className="text-blue-600 font-medium">
                            {Math.round(similarity * 100)}% match
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
} 