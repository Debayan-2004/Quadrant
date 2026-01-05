import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { AttendanceContext } from '../context/AttendanceContext';

// Import timetable data from separate file
import timetableData from '../assets/academicTimetable.json';
const academicTimetable = timetableData.timetable;

// =========================================================================
// 🧩 UPDATED DATA CONFIGURATION (Updated for 2026)
// =========================================================================

// Updated Clinical posting schedule data with 2026 ranges
const clinicalPostingSchedule = {
  "01/11/2025 TO 20/11/2025": { "MEDICINE": "A", "SURGERY": "B", "OBG": "C" },
  "21/11/2025 TO 10/12/2025": { "MEDICINE": "C", "SURGERY": "A", "OBG": "B" },
  "11/12/2025 TO 31/12/2025": { "MEDICINE": "B", "SURGERY": "C", "OBG": "A" },
  "01/01/2026 TO 31/01/2026": { "MEDICINE": "A", "SURGERY": "B", "OBG": "C" }, // Extended for 2026
  "01/02/2026 TO 28/02/2026": { "MEDICINE": "C", "SURGERY": "A", "OBG": "B" },
  "01/03/2026 TO 31/03/2026": { "MEDICINE": "B", "SURGERY": "C", "OBG": "A" },
  "01/04/2026 TO 30/04/2026": { "MEDICINE": "A", "SURGERY": "B", "OBG": "C" }
};

const sglSchedules = {
  "before_first_assessment": {
    "MONDAY": { "Pathology": "A", "Pharmacology": "C", "Microbiology": "B" },
    "TUESDAY": { "Pathology": "B", "Pharmacology": "A", "Microbiology": "C" },
    "WEDNESDAY": { "Pathology": "C", "Pharmacology": "B", "Microbiology": "A" },
    "THURSDAY": { "Pathology": "A", "Pharmacology": "C", "Microbiology": "B" },
    "FRIDAY": { "Pathology": "B", "Pharmacology": "A", "Microbiology": "C" },
    "SATURDAY": { "Pathology": "C", "Pharmacology": "B", "Microbiology": "A" }
  },
  "first_to_second_assessment": {
    "MONDAY": { "Pathology": "B", "Pharmacology": "A", "Microbiology": "C" },
    "TUESDAY": { "Pathology": "C", "Pharmacology": "B", "Microbiology": "A" },
    "WEDNESDAY": { "Pathology": "A", "Pharmacology": "C", "Microbiology": "B" },
    "THURSDAY": { "Pathology": "B", "Pharmacology": "A", "Microbiology": "C" },
    "FRIDAY": { "Pathology": "C", "Pharmacology": "B", "Microbiology": "A" },
    "SATURDAY": { "Pathology": "A", "Pharmacology": "C", "Microbiology": "B" }
  },
  "second_to_third_assessment": {
    "MONDAY": { "Pathology": "C", "Pharmacology": "B", "Microbiology": "A" },
    "TUESDAY": { "Pathology": "A", "Pharmacology": "C", "Microbiology": "B" },
    "WEDNESDAY": { "Pathology": "B", "Pharmacology": "A", "Microbiology": "C" },
    "THURSDAY": { "Pathology": "C", "Pharmacology": "B", "Microbiology": "A" },
    "FRIDAY": { "Pathology": "A", "Pharmacology": "C", "Microbiology": "B" },
    "SATURDAY": { "Pathology": "B", "Pharmacology": "A", "Microbiology": "C" }
  }
};

// Fill these based on your academic calendar for 2026
const FIRST_ASSESSMENT_DATE_STRING = "12-01-2026"; 
const SECOND_ASSESSMENT_DATE_STRING = "22-01-2026"; 
const THIRD_ASSESSMENT_DATE_STRING = null;

// =========================================================================
// 🧩 HELPER FUNCTIONS
// =========================================================================

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
  const startDate = new Date(parseInt(startParts[2]), parseInt(startParts[1]) - 1, parseInt(startParts[0]));
  startDate.setHours(0, 0, 0, 0); 
  const endDate = new Date(parseInt(endParts[2]), parseInt(endParts[1]) - 1, parseInt(endParts[0]));
  endDate.setHours(23, 59, 59, 999); 
  return { start: startDate, end: endDate };
};

const getClinicalPostingPeriod = (dateString) => {
  const date = parseDate(dateString);
  if (!date) return null;
  for (const period in clinicalPostingSchedule) {
    const range = parseDateRange(period);
    if (date >= range.start && date <= range.end) return period;
  }
  return null;
};

