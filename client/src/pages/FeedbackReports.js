import React, { useState, useEffect } from 'react';
import axios from 'axios';

const FeedbackReports = () => {
    const [feedbacks, setFeedbacks] = useState([]);
    const [filteredFeedbacks, setFilteredFeedbacks] = useState([]);

    // Filters
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [emotionFilter, setEmotionFilter] = useState('');

    const API_URL = 'http://localhost:5001/api';

    useEffect(() => {
        const fetchData = async () => {
            try {
                const token = localStorage.getItem('token');
                const res = await axios.get(`${API_URL}/analytics`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setFeedbacks(res.data);
                setFilteredFeedbacks(res.data);
            } catch (error) {
                console.error("Error fetching data", error);
            }
        };
        fetchData();
    }, []);

    useEffect(() => {
        let filtered = feedbacks;

        if (dateFrom) {
            filtered = filtered.filter(f => new Date(f.date) >= new Date(dateFrom));
        }
        if (dateTo) {
            const toDate = new Date(dateTo);
            toDate.setHours(23, 59, 59, 999);
            filtered = filtered.filter(f => new Date(f.date) <= toDate);
        }
        if (emotionFilter) {
            filtered = filtered.filter(f => f.emotion === emotionFilter);
        }

        setFilteredFeedbacks(filtered);
    }, [dateFrom, dateTo, emotionFilter, feedbacks]);

    const handleExport = () => {
        const headers = ['Date,Emotion,Comment'];
        const csvContent = filteredFeedbacks.map(f => `${f.date},${f.emotion},"${f.comment || ''}"`).join('\n');
        const blob = new Blob([headers + '\n' + csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'feedback_report.csv';
        a.click();
    };

    return (
        <div className="container">
            <h1>Feedback Reports</h1>

            <div className="card">
                <h3>Filters</h3>
                <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                        <label>From Date:</label>
                        <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                        <label>To Date:</label>
                        <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                        <label>Emotion:</label>
                        <select value={emotionFilter} onChange={e => setEmotionFilter(e.target.value)} style={{ padding: '0.8rem' }}>
                            <option value="">All Emotions</option>
                            <option value="Happy">Happy</option>
                            <option value="Stressed">Stressed</option>
                            <option value="Anxious">Anxious</option>
                            <option value="Neutral">Neutral</option>
                            <option value="Sad">Sad</option>
                        </select>
                    </div>
                    <button className="btn" onClick={() => { setDateFrom(''); setDateTo(''); setEmotionFilter(''); }}>Clear Filters</button>

                    <div style={{ marginLeft: 'auto' }}>
                        <button className="btn" style={{ backgroundColor: '#27ae60' }} onClick={handleExport}>Download CSV</button>
                    </div>
                </div>
            </div>

            <div className="card">
                <h2>Total Records: {filteredFeedbacks.length}</h2>
                <div style={{ overflowX: 'auto', maxHeight: '500px', overflowY: 'auto' }}>
                    <table className="table">
                        <thead style={{ position: 'sticky', top: 0, backgroundColor: 'white' }}>
                            <tr>
                                <th>Date</th>
                                <th>Emotion</th>
                                <th>Comment</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredFeedbacks.length > 0 ? filteredFeedbacks.map((item, idx) => (
                                <tr key={idx}>
                                    <td>{item.date}</td>
                                    <td>
                                        <span style={{
                                            fontWeight: 'bold',
                                            color: item.emotion === 'Happy' ? 'green' :
                                                item.emotion === 'Stressed' ? 'red' :
                                                    item.emotion === 'Anxious' ? 'orange' : 'black'
                                        }}>
                                            {item.emotion}
                                        </span>
                                    </td>
                                    <td>{item.comment}</td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan="3" style={{ textAlign: 'center' }}>No records found for selected criteria.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default FeedbackReports;
