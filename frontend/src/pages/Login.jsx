// src/pages/Login.jsx
import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import { AttendanceContext } from '../context/AttendanceContext';

const Login = () => {
  const [currentState, setCurrentState] = useState('Login');
  const navigate = useNavigate();
  const { setToken, setUserId, backendUrl } = useContext(AttendanceContext);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const onSubmitHandler = async (event) => {
    event.preventDefault();

    // Validation
    if (currentState === 'Sign Up') {
      if (password.length < 8) {
        toast.error('Password must be at least 8 characters long');
        return;
      }
      if (password !== confirmPassword) {
        toast.error('Passwords do not match');
        return;
      }
    }

    setLoading(true);

    try {
      const endpoint =
        currentState === 'Sign Up'
          ? `${backendUrl}/api/user/register`
          : `${backendUrl}/api/user/login`;

      const body =
        currentState === 'Sign Up'
          ? { name, email, password }
          : { email, password };

      const { data } = await axios.post(endpoint, body);

      if (data.success) {
        localStorage.setItem('token', data.token);
        
        // Handle user ID - check both possible response formats
        const userId = data.userId || data.user?.id;
        if (userId) {
          localStorage.setItem('userId', userId);
          setUserId(userId);
        }

        setToken(data.token);
        toast.success(`${currentState} successful!`);
        navigate('/');
      } else {
        toast.error(data.message || `${currentState} failed!`);
      }
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Reset form when switching between login/signup
  useEffect(() => {
    setName('');
    setEmail('');
    setPassword('');
    setConfirmPassword('');
  }, [currentState]);

  // Auto-redirect if already logged in
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) navigate('/');
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100 flex items-center justify-center p-4">
      {/* Background Decorative Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-200 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-200 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-amber-200 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>
      </div>

      <div className="relative w-full max-w-md">
        {/* Header Card */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200/50 p-8 mb-6 text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-blue-800 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
          <span className="text-blue-500 text-xl"> <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg></span>
          </div>
          <h1 className="text-2xl font-light text-gray-900 mb-2">
            Quadrant's <span className="font-semibold">Portal</span>
          </h1>
          <p className="text-gray-600 text-sm">
            {currentState === 'Login' ? 'Welcome back to your academic dashboard' : 'Create your academic account'}
          </p>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200/50 p-8">
          {/* Form Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setCurrentState('Login')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  currentState === 'Login'
                    ? 'bg-blue-50 text-blue-700 border border-blue-200'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Sign In
              </button>
              <button
                onClick={() => setCurrentState('Sign Up')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  currentState === 'Sign Up'
                    ? 'bg-blue-50 text-blue-700 border border-blue-200'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Sign Up
              </button>
            </div>
            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
          </div>

          <form onSubmit={onSubmitHandler} className="space-y-5">
            {currentState === 'Sign Up' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name
                </label>
                <div className="relative">
                  <input
                    onChange={(e) => setName(e.target.value)}
                    value={name}
                    type="text"
                    className="w-full px-4 py-3 border border-gray-300/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 bg-gray-50/50"
                    placeholder="Enter your full name"
                    required
                  />
                  <svg className="w-5 h-5 text-gray-400 absolute right-3 top-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <div className="relative">
                <input
                  onChange={(e) => setEmail(e.target.value)}
                  value={email}
                  type="email"
                  className="w-full px-4 py-3 border border-gray-300/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 bg-gray-50/50"
                  placeholder="Enter your email"
                  required
                />
                <svg className="w-5 h-5 text-gray-400 absolute right-3 top-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  onChange={(e) => setPassword(e.target.value)}
                  value={password}
                  type="password"
                  className="w-full px-4 py-3 border border-gray-300/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 bg-gray-50/50"
                  placeholder="Enter your password"
                  minLength="8"
                  required
                />
                <svg className="w-5 h-5 text-gray-400 absolute right-3 top-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              {currentState === 'Sign Up' && (
                <p className="text-xs text-gray-500 mt-2">
                  Password must be at least 8 characters long
                </p>
              )}
            </div>

            {currentState === 'Sign Up' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Confirm Password
                </label>
                <div className="relative">
                  <input
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    value={confirmPassword}
                    type="password"
                    className="w-full px-4 py-3 border border-gray-300/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 bg-gray-50/50"
                    placeholder="Confirm your password"
                    minLength="8"
                    required
                  />
                  <svg className="w-5 h-5 text-gray-400 absolute right-3 top-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between pt-2">
            
              
              <button
                type="button"
                onClick={() => setCurrentState(currentState === 'Login' ? 'Sign Up' : 'Login')}
                className="text-sm text-gray-600 hover:text-gray-700 font-medium transition-colors duration-200"
              >
                {currentState === 'Login' ? 'Create account' : 'Login here'}
              </button>
            </div>

            <button 
              type="submit"
              disabled={loading}
              className={`w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white font-medium py-3.5 rounded-xl transition-all duration-200 flex items-center justify-center space-x-2 ${
                loading 
                  ? 'opacity-50 cursor-not-allowed' 
                  : 'hover:from-blue-700 hover:to-blue-800 hover:shadow-lg transform hover:-translate-y-0.5'
              }`}
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Please wait...</span>
                </>
              ) : (
                <>
                  <span>{currentState === 'Login' ? 'Sign In' : 'Create Account'}</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </>
              )}
            </button>
          </form>

          {/* Footer */}
          <div className="mt-6 pt-6 border-t border-gray-200/50">
            <p className="text-center text-xs text-gray-500">
              By continuing, you agree to our{' '}
              <button className="text-blue-600 hover:text-blue-700 font-medium">
                Terms of Service
              </button>{' '}
              and{' '}
              <button className="text-blue-600 hover:text-blue-700 font-medium">
                Privacy Policy
              </button>
            </p>
          </div>
        </div>

        {/* Additional Info */}
        
      </div>

      {/* Add custom animations to tailwind config */}
      <style jsx>{`
        @keyframes blob {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>
    </div>
  );
};

export default Login;
