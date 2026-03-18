import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { apiClient } from '../utils/apiClient';
import { Line } from 'react-chartjs-2';
import { useNavigate, Link } from 'react-router-dom';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend
} from 'chart.js';
import { useAuth } from '../context/AuthContext';

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend
);

const CounsellingManagement = ({ theme }) => {
    const [students, setStudents] = useState([]);
    const [sessions, setSessions] = useState({}); // Key: studentId, Value: array of sessions
    const [allFollowUps, setAllFollowUps] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [expandedStudentId, setExpandedStudentId] = useState(null);
    const [message, setMessage] = useState({ text: '', type: '' });
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const { logout, currentUser } = useAuth();
    const navigate = useNavigate();

    const getUserName = () => {
        if (!currentUser) return 'Faculty';
        if (currentUser.name) return currentUser.name;
        const namePart = currentUser.email?.split('@')[0];
        return namePart ? namePart.charAt(0).toUpperCase() + namePart.slice(1).toLowerCase() : 'Faculty';
    };
    const [formData, setFormData] = useState({
        session_date: new Date().toISOString().split('T')[0],
        session_mode: 'In-Person',
        venue: '',
        concern: '',
        discussion_summary: '',
        advice: '',
        action_plan: '',
        next_followup_date: '',
        session_status: 'Follow-Up Required',
        emotion_level: 3,
        faculty_feedback: ''
    });
    const [editingSessionId, setEditingSessionId] = useState(null);
    const [saving, setSaving] = useState(false);

    const emotionMap = {
        'Happy': 5,
        'Neutral': 4,
        'Anxious': 3,
        'Stressed': 2,
        'Sad': 1
    };

    const getEmotionEmoji = (emotion) => {
        const emojis = {
            'Happy': '😊',
            'Neutral': '😐',
            'Anxious': '😰',
            'Stressed': '😫',
            'Sad': '😢'
        };
        return emojis[emotion] || '😶';
    };

    const ongoingStudents = useMemo(() => {
        return students.filter(s => s.status === 'ongoing');
    }, [students]);

    const fetchInitialData = useCallback(async () => {
        setLoading(true);
        try {
            const [studentList, followUps] = await Promise.all([
                apiClient('/faculty/my-students'),
                apiClient('/counselling-sessions/all-allocated')
            ]);
            setStudents(studentList);
            setAllFollowUps(followUps);
        } catch (error) {
            console.error('Error fetching data:', error);
            setMessage({ text: 'Error loading data. Please try again.', type: 'error' });
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchInitialData();
    }, [fetchInitialData]);

    const fetchStudentSessions = async (studentId) => {
        try {
            const data = await apiClient(`/counselling-sessions/student/${studentId}`);
            setSessions(prev => ({ ...prev, [studentId]: data }));
        } catch (error) {
            console.error('Error fetching student sessions:', error);
        }
    };

    const toggleExpand = (studentId) => {
        if (expandedStudentId === studentId) {
            setExpandedStudentId(null);
        } else {
            setExpandedStudentId(studentId);
            if (!sessions[studentId]) {
                fetchStudentSessions(studentId);
            }
        }
    };

    const handleAddSession = (student) => {
        setSelectedStudent(student);
        setEditingSessionId(null);
        
        // Find if there's a scheduled meeting or follow-up for this student
        const studentId = student.studentId || student.uid || student._id || student.id;
        const studentReminders = sortedReminders.filter(r => (r.id === studentId || r.regno === student.regno));
        
        let defaultDate = new Date().toISOString().split('T')[0];
        if (studentReminders.length > 0) {
            // Use the date from the earliest reminder
            const reminderDate = new Date(studentReminders[0].date);
            if (!isNaN(reminderDate.getTime())) {
                defaultDate = reminderDate.toISOString().split('T')[0];
            }
        }

        setFormData({
            session_date: defaultDate,
            session_mode: 'In-Person',
            venue: '',
            concern: '',
            discussion_summary: '',
            advice: '',
            action_plan: '',
            next_followup_date: '',
            session_status: 'Follow-Up Required',
            emotion_level: 3,
            faculty_feedback: ''
        });
        setShowForm(true);
    };

    const handleEditSession = (student, session) => {
        setSelectedStudent(student);
        setEditingSessionId(session._id);
        setFormData({
            session_date: session.session_date,
            session_mode: session.session_mode,
            venue: session.venue,
            concern: session.concern,
            discussion_summary: session.discussion_summary,
            advice: session.advice,
            action_plan: session.action_plan,
            next_followup_date: session.next_followup_date || '',
            session_status: session.session_status,
            emotion_level: session.emotion_level || 3,
            faculty_feedback: session.faculty_feedback || ''
        });
        setShowForm(true);
    };

    const handleFormSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const url = editingSessionId 
                ? `/counselling-sessions/${editingSessionId}` 
                : '/counselling-sessions';
            const method = editingSessionId ? 'PATCH' : 'POST';

            await apiClient(url, {
                method,
                body: JSON.stringify({
                    ...formData,
                    student_id: selectedStudent.studentId || selectedStudent.uid || selectedStudent._id || selectedStudent.id
                })
            });
            
            setMessage({ text: editingSessionId ? 'Session updated successfully!' : 'Session saved successfully!', type: 'success' });
            setShowForm(false);
            setEditingSessionId(null);
            setFormData({
                session_date: new Date().toISOString().split('T')[0],
                session_mode: 'In-Person',
                venue: '',
                concern: '',
                discussion_summary: '',
                advice: '',
                action_plan: '',
                next_followup_date: '',
                session_status: 'Follow-Up Required',
                emotion_level: 3,
                faculty_feedback: ''
            });
            fetchStudentSessions(selectedStudent.studentId || selectedStudent.uid || selectedStudent._id || selectedStudent.id);
            // Refresh follow-ups
            const followUps = await apiClient('/counselling-sessions/all-allocated');
            setAllFollowUps(followUps);
            setTimeout(() => setMessage({ text: '', type: '' }), 3000);
        } catch (error) {
            console.error('Error saving session:', error);
            setMessage({ text: 'Error saving session. Please try again.', type: 'error' });
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteFollowUp = async (sessionId) => {
        if (!window.confirm('Are you sure you want to delete this follow-up reminder?')) return;
        
        try {
            await apiClient(`/counselling-sessions/${sessionId}`, { method: 'DELETE' });
            setMessage({ text: 'Follow-up reminder deleted successfully.', type: 'success' });
            fetchInitialData();
            setTimeout(() => setMessage({ text: '', type: '' }), 3000);
        } catch (error) {
            console.error('Error deleting follow-up:', error);
            setMessage({ text: 'Error deleting follow-up. Please try again.', type: 'error' });
        }
    };

    const getFollowUpStatus = (dateStr) => {
        if (!dateStr) return null;
        const now = new Date();
        const dateObj = new Date(dateStr);
        
        const todayStr = now.toISOString().split('T')[0];
        const itemDateStr = dateObj.toISOString().split('T')[0];
        
        // If it's today, show in 'Due Today' regardless of time
        if (itemDateStr === todayStr) return { label: 'Due Today', color: '#d97706', bg: theme === 'dark' ? 'rgba(217, 119, 6, 0.15)' : '#fef3c7', icon: '🟡' };
        
        // If it was before today, it's overdue
        if (dateObj < now) return { label: 'Overdue', color: '#dc2626', bg: theme === 'dark' ? 'rgba(220, 38, 38, 0.15)' : '#fee2e2', icon: '🔴' };
        
        return { label: 'Upcoming', color: '#10b981', bg: theme === 'dark' ? 'rgba(16, 185, 129, 0.15)' : '#d1fae5', icon: '🟢' };
    };

    const sortedReminders = useMemo(() => {
        const items = [];

        // 1. Add follow-up reminders from sessions
        allFollowUps
            .filter(f => f.session_status === 'Follow-Up Required')
            .forEach(f => {
                items.push({
                    id: f._id,
                    type: 'follow-up',
                    studentName: f.student_id?.name,
                    regno: f.student_id?.regno,
                    department: f.student_id?.department,
                    date: f.next_followup_date,
                    rawDate: new Date(f.next_followup_date)
                });
            });

        // 2. Add initial meeting reminders from students (feedback)
        students
            .filter(s => s.meetingTimeSlot && s.status !== 'resolved')
            .forEach(s => {
                // Check if a session has already been recorded *after* this meeting was scheduled
                // This prevents initial meetings that have already been addressed from showing up
                const studentSessions = sessions[s.studentId || s.uid || s._id || s.id] || [];
                const hasSessionBeenRecorded = studentSessions.length > 0;

                if (!hasSessionBeenRecorded) {
                    items.push({
                        id: s.id || s._id,
                        type: 'initial-meeting',
                        studentName: s.studentName,
                        regno: s.studentDetails?.regno || s.regno,
                        department: s.studentDetails?.department || s.department,
                        date: s.meetingTimeSlot,
                        rawDate: new Date(s.meetingTimeSlot)
                    });
                }
            });

        return items.sort((a, b) => a.rawDate - b.rawDate);
    }, [allFollowUps, students, sessions]);

    if (loading) {
        return (
            <div className="container" style={{ textAlign: 'center', paddingTop: '60px' }}>
                <div style={{ fontSize: '2rem', marginBottom: '10px' }}>⏳</div>
            <p style={{ color: 'var(--text-secondary)' }}>Loading Counselling Management...</p>
            </div>
        );
    }

    return (
        <div className="counselling-management-page container" style={{ paddingTop: '20px', position: 'relative' }}>
            {/* Hamburger Button */}
            <button
                onClick={() => setIsSidebarOpen(true)}
                className="hamburger-btn"
            >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div className="line"></div>
                    <div className="line"></div>
                    <div className="line"></div>
                </div>
            </button>

            {/* Sidebar Overlay */}
            {isSidebarOpen && (
                <div
                    onClick={() => setIsSidebarOpen(false)}
                    className="sidebar-overlay"
                >
                    <div
                        onClick={e => e.stopPropagation()}
                        className="sidebar-container"
                    >
                        <div className="modal-header">
                            <h3 className="sidebar-title">Menu</h3>
                            <button onClick={() => setIsSidebarOpen(false)} className="sidebar-close-btn">×</button>
                        </div>

                        <nav style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: 1 }}>
                            <Link to="/" className="sidebar-link" onClick={() => setIsSidebarOpen(false)}>
                                🎛️ Faculty Dashboard
                            </Link>
                            <Link to="/?view=analytics" className="sidebar-link" onClick={() => setIsSidebarOpen(false)}>
                                📊 Student Emotional Overview
                            </Link>
                            <Link to="/counselling-management" className="sidebar-link active" onClick={() => setIsSidebarOpen(false)}>
                                📒 Counselling Management
                            </Link>
                        </nav>

                        <div className="sidebar-footer">
                            <div className="sidebar-user-info">
                                <div className="user-avatar">
                                    {getUserName().charAt(0)}
                                </div>
                                <div className="user-details">
                                    <span className="user-name">{getUserName()}</span>
                                    <span className="user-role">Faculty Member</span>
                                </div>
                                <div className="sidebar-logout-arrow" onClick={logout} title="Logout">
                                    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M9 18l6-6-6-6" />
                                    </svg>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {/* Message Banner */}
            {message.text && (
                <div style={{
                    padding: '12px 20px',
                    borderRadius: '8px',
                    marginBottom: '20px',
                    backgroundColor: message.type === 'success' ? '#ecfdf5' : '#fef2f2',
                    color: message.type === 'success' ? '#065f46' : '#991b1b',
                    border: `1px solid ${message.type === 'success' ? '#a7f3d0' : '#fca5a5'}`,
                    fontWeight: 600,
                    animation: 'fadeIn 0.3s ease-out',
                    zIndex: 1000
                }}>
                    {message.text}
                </div>
            )}

            {/* Upcoming Follow-Ups Panel */}
            <div className="card" style={{ marginBottom: '30px', padding: '25px' }}>
                <h2 style={{ color: 'var(--primary-slate)', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1.4rem' }}>
                    📅 Counselling Follow-Up Reminders
                </h2>
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
                    {['Overdue', 'Due Today', 'Upcoming'].map(group => {
                        const filtered = sortedReminders.filter(f => {
                            const status = getFollowUpStatus(f.date);
                            return status.label === group;
                        });

                        const groupColors = {
                            'Overdue': { main: '#dc2626', bg: theme === 'dark' ? 'rgba(220, 38, 38, 0.15)' : '#fee2e2' },
                            'Due Today': { main: '#d97706', bg: theme === 'dark' ? 'rgba(217, 119, 6, 0.15)' : '#fef3c7' },
                            'Upcoming': { main: '#10b981', bg: theme === 'dark' ? 'rgba(16, 185, 129, 0.15)' : '#d1fae5' }
                        };

                        return (
                            <div key={group} className="reminder-group-card" style={{
                                backgroundColor: groupColors[group].bg,
                                borderRadius: '12px',
                                padding: '15px',
                                border: `1px solid ${groupColors[group].main}20`
                            }}>
                                <h3 style={{ 
                                    color: groupColors[group].main, 
                                    fontSize: '0.9rem', 
                                    textTransform: 'uppercase', 
                                    letterSpacing: '0.05em', 
                                    marginBottom: '12px',
                                    display: 'flex',
                                    justifyContent: 'space-between'
                                }}>
                                    {group} <span>{filtered.length}</span>
                                </h3>
                                
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {filtered.length === 0 ? (
                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontStyle: 'italic', padding: '10px', backgroundColor: 'var(--bg-color)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                                            No {group.toLowerCase()} tasks.
                                        </div>
                                    ) : (
                                        filtered.map((f, idx) => (
                                            <div key={idx} style={{ 
                                                backgroundColor: 'var(--card-bg)', 
                                                padding: '10px 12px', 
                                                borderRadius: '8px', 
                                                fontSize: '0.85rem', 
                                                boxShadow: 'var(--shadow-sm)',
                                                border: '1px solid var(--border-color)',
                                                borderLeft: `4px solid ${groupColors[group].main}`
                                            }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                    <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>
                                                        {f.studentName} 
                                                        <span style={{ 
                                                            fontSize: '0.65rem', 
                                                            marginLeft: '6px', 
                                                            padding: '2px 6px', 
                                                            borderRadius: '4px',
                                                            backgroundColor: f.type === 'initial-meeting' ? (theme === 'dark' ? 'rgba(59, 130, 246, 0.2)' : '#dbeafe') : (theme === 'dark' ? 'rgba(245, 158, 11, 0.2)' : '#fef3c7'),
                                                            color: f.type === 'initial-meeting' ? (theme === 'dark' ? '#93c5fd' : '#1e40af') : (theme === 'dark' ? '#fcd34d' : '#92400e'),
                                                            textTransform: 'uppercase'
                                                        }}>
                                                            {f.type === 'initial-meeting' ? 'Initial' : 'Follow-up'}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)', marginTop: '4px', fontSize: '0.75rem' }}>
                                                    <span>{f.regno} • {f.department || 'N/A'}</span>
                                                    <span>{new Date(f.date).toLocaleDateString()} {new Date(f.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Student Session Records Section */}
            <div className="card" style={{ marginBottom: '30px' }}>
                <h2 style={{ borderBottom: '2px solid var(--border-color)', paddingBottom: '10px', marginBottom: '20px', color: 'var(--primary-slate)' }}>
                    📘 Counselling Session Records
                </h2>

                <div style={{ display: 'grid', gap: '20px' }}>
                    {ongoingStudents.map(student => (
                        <div key={student.id} style={{
                            border: '1px solid var(--border-color)',
                            borderRadius: '12px',
                            overflow: 'hidden',
                            backgroundColor: 'var(--card-bg)',
                            transition: 'all 0.3s ease'
                        }}>
                            <div
                                onClick={() => toggleExpand(student.studentId || student.uid || student._id || student.id)}
                                style={{
                                    padding: '16px 20px',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    cursor: 'pointer',
                                    backgroundColor: expandedStudentId === (student.studentId || student.uid || student._id || student.id) ? 'var(--bg-color)' : 'transparent'
                                }}
                            >
                                <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                                    <div style={{
                                        width: '45px',
                                        height: '45px',
                                        borderRadius: '50%',
                                        backgroundColor: 'var(--primary-slate)',
                                        color: '#fff',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '1.2rem',
                                        fontWeight: 'bold'
                                    }}>
                                        {student.studentName?.charAt(0)}
                                    </div>
                                    <div>
                                        <div style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '1.1rem' }}>{student.studentName}</div>
                                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                            {student.studentDetails?.regno || student.regno || '—'} • {student.studentDetails?.department || '—'}
                                        </div>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700 }}>Latest Emotion</div>
                                        <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{student.emotion || '—'}</div>
                                    </div>
                                    <div style={{
                                        transform: expandedStudentId === (student.studentId || student.uid || student._id || student.id) ? 'rotate(180deg)' : 'rotate(0deg)',
                                        transition: 'transform 0.3s',
                                        color: '#94a3b8'
                                    }}>
                                        ▼
                                    </div>
                                </div>
                            </div>

                            {expandedStudentId === (student.studentId || student.uid || student._id || student.id) && (
                                <div style={{ padding: '20px', borderTop: '1px solid var(--border-color)', backgroundColor: 'transparent' }}>
                                    {/* Student Overview Row */}
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px', marginBottom: '25px', backgroundColor: 'var(--bg-color)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                                        {/* Feedback Info */}
                                        <div>
                                            <h4 style={{ color: 'var(--primary-slate)', fontSize: '0.9rem', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                💬 Student Feedback Summary
                                            </h4>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 15px', fontSize: '0.85rem' }}>
                                                <div><strong style={{ color: 'var(--text-secondary)' }}>Emotion:</strong><br /> {getEmotionEmoji(student.emotion)} {student.emotion}</div>
                                                <div><strong style={{ color: 'var(--text-secondary)' }}>Intensity:</strong><br /> {student.emotion_intensity}/5</div>
                                                <div><strong style={{ color: 'var(--text-secondary)' }}>Impact:</strong><br /> {student.life_impact_score || '—'}/5</div>
                                                <div><strong style={{ color: 'var(--text-secondary)' }}>Duration:</strong><br /> {student.emotion_duration || '—'}</div>
                                                <div style={{ gridColumn: 'span 2' }}>
                                                    <strong style={{ color: 'var(--text-secondary)' }}>Primary Cause & Triggers:</strong><br /> 
                                                    {student.emotion_domain || student.reason || '—'} 
                                                    {student.emotion_triggers && ` • ${Array.isArray(student.emotion_triggers) ? student.emotion_triggers.join(', ') : student.emotion_triggers}`}
                                                </div>
                                                <div style={{ gridColumn: 'span 2' }}>
                                                    <strong style={{ color: 'var(--text-secondary)' }}>Student Comment:</strong><br /> 
                                                    <span style={{ fontStyle: student.comment ? 'normal' : 'italic', color: student.comment ? 'var(--text-main)' : 'var(--text-secondary)' }}>
                                                        {student.comment || 'No comment provided'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Meeting Schedule */}
                                        <div style={{ borderLeft: theme === 'dark' ? 'none' : '1px solid var(--border-color)', borderTop: theme === 'dark' ? '1px solid var(--border-color)' : 'none', paddingTop: theme === 'dark' ? '20px' : '0', paddingLeft: theme === 'dark' ? '0' : '24px' }}>
                                            <h4 style={{ color: 'var(--primary-slate)', fontSize: '0.9rem', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                📅 Allocated Meeting Details
                                            </h4>
                                            <div style={{ backgroundColor: 'var(--card-bg)', borderRadius: '8px', padding: '12px', border: '1px solid var(--border-color)' }}>
                                                <div style={{ marginBottom: '10px' }}>
                                                    <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '2px' }}>Time Slot</div>
                                                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                        <span>🕒</span> {student.meetingTimeSlot ? new Date(student.meetingTimeSlot).toLocaleString() : 'Not Scheduled'}
                                                    </div>
                                                </div>
                                                <div>
                                                    <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '2px' }}>Venue</div>
                                                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                        <span>📍</span> {student.meetingVenue || 'Not Assigned'}
                                                    </div>
                                                </div>
                                            </div>
                                            <div style={{ marginTop: '12px', fontSize: '0.75rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                                                * This information is from the initial case allocation.
                                            </div>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                        <h3 style={{ color: 'var(--text-main)', fontSize: '1.2rem', margin: 0 }}>📜 Session History</h3>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleAddSession(student);
                                            }}
                                            style={{
                                                padding: '8px 16px',
                                                backgroundColor: '#10b981',
                                                color: '#fff',
                                                border: 'none',
                                                borderRadius: '8px',
                                                fontWeight: 'bold',
                                                cursor: 'pointer',
                                                fontSize: '0.85rem',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '6px'
                                            }}
                                        >
                                            ➕ Add New Session
                                        </button>
                                    </div>

                                    {!sessions[student.studentId || student.uid || student._id || student.id] ? (
                                        <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading sessions...</div>
                                    ) : (
                                        <>
                                            <div style={{ display: 'grid', gap: '15px', marginBottom: '30px' }}>
                                                {sessions[student.studentId || student.uid || student._id || student.id].length === 0 ? (
                                                    <div style={{ padding: '20px', textAlign: 'center', backgroundColor: 'var(--bg-color)', border: '1px dashed var(--border-color)', borderRadius: '8px', color: 'var(--text-secondary)' }}>
                                                        No sessions recorded yet.
                                                    </div>
                                                ) : (
                                                    sessions[student.studentId || student.uid || student._id || student.id].map((session, sidx) => (
                                                        <div key={session._id} style={{
                                                            padding: '20px', 
                                                            backgroundColor: 'var(--card-bg)', 
                                                            borderRadius: '16px', 
                                                            border: '1px solid var(--border-color)',
                                                            boxShadow: 'var(--shadow-premium)',
                                                            transition: 'all 0.3s ease',
                                                            position: 'relative'
                                                        }}>
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                                    <div style={{ 
                                                                        width: '36px', 
                                                                        height: '36px', 
                                                                        borderRadius: '12px', 
                                                                        backgroundColor: theme === 'dark' ? 'rgba(59, 130, 246, 0.2)' : '#eff6ff', 
                                                                        color: theme === 'dark' ? '#93c5fd' : '#3b82f6',
                                                                        display: 'flex',
                                                                        alignItems: 'center',
                                                                        justifyContent: 'center',
                                                                        fontWeight: 800,
                                                                        fontSize: '0.9rem'
                                                                    }}>
                                                                        {sessions[student.studentId || student.uid || student._id || student.id].length - sidx}
                                                                    </div>
                                                                    <div>
                                                                        <div style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                            Session {getEmotionEmoji({5:'Happy', 4:'Neutral', 3:'Anxious', 2:'Stressed', 1:'Sad'}[session.emotion_level])}
                                                                            <button 
                                                                                onClick={() => handleEditSession(student, session)}
                                                                                style={{
                                                                                    marginLeft: '8px',
                                                                                    border: '1px solid var(--border-color)',
                                                                                    background: 'var(--bg-color)',
                                                                                    borderRadius: '6px',
                                                                                    padding: '2px 10px',
                                                                                    fontSize: '0.7rem',
                                                                                    color: 'var(--text-secondary)',
                                                                                    cursor: 'pointer',
                                                                                    fontWeight: 600,
                                                                                    transition: 'all 0.2s'
                                                                                }}
                                                                            >
                                                                                ✏️ Edit
                                                                            </button>
                                                                        </div>
                                                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '12px', marginTop: '2px' }}>
                                                                            <span>📅 {session.session_date}</span>
                                                                            <span>📍 {session.venue} ({session.session_mode})</span>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <span style={{
                                                                    backgroundColor: session.session_status === 'Completed' ? (theme === 'dark' ? 'rgba(16, 185, 129, 0.2)' : '#ecfdf5') : (theme === 'dark' ? 'rgba(245, 158, 11, 0.2)' : '#fff7ed'),
                                                                    color: session.session_status === 'Completed' ? (theme === 'dark' ? '#34d399' : '#059669') : (theme === 'dark' ? '#fbbf24' : '#c2410c'),
                                                                    padding: '4px 10px',
                                                                    borderRadius: '8px',
                                                                    fontSize: '0.75rem',
                                                                    fontWeight: 700,
                                                                    border: `1px solid ${session.session_status === 'Completed' ? (theme === 'dark' ? '#10b98140' : '#d1fae5') : (theme === 'dark' ? '#f59e0b40' : '#ffedd5')}`
                                                                }}>
                                                                    {session.session_status}
                                                                </span>
                                                            </div>

                                                            <div style={{ paddingLeft: theme === 'dark' ? '0' : '48px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
                                                                <div>
                                                                    <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Main Concern</div>
                                                                    <div style={{ fontSize: '0.9rem', color: 'var(--text-main)', lineHeight: '1.5' }}>{session.concern}</div>
                                                                </div>
                                                                <div>
                                                                    <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Discussion Summary</div>
                                                                    <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>{session.discussion_summary}</div>
                                                                </div>
                                                                <div>
                                                                    <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Advice Given</div>
                                                                    <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>{session.advice}</div>
                                                                </div>
                                                                <div>
                                                                    <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Action Plan</div>
                                                                    <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>{session.action_plan}</div>
                                                                </div>
                                                                <div style={{ gridColumn: 'span 2' }}>
                                                                    <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Faculty Feedback / Remarks</div>
                                                                    <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: '1.5', fontStyle: session.faculty_feedback ? 'normal' : 'italic' }}>
                                                                        {session.faculty_feedback || 'No specific feedback or additional remarks provided.'}
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            {session.next_followup_date && session.session_status !== 'Completed' && (
                                                                <div style={{ 
                                                                    marginTop: '20px', 
                                                                    marginLeft: theme === 'dark' ? '0' : '48px',
                                                                    padding: '10px 15px', 
                                                                    backgroundColor: theme === 'dark' ? 'rgba(245, 158, 11, 0.15)' : '#fff7ed', 
                                                                    borderRadius: '10px', 
                                                                    fontSize: '0.8rem', 
                                                                    color: theme === 'dark' ? '#fcd34d' : '#c2410c', 
                                                                    fontWeight: 600,
                                                                    display: 'inline-flex',
                                                                    alignItems: 'center',
                                                                    gap: '8px',
                                                                    border: '1px solid var(--border-color)'
                                                                }}>
                                                                    <span>📅 Next Follow-Up:</span> {new Date(session.next_followup_date).toLocaleDateString()} ({new Date(session.next_followup_date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})})
                                                                </div>
                                                            )}
                                                        </div>
                                                    ))
                                                )}
                                            </div>

                                            {/* Progress Tracker Section */}
                                            <div style={{ 
                                                padding: '25px', 
                                                backgroundColor: 'var(--card-subtle-bg)', 
                                                borderRadius: '16px', 
                                                border: '1px solid var(--border-color)',
                                                marginTop: '20px'
                                            }}>
                                                <h3 style={{ color: 'var(--text-main)', fontSize: '1.1rem', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px', fontWeight: 700 }}>
                                                    <span style={{ fontSize: '1.3rem' }}>📈</span> Counselling Progress Tracker
                                                </h3>

                                                {/* Student Insights Stats */}
                                                <div style={{ 
                                                    display: 'grid', 
                                                    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', 
                                                    gap: '15px', 
                                                    marginBottom: '25px'
                                                }}>
                                                    <div style={{ backgroundColor: 'var(--card-bg)', padding: '12px', borderRadius: '12px', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                        <div style={{ fontSize: '1.2rem' }}>🎯</div>
                                                        <div>
                                                            <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Total Sessions</div>
                                                            <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-main)' }}>{sessions[student.studentId || student.uid || student._id || student.id].length}</div>
                                                        </div>
                                                    </div>
                                                    <div style={{ backgroundColor: 'var(--card-bg)', padding: '12px', borderRadius: '12px', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                        <div style={{ fontSize: '1.2rem' }}>📊</div>
                                                        <div>
                                                            <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Mood Trend</div>
                                                            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--status-happy)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                                {sessions[student.studentId || student.uid || student._id || student.id].length > 1 && sessions[student.studentId || student.uid || student._id || student.id][0].emotion_level >= sessions[student.studentId || student.uid || student._id || student.id][1].emotion_level ? '↗️ Positive' : '➡️ Stable'}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div style={{ backgroundColor: 'var(--card-bg)', padding: '12px', borderRadius: '12px', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                        <div style={{ fontSize: '1.2rem' }}>📅</div>
                                                        <div>
                                                            <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Next Follow-up</div>
                                                            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--status-anxious)' }}>
                                                                {sessions[student.studentId || student.uid || student._id || student.id].length > 0 ? (sessions[student.studentId || student.uid || student._id || student.id][0].next_followup_date ? `${new Date(sessions[student.studentId || student.uid || student._id || student.id][0].next_followup_date).toLocaleDateString()} (${new Date(sessions[student.studentId || student.uid || student._id || student.id][0].next_followup_date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})})` : 'N/A') : 'N/A'}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div style={{ height: '320px', backgroundColor: 'var(--card-bg)', padding: '20px', borderRadius: '14px', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-premium)' }}>
                                                    <Line
                                                        data={{
                                                            labels: sessions[student.studentId || student.uid || student._id || student.id].slice().reverse().map((s, i) => `Session ${i + 1}`),
                                                            datasets: [{
                                                                label: 'Emotional Level',
                                                                data: sessions[student.studentId || student.uid || student._id || student.id].slice().reverse().map(s => {
                                                                    return s.emotion_level || 3;
                                                                }),
                                                                borderColor: '#10b981',
                                                                borderWidth: 4,
                                                                backgroundColor: (context) => {
                                                                    const ctx = context.chart.ctx;
                                                                    const gradient = ctx.createLinearGradient(0, 0, 0, 300);
                                                                    gradient.addColorStop(0, 'rgba(16, 185, 129, 0.25)');
                                                                    gradient.addColorStop(1, 'rgba(16, 185, 129, 0.0)');
                                                                    return gradient;
                                                                },
                                                                tension: 0.45,
                                                                pointRadius: 6,
                                                                pointBackgroundColor: '#fff',
                                                                pointBorderColor: '#10b981',
                                                                pointBorderWidth: 3,
                                                                pointHoverRadius: 9,
                                                                pointHoverBackgroundColor: '#10b981',
                                                                pointHoverBorderColor: '#fff',
                                                                pointHoverBorderWidth: 4,
                                                                fill: true
                                                            }]
                                                        }}
                                                        options={{
                                                            responsive: true,
                                                            maintainAspectRatio: false,
                                                            layout: { padding: { top: 10, bottom: 10, left: 10, right: 10 } },
                                                            scales: {
                                                                y: {
                                                                    min: 0.5,
                                                                    max: 5.5,
                                                                    grid: { color: theme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(226, 232, 240, 0.4)', drawBorder: false },
                                                                    ticks: {
                                                                        stepSize: 1,
                                                                        font: { size: 11, weight: '600' },
                                                                        color: theme === 'dark' ? '#94a3b8' : '#64748b',
                                                                        callback: (value) => {
                                                                            const reversedMap = { 5: 'Happy', 4: 'Neutral', 3: 'Anxious', 2: 'Stressed', 1: 'Sad' };
                                                                            return reversedMap[value] || '';
                                                                        }
                                                                    }
                                                                },
                                                                x: {
                                                                    grid: { display: false },
                                                                    ticks: { font: { size: 11, weight: '600' }, color: theme === 'dark' ? '#94a3b8' : '#64748b' }
                                                                }
                                                            },
                                                            plugins: {
                                                                legend: { display: false },
                                                                tooltip: {
                                                                    backgroundColor: theme === 'dark' ? '#334155' : '#1e293b',
                                                                    padding: 12,
                                                                    titleFont: { size: 14, weight: 'bold' },
                                                                    bodyFont: { size: 13 },
                                                                    cornerRadius: 8,
                                                                    displayColors: false,
                                                                    callbacks: {
                                                                        title: (context) => {
                                                                            const studentSessions = sessions[student.studentId || student.uid || student._id || student.id];
                                                                            const sessionIdx = studentSessions.length - 1 - context[0].dataIndex;
                                                                            const sessionDate = new Date(studentSessions[sessionIdx].session_date);
                                                                            return `Session on ${sessionDate.toLocaleDateString()} (${sessionDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})})`;
                                                                        },
                                                                        label: (context) => {
                                                                            const reversedMap = { 5: 'Happy', 4: 'Neutral', 3: 'Anxious', 2: 'Stressed', 1: 'Sad' };
                                                                            return ` Status: ${reversedMap[context.raw] || 'Unknown'}`;
                                                                        }
                                                                    }
                                                                }
                                                            }
                                                        }}
                                                    />
                                                </div>
                                                <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'center', gap: '20px', flexWrap: 'wrap' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                                        <span style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#10b981' }}></span>
                                                        <span>Improved</span>
                                                    </div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                                        <span style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#f59e0b' }}></span>
                                                        <span>Monitoring</span>
                                                    </div>
                                                </div>
                                                <p style={{ marginTop: '15px', fontSize: '0.8rem', color: 'var(--text-secondary)', fontStyle: 'italic', textAlign: 'center' }}>
                                                    * This chart visualizes the student's emotional improvement journey as recorded during counselling sessions.
                                                </p>
                                            </div>
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Add Session Modal Form */}
            {showForm && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    backgroundColor: 'rgba(0,0,0,0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 2000,
                    padding: '20px'
                }}>
                    <div style={{
                        backgroundColor: 'var(--card-bg)',
                        borderRadius: '15px',
                        width: '100%',
                        maxSize: '600px',
                        maxWidth: '600px',
                        maxHeight: '90vh',
                        overflowY: 'auto',
                        padding: '30px',
                        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
                            <h2 style={{ color: 'var(--text-main)', margin: 0 }}>
                                {editingSessionId ? '✏️ Edit Session' : '➕ Add New Session'}: {selectedStudent?.studentName}
                            </h2>
                            <button onClick={() => setShowForm(false)} style={{ border: 'none', background: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--text-secondary)' }}>×</button>
                        </div>

                        <form onSubmit={handleFormSubmit}>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '20px' }}>
                                <div>
                                    <label style={{ display: 'block', fontWeight: 600, marginBottom: '8px', color: 'var(--text-main)', fontSize: '0.9rem' }}>Session Date</label>
                                    <input
                                        type="date"
                                        required
                                        value={formData.session_date}
                                        onChange={(e) => setFormData(prev => ({ ...prev, session_date: e.target.value }))}
                                        style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-color)', color: 'var(--text-main)', fontSize: '0.95rem' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontWeight: 600, marginBottom: '8px', color: '#475569', fontSize: '0.9rem' }}>Session Mode</label>
                                    <select
                                        value={formData.session_mode}
                                        onChange={(e) => setFormData(prev => ({ ...prev, session_mode: e.target.value }))}
                                        style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-color)', color: 'var(--text-main)', fontSize: '0.95rem' }}
                                    >
                                        <option value="In-Person">In-Person</option>
                                        <option value="Online">Online</option>
                                    </select>
                                </div>
                            </div>

                            <div style={{ marginBottom: '20px' }}>
                                <label style={{ display: 'block', fontWeight: 600, marginBottom: '8px', color: 'var(--text-main)', fontSize: '0.9rem' }}>Meeting Venue</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="Room 302 / Google Meet / etc."
                                    value={formData.venue}
                                    onChange={(e) => setFormData(prev => ({ ...prev, venue: e.target.value }))}
                                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-color)', color: 'var(--text-main)', fontSize: '0.95rem' }}
                                />
                            </div>

                            <div style={{ marginBottom: '20px' }}>
                                <label style={{ display: 'block', fontWeight: 600, marginBottom: '8px', color: 'var(--text-main)', fontSize: '0.9rem' }}>Main Concern</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="Briefly describe the student's issue"
                                    value={formData.concern}
                                    onChange={(e) => setFormData(prev => ({ ...prev, concern: e.target.value }))}
                                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-color)', color: 'var(--text-main)', fontSize: '0.95rem' }}
                                />
                            </div>

                            <div style={{ marginBottom: '20px' }}>
                                <label style={{ display: 'block', fontWeight: 600, marginBottom: '8px', color: 'var(--text-main)', fontSize: '0.9rem' }}>Discussion Summary</label>
                                <textarea
                                    required
                                    rows="3"
                                    value={formData.discussion_summary}
                                    onChange={(e) => setFormData(prev => ({ ...prev, discussion_summary: e.target.value }))}
                                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-color)', color: 'var(--text-main)', fontSize: '0.95rem', resize: 'vertical' }}
                                ></textarea>
                            </div>

                            <div style={{ marginBottom: '20px' }}>
                                <label style={{ display: 'block', fontWeight: 600, marginBottom: '8px', color: 'var(--text-main)', fontSize: '0.9rem' }}>Advice Given</label>
                                <textarea
                                    required
                                    rows="2"
                                    value={formData.advice}
                                    onChange={(e) => setFormData(prev => ({ ...prev, advice: e.target.value }))}
                                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-color)', color: 'var(--text-main)', fontSize: '0.95rem', resize: 'vertical' }}
                                ></textarea>
                            </div>

                            <div style={{ marginBottom: '20px' }}>
                                <label style={{ display: 'block', fontWeight: 600, marginBottom: '8px', color: 'var(--text-main)', fontSize: '0.9rem' }}>Action Plan</label>
                                <textarea
                                    required
                                    rows="2"
                                    value={formData.action_plan}
                                    onChange={(e) => setFormData(prev => ({ ...prev, action_plan: e.target.value }))}
                                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-color)', color: 'var(--text-main)', fontSize: '0.95rem', resize: 'vertical' }}
                                ></textarea>
                            </div>

                            <div style={{ marginBottom: '20px' }}>
                                <label style={{ display: 'block', fontWeight: 600, marginBottom: '8px', color: '#475569', fontSize: '0.9rem' }}>Faculty Feedback / Remarks for Student</label>
                                <textarea
                                    placeholder="Provide specific feedback or additional remarks for the student (Visible to student)..."
                                    rows="3"
                                    value={formData.faculty_feedback}
                                    onChange={(e) => setFormData(prev => ({ ...prev, faculty_feedback: e.target.value }))}
                                    style={{ 
                                        width: '100%', 
                                        padding: '12px', 
                                        borderRadius: '8px', 
                                        border: '1px solid var(--border-color)', 
                                        fontSize: '0.95rem', 
                                        resize: 'vertical',
                                        backgroundColor: 'var(--bg-color)',
                                        color: 'var(--text-main)'
                                    }}
                                ></textarea>
                                <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '4px' }}>* This feedback will be displayed in the student's progress history.</div>
                            </div>

                            <div style={{ marginBottom: '20px' }}>
                                <label style={{ display: 'block', fontWeight: 600, marginBottom: '8px', color: 'var(--text-main)', fontSize: '0.9rem' }}>Recorded Emotion (Status during session) *</label>
                                <select 
                                    value={formData.emotion_level} 
                                    onChange={(e) => setFormData(prev => ({ ...prev, emotion_level: Number(e.target.value) }))}
                                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-color)', color: 'var(--text-main)', fontSize: '0.95rem' }}
                                    required
                                >
                                    <option value={5}>Happy 😊</option>
                                    <option value={4}>Neutral 😐</option>
                                    <option value={3}>Anxious 😰</option>
                                    <option value={2}>Stressed 😫</option>
                                    <option value={1}>Sad 😢</option>
                                </select>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '30px' }}>
                                <div>
                                    <label style={{ 
                                        display: 'block', 
                                        fontWeight: 600, 
                                        marginBottom: '8px', 
                                        color: formData.session_status === 'Completed' ? 'var(--text-secondary)' : 'var(--text-main)', 
                                        fontSize: '0.9rem',
                                        transition: 'color 0.3s'
                                    }}>
                                        Next Follow-Up Date
                                    </label>
                                    <input
                                        type="datetime-local"
                                        min={new Date().toISOString().slice(0, 16)}
                                        disabled={formData.session_status === 'Completed'}
                                        required={formData.session_status === 'Follow-Up Required'}
                                        value={formData.next_followup_date}
                                        onChange={(e) => setFormData(prev => ({ ...prev, next_followup_date: e.target.value }))}
                                        style={{ 
                                            width: '100%', 
                                            padding: '10px', 
                                            borderRadius: '8px', 
                                            border: '1px solid var(--border-color)', 
                                            fontSize: '0.95rem',
                                            backgroundColor: formData.session_status === 'Completed' ? 'var(--bg-color)' : 'var(--bg-color)',
                                            color: 'var(--text-main)',
                                            cursor: formData.session_status === 'Completed' ? 'not-allowed' : 'text',
                                            transition: 'all 0.3s'
                                        }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontWeight: 600, marginBottom: '8px', color: '#475569', fontSize: '0.9rem' }}>Session Status</label>
                                    <select
                                        value={formData.session_status}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            setFormData(prev => ({ 
                                                ...prev, 
                                                session_status: val,
                                                next_followup_date: val === 'Completed' ? '' : prev.next_followup_date
                                            }));
                                        }}
                                        style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-color)', color: 'var(--text-main)', fontSize: '0.95rem' }}
                                    >
                                        <option value="Completed">Completed</option>
                                        <option value="Follow-Up Required">Follow-Up Required</option>
                                    </select>
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '15px' }}>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    style={{
                                        flex: 2,
                                        padding: '14px',
                                        backgroundColor: 'var(--primary-slate)',
                                        color: '#fff',
                                        border: 'none',
                                        borderRadius: '10px',
                                        fontWeight: 'bold',
                                        fontSize: '1rem',
                                        cursor: saving ? 'not-allowed' : 'pointer',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    {saving ? 'Saving...' : '💾 Save Session'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShowForm(false)}
                                    style={{
                                        flex: 1,
                                        padding: '14px',
                                        backgroundColor: 'var(--bg-color)',
                                        color: 'var(--text-main)',
                                        border: '1px solid var(--border-color)',
                                        borderRadius: '10px',
                                        fontWeight: 'bold',
                                        fontSize: '1rem',
                                        cursor: 'pointer'
                                    }}
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CounsellingManagement;
