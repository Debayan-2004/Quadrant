// src/components/SubjectAttendanceSummary.jsx
import React, { useState, useEffect, useContext } from 'react';
import { AttendanceContext } from '../context/AttendanceContext';
import timetableData from '../assets/academicTimetable.json';

const SubjectAttendanceSummary = () => {
  const { token, backendUrl } = useContext(AttendanceContext);
  const [subjectStats, setSubjectStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Subject mapping for better display names
  const subjectDisplayNames = {
    'Internal Medicine': 'Internal Medicine',
    'Microbiology': 'Microbiology',
    'Pharmacology': 'Pharmacology',
    'Pathology': 'Pathology',
    'Surgery': 'Surgery',
    'Forensic Medicine': 'Forensic Medicine',
    'Obstetrics & Gynecology': 'OBG',
    'Community Medicine': 'Community Medicine',
    'CLINICS': 'Clinical Postings',
    'SMALL GROUP LEARNING': 'SGL Sessions',
    'Self-Directed Learning (SDL)': 'SDL',
    'FAMILY ADOPTION PROGRAMME': 'FAP',
    'Class/Activity': 'Other Activities'
  };

  // Function to map SDL session to actual subject
  const mapSdlToSubject = (sdlTitle) => {
    if (!sdlTitle) return null;
    
    const sdlTitleLower = sdlTitle.toLowerCase();
    
    // Check for Community Medicine SDL
    if (sdlTitleLower.includes('com med') || sdlTitleLower.includes('community med')) {
      return 'Community Medicine';
    }
    
    // Check for Forensic Medicine SDL
    if (sdlTitleLower.includes('fsm') || sdlTitleLower.includes('forensic')) {
      return 'Forensic Medicine';
    }
    
    // You can add more mappings here as needed
    return null;
  };

  // Function to check if a timetable entry is SDL
  const isSdlSession = (entry) => {
    const timeSlots = ['time_8_9_AM', 'time_9_AM_12_Noon', 'time_1_2_PM', 'time_2_4_PM'];
    return timeSlots.some(slot => 
      entry[slot] && entry[slot].toLowerCase().includes('sdl')
    );
  };

  // Function to extract SDL sessions from timetable with their subjects
  const getSdlSessionsWithSubjects = () => {
    const sdlSessions = [];
    
    timetableData.timetable.forEach(entry => {
      const timeSlots = ['time_8_9_AM', 'time_9_AM_12_Noon', 'time_1_2_PM', 'time_2_4_PM'];
      
      timeSlots.forEach(slot => {
        const activity = entry[slot];
        if (activity && activity.toLowerCase().includes('sdl')) {
          const subject = mapSdlToSubject(activity);
          if (subject) {
            sdlSessions.push({
              date: entry.date,
              activity,
              subject,
              timeSlot: slot
            });
          }
        }
      });
    });
    
    return sdlSessions;
  };

  useEffect(() => {
    const fetchAttendanceStats = async () => {
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const res = await fetch(`${backendUrl}/api/attendance/stats/subject`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
        });

        if (!res.ok) {
          throw new Error(`Failed to fetch attendance stats: ${res.status}`);
        }

        const data = await res.json();
        
        if (data.success && data.stats) {
          // Get all SDL sessions from timetable with their mapped subjects
          const sdlSessions = getSdlSessionsWithSubjects();
          
          // Process stats - EXCLUDE CANCELLED CLASSES from total count
          const processedStats = data.stats
            .map(stat => {
              // Check if this is an SDL entry that needs to be merged with a subject
              if (stat.subject.toLowerCase().includes('sdl')) {
                // Try to find which subject this SDL belongs to based on timetable
                const matchingSdl = sdlSessions.find(sdl => 
                  sdl.activity.toLowerCase().includes(stat.subject.toLowerCase().replace('self-directed learning (sdl)', 'sdl').trim())
                );
                
                if (matchingSdl) {
                  // This SDL belongs to a regular subject, so we'll merge it
                  return null;
                }
              }
              
              // Calculate actual total classes (EXCLUDING CANCELLED)
              const actualTotalClasses = stat.totalClasses - (stat.cancelledClasses || 0);
              
              // Calculate percentage based ONLY on classes that actually happened
              const percentage = actualTotalClasses > 0 
                ? Math.round((stat.attendedClasses / actualTotalClasses) * 100)
                : 0;

              return {
                ...stat,
                displayName: subjectDisplayNames[stat.subject] || stat.subject,
                percentage: percentage,
                actualTotalClasses: actualTotalClasses, // Only non-cancelled classes
                isLow: actualTotalClasses > 0 && percentage < 75 // Check against 75% threshold,
              };
            })
            .filter(stat => stat !== null) // Remove SDL entries that will be merged
            .filter(stat => stat.actualTotalClasses > 0) // Only show subjects with actual classes
            .sort((a, b) => b.percentage - a.percentage);

          // Now, aggregate SDL attendance into their respective subjects
          const aggregatedStats = processedStats.reduce((acc, stat) => {
            // Check if this subject has any SDL sessions
            const subjectSdlSessions = sdlSessions.filter(sdl => sdl.subject === stat.subject);
            
            if (subjectSdlSessions.length > 0) {
              // Find SDL attendance records for this subject
              const sdlAttendanceRecords = data.stats.filter(s => 
                s.subject.toLowerCase().includes('sdl')
              );
              
              // For each SDL session for this subject, check if there's attendance
              let sdlAttended = 0;
              let sdlTotal = 0;
              
              subjectSdlSessions.forEach(sdlSession => {
                const sdlRecord = sdlAttendanceRecords.find(s => {
                  // Try to match the SDL session with attendance record
                  const sdlTitle = sdlSession.activity.toLowerCase();
                  const attendanceSubject = s.subject.toLowerCase();
                  
                  // Check for common patterns
                  if (sdlTitle.includes('com med') && attendanceSubject.includes('community')) {
                    return true;
                  }
                  if (sdlTitle.includes('fsm') && attendanceSubject.includes('forensic')) {
                    return true;
                  }
                  // Add more patterns as needed
                  
                  return false;
                });
                
                if (sdlRecord) {
                  sdlTotal++;
                  if (sdlRecord.attendedClasses > 0) {
                    sdlAttended++;
                  }
                }
              });
              
              // Merge SDL attendance with regular attendance
              const mergedStat = {
                ...stat,
                attendedClasses: stat.attendedClasses + sdlAttended,
                totalClasses: stat.totalClasses + sdlTotal,
                actualTotalClasses: stat.actualTotalClasses + sdlTotal, // SDL classes are never cancelled
                percentage: (stat.actualTotalClasses + sdlTotal) > 0 
                  ? Math.round(((stat.attendedClasses + sdlAttended) / (stat.actualTotalClasses + sdlTotal)) * 100)
                  : 0
              };
              
              mergedStat.isLow = mergedStat.actualTotalClasses > 0 && mergedStat.percentage < 75;
              
              acc.push(mergedStat);
            } else {
              // No SDL sessions for this subject
              acc.push(stat);
            }
            
            return acc;
          }, []);

          // Filter out any SDL-only entries that weren't merged
          const finalStats = aggregatedStats.filter(stat => 
            !stat.subject.toLowerCase().includes('sdl')
          );

          setSubjectStats(finalStats);
        }
      } catch (err) {
        console.error('Error fetching attendance stats:', err);
        setError('Unable to load attendance statistics');
      } finally {
        setLoading(false);
      }
    };

    fetchAttendanceStats();
  }, [token, backendUrl]);

  // Calculate overall statistics
  const overallStats = subjectStats.reduce((acc, subject) => {
    acc.totalAttended += subject.attendedClasses;
    acc.totalActualClasses += subject.actualTotalClasses;
    acc.totalCancelled += subject.cancelledClasses || 0;
    return acc;
  }, { totalAttended: 0, totalActualClasses: 0, totalCancelled: 0 });

  const overallPercentage = overallStats.totalActualClasses > 0 
    ? Math.round((overallStats.totalAttended / overallStats.totalActualClasses) * 100)
    : 0;

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
        <div className="animate-pulse">
          <div className="h-7 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
        <div className="text-center py-6">
          <div className="w-12 h-12 mx-auto mb-3 bg-red-100 rounded-full flex items-center justify-center">
            <span className="text-red-500 text-xl">⚠️</span>
          </div>
          <h3 className="text-lg font-semibold text-gray-800 mb-2">Unable to Load Data</h3>
          <p className="text-gray-600 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  if (subjectStats.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
        <div className="text-center py-6">
          <div className="w-14 h-14 mx-auto mb-3 bg-gradient-to-br from-blue-600 to-blue-800 rounded-full flex items-center justify-center">
            <span className="text-blue-500 text-xl"> <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg></span>
          </div>
          <h3 className="text-lg font-semibold text-gray-800 mb-2">No Data Available</h3>
          <p className="text-gray-600 text-sm">Start marking your attendance to see statistics</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-6 mb-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            Attendance Summary
          </h2>
          <p className="text-sm text-gray-600 mt-1">Subject-wise performance overview</p>
        </div>
        <div className="text-right">
          <div className="text-xs font-medium text-gray-500">Total Subjects</div>
          <div className="text-lg font-bold text-gray-900">{subjectStats.length}</div>
        </div>
      </div>

      {/* Overall Summary Card */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 mb-6 border border-blue-100">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-800">Overall Attendance</h3>
          <div className={`px-3 py-1 rounded-full text-sm font-bold ${
            overallPercentage >= 75 
              ? 'bg-green-100 text-green-800' 
              : 'bg-red-100 text-red-800'
          }`}>
            {overallPercentage}%
          </div>
        </div>
        
        {/* Progress Bar */}
        <div className="w-full bg-white rounded-full h-3 mb-3 border border-blue-200">
          <div
            className={`h-3 rounded-full transition-all duration-700 ${
              overallPercentage >= 90 
                ? 'bg-gradient-to-r from-green-500 to-emerald-500' 
                : overallPercentage >= 75 
                ? 'bg-gradient-to-r from-blue-500 to-indigo-500' 
                : 'bg-gradient-to-r from-red-500 to-orange-500'
            }`}
            style={{ width: `${Math.max(overallPercentage, 5)}%` }}
          ></div>
        </div>
        
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="text-center">
            <div className="font-semibold text-gray-700">{overallStats.totalAttended}</div>
            <div className="text-gray-500">Attended</div>
          </div>
          <div className="text-center">
            <div className="font-semibold text-gray-700">{overallStats.totalActualClasses}</div>
            <div className="text-gray-500">Total</div>
          </div>
          <div className="text-center">
            <div className="font-semibold text-gray-700">{overallStats.totalCancelled}</div>
            <div className="text-gray-500">Cancelled</div>
          </div>
        </div>
      </div>

      {/* Subject Grid */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Subject Performance</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {subjectStats.map((subject, index) => (
            <div
              key={subject.subject}
              className={`border rounded-xl p-4 transition-all duration-300 hover:shadow-md ${
                subject.isLow 
                  ? 'bg-red-50 border-red-200' 
                  : 'bg-gray-50 border-gray-200'
              }`}
            >
              {/* Subject Header */}
              <div className="flex items-start justify-between mb-3">
                <h4 className={`font-semibold text-sm leading-tight ${
                  subject.isLow ? 'text-red-800' : 'text-gray-800'
                }`}>
                  {subject.displayName}
                </h4>
                <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                  subject.isLow 
                    ? 'bg-red-100 text-red-800' 
                    : subject.percentage >= 90
                    ? 'bg-green-100 text-green-800'
                    : 'bg-blue-100 text-blue-800'
                }`}>
                  {subject.percentage}%
                </span>
              </div>
              
              {/* Progress Bar */}
              <div className="w-full bg-white rounded-full h-2 mb-2 border border-gray-300">
                <div
                  className={`h-2 rounded-full transition-all duration-700 ${
                    subject.percentage >= 90 
                      ? 'bg-gradient-to-r from-green-500 to-emerald-500' 
                      : subject.percentage >= 75 
                      ? 'bg-gradient-to-r from-blue-500 to-indigo-500' 
                      : 'bg-gradient-to-r from-red-500 to-orange-500'
                  }`}
                  style={{ width: `${Math.max(subject.percentage, 5)}%` }}
                ></div>
              </div>
              
              {/* Stats */}
              <div className="flex justify-between text-xs text-gray-600 mb-1">
                <span>Attended: {subject.attendedClasses}</span>
                <span>Total: {subject.actualTotalClasses}</span>
              </div>

              {/* Cancelled Classes */}
              {subject.cancelledClasses > 0 && (
                <div className="text-xs text-gray-500 mb-2">
                  {subject.cancelledClasses} cancelled
                </div>
              )}

              {/* Warning Message */}
              {subject.isLow && (
                <div className="flex items-center mt-2 text-xs text-red-600 font-medium">
                  <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  Below 75% threshold
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Legend & Footer */}
      <div className="pt-4 border-t border-gray-200">
        <div className="mb-3">
          <h4 className="text-sm font-semibold text-gray-800 mb-2">Performance Indicators</h4>
          <div className="flex flex-wrap gap-3 text-xs">
            <div className="flex items-center">
              <div className="w-3 h-3 bg-gradient-to-r from-green-500 to-emerald-500 rounded mr-2"></div>
              <span className="text-gray-600">Excellent (≥90%)</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-gradient-to-r from-blue-500 to-indigo-500 rounded mr-2"></div>
              <span className="text-gray-600">Good (≥75%)</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-gradient-to-r from-red-500 to-orange-500 rounded mr-2"></div>
              <span className="text-gray-600">Needs Improvement (&lt;75%)</span>
            </div>
          </div>
        </div>
        <div className="text-xs text-gray-500 bg-gray-50 rounded-lg p-3">
          <div className="flex items-start">
            <svg className="w-4 h-4 mr-2 mt-0.5 text-gray-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <span>Only classes that actually happened are counted (cancelled classes excluded from total calculations)</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SubjectAttendanceSummary;