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
  sentence?: {
    text: string;
    length: number;
    tokens: number;
    reduction_percent: number;
  };
  semantic?: {
    sliding_window_similarity: number;
    sbert_similarity: number;
  };
}

const TruncationVisualizer: React.FC = () => {
  const [inputText, setInputText] = useState<string>('');
  const [maxLength, setMaxLength] = useState<number>(100);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [visualizationData, setVisualizationData] = useState<TruncationData | null>(null);
  const [activeTab, setActiveTab] = useState<string>('original');
  
  // Simulation state
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [simulationMethod, setSimulationMethod] = useState<string>('sliding_window');
  const [simulationText, setSimulationText] = useState<string>('');
  const [simulationStep, setSimulationStep] = useState<number>(0);
  const [simulationMaxSteps, setSimulationMaxSteps] = useState<number>(0);
  const [simulationSpeed, setSimulationSpeed] = useState<number>(100); // ms between steps
  const [windowSize, setWindowSize] = useState<number>(30); // Sliding window size

  const handleVisualize = async () => {
    if (!inputText.trim()) {
      setError('Please enter some text to visualize');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // If the backend endpoint exists, use it
      try {
        const response = await fetch('http://localhost:8000/text-truncation', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            text: inputText,
            max_length: maxLength,
            window_size: windowSize
          }),
        });

        if (!response.ok) {
          throw new Error(`Error: ${response.status}`);
        }

        const data = await response.json();
        
        // Make sure data has the sliding_window property
        if (!data.sliding_window && data.word) {
          data.sliding_window = data.word; // Backward compatibility
        } else if (!data.sliding_window) {
          // Create sliding window data if it doesn't exist
          data.sliding_window = {
            text: applySlidingWindowTruncation(data.original.text, maxLength, windowSize),
            length: 0,
            tokens: 0,
            reduction_percent: 0
          };
          
          // Calculate length, tokens, and reduction
          data.sliding_window.length = data.sliding_window.text.length;
          data.sliding_window.tokens = data.sliding_window.text.split(/\s+/).length;
          data.sliding_window.reduction_percent = data.original.length > 0 
            ? Math.round((1 - data.sliding_window.length / data.original.length) * 100)
            : 0;
        }
        
        // Fix semantic data if needed
        if (data.semantic && !data.semantic.sliding_window_similarity && data.semantic.word_similarity) {
          data.semantic.sliding_window_similarity = data.semantic.word_similarity;
        }
        
        setVisualizationData(data);
      } catch (err) {
        // If backend is not available, implement client-side truncation
        console.warn("Backend connection failed, using client-side truncation", err);
        
        // Sliding window hierarchical truncation
        const slidingWindowTruncated = applySlidingWindowTruncation(inputText, maxLength, windowSize);
        
        // SBERT visualization processing
        const sbertProcessing = simulateSBERTProcessing(inputText, maxLength);
        
        // Sentence-aware truncation
        const sentences = inputText.split(/(?<=[.!?])\s+/);
        let sentenceTruncated = "";
        let currentLength = 0;
        
        for (const sentence of sentences) {
          if (currentLength + sentence.length <= maxLength) {
            sentenceTruncated += sentence + " ";
            currentLength += sentence.length + 1;
          } else {
            break;
          }
        }
        
        sentenceTruncated = sentenceTruncated.trim();
        if (inputText.length > maxLength) {
          sentenceTruncated += "...";
        }
        
        // Calculate tokens
        const estimateTokens = (text: string) => text.split(/\s+/).length;
        
        // Calculate reduction percentage
        const calculateReduction = (truncated: string) => {
          return inputText.length > 0 
            ? Math.round((1 - truncated.length / inputText.length) * 100)
            : 0;
        };
        
        // Create a mock data structure similar to what the backend would return
        const mockVisualizationData = {
          original: {
            text: inputText,
            length: inputText.length,
            tokens: estimateTokens(inputText),
            sentences: sentences.length,
            words: inputText.split(/\s+/).length
          },
          sliding_window: {
            text: slidingWindowTruncated,
            length: slidingWindowTruncated.length,
            tokens: estimateTokens(slidingWindowTruncated),
            reduction_percent: calculateReduction(slidingWindowTruncated),
            pooling_metrics: {
              mean_pooling: 0.78, // Mock pooling metrics
              attention_pooling: 0.85
            }
          },
          sbert_viz: {
            text: sbertProcessing.text,
            length: sbertProcessing.text.length,
            tokens: estimateTokens(sbertProcessing.text),
            chunks: sbertProcessing.chunks,
            embeddings_preview: sbertProcessing.embeddings_preview,
            reduction_percent: calculateReduction(sbertProcessing.text)
          },
          sentence: {
            text: sentenceTruncated,
            length: sentenceTruncated.length,
            tokens: estimateTokens(sentenceTruncated),
            reduction_percent: calculateReduction(sentenceTruncated)
          },
          semantic: {
            sliding_window_similarity: 0.82,
            sbert_similarity: 0.95 // SBERT usually preserves semantic meaning well
          }
        };
        
        setVisualizationData(mockVisualizationData);
      }
    } catch (err) {
      setError(`Failed to analyze: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Function to apply sliding window with hierarchical features
  const applySlidingWindowTruncation = (text: string, maxLength: number, windowSize: number): string => {
    if (text.length <= maxLength) return text;

    // 1. Split text into hierarchical levels (sections, paragraphs, sentences)
    const paragraphs = text.split(/\n\n+/);
    
    // 2. Extract key sentences from each paragraph based on position (first, last) and importance
    let keyContent = "";
    let remainingLength = maxLength - 3; // Account for ellipsis
    
    // Extract first sentence of each paragraph as they often contain topic sentences
    for (let i = 0; i < paragraphs.length && remainingLength > 0; i++) {
      const paragraphSentences = paragraphs[i].split(/(?<=[.!?])\s+/);
      
      if (paragraphSentences.length > 0 && paragraphSentences[0].length <= remainingLength) {
        keyContent += paragraphSentences[0] + " ";
        remainingLength -= paragraphSentences[0].length + 1;
      }
    }
    
    // If we still have space, use sliding window to capture more content from the beginning
    if (remainingLength > windowSize) {
      // Find a good breaking point in the original text around the maxLength
      const candidateText = text.substring(0, maxLength - keyContent.length - 3);
      
      // Look for a good breaking point (end of sentence or end of word)
      let breakPoint = candidateText.length;
      const lastSentenceEnd = Math.max(
        candidateText.lastIndexOf('.'), 
        candidateText.lastIndexOf('!'), 
        candidateText.lastIndexOf('?')
      );
      
      if (lastSentenceEnd > breakPoint - windowSize) {
        breakPoint = lastSentenceEnd + 1;
      } else {
        // If no sentence end found, try word boundary
        const lastSpace = candidateText.lastIndexOf(' ');
        if (lastSpace > breakPoint - 10) {
          breakPoint = lastSpace;
        }
      }
      
      // Grab content from beginning up to the break point
      const leadContent = text.substring(0, breakPoint).trim();
      
      // Final truncated text combines: beginning + key topic sentences
      return leadContent + "..." + (keyContent ? " " + keyContent.trim() : "");
    }
    
    // If key content is enough, just return it
    return keyContent.trim() + "...";
  };

  // Function to simulate SBERT processing
  const simulateSBERTProcessing = (text: string, maxLength: number): { 
    text: string, 
    chunks: string[], 
    embeddings_preview: number[][]
  } => {
    // Split text into sentences (SBERT's typical processing unit)
    const sentences = text.split(/(?<=[.!?])\s+/).filter(s => s.trim().length > 0);
    
    // Truncate to a reasonable number of sentences if needed
    const chunks = sentences.slice(0, Math.min(sentences.length, 10));
    
    // Create simulated embeddings (normally 384-dimensional, but we'll use small ones for preview)
    const embeddings_preview: number[][] = [];
    
    chunks.forEach(chunk => {
      // Simulate embedding generation - in reality, SBERT generates 384-1024 dimensional embeddings
      // Here we'll create small random vectors just for visualization
      const embeddingSize = 8; // Small size for preview
      const embedding = Array(embeddingSize).fill(0).map(() => Math.random() * 2 - 1);
      embeddings_preview.push(embedding);
    });
    
    // Produce a summarized text that shows what SBERT might generate
    let outputText = "";
    const totalSentences = sentences.length;
    const targetSentences = Math.max(1, Math.min(5, Math.floor(totalSentences / 3)));
    
    // Choose representative sentences (first, a middle one, and last)
    if (totalSentences > 0) outputText += sentences[0] + " ";
    if (totalSentences > 3) outputText += sentences[Math.floor(totalSentences / 2)] + " ";
    if (totalSentences > 1) outputText += sentences[totalSentences - 1];
    
    // Ensure we're within maxLength
    if (outputText.length > maxLength) {
      outputText = outputText.substring(0, maxLength - 3) + "...";
    }
    
    return {
      text: outputText.trim(),
      chunks,
      embeddings_preview
    };
  };

  const getColorGradient = (similarity: number | undefined) => {
    if (similarity === undefined) return '#6B7280'; // Gray default
    
    // Red to green gradient based on similarity (0.0 to 1.0)
    const red = Math.round(255 * (1 - similarity));
    const green = Math.round(200 * similarity);
    return `rgb(${red}, ${green}, 50)`;
  };

  const getTruncatedText = (original: string, truncated: string) => {
    if (original === truncated) return truncated;
    
    // Find the point where truncation happened
    let commonLength = 0;
    for (let i = 0; i < Math.min(original.length, truncated.length - 3); i++) {
      if (original[i] === truncated[i]) {
        commonLength = i + 1;
      } else {
        break;
      }
    }

    return (
      <>
        <span>{truncated.substring(0, commonLength)}</span>
        <span style={{ color: 'red', fontWeight: 'bold' }}>{truncated.substring(commonLength)}</span>
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
    
    if (simulationMethod === 'sliding_window') {
      // For sliding window, we'll show the window moving through text
      steps = Math.max(30, originalText.length / 3); // More steps for sliding window visual
    } else if (simulationMethod === 'sbert_viz') {
      // For SBERT visualization, we'll simulate the SBERT processing
      steps = Math.max(40, visualizationData.sbert_viz.chunks?.length * 3 || 40);
    }
    
    setSimulationMaxSteps(Math.max(10, steps)); // Ensure at least 10 steps for visual effect
  };

  // Simulation effect
  useEffect(() => {
    if (!isSimulating || !visualizationData) return;
    
    const originalText = visualizationData.original.text;
    
    // If we've reached the end of simulation
    if (simulationStep >= simulationMaxSteps) {
      // Set final state based on method
      if (simulationMethod === 'sliding_window') {
        setSimulationText(visualizationData.sliding_window.text);
      } else if (simulationMethod === 'sbert_viz') {
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
    
    if (simulationMethod === 'sliding_window') {
      // Sliding window: simulate the window moving through the text
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
        // Final step: Complete truncation
        let finalText = applySlidingWindowTruncation(originalText, maxLength, windowSize);
        
        // Add ellipsis if needed
        if (simulationStep < simulationMaxSteps - 3) {
          const ellipsisCount = simulationStep % 4;
          if (finalText.includes("...")) {
            finalText = finalText.replace("...", ".".repeat(ellipsisCount));
          } else if (originalText.length > maxLength) {
            finalText += ".".repeat(ellipsisCount);
          }
        }
        
        setSimulationText(finalText);
      }
    }
    else if (simulationMethod === 'sbert_viz') {
      // SBERT visualization simulation
      if (!visualizationData.sbert_viz) {
        setSimulationText("SBERT visualization data not available");
        return;
      }
      
      if (simulationStep < simulationMaxSteps * 0.3) {
        // Step 1: Show text being split into chunks
        const sentences = originalText.split(/(?<=[.!?])\s+/);
        const chunkCount = Math.ceil((simulationStep / (simulationMaxSteps * 0.3)) * sentences.length);
        
        let result = "";
        for (let i = 0; i < sentences.length; i++) {
          if (i < chunkCount) {
            result += `[Chunk ${i+1}] ${sentences[i]} `;
          } else {
            result += sentences[i] + " ";
          }
        }
        
        setSimulationText(result.trim());
      }
      else if (simulationStep < simulationMaxSteps * 0.6) {
        // Step 2: Show chunks being processed through SBERT
        const chunks = visualizationData.sbert_viz.chunks || [];
        const processedCount = Math.ceil(
          ((simulationStep - simulationMaxSteps * 0.3) / (simulationMaxSteps * 0.3)) * chunks.length
        );
        
        let result = "SBERT processing:\n";
        for (let i = 0; i < chunks.length; i++) {
          if (i < processedCount) {
            result += `✅ Chunk ${i+1}: "${chunks[i]}"\n`;
          } else {
            result += `⏳ Chunk ${i+1}: "${chunks[i]}"\n`;
          }
        }
        
        setSimulationText(result.trim());
      }
      else if (simulationStep < simulationMaxSteps * 0.8) {
        // Step 3: Show embedding calculation
        const progress = (simulationStep - simulationMaxSteps * 0.6) / (simulationMaxSteps * 0.2);
        
        let result = "Generating embeddings...\n";
        result += `[${Array(Math.floor(progress * 20)).fill('▓').join('')}${Array(20 - Math.floor(progress * 20)).fill('░').join('')}] ${Math.floor(progress * 100)}%\n\n`;
        
        // Add vector visualization
        const embeddings = visualizationData.sbert_viz.embeddings_preview || [];
        const vectorCount = Math.ceil(progress * embeddings.length);
        
        for (let i = 0; i < vectorCount && i < embeddings.length; i++) {
          const embedding = embeddings[i];
          result += `Vector ${i+1}: [${embedding.slice(0, 5).map(v => v.toFixed(2)).join(', ')}...]\n`;
        }
        
        setSimulationText(result);
      }
      else {
        // Final step: Complete truncation with SBERT
        const embeddings = visualizationData.sbert_viz.embeddings_preview || [];
        const chunks = visualizationData.sbert_viz.chunks || [];
        
        let result = "SBERT truncation complete!\n\n";
        result += "Selected semantically important chunks:\n";
        
        // Show selected chunks (simulate selection based on importance)
        const selectedCount = Math.min(3, chunks.length);
        for (let i = 0; i < selectedCount; i++) {
          result += `• ${chunks[i]}\n`;
        }
        
        result += "\nFinal truncated text:\n";
        result += visualizationData.sbert_viz.text;
        
        setSimulationText(result);
      }
    }
    
    // Schedule the next step
    const timer = setTimeout(() => {
      setSimulationStep(prev => prev + 1);
    }, simulationSpeed);
    
    return () => clearTimeout(timer);
  }, [isSimulating, simulationStep, simulationMethod, simulationMaxSteps, visualizationData, maxLength, simulationSpeed, windowSize]);

  const tabs = [
    { id: 'original', label: 'Original' },
    { id: 'sliding_window', label: 'Sliding Window' },
    { id: 'sbert_viz', label: 'SBERT Visualization' }
  ];

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Text Truncation Visualizer</h1>
      
      <div className="mb-6">
        <label className="block text-gray-700 mb-2">Input Text:</label>
        <textarea
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
          rows={6}
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Enter text to see how different truncation methods affect it..."
        />
      </div>
      
      <div className="flex flex-wrap gap-4 mb-6">
        <div className="flex flex-col">
          <label className="block text-gray-700 mb-2">Max Length (characters):</label>
          <input
            type="number"
            min={10}
            max={1000}
            className="w-32 px-3 py-2 border border-gray-300 rounded-md"
            value={maxLength}
            onChange={(e) => setMaxLength(parseInt(e.target.value) || 100)}
          />
        </div>
        
        <div className="flex flex-col">
          <label className="block text-gray-700 mb-2">Sliding Window Size:</label>
          <input
            type="number"
            min={5}
            max={100}
            className="w-32 px-3 py-2 border border-gray-300 rounded-md"
            value={windowSize}
            onChange={(e) => setWindowSize(parseInt(e.target.value) || 30)}
          />
        </div>
      </div>
      
      <div className="flex flex-wrap gap-3 mb-4">
        <button
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors duration-200 flex items-center gap-2 font-medium"
          onClick={handleVisualize}
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Processing...
            </>
          ) : (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              Visualize Truncation
            </>
          )}
        </button>
        
        {visualizationData && (
          <div className="flex items-center gap-3">
            <button
              className={`px-4 py-2 rounded-md ${isSimulating ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'} text-white transition-colors duration-200 flex items-center gap-2 font-medium`}
              onClick={isSimulating ? () => setIsSimulating(false) : startSimulation}
              disabled={isLoading}
            >
              {isSimulating ? (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Stop Simulation
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Simulate Truncation
                </>
              )}
            </button>
            
            <select
              className="px-3 py-2 border border-gray-300 rounded-md bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              value={simulationMethod}
              onChange={(e) => setSimulationMethod(e.target.value)}
              disabled={isSimulating}
            >
              <option value="sliding_window">Sliding Window</option>
              <option value="sbert_viz">SBERT Visualization</option>
            </select>
            
            <select
              className="px-3 py-2 border border-gray-300 rounded-md bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              value={simulationSpeed}
              onChange={(e) => setSimulationSpeed(parseInt(e.target.value))}
              disabled={isSimulating}
            >
              <option value="300">Slow</option>
              <option value="150">Medium</option>
              <option value="50">Fast</option>
            </select>
          </div>
        )}
      </div>
      
      {error && (
        <div className="mt-4 p-3 bg-red-100 text-red-700 rounded-md">{error}</div>
      )}
      
      {isSimulating && (
        <div className="mt-6 p-4 border rounded-lg bg-gray-50">
          <h3 className="text-lg font-medium mb-2">
            Truncation Simulation - {simulationMethod.charAt(0).toUpperCase() + simulationMethod.slice(1)} Method
          </h3>
          <div className="mb-3 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className="h-full bg-blue-600 transition-all duration-200" 
              style={{ width: `${(simulationStep / simulationMaxSteps) * 100}%` }}
            ></div>
          </div>
          <div className="relative border p-4 bg-white rounded-md">
            <p className="whitespace-pre-wrap">
              {simulationMethod === 'sliding_window' ? (
                <span dangerouslySetInnerHTML={{
                  __html: simulationText
                    .replace(/\[\[(.*?)\]\]/g, '<span class="bg-yellow-200">$1</span>')
                    .replace(/\*(.*?)\*/g, '<span class="text-blue-600 font-bold">$1</span>')
                }} />
              ) : (
                simulationText
              )}
              <span className="animate-pulse">|</span>
            </p>
          </div>
          <div className="mt-2 text-sm text-gray-500">
            Showing step {simulationStep} of approximately {simulationMaxSteps} steps
          </div>
        </div>
      )}
      
      {visualizationData && !isSimulating && (
        <div className="mt-8 border border-gray-200 rounded-lg overflow-hidden">
          <div className="flex border-b border-gray-200">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                className={`px-4 py-2 font-medium ${activeTab === tab.id ? 'bg-blue-50 text-blue-600' : 'text-gray-600'}`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>
          
          <div className="p-4">
            {activeTab === 'original' && (
              <div>
                <h3 className="font-medium text-lg mb-2">Original Text</h3>
                <p className="whitespace-pre-wrap mb-4 border p-3 bg-gray-50 rounded">{visualizationData.original.text}</p>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Length:</span> {visualizationData.original.length} characters
                  </div>
                  <div>
                    <span className="font-medium">Tokens:</span> ~{visualizationData.original.tokens}
                  </div>
                  <div>
                    <span className="font-medium">Words:</span> {visualizationData.original.words}
                  </div>
                  <div>
                    <span className="font-medium">Sentences:</span> {visualizationData.original.sentences}
                  </div>
                </div>
              </div>
            )}
            
            {activeTab === 'sliding_window' && (
              <div>
                <h3 className="font-medium text-lg mb-2">Sliding Window Truncation</h3>
                {visualizationData && visualizationData.sliding_window ? (
                  <>
                    <p className="whitespace-pre-wrap mb-4 border p-3 bg-gray-50 rounded">
                      {getTruncatedText(visualizationData.original.text, visualizationData.sliding_window.text)}
                    </p>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium">Length:</span> {visualizationData.sliding_window.length} characters
                      </div>
                      <div>
                        <span className="font-medium">Tokens:</span> ~{visualizationData.sliding_window.tokens}
                      </div>
                      <div>
                        <span className="font-medium">Reduction:</span> {visualizationData.sliding_window.reduction_percent}%
                      </div>
                      <div>
                        <span className="font-medium">Window Size:</span> {windowSize} characters
                      </div>
                      {visualizationData.semantic && visualizationData.semantic.sliding_window_similarity !== undefined && (
                        <div>
                          <span className="font-medium">Semantic similarity:</span>
                          <span style={{ color: getColorGradient(visualizationData.semantic.sliding_window_similarity), marginLeft: '4px', fontWeight: 'bold' }}>
                            {Math.round(visualizationData.semantic.sliding_window_similarity * 100)}%
                          </span>
                        </div>
                      )}
                    </div>
                    
                    {/* Pooling Metrics Section */}
                    {visualizationData.sliding_window.pooling_metrics && (
                      <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                        <h4 className="font-medium text-blue-800 mb-2">Advanced Pooling Metrics</h4>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <div className="font-medium text-sm mb-1">Mean Pooling:</div>
                            <div className="flex items-center">
                              <div className="w-40 bg-gray-200 rounded-full h-3 mr-2">
                                <div 
                                  className="bg-blue-600 h-3 rounded-full" 
                                  style={{ 
                                    width: `${visualizationData.sliding_window.pooling_metrics.mean_pooling * 100}%` 
                                  }}
                                />
                              </div>
                              <span className="text-sm font-medium">{Math.round(visualizationData.sliding_window.pooling_metrics.mean_pooling * 100)}%</span>
                            </div>
                            <p className="text-xs text-gray-600 mt-1">
                              Average of all sentence embeddings from original and truncated text
                            </p>
                          </div>
                          
                          <div>
                            <div className="font-medium text-sm mb-1">Attention Pooling (Query-aware):</div>
                            <div className="flex items-center">
                              <div className="w-40 bg-gray-200 rounded-full h-3 mr-2">
                                <div 
                                  className="bg-purple-600 h-3 rounded-full" 
                                  style={{ 
                                    width: `${visualizationData.sliding_window.pooling_metrics.attention_pooling * 100}%` 
                                  }}
                                />
                              </div>
                              <span className="text-sm font-medium">{Math.round(visualizationData.sliding_window.pooling_metrics.attention_pooling * 100)}%</span>
                            </div>
                            <p className="text-xs text-gray-600 mt-1">
                              Weighted average based on relevance to the truncated text
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-red-500">Sliding window data is not available. Please try visualizing the text again.</p>
                )}
                <div className="mt-4 p-3 bg-blue-50 rounded-lg text-sm">
                  <p className="font-medium text-blue-800">How Sliding Window Hierarchical Works:</p>
                  <ol className="list-decimal pl-5 mt-2 text-blue-700 space-y-1">
                    <li>Analyzes text structure (paragraphs, sentences)</li>
                    <li>Extracts the first sentence from each paragraph (topic sentences)</li>
                    <li>Uses a sliding window to maintain local context</li>
                    <li>Combines beginning text with key sentences for better context preservation</li>
                    <li>Prioritizes hierarchical structure over arbitrary word boundaries</li>
                  </ol>
                </div>
              </div>
            )}
            
            {activeTab === 'sbert_viz' && visualizationData && visualizationData.sbert_viz && (
              <div className="space-y-6">
                <div className="bg-white p-6 rounded-lg shadow">
                  <h3 className="text-xl font-semibold mb-4">SBERT Visualization</h3>
                  
                  <div className="mb-6">
                    <h4 className="text-lg font-medium mb-2">How SBERT Works</h4>
                    <p className="text-gray-700 mb-4">
                      Sentence-BERT (SBERT) is a modification of the BERT network that uses siamese and triplet networks
                      to derive semantically meaningful sentence embeddings. Here's how it processes your text:
                    </p>
                    
                    <div className="bg-gray-50 p-4 rounded-md">
                      <ol className="list-decimal list-inside space-y-2">
                        <li>Split the text into chunks/sentences</li>
                        <li>Process each chunk through the SBERT model</li>
                        <li>Generate vector embeddings for each chunk</li>
                        <li>Use these embeddings to calculate semantic similarity</li>
                      </ol>
                    </div>
                  </div>
                  
                  <div className="mb-6">
                    <h4 className="text-lg font-medium mb-2">Text Chunking</h4>
                    <p className="text-gray-700 mb-2">
                      Your text was split into {visualizationData.sbert_viz.chunks.length} chunks:
                    </p>
                    
                    <div className="bg-gray-50 rounded-md p-4 max-h-60 overflow-y-auto">
                      {visualizationData.sbert_viz.chunks.map((chunk, index) => (
                        <div key={index} className="mb-2 p-2 bg-blue-50 rounded">
                          <span className="font-mono text-sm">{chunk}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div className="mb-6">
                    <h4 className="text-lg font-medium mb-2">Embedding Visualization</h4>
                    <p className="text-gray-700 mb-2">
                      Each chunk is converted to a high-dimensional vector. Here's a simplified 2D representation:
                    </p>
                    
                    <div className="bg-gray-50 p-4 rounded-md h-60 relative">
                      {visualizationData.sbert_viz.embeddings_preview.map((embedding, index) => (
                        <div 
                          key={index}
                          className="absolute w-4 h-4 rounded-full bg-blue-500 transform transition-all duration-500"
                          style={{
                            left: `${(embedding[0] * 80) + 10}%`,
                            top: `${(embedding[1] * 80) + 10}%`,
                            opacity: 0.7
                          }}
                          title={`Chunk ${index + 1}`}
                        />
                      ))}
                    </div>
                    <p className="text-xs text-gray-500 mt-1 text-center">
                      Note: This is a simplified 2D projection of higher-dimensional embeddings
                    </p>
                  </div>
                  
                  <div className="mt-6">
                    <h4 className="text-lg font-medium mb-2">Semantic Similarity</h4>
                    <p className="text-gray-700 mb-2">
                      SBERT allows comparing the semantic meaning between texts:
                    </p>
                    
                    {visualizationData.semantic && visualizationData.semantic.sbert_similarity && (
                      <div className="flex items-center mt-4">
                        <span className="mr-2 text-sm w-32">Similarity Score:</span>
                        <div className="flex-1 bg-gray-200 rounded-full h-4">
                          <div 
                            className="bg-green-500 h-4 rounded-full" 
                            style={{ width: `${visualizationData.semantic.sbert_similarity * 100}%` }}
                          ></div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default TruncationVisualizer;