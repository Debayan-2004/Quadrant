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
  "01/03/2026 TO 31/03/2026": { "MEDICINE": "B", "SURGERY": "C", "OBG": "A" }
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
  if (first && date < first) return "before_first_assessment";
  if (first && second && date >= first && date < second) return "first_to_second_assessment";
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
    "GENERAL SURGERY": "Surgery", "COMMUNITY MEDICINE": "Community Medicine", "OBG": "Obstetrics & Gynecology"
  };

  const firstWord = topicString.split(/[\.\s\:]+/)[0].toUpperCase();
  const secondWord = topicString.split(/[\.\s\:]+/)[1]?.toUpperCase();
  const combined = `${firstWord} ${secondWord}`;

  if (subjectMap[combined]) return subjectMap[combined];
  if (subjectMap[firstWord]) return subjectMap[firstWord];
  
  return firstWord || "Class/Activity";
};

const getSubjectColor = (subject) => {
  const colorMap = {
    'Internal Medicine': 'bg-blue-50 text-blue-800 border-blue-200 hover:bg-blue-100 transition-colors',
    'Microbiology': 'bg-purple-50 text-purple-800 border-purple-200 hover:bg-purple-100 transition-colors',
    'Pharmacology': 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100 transition-colors',
    'Pathology': 'bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100 transition-colors',
    'Surgery': 'bg-orange-50 text-orange-800 border-orange-200 hover:bg-orange-100 transition-colors',
    'Forensic Medicine': 'bg-gray-50 text-gray-800 border-gray-200 hover:bg-gray-100 transition-colors',
    'Obstetrics & Gynecology': 'bg-pink-50 text-pink-800 border-pink-200 hover:bg-pink-100 transition-colors',
    'Community Medicine': 'bg-teal-50 text-teal-800 border-teal-200 hover:bg-teal-100 transition-colors',
    'MEDICINE CLINIC': 'bg-blue-100 text-blue-900 border-blue-300 font-semibold',
    'SURGERY CLINIC': 'bg-orange-100 text-orange-900 border-orange-300 font-semibold',
    'OBG CLINIC': 'bg-pink-100 text-pink-900 border-pink-300 font-semibold',
    'Pathology (SGL)': 'bg-rose-100 text-rose-900 border-rose-300 italic',
    'Pharmacology (SGL)': 'bg-emerald-100 text-emerald-900 border-emerald-300 italic',
    'Microbiology (SGL)': 'bg-purple-100 text-purple-900 border-purple-300 italic',
    'AETCOM': 'bg-indigo-100 text-indigo-900 border-indigo-300',
    'Self-Directed Learning (SDL)': 'bg-amber-50 text-amber-800 border-amber-200',
    'FAMILY ADOPTION PROGRAMME': 'bg-cyan-50 text-cyan-800 border-cyan-200 font-medium'
  };
  return colorMap[subject] || 'bg-gray-50 text-gray-800 border-gray-200';
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

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-blue-600"></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b sticky top-0 z-50 p-4 shadow-sm">
        <div className="container mx-auto flex justify-between items-center">
          <button onClick={() => navigate('/')} className="flex items-center space-x-2 text-gray-600 bg-gray-100 px-3 py-2 rounded-lg">
            <span>← Back</span>
          </button>
          <div className="text-center">
            <h1 className="font-bold text-gray-900">Academic Schedule</h1>
            <p className="text-xs text-blue-600 font-medium">Session 2025-26</p>
          </div>
          <div className="bg-blue-600 text-white w-10 h-10 rounded-full flex items-center justify-center font-bold">
            {userGroup}
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Desktop Table */}
        <div className="hidden lg:block overflow-x-auto rounded-xl border shadow-sm bg-white">
          <table className="w-full text-left">
            <thead className="bg-gray-900 text-white">
              <tr>
                <th className="p-4">Date</th>
                <th className="p-4">Day</th>
                <th className="p-4">8-9 AM</th>
                <th className="p-4">9-12 PM</th>
                <th className="p-4">1-2 PM</th>
                <th className="p-4">2-4 PM</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {processedTimetable.map((item) => (
                <tr key={item.date} className="hover:bg-gray-50">
                  <td className="p-4 font-semibold">{item.date}</td>
                  <td className="p-4 text-blue-600">{item.day}</td>
                  {Object.values(item.processedSlots).map((slot, i) => (
                    <td key={i} className="p-4">
                      <span className={`px-3 py-1 rounded-md text-sm border font-medium ${getSubjectColor(slot)}`}>
                        {slot}
                      </span>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards */}
        <div className="lg:hidden space-y-4">
          {processedTimetable.map((item) => (
            <div key={item.date} className="bg-white p-4 rounded-xl border shadow-sm">
              <div className="flex justify-between border-b pb-2 mb-3">
                <span className="font-bold">{item.date}</span>
                <span className="text-blue-600 font-medium">{item.day}</span>
              </div>
              <div className="space-y-2">
                {Object.entries(item.processedSlots).map(([key, val]) => (
                  <div key={key} className="flex items-center space-x-2">
                    <span className="text-[10px] w-12 text-gray-400 uppercase">{key.replace('time_', '').replace('_', ' ')}</span>
                    <div className={`flex-1 p-2 rounded-lg border text-sm ${getSubjectColor(val)}`}>{val}</div>
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