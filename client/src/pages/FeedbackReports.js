import React, { useState, useEffect } from 'react';
import { apiClient } from '../utils/apiClient';

const FeedbackReports = () => {
    const [feedbacks, setFeedbacks] = useState([]);
    const [filteredFeedbacks, setFilteredFeedbacks] = useState([]);
    const [loading, setLoading] = useState(true);

    // Filters
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [emotionFilter, setEmotionFilter] = useState('All');

    const fetchData = async () => {
        setLoading(true);
        try {
            const data = await apiClient('/analytics');
            // Ensure date objects for sorting and comparison
            const feedbackList = data.map(item => ({
                ...item,
                dateObj: item.timestamp ? new Date(item.timestamp) : new Date(item.date || Date.now())
            }));
            feedbackList.sort((a, b) => b.dateObj - a.dateObj);
            setFeedbacks(feedbackList);
            setFilteredFeedbacks(feedbackList);
        } catch (error) {
            console.error("Error fetching data", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    useEffect(() => {
        let filtered = feedbacks;

        if (dateFrom) {
            filtered = filtered.filter(f => f.dateObj >= new Date(dateFrom));
        }
        if (dateTo) {
            const toDate = new Date(dateTo);
            toDate.setHours(23, 59, 59, 999);
            filtered = filtered.filter(f => f.dateObj <= toDate);
        }
        if (emotionFilter !== 'All') {
            filtered = filtered.filter(f => f.emotion === emotionFilter);
        }

        setFilteredFeedbacks(filtered);
    }, [dateFrom, dateTo, emotionFilter, feedbacks]);

    const handleExport = () => {
        const headers = ['Date,Student,Email,Emotion,Intensity,Domain,Triggers,Impact,Duration,Comment'];
        const csvContent = filteredFeedbacks.map(f => {
            const triggers = Array.isArray(f.emotion_triggers) ? f.emotion_triggers.join('; ') : (f.emotion_triggers || '');
            return `${f.dateObj.toLocaleDateString()},"${f.studentName || ''}","${f.studentEmail || ''}",${f.emotion},${f.emotion_intensity || 3},"${f.emotion_domain || ''}","${triggers}",${f.life_impact_score || 3},"${f.emotion_duration || ''}","${(f.comment || '').replace(/"/g, '""')}"`;
        }).join('\n');

        const blob = new Blob([headers.join(',') + '\n' + csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `feedback_report_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this feedback?")) return;
        try {
            await apiClient(`/feedback/${id}`, { method: 'DELETE' });
            setFeedbacks(prev => prev.filter(f => (f.id || f._id) !== id));
            alert("Feedback deleted successfully");
        } catch (error) {
            console.error("Error deleting feedback", error);
            alert("Failed to delete feedback");
        }
    };

    if (loading && feedbacks.length === 0) {
        return <div className="container"><h3>Loading reports...</h3></div>;
    }

    return (
        <div className="feedback-reports-container" style={{ width: '100%', padding: '2px' }}>
            <div className="card" style={{ 
                marginBottom: '20px',
                border: '1px solid var(--border-color)',
                boxShadow: 'var(--shadow-premium)',
                transition: 'all 0.3s ease'
            }}>
                <h3 style={{ marginBottom: '20px' }}>Filters & Export</h3>
                <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                    <div className="form-group" style={{ marginBottom: 0, flex: '1 1 200px' }}>
                        <label>From Date:</label>
                        <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0, flex: '1 1 200px' }}>
                        <label>To Date:</label>
                        <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0, flex: '1 1 200px' }}>
                        <label>Emotion:</label>
                        <select value={emotionFilter} onChange={e => setEmotionFilter(e.target.value)} style={{ padding: '0.8rem' }}>
                            <option value="All">All Emotions</option>
                            <option value="Happy">Happy</option>
                            <option value="Stressed">Stressed</option>
                            <option value="Anxious">Anxious</option>
                            <option value="Neutral">Neutral</option>
                            <option value="Sad">Sad</option>
                        </select>
                    </div>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <button className="btn btn-secondary" style={{ width: 'auto' }} onClick={() => { setDateFrom(''); setDateTo(''); setEmotionFilter('All'); }}>Clear</button>
                        <button className="btn btn-primary" style={{ backgroundColor: '#27ae60', width: 'auto' }} onClick={handleExport}>Download CSV</button>
                    </div>
                </div>
            </div>

            <div className="table-responsive">
                <table className="admin-table">
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Student</th>
                            <th>Emotion</th>
                            <th>Structured Analysis</th>
                            <th>Comment</th>
                            <th style={{ textAlign: 'center' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredFeedbacks.length > 0 ? filteredFeedbacks.map((item, idx) => (
                            <tr key={item.id || item._id || idx}>
                                <td style={{ whiteSpace: 'nowrap' }}>{item.dateObj.toLocaleDateString()}</td>
                                <td>
                                    <div style={{ fontWeight: 'bold', color: 'var(--text-main)' }}>{item.studentName}</div>
                                    <div style={{ fontSize: '0.8em', color: 'var(--text-secondary)' }}>{item.studentEmail}</div>
                                </td>
                                <td>
                                    <span className={`emotion-tag ${item.emotion?.toLowerCase()}`}>
                                        {item.emotion}
                                    </span>
                                    <div style={{ fontSize: '0.75em', marginTop: '4px', textAlign: 'center', opacity: 0.8 }}>
                                        Intensity: {item.emotion_intensity}/5
                                    </div>
                                </td>
                                <td style={{ minWidth: '200px' }}>
                                    <div style={{ fontSize: '0.85em', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                        <div><strong>Domain:</strong> {item.emotion_domain || '—'}</div>
                                        <div><strong>Triggers:</strong> {Array.isArray(item.emotion_triggers) ? item.emotion_triggers.join(', ') : (item.emotion_triggers || '—')}</div>
                                        <div style={{ display: 'flex', gap: '10px' }}>
                                            <span><strong>Impact:</strong> {item.life_impact_score}/5</span>
                                            <span>|</span>
                                            <span><strong>Duration:</strong> {item.emotion_duration || '—'}</span>
                                        </div>
                                    </div>
                                </td>
                                <td>
                                    <div style={{ fontStyle: 'italic', fontSize: '0.9em', maxWidth: '300px' }}>
                                        {item.comment || <span style={{ opacity: 0.5 }}>No comment</span>}
                                    </div>
                                </td>
                                <td style={{ textAlign: 'center' }}>
                                    <button
                                        onClick={() => handleDelete(item.id || item._id)}
                                        className="btn btn-danger"
                                        style={{ padding: '5px 10px', fontSize: '0.8rem', width: 'auto' }}
                                    >
                                        Delete
                                    </button>
                                </td>
                            </tr>
                        )) : (
                            <tr>
                                <td colSpan="6" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                                    No records found matching your criteria.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default FeedbackReports;
