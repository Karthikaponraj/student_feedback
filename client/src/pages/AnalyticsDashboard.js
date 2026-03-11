import React, { useState, useEffect, useMemo } from 'react';
import { apiClient } from '../utils/apiClient';
import * as XLSX from 'xlsx';
import SummaryCard from '../components/SummaryCard';

import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title } from 'chart.js';
import { Doughnut, Bar } from 'react-chartjs-2';
import ChartDataLabels from 'chartjs-plugin-datalabels';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title, ChartDataLabels);

const AnalyticsDashboard = ({ role }) => {
    const [feedbacks, setFeedbacks] = useState([]);
    const [filteredFeedbacks, setFilteredFeedbacks] = useState([]);

    // Analytics State
    const [emotionCounts, setEmotionCounts] = useState({});
    const [detailedCounts, setDetailedCounts] = useState({});
    const [expandedEmotions, setExpandedEmotions] = useState({
        Happy: true,
        Stressed: true,
        Anxious: false,
        Neutral: false,
        Sad: false
    });
    const [stats, setStats] = useState({ totalUsers: 0, totalFeedback: 0, mostCommon: 'N/A' });

    // Modal State
    const [showStudentModal, setShowStudentModal] = useState(false);
    const [modalData, setModalData] = useState({ title: '', students: [] });
    const [modalSearch, setModalSearch] = useState('');

    // Filters
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');

    useEffect(() => {
        const fetchData = async () => {
            try {
                const data = await apiClient('/analytics');
                setFeedbacks(data);
                setFilteredFeedbacks(data);
                processData(data);
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
        const detailed = {};

        data.forEach(item => {
            const emotion = item.emotion;
            if (counts[emotion] !== undefined) {
                counts[emotion]++;

                // Detailed breakdown initialize
                if (!detailed[emotion]) {
                    detailed[emotion] = {
                        domains: {},
                        triggers: {},
                        totalIntensity: 0,
                        totalImpact: 0,
                        count: 0,
                        studentRecords: [] // All students for this emotion
                    };
                }

                const d = detailed[emotion];
                d.count++;
                
                // Track record for exports and modals
                const record = {
                    name: item.studentName || 'Unknown',
                    id: item.regno || '—',
                    department: item.department || '—',
                    emotion: emotion,
                    reason: item.emotion_domain || 'Unspecified',
                    date: new Date(item.date).toLocaleDateString(),
                    email: item.studentEmail || '—'
                };
                d.studentRecords.push(record);

                // Domain (Reason) breakdown
                const reason = item.emotion_domain || 'Unspecified';
                if (!d.domains[reason]) {
                    d.domains[reason] = { count: 0, students: [] };
                }
                d.domains[reason].count++;
                d.domains[reason].students.push(record);

                // Triggers breakdown
                const triggers = Array.isArray(item.emotion_triggers) ? item.emotion_triggers : 
                               (typeof item.emotion_triggers === 'string' ? item.emotion_triggers.split(',').map(t => t.trim()) : []);
                triggers.forEach(t => {
                    if (t) d.triggers[t] = (d.triggers[t] || 0) + 1;
                });

                // Intensity and Impact
                d.totalIntensity += (item.emotion_intensity || 3);
                d.totalImpact += (item.life_impact_score || 3);
            }
        });

        setEmotionCounts(counts);
        setDetailedCounts(detailed);

        // Stats
        let mostCommon = 'N/A';
        let maxCount = 0;
        Object.entries(counts).forEach(([emotion, count]) => {
            if (count > maxCount) {
                maxCount = count;
                mostCommon = emotion;
            }
        });

        setStats({
            totalFeedback: data.length,
            totalUsers: 'N/A',
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

    const handleExportCSV = () => {
        const headers = [['Student Name', 'Roll No', 'Department', 'Emotion', 'Reason', 'Submission Date']];
        const rows = [];
        
        Object.values(detailedCounts).forEach(emotionData => {
            emotionData.studentRecords.forEach(record => {
                rows.push([
                    record.name,
                    record.id,
                    record.department,
                    record.emotion,
                    record.reason,
                    record.date
                ]);
            });
        });

        const csvContent = headers.concat(rows).map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', 'student_emotion_details.csv');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // Excel export function removed per user request

    const pieData = {
        labels: Object.keys(emotionCounts),
        datasets: [
            {
                label: '# of Votes',
                data: Object.values(emotionCounts),
                backgroundColor: [
                    'rgba(16, 185, 129, 0.85)', // Happy
                    'rgba(244, 63, 94, 0.85)',  // Stressed
                    'rgba(245, 158, 11, 0.85)', // Anxious
                    'rgba(148, 163, 184, 0.85)',// Neutral
                    'rgba(59, 130, 246, 0.85)', // Sad
                ],
                borderColor: '#ffffff',
                borderWidth: 3,
                hoverOffset: 12
            },
        ],
    };

    const pieOptions = {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '65%',
        plugins: {
            legend: {
                display: false
            },
            tooltip: {
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                titleColor: '#1e293b',
                bodyColor: '#334155',
                borderColor: '#e2e8f0',
                borderWidth: 1,
                padding: 12,
                boxPadding: 6,
                usePointStyle: true,
                callbacks: {
                    label: function(context) {
                        let label = context.label || '';
                        if (label) {
                            label += ': ';
                        }
                        const value = context.raw || 0;
                        const total = context.chart._metasets[context.datasetIndex].total;
                        const percentage = total > 0 ? Math.round((value / total) * 100) + '%' : '0%';
                        return `${label}${value} (${percentage})`;
                    }
                }
            },
            datalabels: {
                labels: {
                    value: {
                        color: '#ffffff',
                        font: {
                            weight: 'bold',
                            size: 16,
                            family: "'Inter', sans-serif"
                        },
                        formatter: (value, ctx) => {
                            const total = ctx.chart.data.datasets[0].data.reduce((a, b) => a + b, 0);
                            if (value === 0) return '';
                            return Math.round((value / total) * 100) + '%';
                        },
                        align: 'center',
                        anchor: 'center',
                        textStrokeColor: 'rgba(0, 0, 0, 0.1)',
                        textStrokeWidth: 1,
                        textShadowBlur: 4,
                        textShadowColor: 'rgba(0,0,0,0.3)'
                    },
                    name: {
                        color: (ctx) => {
                            return ctx.chart.data.datasets[0].backgroundColor[ctx.dataIndex];
                        },
                        font: {
                            size: 14,
                            family: "'Inter', sans-serif",
                            weight: '600'
                        },
                        formatter: (value, ctx) => {
                            if (value === 0) return '';
                            return ctx.chart.data.labels[ctx.dataIndex];
                        },
                        align: 'start',
                        anchor: 'start',
                        offset: 15
                    }
                }
            }
        },
        layout: {
            padding: {
                top: 20,
                bottom: 20,
                left: 40,
                right: 40
            }
        },
        animation: {
            animateScale: true,
            animateRotate: true
        }
    };

    const isHighStress = (emotionCounts['Stressed'] || 0) + (emotionCounts['Anxious'] || 0) > (filteredFeedbacks.length / 2) && filteredFeedbacks.length > 0;

    return (
        <div className="container">
            <h1>{role === 'admin' ? 'Admin Dashboard' : 'Faculty Dashboard'}</h1>

            {/* Summary Cards */}
            <div style={{ display: 'flex', flexWrap: 'wrap', marginBottom: '20px' }}>
                <SummaryCard title="Total Feedback" value={stats.totalFeedback} color="var(--primary-slate)" />
                <SummaryCard title="Most Common Emotion" value={stats.mostCommon} color="var(--primary-slate)" />
                <SummaryCard title="Alerts" value={isHighStress ? 'High Stress!' : 'Normal'} color="var(--primary-slate)" />
            </div>

            {/* Alert Banner */}
            {isHighStress && (
                <div style={{ padding: '15px', backgroundColor: 'var(--status-pending)20', border: '1px solid var(--status-pending)', borderRadius: '8px', color: 'var(--status-pending)', marginBottom: '20px' }}>
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
                <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', marginTop: '30px', width: '100%' }}>
                    <div style={{ width: '100%', maxWidth: '600px', height: '400px', position: 'relative' }}>
                        <Doughnut data={pieData} options={pieOptions} />
                    </div>
                </div>
            </div>

            {/* Emotion Reason Breakdown Section */}
            <div className="card" style={{ marginTop: '30px' }}>
                <h2 style={{ fontSize: '1.5rem', marginBottom: '8px', color: '#1e293b' }}>Emotion Reason Breakdown</h2>
                <p style={{ color: '#64748b', fontSize: '0.95rem', marginBottom: '25px' }}>Granular analysis of student feedback categories.</p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {Object.keys(emotionCounts).map(emotion => {
                        const count = emotionCounts[emotion] || 0;
                        if (count === 0) return null; // Don't show empty categories based on screenshot? Wait, screenshot shows Stressed 4 responses. If we want all, we can show them, but usually only populated ones. Let's show all or just populated. I will show populated ones or all based on standard practice. Let's show all if they were in the Object.keys(emotionCounts).

                        const emotionStyles = {
                            Happy: { emoji: '😊', color: '#10b981', bg: '#f0fdf4', border: '#bbf7d0' },
                            Stressed: { emoji: '😫', color: '#f43f5e', bg: '#fff1f2', border: '#fecdd3' },
                            Anxious: { emoji: '😰', color: '#f59e0b', bg: '#fffbeb', border: '#fde68a' },
                            Neutral: { emoji: '😐', color: '#64748b', bg: '#f8fafc', border: '#e2e8f0' },
                            Sad: { emoji: '😢', color: '#3b82f6', bg: '#eff6ff', border: '#bfdbfe' }
                        };
                        const style = emotionStyles[emotion] || emotionStyles.Neutral;
                        const isOpen = expandedEmotions[emotion];
                        const detailed = detailedCounts[emotion] || { domains: {}, count: 0 };

                        return (
                            <div key={emotion} style={{
                                backgroundColor: style.bg,
                                borderRadius: '12px',
                                overflow: 'hidden'
                            }}>
                                <div
                                    onClick={() => setExpandedEmotions(prev => ({ ...prev, [emotion]: !prev[emotion] }))}
                                    style={{
                                        padding: '16px 20px',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        cursor: 'pointer'
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <span style={{ fontSize: '1.5rem' }}>{style.emoji}</span>
                                        <span style={{ fontWeight: 'bold', color: '#1e293b', fontSize: '1.1rem' }}>{emotion}</span>
                                        <span style={{ color: style.color, fontSize: '0.9rem', fontWeight: 600 }}>
                                            {count} response{count !== 1 ? 's' : ''}
                                        </span>
                                    </div>
                                    <div style={{
                                        transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                                        transition: 'transform 0.3s',
                                        color: style.color
                                    }}>
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <polyline points="6 9 12 15 18 9"></polyline>
                                        </svg>
                                    </div>
                                </div>

                                {isOpen && (
                                    <div style={{ padding: '0 20px 20px 20px' }}>
                                        <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', padding: '15px' }}>
                                            {Object.entries(detailed.domains).length > 0 ? (
                                                Object.entries(detailed.domains)
                                                    .sort((a, b) => b[1].count - a[1].count)
                                                    .map(([reason, reasonData], idx, arr) => (
                                                        <div key={reason} style={{
                                                            display: 'flex',
                                                            justifyContent: 'space-between',
                                                            alignItems: 'center',
                                                            padding: '10px 0',
                                                            borderBottom: idx < arr.length - 1 ? '1px solid #f1f5f9' : 'none'
                                                        }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                                <span style={{ color: style.color, fontSize: '1.2rem' }}>•</span>
                                                                <span style={{ color: '#334155', fontWeight: 500 }}>{reason}</span>
                                                            </div>
                                                            <div style={{ color: style.color, fontWeight: 'bold', fontSize: '0.85rem' }}>
                                                                {reasonData.count} STUDENT{reasonData.count !== 1 ? 'S' : ''}
                                                            </div>
                                                        </div>
                                                    ))
                                            ) : (
                                                <div style={{ padding: '10px 0', color: '#94a3b8', fontStyle: 'italic' }}>
                                                    No specific reasons provided.
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
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
                                <th>Student</th>
                                <th>Emotion</th>
                                <th>Structured Analysis</th>
                                <th>Comment</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredFeedbacks.slice(0, 10).map((item, idx) => (
                                <tr key={idx}>
                                    <td>{item.date}</td>
                                    <td>
                                        <div style={{ fontWeight: 'bold' }}>{item.studentName || 'Unknown'}</div>
                                        <div style={{ fontSize: '0.8em', color: '#64748b' }}>{item.regno || '—'}</div>
                                    </td>
                                    <td>
                                        <span style={{
                                            padding: '4px 8px',
                                            borderRadius: '12px',
                                            backgroundColor: item.emotion === 'Happy' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(244, 63, 94, 0.1)',
                                            color: item.emotion === 'Happy' ? '#10b981' : '#f43f5e',
                                            border: '1px solid currentColor',
                                            fontSize: '0.85rem'
                                        }}>
                                            {item.emotion} ({item.emotion_intensity}/5)
                                        </span>
                                    </td>
                                    <td>
                                        <div style={{ fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                            <div><strong>Domain:</strong> {item.emotion_domain || '—'}</div>
                                            <div><strong>Triggers:</strong> {Array.isArray(item.emotion_triggers) ? item.emotion_triggers.join(', ') : (item.emotion_triggers || '—')}</div>
                                            <div><strong>Impact:</strong> {item.life_impact_score}/5 | <strong>Dur:</strong> {item.emotion_duration || '—'}</div>
                                        </div>
                                    </td>
                                    <td style={{ fontSize: '0.9rem', color: '#334155' }}>{item.comment || <em>No comment</em>}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Student Details Modal */}
            {showStudentModal && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.6)',
                    backdropFilter: 'blur(4px)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000,
                    padding: '20px',
                    animation: 'fadeIn 0.2s ease-out'
                }} onClick={() => setShowStudentModal(false)}>
                    <div style={{
                        backgroundColor: 'var(--card-bg)',
                        borderRadius: 'var(--radius-lg)',
                        width: '100%',
                        maxWidth: '800px',
                        maxHeight: '85vh',
                        display: 'flex',
                        flexDirection: 'column',
                        boxShadow: 'var(--shadow-xl)',
                        border: '1px solid var(--border-color)',
                        animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
                    }} onClick={e => e.stopPropagation()}>
                        
                        <div style={{ padding: '24px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '1.4rem', color: 'var(--text-main)' }}>{modalData.title}</h3>
                                <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                                    Found {modalData.students.length} student{modalData.students.length !== 1 ? 's' : ''}
                                </div>
                            </div>
                            <button 
                                onClick={() => setShowStudentModal(false)}
                                style={{
                                    background: 'var(--bg-color)',
                                    border: '1px solid var(--border-color)',
                                    color: 'var(--text-secondary)',
                                    width: '36px',
                                    height: '36px',
                                    borderRadius: '50%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s'
                                }}
                            >
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                            </button>
                        </div>

                        <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border-color)', backgroundColor: 'var(--card-subtle-bg)' }}>
                            <div style={{ position: 'relative' }}>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }}><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                                <input 
                                    type="text" 
                                    placeholder="Search by name, roll no, or email..." 
                                    value={modalSearch}
                                    onChange={(e) => setModalSearch(e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: '10px 10px 10px 40px',
                                        borderRadius: 'var(--radius-md)',
                                        border: '1px solid var(--border-color)',
                                        backgroundColor: 'var(--bg-color)',
                                        color: 'var(--text-main)',
                                        fontSize: '0.95rem'
                                    }}
                                />
                            </div>
                        </div>

                        <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                <thead>
                                    <tr>
                                        <th style={{ padding: '12px', borderBottom: '2px solid var(--border-color)', color: 'var(--text-secondary)', fontWeight: '600', fontSize: '0.85rem', textTransform: 'uppercase' }}>Student Name</th>
                                        <th style={{ padding: '12px', borderBottom: '2px solid var(--border-color)', color: 'var(--text-secondary)', fontWeight: '600', fontSize: '0.85rem', textTransform: 'uppercase' }}>Roll No</th>
                                        <th style={{ padding: '12px', borderBottom: '2px solid var(--border-color)', color: 'var(--text-secondary)', fontWeight: '600', fontSize: '0.85rem', textTransform: 'uppercase' }}>Department</th>
                                        <th style={{ padding: '12px', borderBottom: '2px solid var(--border-color)', color: 'var(--text-secondary)', fontWeight: '600', fontSize: '0.85rem', textTransform: 'uppercase' }}>Date</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {modalData.students
                                        .filter(s => 
                                            s.name.toLowerCase().includes(modalSearch.toLowerCase()) || 
                                            s.id.toLowerCase().includes(modalSearch.toLowerCase()) ||
                                            s.email.toLowerCase().includes(modalSearch.toLowerCase())
                                        )
                                        .map((student, idx) => (
                                        <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)', backgroundColor: idx % 2 === 0 ? 'transparent' : 'var(--card-subtle-bg)' }}>
                                            <td style={{ padding: '12px', color: 'var(--text-main)', fontWeight: '500' }}>
                                                {student.name}
                                                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 'normal' }}>{student.email}</div>
                                            </td>
                                            <td style={{ padding: '12px', color: 'var(--text-main)' }}>{student.id}</td>
                                            <td style={{ padding: '12px', color: 'var(--text-main)' }}>{student.department}</td>
                                            <td style={{ padding: '12px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{student.date}</td>
                                        </tr>
                                    ))}
                                    {modalData.students.filter(s => s.name.toLowerCase().includes(modalSearch.toLowerCase()) || s.id.toLowerCase().includes(modalSearch.toLowerCase()) || s.email.toLowerCase().includes(modalSearch.toLowerCase())).length === 0 && (
                                        <tr>
                                            <td colSpan="4" style={{ padding: '30px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                                                No students found matching your search.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
            
            <style>{`
                @keyframes shimmer {
                    from { background-position: -200px 0; }
                    to { background-position: calc(200px + 100%) 0; }
                }
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes slideUp {
                    from { opacity: 0, transform: 'translateY(20px)'; }
                    to { opacity: 1, transform: 'translateY(0)'; }
                }
                .progress-container:hover div > div {
                    filter: brightness(1.2);
                }
            `}</style>
        </div>
    );
};

export default AnalyticsDashboard;
