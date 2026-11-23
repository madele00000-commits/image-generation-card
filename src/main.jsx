import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ImageGeneration } from './ImageGeneration.jsx';
import './styles.css';

function App() {
  const [image, setImage] = useState(null);
  useEffect(() => {
    // Demo model response. A real caller can pass src=null until its result arrives.
    const response = setTimeout(() => setImage('/images/stingrays.webp'), 8000);
    return () => clearTimeout(response);
  }, []);
  return (
    <main className="stage" aria-label="Scene generation preview">
      <ImageGeneration src={image} />
    </main>
  );
}

createRoot(document.getElementById('root')).render(
  <React.StrictMode><App /></React.StrictMode>,
);