const getSGLPeriod = (dateString) => {
  const date = parseDate(dateString);
  if (!date) return "before_first_assessment"; 
  const first = FIRST_ASSESSMENT_DATE_STRING ? parseDate(FIRST_ASSESSMENT_DATE_STRING) : null;
  const second = SECOND_ASSESSMENT_DATE_STRING ? parseDate(SECOND_ASSESSMENT_DATE_STRING) : null;
  const third = THIRD_ASSESSMENT_DATE_STRING ? parseDate(THIRD_ASSESSMENT_DATE_STRING) : null;

  if (first && second && third) {
    if (date < first) return "before_first_assessment";
    if (date >= first && date < second) return "first_to_second_assessment";
    if (date >= second && date < third) return "second_to_third_assessment";
    return "second_to_third_assessment"; 
  }

  if (first && second) {
    if (date < first) return "before_first_assessment";
    if (date >= first && date < second) return "first_to_second_assessment";
    return "second_to_third_assessment"; 
  }

  if (first) {
    if (date < first) return "before_first_assessment";
    return "first_to_second_assessment"; 
  }

  return "before_first_assessment";
};

const getSubjectName = (topicString, dateString, dayName, timeSlot, userGroup) => {
  if (!topicString) return "N/A";
  const validGroups = ['A', 'B', 'C'];
  const currentGroup = validGroups.includes(userGroup) ? userGroup : 'A'; 

  // 1. Clinical Posting Check
  if (topicString.includes("CLINICS")) {
    const period = getClinicalPostingPeriod(dateString);
    if (period && clinicalPostingSchedule[period]) {
      for (const [dept, group] of Object.entries(clinicalPostingSchedule[period])) {
        if (group === currentGroup) return `${dept} CLINIC`;
      }
    }
    return "CLINICS"; 
  }
  
  // 2. SGL Check
  if (topicString.includes("SMALL GROUP LEARNING")) {
    const sglPeriod = getSGLPeriod(dateString);
    const daySchedule = sglSchedules[sglPeriod]?.[dayName.toUpperCase()]; 
    if (daySchedule) {
      for (const [subject, group] of Object.entries(daySchedule)) {
        if (group === currentGroup) return `${subject} (SGL)`;
      }
    }
    return "SMALL GROUP LEARNING";
  }
  
  if (topicString.includes("FAMILY ADOPTION PROGRAMME")) return "FAMILY ADOPTION PROGRAMME";
  if (topicString.includes("SDL")) return "Self-Directed Learning (SDL)";
  if (topicString.includes("AETCOM")) return "AETCOM";

  // 3. Mapping for 2025 Abbreviations and 2026 Full Names
  const subjectMap = {
    "IM": "Internal Medicine", "MI": "Microbiology", "PH": "Pharmacology",
    "PA": "Pathology", "SU": "Surgery", "FM": "Forensic Medicine",
    "OG": "Obstetrics & Gynecology", "CM": "Community Medicine",
    "PATHOLOGY": "Pathology", "PHARMACOLOGY": "Pharmacology", 
    "MICROBIOLOGY": "Microbiology", "GENERAL MEDICINE": "Internal Medicine",
    "GENERAL SURGERY": "Surgery", "COMMUNITY MEDICINE": "Community Medicine", 
    "OBG": "Obstetrics & Gynecology", "FORENSIC MEDICINE": "Forensic Medicine"
  };

  const firstWord = topicString.split(/[\.\s\:]+/)[0].toUpperCase();
  const secondWord = topicString.split(/[\.\s\:]+/)[1]?.toUpperCase();
  const combined = `${firstWord} ${secondWord}`;

  // Check for "Topic: Subject" format (2026)
  if (topicString.toUpperCase().includes("TOPIC:")) {
    if (topicString.toUpperCase().includes("PATHOLOGY")) return "Pathology";
    if (topicString.toUpperCase().includes("PHARMACOLOGY")) return "Pharmacology";
    if (topicString.toUpperCase().includes("MICROBIOLOGY")) return "Microbiology";
    if (topicString.toUpperCase().includes("GENERAL MEDICINE") || topicString.toUpperCase().includes("INTERNAL MEDICINE")) return "Internal Medicine";
    if (topicString.toUpperCase().includes("GENERAL SURGERY")) return "Surgery";
    if (topicString.toUpperCase().includes("COMMUNITY MEDICINE")) return "Community Medicine";
    if (topicString.toUpperCase().includes("OBG")) return "Obstetrics & Gynecology";
    if (topicString.toUpperCase().includes("FORENSIC MEDICINE")) return "Forensic Medicine";
  }

  if (subjectMap[combined]) return subjectMap[combined];
  if (subjectMap[firstWord]) return subjectMap[firstWord];
  
  // Check for standalone full names
  if (topicString === "PATHOLOGY") return "Pathology";
  if (topicString === "PHARMACOLOGY") return "Pharmacology";
  if (topicString === "MICROBIOLOGY") return "Microbiology";
  if (topicString === "GENERAL MEDICINE" || topicString === "INTERNAL MEDICINE") return "Internal Medicine";
  if (topicString === "GENERAL SURGERY" || topicString === "SURGERY") return "Surgery";
  if (topicString === "COMMUNITY MEDICINE") return "Community Medicine";
  if (topicString === "OBG" || topicString === "OBSTETRICS & GYNAECOLOGY") return "Obstetrics & Gynecology";
  if (topicString === "FORENSIC MEDICINE") return "Forensic Medicine";
  
  return firstWord || "Class/Activity";
};

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
    'AETCOM': 'bg-indigo-100 text-indigo-800 border-indigo-200',
    'Class/Activity': 'bg-slate-100 text-slate-800 border-slate-200'
  };
  
  return colorMap[subject] || 'bg-gray-100 text-gray-800 border-gray-200';
};

