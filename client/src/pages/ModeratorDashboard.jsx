import React from 'react';

export default function ModeratorDashboard() {
  const decoded = JSON.parse(localStorage.getItem('user'));
  return (
    <div style={{ padding: '2rem' }}>
      <h1>Moderator Dashboard</h1>
      <p>Hello {decoded?.name || 'Moderator'}!</p>
    </div>
  );
}
