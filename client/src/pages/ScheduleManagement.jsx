import React, { useState, useEffect } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL;
const CloseIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
  </svg>
);

const ScheduleManagement = ({ isOpen, onClose, userId }) => {
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancellingMeeting, setCancellingMeeting] = useState(false);

  useEffect(() => {
    if (isOpen && userId) {
      fetchUserMeetings();
    }
  }, [isOpen, userId]);

  const fetchUserMeetings = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${API_BASE_URL}/api/meetings/user/${userId}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (response.data.success) {
        const formattedEvents = response.data.meetings.map(meeting => ({
          id: meeting.id.toString(),
          title: `Meeting with Partner`,
          start: meeting.scheduled_at,
          end: new Date(new Date(meeting.scheduled_at).getTime() + 60 * 60 * 1000),
          extendedProps: {
            meetingId: meeting.id,
            conversationId: meeting.conversation_id,
            participants: meeting.participants,
            status: meeting.status,
            originalData: meeting
          },
          backgroundColor: getEventColor(meeting.status),
          borderColor: getEventColor(meeting.status),
          textColor: '#ffffff'
        }));
        setEvents(formattedEvents);
      }
    } catch (err) {
      console.error('Error fetching meetings:', err);
      alert('Failed to load schedule');
    } finally {
      setIsLoading(false);
    }
  };

  const getEventColor = (status) => {
    switch (status) {
      case 'scheduled':
        return '#10B981'; // green
      case 'pending':
        return '#F59E0B'; // yellow
      case 'completed':
        return '#6B7280'; // gray
      case 'cancelled':
        return '#EF4444'; // red
      default:
        return '#3B82F6'; // blue
    }
  };

  const handleEventClick = (clickInfo) => {
    const meeting = clickInfo.event.extendedProps.originalData;
    setSelectedEvent(meeting);
  };

  const handleCancelMeeting = async () => {
    if (!selectedEvent) return;

    setCancellingMeeting(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API_BASE_URL}/api/meetings/update-status`,
        {
          meetingId: selectedEvent.id,
          status: 'cancelled',
          participants: selectedEvent.participants
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      // Refresh events
      await fetchUserMeetings();
      setShowCancelModal(false);
      setSelectedEvent(null);
      alert('Meeting cancelled successfully! Your partner has been notified.');
    } catch (err) {
      console.error('Error cancelling meeting:', err);
      alert('Failed to cancel meeting');
    } finally {
      setCancellingMeeting(false);
    }
  };

  const formatParticipants = (participants) => {
    if (!participants || !Array.isArray(participants)) return 'Unknown';
    return participants.map(p => `User ${p}`).join(', ');
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'scheduled': return 'Scheduled';
      case 'pending': return 'Pending';
      case 'completed': return 'Completed';
      case 'cancelled': return 'Cancelled';
      default: return status;
    }
  };

  return (
    <>
      {/* Main Schedule Modal */}
      {isOpen && (
        <div className="peerfusion-modal-overlay" onClick={onClose}>
          <div className="peerfusion-modal-content peerfusion-schedule-modal" onClick={(e) => e.stopPropagation()}>
            <button className="peerfusion-close-modal" onClick={onClose}>
              <CloseIcon />
            </button>

            <div className="peerfusion-schedule-header">
              <h3 className="peerfusion-schedule-title">Session Schedule</h3>
              <p className="peerfusion-schedule-subtitle">Manage your upcoming sessions and meetings</p>
            </div>

            <div className="peerfusion-schedule-main">
              <div className="peerfusion-calendar-container">
                {isLoading ? (
                  <div className="peerfusion-schedule-loading">
                    <div className="peerfusion-loading-spinner"></div>
                    <p>Loading your schedule...</p>
                  </div>
                ) : (
                  <FullCalendar
                    plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                    initialView="dayGridMonth"
                    headerToolbar={{
                      left: 'prev,next today',
                      center: 'title',
                      right: 'dayGridMonth,timeGridWeek,timeGridDay'
                    }}
                    events={events}
                    eventClick={handleEventClick}
                    height="600px"
                    eventDisplay="block"
                    eventTimeFormat={{
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: true
                    }}
                    dayMaxEvents={true}
                  />
                )}
              </div>

              {/* Event Details Panel */}
              {selectedEvent && (
                <div className="peerfusion-event-details">
                  <h4>Meeting Details</h4>
                  <div className="peerfusion-event-info">
                    <div className="peerfusion-event-item">
                      <span className="peerfusion-event-label">Meeting ID:</span>
                      <span className="peerfusion-event-value">#{selectedEvent.id}</span>
                    </div>
                    <div className="peerfusion-event-item">
                      <span className="peerfusion-event-label">Status:</span>
                      <span 
                        className={`peerfusion-event-status peerfusion-status-${selectedEvent.status}`}
                        style={{ color: getEventColor(selectedEvent.status) }}
                      >
                        {getStatusText(selectedEvent.status)}
                      </span>
                    </div>
                    <div className="peerfusion-event-item">
                      <span className="peerfusion-event-label">Scheduled:</span>
                      <span className="peerfusion-event-value">
                        {new Date(selectedEvent.scheduled_at).toLocaleString()}
                      </span>
                    </div>
                    <div className="peerfusion-event-item">
                      <span className="peerfusion-event-label">Participants:</span>
                      <span className="peerfusion-event-value">
                        {formatParticipants(selectedEvent.participants)}
                      </span>
                    </div>
                    <div className="peerfusion-event-item">
                      <span className="peerfusion-event-label">Conversation ID:</span>
                      <span className="peerfusion-event-value">
                        {selectedEvent.conversation_id}
                      </span>
                    </div>
                  </div>

                  {selectedEvent.status === 'scheduled' && (
                    <div className="peerfusion-event-actions">
                      <button 
                        className="peerfusion-cancel-meeting-btn"
                        onClick={() => setShowCancelModal(true)}
                        disabled={isLoading}
                      >
                        <span className="peerfusion-cancel-icon"></span>
                        Cancel Meeting
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="peerfusion-schedule-legend">
              <div className="peerfusion-legend-item">
                <span className="peerfusion-legend-color" style={{ backgroundColor: '#10B981' }}></span>
                <span>Scheduled</span>
              </div>
              <div className="peerfusion-legend-item">
                <span className="peerfusion-legend-color" style={{ backgroundColor: '#F59E0B' }}></span>
                <span>Pending</span>
              </div>
              <div className="peerfusion-legend-item">
                <span className="peerfusion-legend-color" style={{ backgroundColor: '#6B7280' }}></span>
                <span>Completed</span>
              </div>
              <div className="peerfusion-legend-item">
                <span className="peerfusion-legend-color" style={{ backgroundColor: '#EF4444' }}></span>
                <span>Cancelled</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Confirmation Modal */}
      {showCancelModal && (
        <div className="peerfusion-modal-overlay" onClick={() => setShowCancelModal(false)}>
          <div className="peerfusion-modal-content peerfusion-confirm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="peerfusion-confirm-header">
              <div className="peerfusion-confirm-warning-icon">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="#e74c3c">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
                </svg>
              </div>
              <h3 className="peerfusion-confirm-title">Cancel Session</h3>
            </div>

            <div className="peerfusion-confirm-body">
              <div className="peerfusion-confirm-message">
                <p>Are you sure you want to cancel this session?</p>
                <div className="peerfusion-meeting-details">
                  <strong>Session Time:</strong><br />
                  {selectedEvent && new Date(selectedEvent.scheduled_at).toLocaleString()}
                </div>
                <div className="peerfusion-confirm-warning">
                  This action cannot be undone. Your partner will be notified of the cancellation.
                </div>
              </div>

              <div className="peerfusion-confirm-actions">
                <button
                  onClick={handleCancelMeeting}
                  className="peerfusion-confirm-danger-btn"
                  disabled={cancellingMeeting}
                >
                  {cancellingMeeting ? (
                    <>
                      <span className="peerfusion-loading-spinner-small"></span>
                      Cancelling...
                    </>
                  ) : (
                    'Yes, Cancel Session'
                  )}
                </button>
                <button 
                  onClick={() => setShowCancelModal(false)}
                  className="peerfusion-confirm-secondary-btn"
                  disabled={cancellingMeeting}
                >
                  Keep Session
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ScheduleManagement;