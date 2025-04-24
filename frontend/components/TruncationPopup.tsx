import React, { useState, useEffect } from 'react';

interface TruncationData {
  original: {
    text: string;
    length: number;
    tokens: number;
    sentences: number;
    words: number;
  };
  sliding_window: {
    text: string;
    length: number;
    tokens: number;
    reduction_percent: number;
    pooling_metrics?: {
      mean_pooling: number;
      attention_pooling: number;
    };
  };
  sbert_viz: {
    text: string;
    length: number;
    tokens: number;
    chunks: string[];
    embeddings_preview: number[][];
    reduction_percent: number;
  };
  semantic?: {
    sliding_window_similarity: number;
    sbert_similarity: number;
    word_similarity?: number;
    sentence_similarity?: number;
  };
}

interface TruncationPopupProps {
  isOpen: boolean;
  onClose: () => void;
  description: string;
  originalDescription?: string;
  maxLength?: number;
}

const TruncationPopup: React.FC<TruncationPopupProps> = ({
  isOpen,
  onClose,
  description,
  originalDescription,
  maxLength = 200
}) => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [visualizationData, setVisualizationData] = useState<TruncationData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>('original');

  const tabs = [
    { id: 'original', label: 'Original Text' },
    { id: 'sliding_window', label: 'Truncation Impact' },
    { id: 'pooling', label: 'Pooling Metrics' }
  ];

  const handleVisualize = async () => {
    if (!isOpen) return;
    
    if (!description) {
      setError('No description text available');
      return;
    }

    // If we already have visualization data, don't re-fetch
    if (visualizationData) return;

    setIsLoading(true);
    setError(null);

    try {
      // Use the original description if provided, otherwise use the truncated description
      const textToAnalyze = originalDescription || description;
      
      const response = await fetch('http://localhost:8000/text-truncation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: textToAnalyze,
          max_length: maxLength,
          window_size: 30 // Default window size
        }),
      });

      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }

      const data = await response.json();
      setVisualizationData(data);
    } catch (err) {
      setError(`Failed to analyze: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Call visualize when popup opens
  useEffect(() => {
    if (isOpen) {
      handleVisualize();
    }
  }, [isOpen]);

  const getColorGradient = (similarity: number | undefined) => {
    if (similarity === undefined) return '#6B7280'; // Gray default
    
    // Red to green gradient based on similarity (0.0 to 1.0)
    const red = Math.round(255 * (1 - similarity));
    const green = Math.round(200 * similarity);
    return `rgb(${red}, ${green}, 50)`;
  };

  const getTruncatedText = (original: string, truncated: string) => {
    if (original === truncated) return truncated;
    
    return (
      <>
        <span>{truncated}</span>
        {truncated.endsWith('...') && <span style={{ color: 'red' }}>...</span>}
      </>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="fixed inset-0 bg-black bg-opacity-25" onClick={onClose}></div>
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="w-full max-w-3xl bg-white rounded-2xl p-6 shadow-xl relative z-10">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium leading-6 text-gray-900">Text Truncation Analysis</h3>
            <button
              type="button"
              className="rounded-md bg-white text-gray-400 hover:text-gray-500"
              onClick={onClose}
            >
              <span className="sr-only">Close</span>
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          {isLoading ? (
            <div className="mt-4 flex justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          ) : error ? (
            <div className="mt-4 p-4 bg-red-50 text-red-700 rounded-md">
              {error}
            </div>
          ) : visualizationData ? (
            <div className="mt-4">
              <div className="flex border-b border-gray-200 mb-4">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    className={`px-4 py-2 font-medium ${activeTab === tab.id ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-500' : 'text-gray-600'}`}
                    onClick={() => setActiveTab(tab.id)}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
              
              {activeTab === 'original' && (
                <div>
                  <h4 className="font-medium text-lg mb-2">Original Text</h4>
                  <p className="whitespace-pre-wrap mb-4 border p-3 bg-gray-50 rounded max-h-60 overflow-y-auto">
                    {visualizationData.original.text}
                  </p>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium">Length:</span> {visualizationData.original.length} characters
                    </div>
                    <div>
                      <span className="font-medium">Tokens:</span> ~{visualizationData.original.tokens}
                    </div>
                    <div>
                      <span className="font-medium">Words:</span> {visualizationData.original.words || 'N/A'}
                    </div>
                    <div>
                      <span className="font-medium">Sentences:</span> {visualizationData.original.sentences || 'N/A'}
                    </div>
                  </div>
                </div>
              )}
              
              {activeTab === 'sliding_window' && (
                <div>
                  <h4 className="font-medium text-lg mb-2">Truncated Text</h4>
                  <p className="whitespace-pre-wrap mb-4 border p-3 bg-gray-50 rounded max-h-60 overflow-y-auto">
                    {getTruncatedText(visualizationData.original.text, visualizationData.sliding_window.text)}
                  </p>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium">Original Length:</span> {visualizationData.original.length} characters
                    </div>
                    <div>
                      <span className="font-medium">Truncated Length:</span> {visualizationData.sliding_window.length} characters
                    </div>
                    <div>
                      <span className="font-medium">Reduction:</span> {visualizationData.sliding_window.reduction_percent}%
                    </div>
                    {visualizationData.semantic && (
                      <div>
                        <span className="font-medium">Semantic similarity:</span>
                        <span style={{ color: getColorGradient(
                          visualizationData.semantic.sliding_window_similarity || 
                          visualizationData.semantic.word_similarity
                        ), marginLeft: '4px', fontWeight: 'bold' }}>
                          {Math.round((
                            visualizationData.semantic.sliding_window_similarity || 
                            visualizationData.semantic.word_similarity || 0
                          ) * 100)}%
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {activeTab === 'pooling' && visualizationData.sliding_window.pooling_metrics && (
                <div>
                  <h4 className="font-medium text-lg mb-2">Advanced Pooling Metrics</h4>
                  <p className="text-sm text-gray-600 mb-4">
                    Compare how different pooling methods preserve the semantic meaning when text is truncated.
                  </p>
                  
                  <div className="grid grid-cols-1 gap-6">
                    <div className="p-4 border rounded-lg bg-blue-50">
                      <div className="font-medium mb-2">Mean Pooling: 
                        <span className="text-blue-700 ml-2">
                          {Math.round(visualizationData.sliding_window.pooling_metrics.mean_pooling * 100)}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-4 mb-2">
                        <div 
                          className="bg-blue-600 h-4 rounded-full" 
                          style={{ 
                            width: `${visualizationData.sliding_window.pooling_metrics.mean_pooling * 100}%` 
                          }}
                        />
                      </div>
                      <p className="text-xs text-gray-600">
                        <strong>Mean pooling</strong> takes the average of all sentence embeddings from both the original and truncated text. It treats all sentences equally and may not preserve the most important semantics if important content is removed.
                      </p>
                    </div>
                    
                    <div className="p-4 border rounded-lg bg-purple-50">
                      <div className="font-medium mb-2">Attention Pooling: 
                        <span className="text-purple-700 ml-2">
                          {Math.round(visualizationData.sliding_window.pooling_metrics.attention_pooling * 100)}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-4 mb-2">
                        <div 
                          className="bg-purple-600 h-4 rounded-full" 
                          style={{ 
                            width: `${visualizationData.sliding_window.pooling_metrics.attention_pooling * 100}%` 
                          }}
                        />
                      </div>
                      <p className="text-xs text-gray-600">
                        <strong>Attention pooling</strong> is query-aware and weights sentences based on their relevance to the truncated text. This approach can better preserve the semantics of key content even when significant portions are truncated.
                      </p>
                    </div>
                    
                    <div className="text-sm text-gray-600 mt-2">
                      <p className="italic">
                        <span className="font-bold">Analysis: </span>
                        {visualizationData.sliding_window.pooling_metrics.attention_pooling > 
                         visualizationData.sliding_window.pooling_metrics.mean_pooling + 0.1 
                          ? "Attention pooling significantly outperforms mean pooling, indicating that the truncation kept the most semantically relevant content."
                          : visualizationData.sliding_window.pooling_metrics.mean_pooling > 
                            visualizationData.sliding_window.pooling_metrics.attention_pooling + 0.1
                            ? "Mean pooling outperforms attention pooling, suggesting the truncation may have retained broad content but missed some specific important details."
                            : "Both pooling methods perform similarly, indicating a balanced truncation that preserves general semantic meaning."
                        }
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="mt-4 p-4 bg-yellow-50 text-yellow-700 rounded-md">
              No visualization data available. Please try again.
            </div>
          )}
          
          <div className="mt-6 flex justify-end">
            <button
              type="button"
              className="inline-flex justify-center rounded-md border border-transparent bg-blue-100 px-4 py-2 text-sm font-medium text-blue-900 hover:bg-blue-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
              onClick={onClose}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TruncationPopup; 