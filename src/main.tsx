import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './styles/global.css'

// Ensure global polyfills for the entire App
import { Buffer } from "buffer";
import process from "process";
(window as any).Buffer = Buffer;
(window as any).process = process;
if (!(window as any).process.version) (window as any).process.version = 'v18.0.0';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)