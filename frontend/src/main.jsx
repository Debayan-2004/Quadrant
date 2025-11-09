// main.jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import { BrowserRouter } from 'react-router-dom';
import { AttendanceProvider } from './context/AttendanceContext';

ReactDOM.createRoot(document.getElementById('root')).render(
  // ✅ FIX: BrowserRouter must be the parent of AttendanceProvider
  // because the provider uses the 'useNavigate' hook which needs the router context.
  <BrowserRouter>
    <AttendanceProvider>
      <App />
    </AttendanceProvider>
  </BrowserRouter>
);
