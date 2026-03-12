import React, { useState, useEffect } from 'react';
import { apiClient } from '../utils/apiClient';

const AdminCounsellingHistory = () => {
    const [sessions, setSessions] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
        setLoading(true);
        try {
            const data = await apiClient('/admin/counselling-sessions');
            setSessions(data);
        } catch (error) {
            console.error("Error fetching counselling sessions", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const getEmotionEmoji = (level) => {
        const emojis = { 5: '😊', 4: '😐', 3: '😰', 2: '😫', 1: '😢' };
        return emojis[level] || '😶';
    };

    const getEmotionClass = (level) => {
        const classes = { 5: 'happy', 4: 'neutral', 3: 'anxious', 2: 'stressed', 1: 'sad' };
        return classes[level] || 'unknown';
    };

    const getEmotionText = (level) => {
        const texts = { 5: 'Happy', 4: 'Neutral', 3: 'Anxious', 2: 'Stressed', 1: 'Sad' };
        return texts[level] || 'Unknown';
    };

    if (loading) return <div className="container" style={{ padding: '40px', textAlign: 'center' }}><h3>⏳ Loading counselling records...</h3></div>;

    return (
        <div className="counselling-history-container" style={{ width: '100%', padding: '2px' }}>
            <div className="card" style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                 <div>
                    <h3 style={{ margin: 0 }}>📜 Global Counselling Records</h3>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: '5px 0 0 0' }}>Monitor all student-faculty interactions and faculty feedback.</p>
                 </div>
                 <button className="btn btn-secondary" onClick={fetchData} style={{ width: 'auto' }}>🔄 Refresh</button>
            </div>
            
            <div className="table-responsive">
                <table className="admin-table">
                    <thead>
                        <tr>
                            <th style={{ minWidth: '120px' }}>Session Date</th>
                            <th style={{ minWidth: '200px' }}>Student Info</th>
                            <th style={{ minWidth: '180px' }}>Faculty Advisor</th>
                            <th style={{ minWidth: '150px' }}>Emotion Level</th>
                            <th style={{ minWidth: '350px' }}>Discussion & Feedback</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sessions.length > 0 ? sessions.map((session) => (
                            <tr key={session._id}>
                                <td style={{ whiteSpace: 'nowrap', verticalAlign: 'top' }}>
                                    <div style={{ fontWeight: 'bold' }}>{new Date(session.session_date).toLocaleDateString()}</div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                                        Mode: {session.session_mode}
                                    </div>
                                </td>
                                <td style={{ verticalAlign: 'top' }}>
                                    <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>{session.student_id?.name || 'Unknown'}</div>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                                        Email: {session.student_id?.email || 'N/A'} <br/>
                                        Dept: {session.student_id?.department || 'N/A'} <br/>
                                        Roll: {session.student_id?.regno || 'N/A'}
                                    </div>
                                </td>
                                <td style={{ verticalAlign: 'top' }}>
                                    <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{session.faculty_id?.name || 'Unknown'}</div>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{session.faculty_id?.email || 'N/A'}</div>
                                </td>
                                <td style={{ verticalAlign: 'top' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <span style={{ fontSize: '1.2rem' }}>{getEmotionEmoji(session.emotion_level)}</span>
                                            <span className={`emotion-tag ${getEmotionClass(session.emotion_level)}`}>
                                                {getEmotionText(session.emotion_level)}
                                            </span>
                                        </div>
                                        {session.next_followup_date && session.session_status === 'Follow-Up Required' && (
                                            <div style={{ fontSize: '0.75rem', color: '#d97706', backgroundColor: '#fef3c7', padding: '4px 8px', borderRadius: '4px', fontWeight: 600 }}>
                                                📅 Next: {new Date(session.next_followup_date).toLocaleDateString()}
                                            </div>
                                        )}
                                    </div>
                                </td>
                                <td style={{ verticalAlign: 'top' }}>
                                    <div style={{ fontSize: '0.9rem', lineHeight: '1.5' }}>
                                        <div style={{ marginBottom: '8px' }}>
                                            <strong style={{ color: 'var(--primary-slate)', fontSize: '0.8rem', textTransform: 'uppercase' }}>Main Concern:</strong> <br/>
                                            {session.concern}
                                        </div>
                                        <div style={{ marginBottom: '8px', padding: '10px', backgroundColor: 'var(--bg-color)', borderRadius: '8px', borderLeft: '4px solid var(--primary-slate)' }}>
                                            <strong style={{ color: 'var(--text-main)', fontSize: '0.8rem', textTransform: 'uppercase' }}>Faculty Remarks:</strong> <br/>
                                            <span style={{ fontStyle: 'italic', color: '#334155' }}>
                                                {session.faculty_feedback || session.discussion_summary || 'No detailed feedback provided.'}
                                            </span>
                                        </div>
                                        <div>
                                            <strong style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', textTransform: 'uppercase' }}>Action Plan:</strong> <br/>
                                            <span style={{ fontSize: '0.85rem' }}>{session.action_plan || '—'}</span>
                                        </div>
                                    </div>
                                </td>
                            </tr>
                        )) : (
                            <tr>
                                <td colSpan="5" style={{ textAlign: 'center', padding: '60px', color: 'var(--text-secondary)' }}>
                                    <div style={{ fontSize: '2rem', marginBottom: '10px' }}>📂</div>
                                    No counselling sessions recorded yet.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default AdminCounsellingHistory;
