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
      console.log('🔄 Fetching meetings for user ID:', userId);
      
      const response = await axios.get(
        `${API_BASE_URL}/api/meeting/user/${userId}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      console.log('📊 Meetings API response:', response.data);

      if (response.data.success) {
        const meetings = response.data.meetings || [];
        console.log(`📅 Found ${meetings.length} total meetings:`, meetings);
        
        // Format ALL meetings including cancelled/completed
        const formattedEvents = meetings.map(meeting => {
          console.log('Processing meeting:', meeting);
          
          // Handle participant data - support both new and old format
          let participants = [];
          let participantNames = [];
          
          if (meeting.participants && Array.isArray(meeting.participants)) {
            // New format with participant objects
            participants = meeting.participants.map(p => {
              if (typeof p === 'object' && p.id) {
                return {
                  id: p.id,
                  username: p.username || `User ${p.id}`
                };
              }
              return {
                id: p,
                username: `User ${p}`
              };
            });
            
            participantNames = participants
              .filter(p => p.id && String(p.id) !== String(userId))
              .map(p => p.username);
          } else {
            // Fallback to rawParticipants or parse JSON
            let rawParts = meeting.rawParticipants;
            if (!rawParts && typeof meeting.participants === 'string') {
              try {
                rawParts = JSON.parse(meeting.participants);
              } catch (e) {
                console.error('Error parsing participants:', e);
                rawParts = [];
              }
            }
            
            if (rawParts && Array.isArray(rawParts)) {
              participantNames = rawParts
                .filter(id => id && String(id) !== String(userId))
                .map(id => `User ${id}`);
            }
          }

          const title = participantNames.length > 0 
            ? `Meeting with ${participantNames.join(', ')}`
            : 'Scheduled Meeting';

          const eventColor = getEventColor(meeting.status);
          
          const eventData = {
            id: meeting.id.toString(),
            title: title,
            start: meeting.scheduled_at,
            end: new Date(new Date(meeting.scheduled_at).getTime() + 60 * 60 * 1000), // 1 hour duration
            extendedProps: {
              meetingId: meeting.id,
              conversationId: meeting.conversation_id,
              participants: meeting.rawParticipants || (meeting.participants ? meeting.participants.map(p => p.id || p) : []),
              participantNames: participantNames,
              status: meeting.status,
              originalData: meeting
            },
            backgroundColor: eventColor,
            borderColor: eventColor,
            textColor: '#ffffff',
            classNames: [meeting.status]
          };
          
          console.log('Formatted event:', eventData);
          return eventData;
        });

        console.log('🎉 Final formatted events:', formattedEvents);
        setEvents(formattedEvents);
      } else {
        console.error('❌ API returned success: false');
        alert('Failed to load meetings: ' + (response.data.error || 'Unknown error'));
      }
    } catch (err) {
      console.error('❌ Error fetching meetings:', err);
      console.error('Error details:', err.response?.data);
      alert('Failed to load schedule: ' + (err.response?.data?.error || err.message));
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
        return '#4a7c3a'; // primary green
    }
  };

  const handleEventClick = (clickInfo) => {
    console.log('Event clicked:', clickInfo.event);
    const meeting = clickInfo.event.extendedProps.originalData;
    const participantNames = clickInfo.event.extendedProps.participantNames || [];
    
    setSelectedEvent({
      ...meeting,
      participantNames: participantNames,
      displayParticipants: meeting.participants || []
    });
  };

  const handleCancelMeeting = async () => {
    if (!selectedEvent) return;

    setCancellingMeeting(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API_BASE_URL}/api/meeting/update-status`,
        {
          meetingId: selectedEvent.id,
          status: 'cancelled'
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (response.data.success) {
        // Refresh events
        await fetchUserMeetings();
        setShowCancelModal(false);
        setSelectedEvent(null);
        alert('Meeting cancelled successfully! All participants have been notified.');
      } else {
        throw new Error(response.data.error);
      }
    } catch (err) {
      console.error('Error cancelling meeting:', err);
      alert('Failed to cancel meeting: ' + (err.response?.data?.error || err.message));
    } finally {
      setCancellingMeeting(false);
    }
  };

  const formatParticipants = (participants = []) => {
    if (!participants || participants.length === 0) {
      return 'No participants';
    }
    
    return participants.map(p => {
      if (typeof p === 'object' && p.username) {
        return p.username;
      }
      return `User ${p}`;
    }).join(', ');
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

  const formatDateTime = (dateString) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      }),
      time: date.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true 
      }),
      full: date.toLocaleString('en-US', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      })
    };
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Main Schedule Modal */}
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
              ) : events.length === 0 ? (
                <div className="peerfusion-schedule-loading">
                  <div className="peerfusion-placeholder-icon">📅</div>
                  <h4>No Meetings Found</h4>
                  <p>You don't have any scheduled meetings yet.</p>
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
                  height="auto"
                  eventDisplay="block"
                  eventTimeFormat={{
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: true
                  }}
                  dayMaxEvents={3}
                  views={{
                    dayGridMonth: {
                      dayMaxEvents: 3,
                      titleFormat: { year: 'numeric', month: 'long' }
                    },
                    timeGridWeek: {
                      titleFormat: { year: 'numeric', month: 'short', day: 'numeric' },
                      allDaySlot: false
                    },
                    timeGridDay: {
                      titleFormat: { year: 'numeric', month: 'long', day: 'numeric' },
                      allDaySlot: false
                    }
                  }}
                  eventContent={(eventInfo) => (
                    <div className="peerfusion-calendar-event">
                      <div className="peerfusion-event-title">{eventInfo.event.title}</div>
                      <div className="peerfusion-event-time">
                        {eventInfo.timeText}
                      </div>
                      <div className="peerfusion-event-status-badge">
                        {getStatusText(eventInfo.event.extendedProps.status)}
                      </div>
                    </div>
                  )}
                />
              )}
            </div>

            {/* Event Details Panel */}
            {selectedEvent ? (
              <div className="peerfusion-event-details">
                <div className="peerfusion-event-details-header">
                  <h4>Meeting Details</h4>
                  <button 
                    className="peerfusion-close-details"
                    onClick={() => setSelectedEvent(null)}
                  >
                    <CloseIcon />
                  </button>
                </div>
                <div className="peerfusion-event-info">
                  <div className="peerfusion-event-item">
                    <span className="peerfusion-event-label">Meeting ID:</span>
                    <span className="peerfusion-event-value">#{selectedEvent.id}</span>
                  </div>
                  <div className="peerfusion-event-item">
                    <span className="peerfusion-event-label">Status:</span>
                    <span 
                      className={`peerfusion-event-status peerfusion-status-${selectedEvent.status}`}
                    >
                      {getStatusText(selectedEvent.status)}
                    </span>
                  </div>
                  <div className="peerfusion-event-item">
                    <span className="peerfusion-event-label">Date & Time:</span>
                    <span className="peerfusion-event-value">
                      {formatDateTime(selectedEvent.scheduled_at).full}
                    </span>
                  </div>
                  <div className="peerfusion-event-item">
                    <span className="peerfusion-event-label">Participants:</span>
                    <span className="peerfusion-event-value">
                      {formatParticipants(selectedEvent.displayParticipants || selectedEvent.participants)}
                    </span>
                  </div>
                  {selectedEvent.conversation_id && (
                    <div className="peerfusion-event-item">
                      <span className="peerfusion-event-label">Conversation ID:</span>
                      <span className="peerfusion-event-value">
                        {selectedEvent.conversation_id}
                      </span>
                    </div>
                  )}
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
            ) : (
              <div className="peerfusion-event-details-placeholder">
                <div className="peerfusion-placeholder-content">
                  <div className="peerfusion-placeholder-icon">📅</div>
                  <h4>No Meeting Selected</h4>
                  <p>Click on a meeting in the calendar to view details and manage your session.</p>
                </div>
              </div>
            )}
          </div>

          <div className="peerfusion-schedule-footer">
            <div className="peerfusion-schedule-stats">
              <div className="peerfusion-stat-item">
                <span className="peerfusion-stat-number">
                  {events.filter(e => e.extendedProps.status === 'scheduled').length}
                </span>
                <span className="peerfusion-stat-label">Upcoming</span>
              </div>
              <div className="peerfusion-stat-item">
                <span className="peerfusion-stat-number">
                  {events.filter(e => e.extendedProps.status === 'pending').length}
                </span>
                <span className="peerfusion-stat-label">Pending</span>
              </div>
              <div className="peerfusion-stat-item">
                <span className="peerfusion-stat-number">
                  {events.filter(e => e.extendedProps.status === 'cancelled').length}
                </span>
                <span className="peerfusion-stat-label">Cancelled</span>
              </div>
              <div className="peerfusion-stat-item">
                <span className="peerfusion-stat-number">
                  {events.filter(e => e.extendedProps.status === 'completed').length}
                </span>
                <span className="peerfusion-stat-label">Completed</span>
              </div>
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
                <span className="peerfusion-legend-color" style={{ backgroundColor: '#EF4444' }}></span>
                <span>Cancelled</span>
              </div>
              <div className="peerfusion-legend-item">
                <span className="peerfusion-legend-color" style={{ backgroundColor: '#6B7280' }}></span>
                <span>Completed</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Cancel Confirmation Modal */}
      {showCancelModal && (
        <div className="peerfusion-modal-overlay" onClick={() => setShowCancelModal(false)}>
          <div className="peerfusion-modal-content peerfusion-confirm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="peerfusion-confirm-header">
              <div className="peerfusion-confirm-warning-icon">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="#dc2626">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
                </svg>
              </div>
              <h3 className="peerfusion-confirm-title">Cancel Session</h3>
            </div>

            <div className="peerfusion-confirm-body">
              <div className="peerfusion-confirm-message">
                <p>Are you sure you want to cancel this session?</p>
                <div className="peerfusion-meeting-details">
                  <strong>Session Details:</strong>
                  <div className="peerfusion-meeting-time">
                    {selectedEvent && formatDateTime(selectedEvent.scheduled_at).date}
                  </div>
                  <div className="peerfusion-meeting-time">
                    {selectedEvent && formatDateTime(selectedEvent.scheduled_at).time}
                  </div>
                  {selectedEvent && (
                    <div className="peerfusion-meeting-participants">
                      With: {formatParticipants(selectedEvent.displayParticipants || selectedEvent.participants)}
                    </div>
                  )}
                </div>
                <div className="peerfusion-confirm-warning">
                  This action cannot be undone. All participants will be notified of the cancellation.
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