import React from 'react'
import ReactDOM from 'react-dom/client'
import tmws from '../tmws/tmws'
import './globals.css'
tmws()
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode></React.StrictMode>
)