// =========================================================================
// ⚛️ REACT COMPONENT
// =========================================================================

const AcademicTimetable = () => {
  const navigate = useNavigate();
  const { backendUrl } = useContext(AttendanceContext); 
  const [userGroup, setUserGroup] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserProfile = async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        setUsername("Guest User");
        setUserGroup("A");
        setLoading(false);
        return;
      }
      try {
        const res = await axios.get(`${backendUrl}/api/user/profile`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.data.success && res.data.user) {
          setUsername(res.data.user.name || "Authenticated User");
          setUserGroup(res.data.user.group || "A");
        }
      } catch (err) {
        console.error("Error fetching user profile:", err.message);
        setUserGroup("A");
      } finally {
        setLoading(false);
      }
    };
    fetchUserProfile();
  }, [backendUrl]); 

  const processedTimetable = academicTimetable.map(item => ({
    ...item,
    processedSlots: {
      time_8_9_AM: getSubjectName(item.time_8_9_AM, item.date, item.day, '8-9 AM', userGroup),
      time_9_AM_12_Noon: getSubjectName(item.time_9_AM_12_Noon, item.date, item.day, '9-12 PM', userGroup),
      time_1_2_PM: getSubjectName(item.time_1_2_PM, item.date, item.day, '1-2 PM', userGroup),
      time_2_4_PM: getSubjectName(item.time_2_4_PM, item.date, item.day, '2-4 PM', userGroup),
    }
  }));

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-gray-300 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-700 text-lg font-medium">Loading timetable...</p>
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
                <p className="text-xs text-gray-600 hidden sm:block">Academic Timetable (Group {userGroup})</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6 sm:py-8">
        {/* Page Header */}
        <div className="text-center mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-4xl font-light text-gray-900 mb-3 sm:mb-4 tracking-tight">
            Academic <span className="font-semibold">Timetable</span>
          </h1>
          <p className="text-base sm:text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed">
            Complete schedule for <strong className="font-semibold">Group {userGroup}</strong>
          </p>
          <p className="text-sm text-gray-500 mt-2">
            November 2025 - April 2026
          </p>
        </div>

        {/* Desktop Table */}
        <div className="hidden lg:block overflow-hidden rounded-xl border border-gray-200 shadow-sm bg-white">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-gray-900 to-blue-900">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-white uppercase tracking-wider">Date</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-white uppercase tracking-wider">Day</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-white uppercase tracking-wider">8-9 AM</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-white uppercase tracking-wider">9 AM-12 Noon</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-white uppercase tracking-wider">1-2 PM</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-white uppercase tracking-wider">2-4 PM</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {processedTimetable.map((item) => (
                <tr key={item.date} className="hover:bg-gray-50 transition-colors duration-150">
                  <td className="px-6 py-4">
                    <div className="font-semibold text-gray-900">{item.date}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-blue-600 font-medium">{item.day}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${getSubjectColor(item.processedSlots.time_8_9_AM)}`}>
                      {item.processedSlots.time_8_9_AM}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${getSubjectColor(item.processedSlots.time_9_AM_12_Noon)}`}>
                      {item.processedSlots.time_9_AM_12_Noon}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${getSubjectColor(item.processedSlots.time_1_2_PM)}`}>
                      {item.processedSlots.time_1_2_PM}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${getSubjectColor(item.processedSlots.time_2_4_PM)}`}>
                      {item.processedSlots.time_2_4_PM}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards */}
        <div className="lg:hidden space-y-4">
          {processedTimetable.map((item) => (
            <div key={item.date} className="bg-white rounded-xl border-2 p-4 border-gray-200">
              {/* Header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-800 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900">{item.date}</div>
                    <div className="text-sm text-blue-600 font-medium">{item.day}</div>
                  </div>
                </div>
              </div>

              {/* Class Details */}
              <div className="space-y-2">
                {Object.entries(item.processedSlots).map(([key, subject]) => (
                  <div key={key} className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">
                      {key.replace('time_', '').replace('_', ' ').replace('8-9-AM', '8-9 AM').replace('9-AM-12-Noon', '9 AM-12 Noon').replace('1-2-PM', '1-2 PM').replace('2-4-PM', '2-4 PM')}:
                    </span>
                    <span className={`px-2 py-1 rounded-lg text-xs font-medium ${getSubjectColor(subject)}`}>
                      {subject}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AcademicTimetable;