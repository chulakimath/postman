/**
 * Application Entry Point
 * 
 * This is the main entry file for the React application.
 * It renders the root App component and applies global styles.
 */

import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

// Create root and render app
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
