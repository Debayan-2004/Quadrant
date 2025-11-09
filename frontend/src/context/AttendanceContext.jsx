import React, { createContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export const AttendanceContext = createContext();

export const AttendanceProvider = ({ children }) => {
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [userId, setUserId] = useState(localStorage.getItem('userId') || '');
  const navigate = useNavigate();
  const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:4000';

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedUserId = localStorage.getItem('userId');
    if (storedToken) setToken(storedToken);
    if (storedUserId) setUserId(storedUserId);
  }, []);

  return (
    <AttendanceContext.Provider
      value={{
        token,
        setToken,
        userId,
        setUserId,
        backendUrl,
        navigate,
      }}
    >
      {children}
    </AttendanceContext.Provider>
  );
};



