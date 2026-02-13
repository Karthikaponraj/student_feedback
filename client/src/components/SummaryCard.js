import React from 'react';

const SummaryCard = ({ title, value, color, icon }) => {
    return (
        <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            padding: '20px',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderLeft: `5px solid ${color || '#394d46'}`,
            flex: 1,
            minWidth: '200px',
            margin: '10px'
        }}>
            <div>
                <h3 style={{ margin: '0 0 10px 0', fontSize: '1rem', color: '#666' }}>{title}</h3>
                <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#333' }}>{value}</div>
            </div>
            {icon && <div style={{ fontSize: '2rem', opacity: 0.2 }}>{icon}</div>}
        </div>
    );
};

export default SummaryCard;
