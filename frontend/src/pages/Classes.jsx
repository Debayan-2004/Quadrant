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

// Phase 1: Clinical Postings (Jan-Mar 2026)
const clinicalPostingSchedulePhase1 = {
  "02/01/2026 TO 16/01/2026": { "MEDICINE": "A", "SURGERY": "B", "OBG": "C" },
  "19/01/2026 TO 04/02/2026": { "MEDICINE": "B", "SURGERY": "C", "OBG": "A" },
  "06/02/2026 TO 18/03/2026": { "MEDICINE": "C", "SURGERY": "A", "OBG": "B" }
};

// Phase 2: Specialty Postings (Mar-Jun 2026)
const clinicalPostingSchedulePhase2 = {
  "20/03/2026 TO 08/04/2026": { "PAEDIATRICS": "A", "ENT": "B", "OPHTHALMOLOGY": "C" },
  "10/04/2026 TO 05/05/2026": { "PAEDIATRICS": "B", "ENT": "C", "OPHTHALMOLOGY": "A" },
  "06/05/2026 TO 11/06/2026": { "PAEDIATRICS": "C", "ENT": "A", "OPHTHALMOLOGY": "B" }
};

// Phase 3: Community Medicine Posting (Jun-Jul 2026)
const clinicalPostingSchedulePhase3 = {
  "12/06/2026 TO 29/06/2026": { "COMMUNITY MEDICINE": "A" },
  "30/06/2026 TO 14/07/2026": { "COMMUNITY MEDICINE": "B" },
  "15/07/2026 TO 31/07/2026": { "COMMUNITY MEDICINE": "C" }
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

// Assessment dates for 2026
const FIRST_ASSESSMENT_DATE_STRING = "09-02-2026"; 
const SECOND_ASSESSMENT_DATE_STRING = "08-05-2026"; 
const THIRD_ASSESSMENT_DATE_STRING = "03-08-2026";

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
  
  // Check Phase 1: Medicine, Surgery, OBG (Jan-Mar 2026)
  for (const period in clinicalPostingSchedulePhase1) {
    const range = parseDateRange(period);
    if (date >= range.start && date <= range.end) {
      return { period, phase: 1, schedule: clinicalPostingSchedulePhase1 };
    }
  }
  
  // Check Phase 2: Paediatrics, ENT, Ophthalmology (Mar-Jun 2026)
  for (const period in clinicalPostingSchedulePhase2) {
    const range = parseDateRange(period);
    if (date >= range.start && date <= range.end) {
      return { period, phase: 2, schedule: clinicalPostingSchedulePhase2 };
    }
  }
  
  // Check Phase 3: Community Medicine (Jun-Jul 2026)
  for (const period in clinicalPostingSchedulePhase3) {
    const range = parseDateRange(period);
    if (date >= range.start && date <= range.end) {
      return { period, phase: 3, schedule: clinicalPostingSchedulePhase3 };
    }
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
  
  const validGroups = ['A', 'B', 'C', 'D', 'E'];
  const currentGroup = validGroups.includes(userGroup) ? userGroup : 'A'; 

  // 1. Clinical Posting Check
  if (topicString.includes("CLINICS")) {
    const clinicalInfo = getClinicalPostingPeriod(dateString);
    if (clinicalInfo && clinicalInfo.schedule[clinicalInfo.period]) {
      for (const [dept, group] of Object.entries(clinicalInfo.schedule[clinicalInfo.period])) {
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
  
  // 3. Handle AETCOM
  if (topicString.includes("AETCOM")) {
    if (topicString.includes("Module")) {
      const moduleMatch = topicString.match(/Module\s+[\d.]+/i);
      if (moduleMatch) {
        // Extract subject from AETCOM description
        if (topicString.includes("MICRO")) return `AETCOM (Microbiology) ${moduleMatch[0]}`;
        if (topicString.includes("PHARMA")) return `AETCOM (Pharmacology) ${moduleMatch[0]}`;
        if (topicString.includes("PATHO")) return `AETCOM (Pathology) ${moduleMatch[0]}`;
        return `AETCOM ${moduleMatch[0]}`;
      }
    }
    return "AETCOM";
  }
  
  // 4. Handle SDL
  if (topicString.includes("SDL")) {
    if (topicString.includes("FSM")) return "Self-Directed Learning (Forensic Medicine)";
    if (topicString.includes("MICRO")) return "Self-Directed Learning (Microbiology)";
    if (topicString.includes("PHARMA")) return "Self-Directed Learning (Pharmacology)";
    if (topicString.includes("PATHO")) return "Self-Directed Learning (Pathology)";
    return "Self-Directed Learning (SDL)";
  }
  
  // 5. Handle Family Adoption Programme
  if (topicString.includes("FAMILY ADOPTION PROGRAMME")) return "Family Adoption Programme";
  
  // 6. Handle Sports/Yoga/Extra Curricular Activities
  if (topicString.includes("SPORTS") || topicString.includes("YOGA") || topicString.includes("EXTRA CURRICULAR")) {
    return "Sports/Yoga/Extra Curricular";
  }
  
  // 7. Handle Assessments
  if (topicString.includes("ASSESSEMENT") || topicString.includes("ASSESSMENT")) {
    if (topicString.includes("PHARMACOLOGY")) return "Pharmacology Assessment";
    if (topicString.includes("MICROBIOLOGY")) return "Microbiology Assessment";
    if (topicString.includes("PATHOLOGY")) return "Pathology Assessment";
    return "Assessment";
  }
  
  // 8. Handle SGT/Seminar/Tutorial
  if (topicString.includes("SGT") || topicString.includes("SEMINAR") || topicString.includes("TUTORIAL")) {
    if (topicString.includes("FSM")) return "Forensic Medicine (Tutorial)";
    return "Small Group Teaching";
  }
  
  // 9. Subject mapping for exact matches
  const subjectExactMap = {
    "PATHOLOGY": "Pathology",
    "PHARMACOLOGY": "Pharmacology",
    "MICROBIOLOGY": "Microbiology",
    "GENERAL MEDICINE": "Internal Medicine",
    "GENERAL SURGERY": "Surgery",
    "COMMUNITY MEDICINE": "Community Medicine",
    "OBG": "Obstetrics & Gynecology",
    "FORENSIC MEDICINE": "Forensic Medicine",
    "FSM": "Forensic Medicine",
    "PAEDIATRICS": "Paediatrics",
    "ENT": "ENT",
    "OPHTHALMOLOGY": "Ophthalmology"
  };
  
  const upperTopic = topicString.toUpperCase().trim();
  if (subjectExactMap[upperTopic]) {
    return subjectExactMap[upperTopic];
  }
  
  // 10. Parse first word for subject matching
  const firstWord = topicString.split(/[\.\s\:]+/)[0].toUpperCase();
  if (subjectExactMap[firstWord]) {
    return subjectExactMap[firstWord];
  }

  // 11. Handle internal assessment exam days
  if (topicString.includes("TIME: 10AM TO 1PM") || topicString.includes("Marks=100")) {
    return "Internal Assessment Exam";
  }

  // 12. Handle practical assessment days
  if (topicString.includes("BATCH-")) {
    return "Practical Assessment";
  }
  
  return firstWord || "Class/Activity";
};

const getSubjectColor = (subject) => {
  const colorMap = {
    'Internal Medicine': 'bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-100 transition-colors',
    'Microbiology': 'bg-purple-100 text-purple-800 border-purple-200 hover:bg-purple-100 transition-colors',
    'Pharmacology': 'bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-100 transition-colors',
    'Pathology': 'bg-rose-100 text-rose-800 border-rose-200 hover:bg-rose-100 transition-colors',
    'Surgery': 'bg-orange-100 text-orange-800 border-orange-200 hover:bg-orange-100 transition-colors',
    'Forensic Medicine': 'bg-gray-100 text-gray-800 border-gray-200 hover:bg-gray-100 transition-colors',
    'Obstetrics & Gynecology': 'bg-pink-100 text-pink-800 border-pink-200 hover:bg-pink-100 transition-colors',
    'Community Medicine': 'bg-teal-100 text-teal-800 border-teal-200 hover:bg-teal-100 transition-colors',
    'Paediatrics': 'bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-100 transition-colors',
    'ENT': 'bg-indigo-100 text-indigo-800 border-indigo-200 hover:bg-indigo-100 transition-colors',
    'Ophthalmology': 'bg-cyan-100 text-cyan-800 border-cyan-200 hover:bg-cyan-100 transition-colors',
    'MEDICINE CLINIC': 'bg-blue-100 text-blue-900 border-blue-300 font-semibold',
    'SURGERY CLINIC': 'bg-orange-100 text-orange-900 border-orange-300 font-semibold',
    'OBG CLINIC': 'bg-pink-100 text-pink-900 border-pink-300 font-semibold',
    'PAEDIATRICS CLINIC': 'bg-yellow-100 text-yellow-900 border-yellow-300 font-semibold',
    'ENT CLINIC': 'bg-indigo-100 text-indigo-900 border-indigo-300 font-semibold',
    'OPHTHALMOLOGY CLINIC': 'bg-cyan-100 text-cyan-900 border-cyan-300 font-semibold',
    'COMMUNITY MEDICINE CLINIC': 'bg-teal-100 text-teal-900 border-teal-300 font-semibold',
    'Pathology (SGL)': 'bg-rose-100 text-rose-900 border-rose-300 italic',
    'Pharmacology (SGL)': 'bg-emerald-100 text-emerald-900 border-emerald-300 italic',
    'Microbiology (SGL)': 'bg-purple-100 text-purple-900 border-purple-300 italic',
    'AETCOM': 'bg-violet-100 text-violet-900 border-violet-300 font-medium',
    'Self-Directed Learning (SDL)': 'bg-amber-100 text-amber-800 border-amber-200',
    'Self-Directed Learning (Forensic Medicine)': 'bg-amber-100 text-amber-800 border-amber-200',
    'Self-Directed Learning (Microbiology)': 'bg-amber-100 text-amber-800 border-amber-200',
    'Self-Directed Learning (Pharmacology)': 'bg-amber-100 text-amber-800 border-amber-200',
    'Self-Directed Learning (Pathology)': 'bg-amber-100 text-amber-800 border-amber-200',
    'Family Adoption Programme': 'bg-cyan-100 text-cyan-800 border-cyan-200 font-medium',
    'Sports/Yoga/Extra Curricular': 'bg-lime-100 text-lime-800 border-lime-200',
    'Forensic Medicine (Tutorial)': 'bg-slate-100 text-slate-800 border-slate-200',
    'Small Group Teaching': 'bg-violet-100 text-violet-800 border-violet-200',
    'Internal Assessment Exam': 'bg-red-100 text-red-800 border-red-300 font-bold',
    'Practical Assessment': 'bg-orange-100 text-orange-800 border-orange-300 font-bold',
    'Pharmacology Assessment': 'bg-yellow-100 text-yellow-800 border-yellow-200',
    'Microbiology Assessment': 'bg-yellow-100 text-yellow-800 border-yellow-200',
    'Pathology Assessment': 'bg-yellow-100 text-yellow-800 border-yellow-200',
    'Assessment': 'bg-yellow-100 text-yellow-800 border-yellow-200'
  };
  
  // Handle AETCOM with module numbers
  if (subject.startsWith('AETCOM')) {
    return 'bg-violet-100 text-violet-900 border-violet-300 font-medium';
  }
  
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
  const [viewMode, setViewMode] = useState('desktop'); // 'desktop' or 'mobile'

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
    
    // Check viewport size for responsive design
    const handleResize = () => {
      setViewMode(window.innerWidth >= 1024 ? 'desktop' : 'mobile');
    };
    
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [backendUrl]); 

  const processedTimetable = React.useMemo(() => {
    return academicTimetable.map(item => ({
      ...item,
      processedSlots: {
        time_8_9_AM: getSubjectName(item.time_8_9_AM, item.date, item.day, '8-9 AM', userGroup),
        time_9_AM_12_Noon: getSubjectName(item.time_9_AM_12_Noon, item.date, item.day, '9-12 PM', userGroup),
        time_1_2_PM: getSubjectName(item.time_1_2_PM, item.date, item.day, '1-2 PM', userGroup),
        time_2_4_PM: getSubjectName(item.time_2_4_PM, item.date, item.day, '2-4 PM', userGroup),
      }
    }));
  }, [userGroup]);

  // Calculate stats
  const stats = React.useMemo(() => {
    const uniqueSubjects = new Set();
    let clinicDays = 0;
    let sglSessions = 0;
    
    processedTimetable.forEach(day => {
      Object.values(day.processedSlots).forEach(subject => {
        if (subject !== 'N/A' && subject !== 'Class/Activity') {
          uniqueSubjects.add(subject.split(' (')[0]); // Get base subject name
        }
        if (subject.includes('CLINIC')) clinicDays++;
        if (subject.includes('(SGL)')) sglSessions++;
      });
    });
    
    return {
      totalDays: processedTimetable.length,
      uniqueSubjects: uniqueSubjects.size,
      clinicDays,
      sglSessions
    };
  }, [processedTimetable]);

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
      {/* Header */}
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
                <span className="hidden sm:inline font-medium">Back to Home</span>
              </button>
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-blue-700 to-blue-900 rounded-lg flex items-center justify-center shadow-sm">
                <svg className="w-4 h-4 sm:w-5 sm:h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <h1 className="text-sm sm:text-lg font-semibold text-gray-900 tracking-tight">Academic Schedule</h1>
                <p className="text-xs text-gray-600 hidden sm:block">January - July 2026 | Tripura Medical College</p>
              </div>
            </div>
            
            {/* User Info */}
            <div className="flex items-center space-x-2 sm:space-x-4">
              <div className="text-right hidden sm:block">
                <div className="text-sm font-medium text-gray-700">{username}</div>
                <div className="text-xs text-gray-500">Group {userGroup}</div>
              </div>
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-blue-600 to-blue-800 rounded-full flex items-center justify-center text-white text-sm font-semibold shadow-sm">
                {userGroup}
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6 sm:py-8">
        {/* Page Header */}
        <div className="text-center mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-4xl font-light text-gray-900 mb-3 sm:mb-4 tracking-tight">
            Academic <span className="font-semibold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">Timetable</span>
          </h1>
          <p className="text-base sm:text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed">
            Personalized schedule for <span className="font-semibold text-gray-800">{username}</span> - Group <span className="font-semibold text-blue-600">{userGroup}</span>
          </p>
          <p className="text-sm text-gray-500 mt-2">Academic Year 2025-2026 | Second MBBS</p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
          <div className="bg-white rounded-lg sm:rounded-xl p-3 sm:p-4 shadow-sm border border-gray-200/60 text-center">
            <div className="text-xl sm:text-2xl font-bold text-blue-700 mb-1">{stats.totalDays}</div>
            <div className="text-xs sm:text-sm text-gray-600">Total Days</div>
          </div>
          <div className="bg-white rounded-lg sm:rounded-xl p-3 sm:p-4 shadow-sm border border-gray-200/60 text-center">
            <div className="text-xl sm:text-2xl font-bold text-emerald-700 mb-1">{stats.uniqueSubjects}</div>
            <div className="text-xs sm:text-sm text-gray-600">Subjects</div>
          </div>
          <div className="bg-white rounded-lg sm:rounded-xl p-3 sm:p-4 shadow-sm border border-gray-200/60 text-center">
            <div className="text-xl sm:text-2xl font-bold text-orange-700 mb-1">{stats.clinicDays}</div>
            <div className="text-xs sm:text-sm text-gray-600">Clinic Slots</div>
          </div>
          <div className="bg-white rounded-lg sm:rounded-xl p-3 sm:p-4 shadow-sm border border-gray-200/60 text-center">
            <div className="text-xl sm:text-2xl font-bold text-purple-700 mb-1">{stats.sglSessions}</div>
            <div className="text-xs sm:text-sm text-gray-600">SGL Sessions</div>
          </div>
        </div>

        {/* Legend */}
        <div className="bg-white rounded-lg sm:rounded-xl shadow-sm border border-gray-200/60 p-4 sm:p-6 mb-6 sm:mb-8">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4 flex items-center">
            <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            Subject Legend
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 sm:gap-3">
            {[
              'Internal Medicine', 'Microbiology', 'Pharmacology', 'Pathology', 
              'Surgery', 'Forensic Medicine', 'Obstetrics & Gynecology', 'Community Medicine',
              'Paediatrics', 'ENT', 'Ophthalmology',
              'MEDICINE CLINIC', 'SURGERY CLINIC', 'OBG CLINIC', 
              'PAEDIATRICS CLINIC', 'ENT CLINIC', 'OPHTHALMOLOGY CLINIC',
              'Pathology (SGL)', 'Pharmacology (SGL)', 'Microbiology (SGL)', 
              'Self-Directed Learning (SDL)', 'Family Adoption Programme', 'AETCOM',
              'Internal Assessment Exam', 'Sports/Yoga/Extra Curricular'
            ].map((subject) => (
              <div key={subject} className="flex items-center space-x-2 group">
                <div className={`w-3 h-3 rounded-full flex-shrink-0 ${getSubjectColor(subject).split(' ')[0]}`}></div>
                <span className="text-xs sm:text-sm text-gray-700 truncate" title={subject}>
                  {subject.includes('CLINIC') ? subject.replace(' CLINIC', '') : 
                   subject.includes('(SGL)') ? subject.split(' ')[0] : 
                   subject.includes('Learning') || subject.includes('Programme') ? subject.split(' ')[0] :
                   subject.includes('AETCOM') ? 'AETCOM' :
                   subject.includes('Assessment') ? 'Assessment' :
                   subject.includes('Sports') ? 'Sports/Activities' :
                   subject.split(' ')[0]}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Desktop Table */}
        <div className="hidden lg:block overflow-hidden rounded-xl border border-gray-200/60 shadow-sm bg-white">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200/60">
              <thead className="bg-gradient-to-r from-gray-900 to-blue-900">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-white uppercase tracking-wider">Date</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-white uppercase tracking-wider">Day</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-white uppercase tracking-wider">8:00 - 9:00 AM</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-white uppercase tracking-wider">9:00 AM - 12:00 PM</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-white uppercase tracking-wider">1:00 - 2:00 PM</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-white uppercase tracking-wider">2:00 - 4:00 PM</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200/60">
                {processedTimetable.map((item) => (
                  <tr key={item.date} className="hover:bg-gray-50/80 transition-colors duration-150 group">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-semibold text-gray-900 group-hover:text-blue-700 transition-colors">{item.date}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-blue-700">{item.day}</div>
                    </td>
                    {[
                      item.processedSlots.time_8_9_AM, 
                      item.processedSlots.time_9_AM_12_Noon, 
                      item.processedSlots.time_1_2_PM, 
                      item.processedSlots.time_2_4_PM
                    ].map((timeSlot, slotIndex) => (
                      <td key={slotIndex} className="px-6 py-4">
                        <div className={`inline-flex px-3 py-1.5 rounded-lg border text-sm font-medium ${getSubjectColor(timeSlot)}`}>
                          {timeSlot}
                        </div>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Mobile Cards */}
        <div className="lg:hidden space-y-4">
          {processedTimetable.map((item) => (
            <div key={item.date} className="bg-white rounded-xl shadow-sm border border-gray-200/60 p-4 hover:shadow-md transition-shadow duration-200">
              {/* Date Header */}
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-100">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-blue-800 rounded-lg flex items-center justify-center shadow-sm">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900">{item.date}</div>
                    <div className="text-sm font-medium text-blue-600">{item.day}</div>
                  </div>
                </div>
                {/* Special indicators */}
                <div className="flex space-x-1">
                  {Object.values(item.processedSlots).some(slot => slot.includes('CLINIC')) && (
                    <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded-full font-medium">Clinic</span>
                  )}
                  {Object.values(item.processedSlots).some(slot => slot.includes('Assessment') || slot.includes('Exam')) && (
                    <span className="px-2 py-0.5 bg-red-50 text-red-700 text-xs rounded-full font-medium">Assessment</span>
                  )}
                </div>
              </div>

              {/* Time Slots */}
              <div className="space-y-3">
                {[
                  { time: '8-9 AM', subject: item.processedSlots.time_8_9_AM },
                  { time: '9-12 PM', subject: item.processedSlots.time_9_AM_12_Noon },
                  { time: '1-2 PM', subject: item.processedSlots.time_1_2_PM },
                  { time: '2-4 PM', subject: item.processedSlots.time_2_4_PM }
                ].map((slot, index) => (
                  <div key={index} className="flex items-start space-x-3">
                    <div className="w-16 flex-shrink-0">
                      <span className="text-xs font-medium text-gray-500 bg-gray-50 px-2 py-1 rounded">{slot.time}</span>
                    </div>
                    <div className={`px-3 py-2 rounded-lg border text-sm flex-1 ${getSubjectColor(slot.subject)}`}>
                      {slot.subject}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer Note */}
        <div className="text-center text-xs sm:text-sm text-gray-500 mt-6 sm:mt-8">
          <p>Schedule is personalized based on your group assignment. Clinical postings rotate according to the academic calendar.</p>
          <p className="mt-1">Tripura Medical College & Dr. BRAM Teaching Hospital | Second MBBS 2025-2026</p>
        </div>
      </div>
    </div>
  );
};

export default AcademicTimetable;