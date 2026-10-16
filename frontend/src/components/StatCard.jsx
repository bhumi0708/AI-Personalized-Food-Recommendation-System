import React from 'react';

export default function StatCard({ title, value, icon: Icon, color = '#f97316', subtitle }) {
  return (
    <div className="glass-card" style={{ padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <div>
        <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          {title}
        </div>
        <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#f8fafc', margin: '4px 0 2px 0' }}>
          {value}
        </div>
        {subtitle && (
          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
            {subtitle}
          </div>
        )}
      </div>

      <div style={{
        width: '52px',
        height: '52px',
        borderRadius: '14px',
        background: `${color}18`,
        border: `1px solid ${color}33`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <Icon size={26} color={color} />
      </div>
    </div>
  );
}
