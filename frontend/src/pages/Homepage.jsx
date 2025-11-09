import React, { useEffect, useState, useContext, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { AttendanceContext } from "../context/AttendanceContext";
import SubjectAttendanceSummary from "../components/SubjectAttendanceSummary";

const Home = () => {
  const navigate = useNavigate();
  const { setUserId, setToken, backendUrl } = useContext(AttendanceContext);
  const [username, setUsername] = useState("");
  const [userGroup, setUserGroup] = useState("");
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const [showGroupDropdown, setShowGroupDropdown] = useState(false);
  
  const dropdownRef = useRef(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
      return;
    }

    const fetchUser = async () => {
      try {
        const res = await axios.get(`${backendUrl}/api/user/profile`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.data.success && res.data.user) {
          setUsername(res.data.user.name || "User");
          setUserGroup(res.data.user.group || "Not set");
          
          if (res.data.user.id) {
            setUserId(res.data.user.id);
            localStorage.setItem("userId", res.data.user.id);
          }
        } else {
          throw new Error("Invalid response format");
        }

        setToken(token);
      } catch (err) {
        console.error("Error fetching user:", err);
        localStorage.removeItem("token");
        localStorage.removeItem("userId");
        navigate("/login");
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [navigate, backendUrl, setUserId, setToken]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowGroupDropdown(false);
      }
    };

    if (showGroupDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showGroupDropdown]);

  const handleUpdateGroup = async (newGroup) => {
    const token = localStorage.getItem("token");
    if (!token) {
      alert("Please login again");
      navigate("/login");
      return;
    }
  
    setProfileLoading(true);
    try {
      const res = await axios.put(
        `${backendUrl}/api/user/profile/group`,
        { group: newGroup },
        {
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
      );
  
      if (res.data.success) {
        setUserGroup(newGroup);
        setShowGroupDropdown(false);
        alert(`Group updated successfully to ${newGroup}!`);
      } else {
        alert("Failed to update group: " + (res.data.message || "Unknown error"));
      }
    } catch (err) {
      console.error("Error updating group:", err);
      
      if (err.code === 'ECONNABORTED') {
        alert("Request timeout - Backend might be down or slow");
      } else if (err.code === 'NETWORK_ERROR' || err.message?.includes('Network Error')) {
        alert("Network error - Check backend URL: " + backendUrl);
      } else if (err.response?.status === 401) {
        alert("Authentication failed - Please login again");
        localStorage.removeItem("token");
        navigate("/login");
      } else if (err.response?.status === 404) {
        alert("Endpoint not found - Check if backend routes are correct");
      } else if (err.response?.status === 500) {
        alert("Server error - Check backend console for details");
      } else {
        alert("Failed to update group - Please try again");
      }
    } finally {
      setProfileLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("userId");
    setToken("");
    setUserId("");
    navigate("/login");
  };

  const navigateTo = (path) => {
    navigate(path);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-gray-300 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-700 text-lg font-medium">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100">
      <header className="bg-white/90 backdrop-blur-md border-b border-gray-300/50 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-700 to-blue-900 rounded-lg flex items-center justify-center shadow-sm">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div>
                <h1 className="text-lg font-semibold text-gray-900 tracking-tight">Quadrant's Attendance Portal</h1>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <button
                onClick={handleLogout}
                className="flex items-center space-x-2 bg-white border border-gray-400/50 hover:border-red-400 hover:bg-red-50 text-gray-700 hover:text-red-700 px-4 py-2.5 rounded-lg shadow-sm transition-all duration-200 font-medium"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span className="inline">Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="bg-gradient-to-br from-gray-900 to-blue-900 rounded-2xl shadow-2xl p-8 mb-8 text-white relative overflow-hidden">
          <div className="absolute inset-0 opacity-5">
            <div className="absolute top-0 right-0 w-40 h-40 bg-white rounded-full -mr-20 -mt-20"></div>
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-white rounded-full -ml-16 -mb-16"></div>
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-48 h-48 border-2 border-white rounded-full"></div>
          </div>
          
          <div className="relative z-10">
            <div className="flex flex-col lg:flex-row items-start justify-between">
              <div className="text-center lg:text-left mb-8 lg:mb-0 lg:mr-8 flex-1">
                <div className="inline-flex items-center px-4 py-2 bg-white/10 rounded-full mb-6 border border-white/20">
                  <svg className="w-4 h-4 mr-2 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <span className="text-blue-100 text-sm font-medium">Welcome</span>
                </div>
                
                <h1 className="text-4xl sm:text-5xl font-light mb-4 tracking-tight">
                  Hello , <span className="font-semibold text-white">{username}</span>
                </h1>
                
                <div className="relative inline-block" ref={dropdownRef}>
                  <div className="flex items-center space-x-3 mb-6">
                    <div className="bg-white/10 rounded-lg px-4 py-2 border border-white/20">
                      <span className="text-blue-200 text-sm">Group: </span>
                      <span className="font-semibold text-white">{userGroup}</span>
                    </div>
                    <button
                      onClick={() => setShowGroupDropdown(!showGroupDropdown)}
                      disabled={profileLoading}
                      className="bg-white/20 hover:bg-white/30 text-white px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 border border-white/30 hover:border-white/50 flex items-center space-x-1 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <span>{profileLoading ? "Updating..." : "Change"}</span>
                      <svg 
                        className={`w-4 h-4 transition-transform ${showGroupDropdown ? 'rotate-180' : ''}`} 
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                  </div>

                  {showGroupDropdown && (
                    <div className="relative mt-2 w-full bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                      <div className="p-4">
                        <div className="text-xs font-semibold text-gray-500 px-3 py-2 uppercase tracking-wide mb-3">
                          Select Group
                        </div>
                        <div className="flex flex-row space-x-3 justify-center">
                          {['A', 'B', 'C'].map((group) => (
                            <button
                              key={group}
                              onClick={() => handleUpdateGroup(group)}
                              disabled={profileLoading}
                              className={`px-6 py-3 rounded-lg text-sm font-medium transition-all duration-200 border-2 min-w-[80px] text-center ${
                                userGroup === group
                                  ? 'bg-blue-100 text-blue-700 border-blue-300 shadow-sm'
                                  : 'text-gray-700 hover:bg-gray-50 border-gray-200 hover:border-gray-300'
                              } ${profileLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                              <div className="flex items-center justify-center space-x-2">
                                <span className="font-semibold">{group}</span>
                                {userGroup === group && (
                                  <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                  </svg>
                                )}
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                
                <p className="text-xl text-blue-100 mb-8 max-w-2xl leading-relaxed">
                  Track your attendance, analyze patterns, and maintain your academic standing.
                </p>
              </div>
              
              <div className="flex-shrink-0 flex items-center justify-center">
                <div className="w-28 h-28 bg-gradient-to-br from-blue-600 to-blue-800 rounded-2xl flex items-center justify-center shadow-lg border border-blue-500/30">
                  <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <button
            onClick={() => navigateTo("/classes")}
            className="group bg-white rounded-xl shadow-sm hover:shadow-lg border border-gray-300/50 hover:border-blue-500/30 p-6 text-left transition-all duration-300 hover:translate-y-[-4px]"
          >
            <div className="flex items-start space-x-4">
              <div className="w-14 h-14 bg-blue-50 rounded-xl flex items-center justify-center group-hover:bg-blue-100 transition-colors duration-300 border border-blue-200/50">
                <svg className="w-7 h-7 text-blue-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 text-xl mb-2">Academic Schedule</h3>
                <p className="text-gray-600 leading-relaxed">Review your class timetable, upcoming sessions, and academic calendar</p>
                <div className="mt-3 text-sm text-blue-600 font-medium flex items-center">
                  View schedule
                  <svg className="w-4 h-4 ml-1 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </div>
          </button>

          <button
            onClick={() => navigateTo("/attendance")}
            className="group bg-white rounded-xl shadow-sm hover:shadow-lg border border-gray-300/50 hover:border-green-500/30 p-6 text-left transition-all duration-300 hover:translate-y-[-4px]"
          >
            <div className="flex items-start space-x-4">
              <div className="w-14 h-14 bg-green-50 rounded-xl flex items-center justify-center group-hover:bg-green-100 transition-colors duration-300 border border-green-200/50">
                <svg className="w-7 h-7 text-green-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 text-xl mb-2">Record Attendance</h3>
                <p className="text-gray-600 leading-relaxed">Mark your presence for ongoing classes and track your attendance</p>
                <div className="mt-3 text-sm text-green-600 font-medium flex items-center">
                  Mark attendance
                  <svg className="w-4 h-4 ml-1 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </div>
          </button>
        </div>

        <SubjectAttendanceSummary />
      </div>

    
    </div>
  );
};

export default Home;
