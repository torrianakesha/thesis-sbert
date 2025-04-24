import React from 'react';
import Head from 'next/head';
import TruncationVisualizer from '../components/TruncationVisualizer';

export default function TruncationVisualizerPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Head>
        <title>Text Truncation Visualizer</title>
        <meta name="description" content="Visualize different text truncation methods and their semantic impacts" />
      </Head>
      
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-4 px-4">
          <h1 className="text-xl font-bold text-gray-900">
            Text Truncation Visualization Tool
          </h1>
          <p className="text-gray-500 mt-1">
            Compare different truncation methods and their impact on semantic meaning
          </p>
        </div>
      </header>
      
      <main className="py-8">
        <TruncationVisualizer />
      </main>
    </div>
  );
} 