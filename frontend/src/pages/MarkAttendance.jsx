import React, { useState, useEffect, useCallback, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { AttendanceContext } from '../context/AttendanceContext';

import timetableData from '../assets/academicTimetable.json';
const academicTimetable = timetableData.timetable;

// =========================================================================
// 🌟 INTEGRATED SCHEDULES AND ASSESSMENT DATES (Required for Group Logic)
// =========================================================================

const clinicalPostingSchedule = {
  "01/11/2025 TO 20/11/2025": { "MEDICINE": "A", "SURGERY": "B", "OBG": "C" },
  "21/11/2025 TO 10/12/2025": { "MEDICINE": "C", "SURGERY": "A", "OBG": "B" },
  "11/12/2025 TO 31/12/2025": { "MEDICINE": "B", "SURGERY": "C", "OBG": "A" }
};

const sglSchedules = {
  "before_first_assessment": {
    "MONDAY": { "Pathology": "A", "Pharmacology": "C", "Microbiology": "B" },
    "TUESDAY": { "Pathology": "B", "Pharmacology": "A", "Microbiology": "C" },
    "WEDNESDAY": { "Pathology": "C", "Pharmacology": "B", "Microbiology": "A" },
    "THURSDAY": { "Pathology": "A", "Pharmacology": "C", "Microbiology": "B" },
    "FRIDAY": { "Pathology": "B", "Pharmacology": "A", "Microbiology": "C" },
    "SATURDAY": { "Pathology": "C", "Pharmacology": "B", "Microbiology": "A" }
  }
};

// Assessment dates
const FIRST_ASSESSMENT_DATE_STRING = null; 
const SECOND_ASSESSMENT_DATE_STRING = null; 
const THIRD_ASSESSMENT_DATE_STRING = null;

// ----------------- Helper Functions -----------------

const parseDate = (dateString) => {
  if (!dateString) return null;
  const parts = dateString.split('-');
  if (parts.length === 3) {
    const day = parseInt(parts[0]);
    const month = parseInt(parts[1]) - 1; 
    const year = parseInt(parts[2]);
    const date = new Date(year, month, day);
    date.setHours(0, 0, 0, 0);
    return date;
  }
  return null;
};

const parseDateRange = (dateRange) => {
  const [startStr, , endStr] = dateRange.split(' ');
  const startParts = startStr.split('/');
  const endParts = endStr.split('/');
  
  const startDate = new Date(
    parseInt(startParts[2]), parseInt(startParts[1]) - 1, parseInt(startParts[0]) 
  );
  startDate.setHours(0, 0, 0, 0); 
  
  const endDate = new Date(
    parseInt(endParts[2]), parseInt(endParts[1]) - 1, parseInt(endParts[0]) 
  );
  endDate.setHours(23, 59, 59, 999); 
  
  return { start: startDate, end: endDate };
};

const getClinicalPostingPeriod = (dateString) => {
  const date = parseDate(dateString);
  if (!date) return null;
  
  for (const period in clinicalPostingSchedule) {
    const range = parseDateRange(period);
    if (date >= range.start && date <= range.end) {
      return period;
    }
  }
  return null;
};

const getSGLPeriod = (dateString) => {
  const date = parseDate(dateString);
  if (!date) return "before_first_assessment"; 
  
  const firstAssessment = FIRST_ASSESSMENT_DATE_STRING ? parseDate(FIRST_ASSESSMENT_DATE_STRING) : null;
  const secondAssessment = SECOND_ASSESSMENT_DATE_STRING ? parseDate(SECOND_ASSESSMENT_DATE_STRING) : null;
  const thirdAssessment = THIRD_ASSESSMENT_DATE_STRING ? parseDate(THIRD_ASSESSMENT_DATE_STRING) : null;

  if (firstAssessment && secondAssessment && thirdAssessment) {
    if (date < firstAssessment) return "before_first_assessment";
    if (date >= firstAssessment && date < secondAssessment) return "first_to_second_assessment";
    if (date >= secondAssessment && date < thirdAssessment) return "second_to_third_assessment";
    return "second_to_third_assessment"; 
  }

  if (firstAssessment && secondAssessment) {
    if (date < firstAssessment) return "before_first_assessment";
    if (date >= firstAssessment && date < secondAssessment) return "first_to_second_assessment";
    return "second_to_third_assessment"; 
  }

  if (firstAssessment) {
      if (date < firstAssessment) return "before_first_assessment";
      return "first_to_second_assessment"; 
  }

  return "before_first_assessment";
};

// Core function to map timetable activity to a user-specific subject name.
const getSubjectName = (topicString, dateString, dayName, userGroup) => {
  if (!topicString || topicString.includes("HOLIDAY")) return topicString || "N/A";
  
  const validGroups = ['A', 'B', 'C'];
  const currentGroup = validGroups.includes(userGroup) ? userGroup : 'A'; 
  
  // 1. Clinical Posting Check
  if (topicString.includes("CLINICS")) {
    const period = getClinicalPostingPeriod(dateString);
    
    if (period && clinicalPostingSchedule[period]) {
      for (const [department, group] of Object.entries(clinicalPostingSchedule[period])) {
        if (group === currentGroup) {
          return `${department} CLINIC`;
        }
      }
    }
    return "CLINICS"; 
  }
  
  // 2. Small Group Learning Check (SGL)
  if (topicString.includes("SMALL GROUP LEARNING")) {
    const sglPeriod = getSGLPeriod(dateString);
    const daySchedule = sglSchedules[sglPeriod]?.[dayName.toUpperCase()]; 
    
    if (daySchedule) {
      for (const [subject, group] of Object.entries(daySchedule)) {
        if (group === currentGroup) {
          return `${subject} (SGL)`;
        }
      }
    }
    return "SMALL GROUP LEARNING"; 
  }
  
  // 3. Handle other special activities (SDL, FAP)
  if (topicString.includes("FAMILY ADOPTION PROGRAMME")) return "FAMILY ADOPTION PROGRAMME";
  if (topicString.includes("SDL")) return "Self-Directed Learning (SDL)";
  
  // 4. Check for full subject names
  if (topicString.includes("Pathology")) return "Pathology";
  if (topicString.includes("Pharmacology")) return "Pharmacology";
  if (topicString.includes("Microbiology")) return "Microbiology";
  if (topicString.includes("Internal Medicine")) return "Internal Medicine";
  if (topicString.includes("Surgery")) return "Surgery";
  if (topicString.includes("Forensic Medicine")) return "Forensic Medicine";
  if (topicString.includes("Obstetrics") || topicString.includes("Gynaecology")) return "Obstetrics & Gynecology";
  if (topicString.includes("Community Medicine")) return "Community Medicine";

  // 5. Check for abbreviations
  const subjectMap = {
    IM: "Internal Medicine", MI: "Microbiology", PH: "Pharmacology",
    PA: "Pathology", SU: "Surgery", FM: "Forensic Medicine",
    OG: "Obstetrics & Gynecology", CM: "Community Medicine",
  };

  const parts = topicString.split(/[\.\s\:]+/);
  const prefix = parts[0].toUpperCase().replace(":", "").replace(".", "");

  if (subjectMap[prefix]) {
    return subjectMap[prefix];
  }
  
  // 6. Final fallback
  if (parts[0]) {
    return parts[0].replace(":", "").replace(".", "").replace(/\d/g, ''); 
  }
  
  return "Class/Activity";
};

// Enhanced submission status with time-based availability
const getSubmissionStatus = (classDate, existingAttendance) => {
  const today = new Date();
  const currentTime = today.getHours() * 60 + today.getMinutes();
  
  const [day, month, year] = classDate.split('-');
  const classDay = new Date(`${year}-${month}-${day}`);
  classDay.setHours(0, 0, 0, 0);
  
  const todayStart = new Date(today);
  todayStart.setHours(0, 0, 0, 0);

  if (existingAttendance) {
    return {
      status: existingAttendance,
      color: existingAttendance === "Present" ? "text-green-700" : "text-red-700",
      className: existingAttendance === "Present" ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200",
      canMark: true,
      isAvailable: true,
    };
  }

  const classDayEnd = new Date(classDay);
  classDayEnd.setHours(16, 0, 0, 0);
  
  const isToday = classDay.getTime() === todayStart.getTime();

  if (classDay > todayStart) {
    return { 
      status: "Future", 
      color: "text-blue-500", 
      canMark: false, 
      className: "bg-blue-50 border-blue-200",
      isAvailable: false,
    };
  }

  if (isToday && currentTime < 16 * 60) { 
    return {
      status: "Available after 4 PM",
      color: "text-gray-500",
      canMark: false,
      className: "bg-gray-50 border-gray-200",
      isAvailable: false,
    };
  }

  return {
    status: "Pending",
    color: "text-orange-600",
    canMark: true,
    className: "bg-orange-50 border-orange-200",
    isAvailable: true,
  };
};

const getFlatTimetable = (timetable, userGroup) => {
  const flatList = [];
  timetable.forEach((dayRecord) => {
    ['time_8_9_AM', 'time_9_AM_12_Noon', 'time_1_2_PM', 'time_2_4_PM'].forEach((key) => {
      const topic = dayRecord[key];
      const subject = getSubjectName(topic, dayRecord.date, dayRecord.day, userGroup);
      
      if (subject !== "N/A" && subject !== "HOLIDAY" && subject !== "CLINICS" && subject !== "SMALL GROUP LEARNING") {
        const timeSlot = key
          .replace('time_', '')
          .replace(/_/g, '-')
          .replace('8-9-AM', '8-9 AM')
          .replace('9-AM-12-Noon', '9 AM-12 Noon')
          .replace('1-2-PM', '1-2 PM')
          .replace('2-4-PM', '2-4 PM');

        flatList.push({
          date: dayRecord.date,
          day: dayRecord.day,
          timeSlot,
          timeSlotKey: key,
          subject, 
          topic,
          uniqueId: `${dayRecord.date}-${key}`,
        });
      }
    });
  });
  return flatList;
};

// Color mapping for subjects
const getSubjectColor = (subject) => {
  const colorMap = {
    'Internal Medicine': 'bg-blue-100 text-blue-800 border-blue-200',
    'Microbiology': 'bg-purple-100 text-purple-800 border-purple-200',
    'Pharmacology': 'bg-green-100 text-green-800 border-green-200',
    'Pathology': 'bg-red-100 text-red-800 border-red-200',
    'Surgery': 'bg-orange-100 text-orange-800 border-orange-200',
    'Forensic Medicine': 'bg-gray-100 text-gray-800 border-gray-200',
    'Obstetrics & Gynecology': 'bg-pink-100 text-pink-800 border-pink-200',
    'Community Medicine': 'bg-teal-100 text-teal-800 border-teal-200',
    'MEDICINE CLINIC': 'bg-blue-200 text-blue-900 border-blue-300',
    'SURGERY CLINIC': 'bg-orange-200 text-orange-900 border-orange-300',
    'OBG CLINIC': 'bg-pink-200 text-pink-900 border-pink-300',
    'Pathology (SGL)': 'bg-red-200 text-red-900 border-red-300',
    'Pharmacology (SGL)': 'bg-green-200 text-green-900 border-green-300',
    'Microbiology (SGL)': 'bg-purple-200 text-purple-900 border-purple-300',
    'Self-Directed Learning (SDL)': 'bg-amber-100 text-amber-800 border-amber-200',
    'FAMILY ADOPTION PROGRAMME': 'bg-cyan-100 text-cyan-800 border-cyan-200',
    'Class/Activity': 'bg-slate-100 text-slate-800 border-slate-200'
  };
  
  return colorMap[subject] || 'bg-gray-100 text-gray-800 border-gray-200';
};

// ----------------- Main Component -----------------
const MarkAttendancePage = () => {
  const navigate = useNavigate();
  const { token, backendUrl } = useContext(AttendanceContext);

  const [userGroup, setUserGroup] = useState('');
  const [attendanceRecords, setAttendanceRecords] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [savingRecordId, setSavingRecordId] = useState(null);
  
  const flatTimetable = React.useMemo(() => {
    return getFlatTimetable(academicTimetable, userGroup);
  }, [userGroup]); 

  // Load User Group and Attendance on component mount
  useEffect(() => {
    const fetchData = async () => {
      if (!token) {
        setLoading(false);
        setError('Missing auth token. Please log in again.');
        setUserGroup("A"); 
        return;
      }
      
      try {
        setLoading(true);
        let fetchedGroup = 'A'; 

        const userRes = await axios.get(`${backendUrl}/api/user/profile`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (userRes.data.success && userRes.data.user) {
          fetchedGroup = userRes.data.user.group || 'A';
          setUserGroup(fetchedGroup);
        } else {
          setUserGroup('A');
        }

        const attRes = await fetch(`${backendUrl}/api/attendance/my`, {
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
        });
        
        if (!attRes.ok) {
          throw new Error(`Failed to fetch attendance: ${attRes.status}`);
        }

        const data = await attRes.json();
        
        if (data.records && Array.isArray(data.records)) {
          const initialAttendance = data.records.reduce((acc, record) => {
            const uniqueId = `${record.classDate}-${record.timeSlotKey}`;
            acc[uniqueId] = record.status;
            return acc;
          }, {});
          
          setAttendanceRecords(initialAttendance);
        } else {
          setAttendanceRecords({});
        }
        
      } catch (err) {
        console.error('❌ Error fetching data:', err);
        setError('Unable to load data. ' + err.message);
        setUserGroup('A');
        setAttendanceRecords({});
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [backendUrl, token]);

  // Auto-save attendance when status changes
  const handleAttendanceChange = useCallback(async (record, newStatus) => {
    const { uniqueId, date, timeSlot, timeSlotKey, subject } = record;
    
    setSavingRecordId(uniqueId);
    setError('');
    setSuccessMsg('');

    try {
      setAttendanceRecords(prev => ({
        ...prev,
        [uniqueId]: newStatus
      }));

      const payload = {
        records: [{
          subject,
          classDate: date,
          timeSlot,
          timeSlotKey,
          status: newStatus
        }]
      };
      
      const res = await fetch(`${backendUrl}/api/attendance/mark`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      
      if (!res.ok) {
        setAttendanceRecords(prev => {
          const newState = { ...prev };
          delete newState[uniqueId];
          return newState;
        });
        throw new Error(data.message || 'Failed to save attendance');
      }

      setSuccessMsg(`✅ Attendance marked as ${newStatus}`);
      setTimeout(() => setSuccessMsg(''), 3000);
      
    } catch (err) {
      console.error('❌ Error saving attendance:', err);
      setError(err.message || 'Failed to save attendance. Please try again.');
    } finally {
      setSavingRecordId(null);
    }
  }, [backendUrl, token]);

  // Remove attendance record
  const handleRemoveAttendance = useCallback(async (record) => {
    const { uniqueId, date, timeSlotKey } = record;
    
    setSavingRecordId(uniqueId);
    setError('');
    setSuccessMsg('');

    try {
      const previousStatus = attendanceRecords[uniqueId];

      setAttendanceRecords(prev => {
        const newState = { ...prev };
        delete newState[uniqueId];
        return newState;
      });

      const res = await fetch(`${backendUrl}/api/attendance/remove`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          classDate: date,
          timeSlotKey: timeSlotKey
        }),
      });

      const data = await res.json();
      
      if (!res.ok) {
        setAttendanceRecords(prev => ({
          ...prev,
          [uniqueId]: previousStatus
        }));
        throw new Error(data.message || 'Failed to remove attendance');
      }

      setSuccessMsg('✅ Attendance record removed');
      setTimeout(() => setSuccessMsg(''), 3000);
      
    } catch (err) {
      console.error('Error removing attendance:', err);
      setError(err.message || 'Failed to remove attendance. Please try again.');
    } finally {
      setSavingRecordId(null);
    }
  }, [backendUrl, token, attendanceRecords]);

  // Mobile Card View
  const MobileAttendanceCard = ({ record }) => {
    const status = attendanceRecords[record.uniqueId];
    const submission = getSubmissionStatus(record.date, status);
    const isSaving = savingRecordId === record.uniqueId;

    if (submission.status === "Future") return null;

    return (
      <div className={`bg-white rounded-xl border-2 p-4 mb-4 transition-all duration-200 ${submission.className}`}>
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-800 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <div className="font-semibold text-gray-900">{record.date}</div>
              <div className="text-sm text-blue-600 font-medium">{record.day}</div>
            </div>
          </div>
          <div className={`px-3 py-1 rounded-full text-xs font-semibold ${submission.color} bg-white border`}>
            {submission.status}
          </div>
        </div>

        {/* Class Details */}
        <div className="space-y-2 mb-4">
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Time:</span>
            <span className="text-sm font-medium text-gray-900">{record.timeSlot}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Subject:</span>
            <span className={`px-2 py-1 rounded-lg text-xs font-medium ${getSubjectColor(record.subject)}`}>
              {record.subject}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        {submission.canMark && submission.isAvailable ? (
          <div className="space-y-3">
            <div className="flex space-x-2">
              {['Present', 'Absent', 'Cancelled'].map((action) => (
                <button
                  key={action}
                  onClick={() => handleAttendanceChange(record, action)}
                  disabled={isSaving}
                  className={`flex-1 py-2 px-3 rounded-lg text-sm font-semibold transition-all duration-200 ${
                    action === 'Present' ? 'bg-green-500 hover:bg-green-600 text-white' :
                    action === 'Absent' ? 'bg-red-500 hover:bg-red-600 text-white' :
                    'bg-gray-500 hover:bg-gray-600 text-white'
                  } ${status === action ? 'ring-2 ring-yellow-400 ring-opacity-50' : ''} ${
                    isSaving ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  {action}
                </button>
              ))}
            </div>
            
            {status && (
              <button
                onClick={() => handleRemoveAttendance(record)}
                disabled={isSaving}
                className="w-full py-2 bg-red-50 text-red-700 rounded-lg text-sm font-semibold hover:bg-red-100 transition-colors duration-200 border border-red-200"
              >
                Remove Attendance
              </button>
            )}
            
            {isSaving && (
              <div className="text-center py-2">
                <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
                <span className="text-xs text-blue-600 ml-2">Saving...</span>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-3 bg-gray-100 rounded-lg">
            <svg className="w-5 h-5 text-gray-500 mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-xs text-gray-600">{submission.status}</p>
          </div>
        )}
      </div>
    );
  };

  // Desktop Table View
  const DesktopTableView = () => (
    <div className="hidden lg:block overflow-hidden rounded-xl border border-gray-200 shadow-sm">
      <table className="w-full">
        <thead className="bg-gradient-to-r from-gray-900 to-blue-900">
          <tr>
            <th className="px-6 py-4 text-left text-sm font-semibold text-white uppercase tracking-wider">Date & Day</th>
            <th className="px-6 py-4 text-left text-sm font-semibold text-white uppercase tracking-wider">Time Slot</th>
            <th className="px-6 py-4 text-left text-sm font-semibold text-white uppercase tracking-wider">Subject</th>
            <th className="px-6 py-4 text-left text-sm font-semibold text-white uppercase tracking-wider">Status</th>
            <th className="px-6 py-4 text-left text-sm font-semibold text-white uppercase tracking-wider">Actions</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {flatTimetable.map((record) => {
            const status = attendanceRecords[record.uniqueId];
            const submission = getSubmissionStatus(record.date, status);
            if (submission.status === "Future") return null;
            
            const isSaving = savingRecordId === record.uniqueId;

            return (
              <tr key={record.uniqueId} className={`hover:bg-gray-50 transition-colors duration-150 ${submission.className}`}>
                <td className="px-6 py-4">
                  <div className="font-semibold text-gray-900">{record.date}</div>
                  <div className="text-sm text-blue-600">{record.day}</div>
                </td>
                <td className="px-6 py-4">
                  <div className="font-medium text-gray-900">{record.timeSlot}</div>
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${getSubjectColor(record.subject)}`}>
                    {record.subject}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className={`font-semibold ${submission.color}`}>
                    {submission.status}
                  </span>
                </td>
                <td className="px-6 py-4">
                  {submission.canMark && submission.isAvailable ? (
                    <div className="flex items-center space-x-2">
                      <div className="flex space-x-1">
                        {['Present', 'Absent', 'Cancelled'].map((action) => (
                          <button
                            key={action}
                            onClick={() => handleAttendanceChange(record, action)}
                            disabled={isSaving}
                            className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors duration-200 ${
                              action === 'Present' ? 'bg-green-500 hover:bg-green-600 text-white' :
                              action === 'Absent' ? 'bg-red-500 hover:bg-red-600 text-white' :
                              'bg-gray-500 hover:bg-gray-600 text-white'
                            } ${status === action ? 'ring-2 ring-yellow-400' : ''} ${
                              isSaving ? 'opacity-50 cursor-not-allowed' : ''
                            }`}
                          >
                            {action}
                          </button>
                        ))}
                      </div>
                      {status && (
                        <button
                          onClick={() => handleRemoveAttendance(record)}
                          disabled={isSaving}
                          className="px-3 py-1 text-xs font-semibold bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors duration-200"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  ) : (
                    <span className="text-sm text-gray-500">{submission.status}</span>
                  )}
                  {isSaving && (
                    <div className="text-xs text-blue-600 mt-1">Saving...</div>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-gray-300 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-700 text-lg font-medium">Loading attendance data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100">
      {/* Header - Clean mobile version */}
      <header className="bg-white/90 backdrop-blur-md border-b border-gray-300/50 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 sm:space-x-3">
              <button
                onClick={() => navigate('/')}
                className="flex items-center space-x-2 text-gray-700 hover:text-gray-900 transition-colors duration-200 bg-gray-100 hover:bg-gray-200 p-2 sm:px-3 sm:py-2 rounded-lg"
                title="Back to Home"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                <span className="hidden sm:inline font-medium">Back</span>
              </button>
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-blue-700 to-blue-900 rounded-lg flex items-center justify-center shadow-sm">
                <svg className="w-4 h-4 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div>
                <h1 className="text-sm sm:text-lg font-semibold text-gray-900 tracking-tight">Quadrant's Portal</h1>
                <p className="text-xs text-gray-600 hidden sm:block">Mark your class attendance (Group {userGroup})</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6 sm:py-8">
        {/* Page Header */}
        <div className="text-center mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-4xl font-light text-gray-900 mb-3 sm:mb-4 tracking-tight">
            Mark <span className="font-semibold">Attendance</span>
          </h1>
          <p className="text-base sm:text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed">
            Recording attendance for <strong className="font-semibold">Group {userGroup}</strong> classes.
          </p>
        </div>

        {/* Alerts */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-red-700 text-sm">{error}</span>
            </div>
            <button onClick={() => setError('')} className="text-red-500 hover:text-red-700">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {successMsg && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-green-700 text-sm">{successMsg}</span>
            </div>
            <button onClick={() => setSuccessMsg('')} className="text-green-500 hover:text-green-700">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
          <div className="bg-blue-50 border border-blue-200 rounded-lg sm:rounded-xl p-4 sm:p-6">
            <div className="flex items-center space-x-2 sm:space-x-3 mb-2 sm:mb-3">
              <div className="w-6 h-6 sm:w-10 sm:h-10 bg-blue-100 rounded flex sm:rounded-lg items-center justify-center">
                <svg className="w-3 h-3 sm:w-5 sm:h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-sm sm:text-lg font-semibold text-gray-900">Availability Notice</h3>
            </div>
            <p className="text-gray-700 text-xs sm:text-base leading-relaxed">
              Attendance for each day's classes becomes available after <strong className="font-semibold">4:00 PM</strong> on the class date. 
            </p>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg sm:rounded-xl p-4 sm:p-6">
            <div className="flex items-center space-x-2 sm:space-x-3 mb-2 sm:mb-3">
              <div className="w-6 h-6 sm:w-10 sm:h-10 bg-green-100 rounded flex sm:rounded-lg items-center justify-center">
                <svg className="w-3 h-3 sm:w-5 sm:h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-sm sm:text-lg font-semibold text-gray-900">Auto-Save Enabled</h3>
            </div>
            <p className="text-gray-700 text-xs sm:text-base leading-relaxed">
              Your attendance changes are automatically saved. Data persists across sessions. 
              Currently loaded: <strong className="font-semibold">{Object.keys(attendanceRecords).length}</strong> records.
            </p>
          </div>
        </div>

        {/* Attendance List */}
        <div className="mb-6 sm:mb-8">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-3 sm:mb-4 flex items-center">
            <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            Available Classes
          </h2>

          {/* Mobile View */}
          <div className="lg:hidden space-y-4">
            {flatTimetable.map((record) => (
              <MobileAttendanceCard key={record.uniqueId} record={record} />
            ))}
          </div>

          {/* Desktop View */}
          <DesktopTableView />
        </div>
      </div>
    </div>
  );
};

export default MarkAttendancePage;
