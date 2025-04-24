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
  initialMode?: 'analyze' | 'simulate';
}

const TruncationPopup: React.FC<TruncationPopupProps> = ({
  isOpen,
  onClose,
  description,
  originalDescription,
  maxLength = 200,
  initialMode = 'analyze'
}) => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [visualizationData, setVisualizationData] = useState<TruncationData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>('original');
  
  // Simulation states
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [simulationMode, setSimulationMode] = useState<string>('sliding_window');
  const [simulationText, setSimulationText] = useState<string>('');
  const [simulationStep, setSimulationStep] = useState<number>(0);
  const [simulationMaxSteps, setSimulationMaxSteps] = useState<number>(0);
  const [simulationSpeed, setSimulationSpeed] = useState<number>(500); // ms between steps
  const [windowSize, setWindowSize] = useState<number>(30); // Sliding window size

  const tabs = [
    { id: 'original', label: 'Original Text' },
    { id: 'sliding_window', label: 'Truncation Impact' },
    { id: 'pooling', label: 'Pooling Metrics' },
    { id: 'simulate', label: 'Simulate Truncation' }
  ];

  // Set the view mode based on initialMode prop
  useEffect(() => {
    if (initialMode === 'simulate') {
      setActiveTab('simulate');
    }
  }, [initialMode]);

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

  // Start the truncation simulation
  const startSimulation = () => {
    if (!visualizationData) {
      setError('Please visualize truncation first');
      return;
    }

    // Reset simulation state
    setSimulationStep(0);
    setIsSimulating(true);
    
    // Get original text
    const originalText = visualizationData.original.text;
    setSimulationText(originalText);
    
    // Set max steps based on truncation method and text length
    let steps = 0;
    
    if (simulationMode === 'sliding_window') {
      // For sliding window, we'll show the window moving through text
      steps = Math.max(30, originalText.length / 10); // More steps for sliding window visual
    } else if (simulationMode === 'sbert') {
      // For SBERT visualization, we'll simulate the SBERT processing
      steps = Math.max(30, visualizationData.sbert_viz.chunks?.length * 3 || 30);
    }
    
    setSimulationMaxSteps(Math.max(10, steps)); // Ensure at least 10 steps for visual effect
  };

  // Stop simulation
  const stopSimulation = () => {
    setIsSimulating(false);
    setSimulationStep(0);
    if (visualizationData) {
      setSimulationText(visualizationData.original.text);
    }
  };

  // Simulation effect
  useEffect(() => {
    if (!isSimulating || !visualizationData) return;
    
    const originalText = visualizationData.original.text;
    
    // If we've reached the end of simulation
    if (simulationStep >= simulationMaxSteps) {
      // Set final state based on method
      if (simulationMode === 'sliding_window') {
        setSimulationText(visualizationData.sliding_window.text);
      } else if (simulationMode === 'sbert') {
        setSimulationText(visualizationData.sbert_viz.text);
      }
      
      // End simulation after a pause
      const timer = setTimeout(() => {
        setIsSimulating(false);
      }, 1500);
      
      return () => clearTimeout(timer);
    }
    
    // Calculate the current truncation state
    const progress = simulationStep / simulationMaxSteps;
    
    if (simulationMode === 'sliding_window') {
      // Sliding window simulation logic
      const paragraphs = originalText.split(/\n\n+/);
      const sentences = originalText.split(/(?<=[.!?])\s+/);
      
      // Initial full text
      if (simulationStep < simulationMaxSteps * 0.2) {
        // Step 1: Highlight potential paragraph borders
        const highlighted = paragraphs.join("\n\n");
        setSimulationText(highlighted);
      }
      else if (simulationStep < simulationMaxSteps * 0.4) {
        // Step 2: Extract first sentences of paragraphs
        const importantSentences = paragraphs.map(p => {
          const firstSentence = p.split(/(?<=[.!?])\s+/)[0];
          return firstSentence || p;
        });
        
        // Gradually highlight the important sentences
        const highlightCount = Math.floor((simulationStep - simulationMaxSteps * 0.2) / 
                               (simulationMaxSteps * 0.2) * importantSentences.length);
        
        let result = originalText;
        for (let i = 0; i < highlightCount && i < importantSentences.length; i++) {
          const sentence = importantSentences[i];
          if (sentence && sentence.length > 0) {
            result = result.replace(sentence, `*${sentence}*`);
          }
        }
        
        setSimulationText(result);
      }
      else if (simulationStep < simulationMaxSteps * 0.6) {
        // Step 3: Create a sliding window effect through the text
        const windowProgress = (simulationStep - simulationMaxSteps * 0.4) / (simulationMaxSteps * 0.2);
        const totalText = originalText.length;
        const windowPosition = Math.floor(windowProgress * (totalText - windowSize));
        
        let result = originalText.substring(0, windowPosition) + 
                    "[[" + originalText.substring(windowPosition, windowPosition + windowSize) + "]]" + 
                    originalText.substring(windowPosition + windowSize);
        
        setSimulationText(result);
      }
      else if (simulationStep < simulationMaxSteps * 0.8) {
        // Step 4: Starting to form the final output
        const leadTextLength = Math.min(
          maxLength * 0.6,
          Math.floor((simulationStep - simulationMaxSteps * 0.6) / (simulationMaxSteps * 0.2) * maxLength * 0.6)
        );
        
        // Get important sentences
        const importantSentences = paragraphs.map(p => {
          const firstSentence = p.split(/(?<=[.!?])\s+/)[0];
          return firstSentence || "";
        }).filter(s => s.length > 0).join(" ");
        
        // Gradually build the result
        let result = originalText.substring(0, leadTextLength);
        
        // Add important parts as available space allows
        if (leadTextLength > maxLength * 0.3) {
          result += "... " + importantSentences.substring(0, maxLength * 0.3);
        }
        
        setSimulationText(result);
      }
      else {
        // Final step: Show the result with proper truncation
        const targetLength = Math.min(
          visualizationData.sliding_window.text.length,
          maxLength
        );
        
        let result = visualizationData.sliding_window.text.substring(0, targetLength);
        
        // Add ellipsis if truncated
        if (result.length < originalText.length) {
          result += "...";
        }
        
        setSimulationText(result);
      }
    } else if (simulationMode === 'sbert') {
      // SBERT simulation - visualize sentence by sentence processing
      const sentences = originalText.split(/(?<=[.!?])\s+/);
      
      if (simulationStep < simulationMaxSteps * 0.3) {
        // Phase 1: Split into sentences
        const processedCount = Math.floor((simulationStep / (simulationMaxSteps * 0.3)) * sentences.length);
        let result = "";
        
        for (let i = 0; i < sentences.length; i++) {
          if (i < processedCount) {
            result += `<span class="text-blue-600">${sentences[i]}</span> `;
          } else {
            result += sentences[i] + " ";
          }
        }
        
        setSimulationText(result);
      } 
      else if (simulationStep < simulationMaxSteps * 0.6) {
        // Phase 2: Show encoding as vectors
        const encodingProgress = (simulationStep - simulationMaxSteps * 0.3) / (simulationMaxSteps * 0.3);
        const sentenceCount = Math.min(sentences.length, 5); // Limit to first 5 sentences for visualization
        
        let result = "";
        for (let i = 0; i < sentenceCount; i++) {
          result += `<span class="font-mono text-xs">${sentences[i]}</span>\n`;
          
          if (encodingProgress > i / sentenceCount) {
            result += `<span class="font-mono text-green-600 text-xs">[${Array(8).fill(0).map(() => (Math.random() * 2 - 1).toFixed(2)).join(", ")}]</span>\n\n`;
          } else {
            result += "\n";
          }
        }
        
        setSimulationText(result);
      }
      else {
        // Phase 3: Combine embeddings and form final result
        const finalProgress = (simulationStep - simulationMaxSteps * 0.6) / (simulationMaxSteps * 0.4);
        const fragments = visualizationData.sbert_viz.chunks.slice(0, 3); // Take 3 key fragments for demonstration
        
        let result = "<span class='text-sm font-medium'>Semantic evaluation results:</span>\n\n";
        fragments.forEach((fragment, idx) => {
          const relevanceScore = 0.5 + Math.random() * 0.5; // Simulate relevance score
          
          if (finalProgress > idx / 3) {
            const scoreColor = relevanceScore > 0.7 ? "text-green-600" : "text-yellow-600";
            result += `<span class="text-xs">${fragment}</span> <span class="${scoreColor} font-medium">(${(relevanceScore * 100).toFixed(0)}%)</span>\n\n`;
          }
        });
        
        // Add final summary
        if (finalProgress > 0.8) {
          result += "\n<span class='text-base font-medium text-blue-700'>Final truncated text:</span>\n\n";
          result += visualizationData.sbert_viz.text;
        }
        
        setSimulationText(result);
      }
    }
    
    // Schedule next step
    const timer = setTimeout(() => {
      setSimulationStep(simulationStep + 1);
    }, simulationSpeed);
    
    return () => clearTimeout(timer);
  }, [isSimulating, simulationStep, simulationMaxSteps, simulationMode, visualizationData, maxLength, windowSize, simulationSpeed]);

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
              <div className="flex border-b border-gray-200 mb-4 overflow-x-auto">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    className={`px-4 py-2 font-medium whitespace-nowrap ${activeTab === tab.id ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-500' : 'text-gray-600'}`}
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

              {activeTab === 'simulate' && (
                <div className="space-y-4">
                  <h4 className="font-medium text-lg mb-2">Truncation Simulation</h4>
                  
                  {!isSimulating ? (
                    <div className="mb-4 p-4 bg-blue-50 rounded-lg">
                      <h5 className="font-medium text-blue-800 mb-2">Simulation Controls</h5>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Simulation Method
                          </label>
                          <select 
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                            value={simulationMode}
                            onChange={(e) => setSimulationMode(e.target.value)}
                          >
                            <option value="sliding_window">Sliding Window (Hierarchical)</option>
                            <option value="sbert">SBERT Processing</option>
                          </select>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Simulation Speed
                          </label>
                          <select 
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                            value={simulationSpeed}
                            onChange={(e) => setSimulationSpeed(parseInt(e.target.value))}
                          >
                            <option value="200">Fast (200ms)</option>
                            <option value="500">Medium (500ms)</option>
                            <option value="1000">Slow (1000ms)</option>
                          </select>
                        </div>
                      </div>
                      
                      <button
                        onClick={startSimulation}
                        className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md flex items-center justify-center gap-2"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                        </svg>
                        Start Simulation
                      </button>
                    </div>
                  ) : (
                    <div className="mb-4 space-y-4">
                      <div className="bg-gray-50 p-4 border rounded-lg">
                        <div className="mb-2 flex justify-between">
                          <span className="text-sm font-medium text-gray-700">
                            Simulating: {simulationMode === 'sliding_window' ? 'Sliding Window Truncation' : 'SBERT Processing'}
                          </span>
                          <button
                            onClick={stopSimulation}
                            className="text-red-600 text-sm font-medium hover:text-red-800"
                          >
                            Stop
                          </button>
                        </div>
                        
                        <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
                          <div 
                            className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                            style={{ 
                              width: `${(simulationStep / simulationMaxSteps) * 100}%` 
                            }}
                          />
                        </div>
                        
                        <p className="whitespace-pre-wrap border p-3 bg-white rounded max-h-60 overflow-y-auto font-mono text-sm leading-relaxed" 
                           dangerouslySetInnerHTML={{
                             __html: simulationText
                               .replace(/\[\[(.*?)\]\]/g, '<span class="bg-yellow-200 font-bold">$1</span>')
                               .replace(/\*(.*?)\*/g, '<span class="text-blue-600 font-bold">$1</span>')
                           }}
                        />
                        
                        <div className="mt-2 text-xs text-gray-500">
                          Step {simulationStep} of approximately {simulationMaxSteps} steps
                        </div>
                      </div>
                      
                      <div className="flex justify-center">
                        <button
                          onClick={stopSimulation}
                          className="px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-md"
                        >
                          Cancel Simulation
                        </button>
                      </div>
                    </div>
                  )}
                  
                  <div className="p-3 bg-gray-50 rounded-lg text-sm">
                    <p className="font-medium mb-2">How Truncation Simulations Work:</p>
                    {simulationMode === 'sliding_window' ? (
                      <ol className="list-decimal pl-5 space-y-1 text-gray-700">
                        <li>Text is analyzed for paragraphs and key sentences</li>
                        <li>Important sentences are highlighted</li>
                        <li>A sliding window moves through the text</li>
                        <li>The algorithm selects content for preservation</li>
                        <li>Finally the truncated text is formed</li>
                      </ol>
                    ) : (
                      <ol className="list-decimal pl-5 space-y-1 text-gray-700">
                        <li>Text is split into sentences</li>
                        <li>Each sentence is encoded into a vector</li>
                        <li>The most semantically relevant sentences are identified</li>
                        <li>The final summary is generated based on semantic importance</li>
                      </ol>
                    )}
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