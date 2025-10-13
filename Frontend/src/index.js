import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css'; 

const container = document.getElementById('root');
if (!container) {
  throw new Error("No root element found! Ensure <div id='root'></div> is present in public/index.html.");
}

const root = ReactDOM.createRoot(container);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
