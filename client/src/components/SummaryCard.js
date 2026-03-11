import React from 'react';

const SummaryCard = ({ title, value, color, icon }) => {
    return (
        <div style={{
            background: 'var(--card-subtle-bg)',
            borderRadius: 'var(--radius-md)',
            padding: '24px',
            boxShadow: 'var(--shadow-premium)',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            border: '1px solid var(--border-color)',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
        }}
            className="summary-card-hover"
        >
            <div style={{ width: '100%' }}>
                <h3 style={{
                    margin: '0 0 12px 0',
                    fontSize: '0.85rem',
                    color: 'var(--text-secondary)',
                    textTransform: 'uppercase',
                    letterSpacing: '1px',
                    fontWeight: '700'
                }}>
                    {title}
                </h3>
                <div style={{
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '12px',
                    marginTop: '4px'
                }}>
                    {icon && (
                        <div style={{
                            fontSize: '1.8rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: color || 'var(--primary-slate)',
                            opacity: 0.9,
                            minWidth: '32px'
                        }}>
                            {icon}
                        </div>
                    )}
                    <div style={{
                        fontSize: '1.75rem',
                        fontWeight: '800',
                        color: 'var(--primary-slate)',
                        lineHeight: '1.2',
                        whiteSpace: 'nowrap',
                        display: 'flex',
                        alignItems: 'center'
                    }}>
                        {value}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SummaryCard;
