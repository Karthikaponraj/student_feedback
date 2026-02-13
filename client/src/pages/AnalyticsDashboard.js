import React, { useState, useEffect } from 'react';
import axios from 'axios';
import SummaryCard from '../components/SummaryCard';

import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title } from 'chart.js';
import { Pie, Bar } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title);

const AnalyticsDashboard = ({ role }) => {
    const [feedbacks, setFeedbacks] = useState([]);
    const [filteredFeedbacks, setFilteredFeedbacks] = useState([]);

    // Analytics State
    const [emotionCounts, setEmotionCounts] = useState({});
    const [stats, setStats] = useState({ totalUsers: 0, totalFeedback: 0, mostCommon: 'N/A' });

    // Filters
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');

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
                processData(res.data);
            } catch (error) {
                console.error("Error fetching analytics", error);
            }
        };
        fetchData();
    }, []);

    // Filter Logic
    useEffect(() => {
        if (!dateFrom && !dateTo) {
            setFilteredFeedbacks(feedbacks);
            processData(feedbacks);
            return;
        }

        const filtered = feedbacks.filter(item => {
            const itemDate = new Date(item.date);
            const from = dateFrom ? new Date(dateFrom) : new Date('1900-01-01');
            const to = dateTo ? new Date(dateTo) : new Date();
            // Set to end of day
            to.setHours(23, 59, 59, 999);
            return itemDate >= from && itemDate <= to;
        });

        setFilteredFeedbacks(filtered);
        processData(filtered);
    }, [dateFrom, dateTo, feedbacks]);

    const processData = (data) => {
        const counts = { Happy: 0, Stressed: 0, Anxious: 0, Neutral: 0, Sad: 0 };
        data.forEach(item => {
            if (counts[item.emotion] !== undefined) {
                counts[item.emotion]++;
            }
        });
        setEmotionCounts(counts);

        // Stats
        const total = data.length;
        // Simple mock for total users since we might not have that data here directly, 
        // or we can count unique user IDs if available. 
        // For now, let's just count unique users from feedback if possible, or just leave it as 'N/A' if user count isn't in this API response.
        // Assuming we want Total Feedback here.

        let mostCommon = 'N/A';
        let maxCount = 0;
        Object.entries(counts).forEach(([emotion, count]) => {
            if (count > maxCount) {
                maxCount = count;
                mostCommon = emotion;
            }
        });

        setStats({
            totalFeedback: total,
            totalUsers: 'N/A', // We would need a separate API call for this usually, or just remove if not critical
            mostCommon: mostCommon
        });
    };

    const handleExport = () => {
        const headers = ['Date,Emotion,Comment'];
        const csvContent = filteredFeedbacks.map(f => `${f.date},${f.emotion},"${f.comment}"`).join('\n');
        const blob = new Blob([headers + '\n' + csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'feedback_report.csv';
        a.click();
    };

    const pieData = {
        labels: Object.keys(emotionCounts),
        datasets: [
            {
                label: '# of Votes',
                data: Object.values(emotionCounts),
                backgroundColor: [
                    'rgba(75, 192, 192, 0.6)', // Happy
                    'rgba(255, 99, 132, 0.6)', // Stressed
                    'rgba(255, 206, 86, 0.6)', // Anxious
                    'rgba(201, 203, 207, 0.6)', // Neutral
                    'rgba(54, 162, 235, 0.6)', // Sad
                ],
                borderWidth: 1,
            },
        ],
    };

    const isHighStress = (emotionCounts['Stressed'] || 0) + (emotionCounts['Anxious'] || 0) > (filteredFeedbacks.length / 2) && filteredFeedbacks.length > 0;

    return (
        <div className="container">
            <h1>{role === 'admin' ? 'Admin Dashboard' : 'Faculty Dashboard'}</h1>

            {/* Summary Cards */}
            <div style={{ display: 'flex', flexWrap: 'wrap', marginBottom: '20px' }}>
                <SummaryCard title="Total Feedback" value={stats.totalFeedback} color="#394d46" />
                <SummaryCard title="Most Common Emotion" value={stats.mostCommon} color="#50c878" />
                <SummaryCard title="Alerts" value={isHighStress ? 'High Stress!' : 'Normal'} color={isHighStress ? '#ff6b6b' : '#50c878'} />
            </div>

            {/* Alert Banner */}
            {isHighStress && (
                <div style={{ padding: '15px', backgroundColor: '#ffe6e6', border: '1px solid #ff6b6b', borderRadius: '8px', color: '#c0392b', marginBottom: '20px' }}>
                    <strong>Alert:</strong> A significant number of students are reporting Stress or Anxiety. Please investigate.
                </div>
            )}

            {/* Filters & Actions */}
            <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '15px', flexWrap: 'wrap' }}>
                <h3>Filters:</h3>
                <div>
                    <label style={{ marginRight: '10px' }}>From:</label>
                    <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={{ padding: '5px' }} />
                </div>
                <div>
                    <label style={{ marginRight: '10px' }}>To:</label>
                    <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} style={{ padding: '5px' }} />
                </div>
                <div style={{ marginLeft: 'auto' }}>
                    <button className="btn" onClick={handleExport}>Export Report</button>
                </div>
            </div>

            {/* Charts Area */}
            <div className="card">
                <h2>Emotion Overview</h2>
                <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '40px' }}>
                    <div className="chart-container" style={{ width: '400px', height: '400px' }}>
                        <Pie data={pieData} />
                    </div>

                    {/* Legend */}
                    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                        <h3>Legend</h3>
                        {Object.entries(emotionCounts).map(([emotion, count]) => (
                            <div key={emotion} style={{ display: 'flex', alignItems: 'center', marginBottom: '5px' }}>
                                <span style={{ fontWeight: 'bold', minWidth: '80px' }}>{emotion}:</span>
                                <span>{count} ({filteredFeedbacks.length ? ((count / filteredFeedbacks.length) * 100).toFixed(1) : 0}%)</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Recent Feedback Table */}
            <div className="card">
                <h2>Recent Feedback Report</h2>
                <p>Showing {filteredFeedbacks.length} records</p>
                <div style={{ overflowX: 'auto' }}>
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Emotion</th>
                                <th>Comment</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredFeedbacks.slice(0, 10).map((item, idx) => ( // Show last 10
                                <tr key={idx}>
                                    <td>{item.date}</td>
                                    <td>
                                        <span style={{
                                            padding: '4px 8px',
                                            borderRadius: '12px',
                                            backgroundColor: item.emotion === 'Happy' ? '#e6fffa' : '#fff5f5',
                                            color: item.emotion === 'Happy' ? 'green' : 'red',
                                            border: '1px solid currentColor'
                                        }}>
                                            {item.emotion}
                                        </span>
                                    </td>
                                    <td>{item.comment}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default AnalyticsDashboard;
