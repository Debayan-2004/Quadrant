// src/components/SubjectAttendanceSummary.jsx
import React, { useState, useEffect, useContext } from 'react';
import { AttendanceContext } from '../context/AttendanceContext';
import timetableData from '../assets/academicTimetable.json';

const SubjectAttendanceSummary = () => {
  const { token, backendUrl } = useContext(AttendanceContext);
  const [subjectStats, setSubjectStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Subject display names
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
    'FAMILY ADOPTION PROGRAMME': 'FAP',
    'Class/Activity': 'Other Activities'
  };

  // 🔹 Build SDL → Subject map from timetable
  const buildSDLSubjectMap = () => {
    const map = {};

    timetableData.forEach(day => {
      day.periods?.forEach(period => {
        if (!period.subject) return;

        const subject = period.subject.toUpperCase();
        if (!subject.includes('SDL')) return;

        if (subject.includes('COM')) map[period.subject] = 'Community Medicine';
        else if (subject.includes('FSM') || subject.includes('FM'))
          map[period.subject] = 'Forensic Medicine';
        else if (subject.includes('PA')) map[period.subject] = 'Pathology';
        else if (subject.includes('PH')) map[period.subject] = 'Pharmacology';
        else if (subject.includes('MI')) map[period.subject] = 'Microbiology';
        else if (subject.includes('IM')) map[period.subject] = 'Internal Medicine';
      });
    });

    return map;
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
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (!res.ok) throw new Error('Failed to fetch attendance');

        const data = await res.json();
        if (!data.success || !data.stats) return;

        const sdlMap = buildSDLSubjectMap();
        const combined = {};

        // 🔹 Merge SDL + normal attendance
        data.stats.forEach(stat => {
          const finalSubject = sdlMap[stat.subject] || stat.subject;

          if (!combined[finalSubject]) {
            combined[finalSubject] = {
              ...stat,
              subject: finalSubject,
              attendedClasses: 0,
              totalClasses: 0,
              cancelledClasses: 0
            };
          }

          combined[finalSubject].attendedClasses += stat.attendedClasses;
          combined[finalSubject].totalClasses += stat.totalClasses;
          combined[finalSubject].cancelledClasses += stat.cancelledClasses || 0;
        });

        const processedStats = Object.values(combined)
          .map(stat => {
            const actualTotalClasses =
              stat.totalClasses - stat.cancelledClasses;

            const percentage =
              actualTotalClasses > 0
                ? Math.round(
                    (stat.attendedClasses / actualTotalClasses) * 100
                  )
                : 0;

            return {
              ...stat,
              displayName:
                subjectDisplayNames[stat.subject] || stat.subject,
              actualTotalClasses,
              percentage,
              isLow: actualTotalClasses > 0 && percentage < 75
            };
          })
          .filter(stat => stat.actualTotalClasses > 0)
          .sort((a, b) => b.percentage - a.percentage);

        setSubjectStats(processedStats);
      } catch (err) {
        console.error(err);
        setError('Unable to load attendance statistics');
      } finally {
        setLoading(false);
      }
    };

    fetchAttendanceStats();
  }, [token, backendUrl]);

  // 🔹 Overall stats
  const overallStats = subjectStats.reduce(
    (acc, subject) => {
      acc.totalAttended += subject.attendedClasses;
      acc.totalActualClasses += subject.actualTotalClasses;
      acc.totalCancelled += subject.cancelledClasses || 0;
      return acc;
    },
    { totalAttended: 0, totalActualClasses: 0, totalCancelled: 0 }
  );

  const overallPercentage =
    overallStats.totalActualClasses > 0
      ? Math.round(
          (overallStats.totalAttended /
            overallStats.totalActualClasses) *
            100
        )
      : 0;

  /* ================= UI (UNCHANGED) ================= */

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
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6 text-center">
        {error}
      </div>
    );
  }

  if (!subjectStats.length) return null;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-6 mb-6">
      {/* HEADER */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">
            Attendance Summary
          </h2>
          <p className="text-sm text-gray-600">
            Subject-wise performance overview
          </p>
        </div>
        <div className="text-right">
          <div className="text-xs font-medium text-gray-500">
            Total Subjects
          </div>
          <div className="text-lg font-bold text-gray-900">
            {subjectStats.length}
          </div>
        </div>
      </div>

      {/* OVERALL */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 mb-6 border border-blue-100">
        <div className="flex justify-between mb-3">
          <h3 className="font-semibold text-gray-800">
            Overall Attendance
          </h3>
          <span className="font-bold">{overallPercentage}%</span>
        </div>
      </div>

      {/* SUBJECT GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {subjectStats.map(subject => (
          <div
            key={subject.subject}
            className="border rounded-xl p-4 bg-gray-50"
          >
            <div className="flex justify-between mb-2">
              <h4 className="font-semibold text-sm">
                {subject.displayName}
              </h4>
              <span className="text-xs font-bold">
                {subject.percentage}%
              </span>
            </div>
            <div className="text-xs text-gray-600">
              Attended: {subject.attendedClasses} /{' '}
              {subject.actualTotalClasses}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SubjectAttendanceSummary;

