import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Pages
import Login from './pages/Login';
import Home from './pages/Homepage';
import Classes from './pages/Classes';

import MarkAttendancePage from './pages/MarkAttendance';

const App = () => {
  return (
    <div >
      <ToastContainer />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<Home />} />
        <Route path="/classes" element={<Classes />} />
        <Route path="/attendance" element={<MarkAttendancePage />} /> 
      </Routes>
    </div>
  );
};

export default App;

