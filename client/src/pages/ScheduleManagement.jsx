import React, { useState, useEffect, useRef } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import axios from 'axios';
import '../css/schedulemanagement.css';

const API_BASE_URL = process.env.REACT_APP_API_URL;

const CloseIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
  </svg>
);

const BackIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
  </svg>
);

const ScheduleManagement = ({ isOpen, onClose, userId }) => {
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancellingMeeting, setCancellingMeeting] = useState(false);
  const [viewType, setViewType] = useState('dayGridMonth');
  const [calendarApi, setCalendarApi] = useState(null);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [isCalendarReady, setIsCalendarReady] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showDetailsOverlay, setShowDetailsOverlay] = useState(false);
  
  const calendarRef = useRef(null);
  const detailsPanelRef = useRef(null);
  const selectedEventRef = useRef(null);

  // Check if mobile on mount and resize
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (isOpen && userId) {
      fetchUserMeetings();
      setHasLoaded(true);
      setIsCalendarReady(false);
      setShowDetailsOverlay(false);
      setSelectedEvent(null);
    } else {
      setEvents([]);
      setSelectedEvent(null);
      setHasLoaded(false);
      setIsCalendarReady(false);
      setShowDetailsOverlay(false);
    }
  }, [isOpen, userId]);

  useEffect(() => {
    if (isOpen && !isCalendarReady) {
      const timer = setTimeout(() => {
        setIsCalendarReady(true);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen, isCalendarReady]);

  useEffect(() => {
    if (calendarApi && viewType && isOpen) {
      try {
        setTimeout(() => {
          calendarApi.changeView(viewType);
          setTimeout(() => {
            calendarApi.updateSize();
          }, 50);
        }, 50);
      } catch (error) {
        console.error('Error changing view:', error);
      }
    }
  }, [viewType, calendarApi, isOpen]);

  // Clear selection when view changes
  useEffect(() => {
    if (calendarApi) {
      clearEventSelection();
    }
    if (isMobile) {
      setShowDetailsOverlay(false);
    }
  }, [viewType]);

  const fetchUserMeetings = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('token');
      
      const response = await axios.get(
        `${API_BASE_URL}/api/meeting/user/${userId}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (response.data.success) {
        const meetings = response.data.meetings || [];
        
        const formattedEvents = meetings.map(meeting => {
          let participants = [];
          try {
            if (typeof meeting.participants === 'string') {
              participants = JSON.parse(meeting.participants);
            } else if (Array.isArray(meeting.participants)) {
              participants = meeting.participants;
            }
          } catch (e) {
            participants = [];
          }

          const participantNames = participants
            .filter(p => {
              const participantId = typeof p === 'object' ? p.id : p;
              return participantId && String(participantId) !== String(userId);
            })
            .map(p => {
              if (typeof p === 'object' && p.username) {
                return p.username;
              }
              return `User ${p}`;
            });

          const title = participantNames.length > 0 
            ? `Session with ${participantNames.join(', ')}`
            : 'Scheduled Session';

          const eventColor = getEventColor(meeting.status);
          const endTime = new Date(meeting.scheduled_at);
          endTime.setHours(endTime.getHours() + 1);
          
          return {
            id: meeting.id.toString(),
            title: title,
            start: meeting.scheduled_at,
            end: endTime.toISOString(),
            extendedProps: {
              meetingId: meeting.id,
              conversationId: meeting.conversation_id,
              participants: participants,
              participantNames: participantNames,
              status: meeting.status,
              originalData: meeting
            },
            backgroundColor: eventColor,
            borderColor: eventColor,
            textColor: '#ffffff',
            classNames: [meeting.status],
            allDay: false
          };
        });

        setEvents(formattedEvents);
        
        if (calendarApi && isOpen) {
          setTimeout(() => {
            calendarApi.refetchEvents();
            calendarApi.updateSize();
          }, 100);
        }
      } else {
        alert('Failed to load meetings');
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
        return '#10B981';
      case 'cancelled':
        return '#EF4444';
      default:
        return '#4a7c3a';
    }
  };

  const clearEventSelection = () => {
    if (calendarApi) {
      const allEvents = calendarApi.getEvents();
      allEvents.forEach(event => {
        const el = event.el;
        if (el) {
          el.classList.remove('fc-event-selected');
        }
      });
    }
    setSelectedEvent(null);
    if (isMobile) {
      setShowDetailsOverlay(false);
    }
  };

  const handleEventClick = (clickInfo) => {
    console.log('Event clicked:', clickInfo.event.title);
    
    if (clickInfo.jsEvent) {
      clickInfo.jsEvent.preventDefault();
      clickInfo.jsEvent.stopPropagation();
    }
    
    clearEventSelection();
    
    const clickedEvent = clickInfo.event;
    const eventElement = clickedEvent.el;
    
    if (eventElement) {
      eventElement.classList.add('fc-event-selected');
      selectedEventRef.current = eventElement;
    }
    
    const meeting = clickedEvent.extendedProps.originalData;
    const participantNames = clickedEvent.extendedProps.participantNames || [];
    
    setSelectedEvent({
      ...meeting,
      participantNames: participantNames,
      displayParticipants: meeting.participants || []
    });
    
    if (isMobile) {
      setShowDetailsOverlay(true);
    }
    
    if (detailsPanelRef.current) {
      detailsPanelRef.current.scrollTop = 0;
    }
    
    return false;
  };

  const handleDateClick = (info) => {
    clearEventSelection();
  };

  const handleDatesSet = (info) => {
    if (calendarApi) {
      calendarApi.refetchEvents();
    }
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
        await fetchUserMeetings();
        setShowCancelModal(false);
        clearEventSelection();
        alert('Session cancelled successfully!');
      } else {
        throw new Error(response.data.error);
      }
    } catch (err) {
      alert('Failed to cancel session');
    } finally {
      setCancellingMeeting(false);
    }
  };

  const formatParticipants = (participants = []) => {
    if (!participants || participants.length === 0) {
      return 'No participants';
    }
    if (participants[0] && typeof participants[0] === 'object') {
      return participants.map(p => p.username || `User ${p.id}`).join(', ');
    }
    return participants.map(p => `User ${p}`).join(', ');
  };
  
  const getStatusText = (status) => {
    switch (status) {
      case 'scheduled': return 'Scheduled';
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

  const handleCloseDetails = () => {
    clearEventSelection();
  };

  const handleBackFromDetails = () => {
    setShowDetailsOverlay(false);
    clearEventSelection();
  };

  const handleCalendarReady = (api) => {
    setCalendarApi(api);
    setIsCalendarReady(true);
    
    setTimeout(() => {
      api.updateSize();
    }, 100);
  };

  const handleViewChange = (newViewType) => {
    setViewType(newViewType);
    clearEventSelection();
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="schedule-modal-overlay" onClick={onClose}>
        <div className="schedule-modal-container" onClick={(e) => e.stopPropagation()}>
          <div className="schedule-modal-header">
            <div className="schedule-header-content">
              <h2 className="schedule-modal-title">
                {showDetailsOverlay && isMobile ? (
                  <>
                    <button 
                      className="back-to-calendar-btn"
                      onClick={handleBackFromDetails}
                    >
                      <BackIcon />
                    </button>
                    Meeting Details
                  </>
                ) : (
                  'My Schedule'
                )}
              </h2>
              <p className="schedule-modal-subtitle">
                {showDetailsOverlay && isMobile ? '' : 'Manage your upcoming sessions'}
              </p>
            </div>
            {(!showDetailsOverlay || !isMobile) && (
              <button className="schedule-close-btn" onClick={onClose}>
                <CloseIcon />
              </button>
            )}
          </div>

          <div className="schedule-main-content">
            {/* Mobile Details Overlay */}
            {isMobile && showDetailsOverlay && selectedEvent ? (
              <div className="mobile-details-overlay">
                <div className="mobile-details-wrapper" ref={detailsPanelRef}>
                  <div className="mobile-event-details-panel">
                    <div className="event-details-content">
                      <div className="detail-item">
                        <span className="detail-label">Meeting ID:</span>
                        <span className="detail-value">#{selectedEvent.id}</span>
                      </div>
                      
                      <div className="detail-item">
                        <span className="detail-label">Status:</span>
                        <span className={`status-badge status-${selectedEvent.status}`}>
                          {getStatusText(selectedEvent.status)}
                        </span>
                      </div>
                      
                      <div className="detail-item">
                        <span className="detail-label">Date:</span>
                        <span className="detail-value">
                          {formatDateTime(selectedEvent.scheduled_at).date}
                        </span>
                      </div>
                      
                      <div className="detail-item">
                        <span className="detail-label">Time:</span>
                        <span className="detail-value">
                          {formatDateTime(selectedEvent.scheduled_at).time}
                        </span>
                      </div>
                      
                      <div className="detail-item">
                        <span className="detail-label">Participants:</span>
                        <span className="detail-value">
                          {formatParticipants(selectedEvent.displayParticipants || selectedEvent.participants)}
                        </span>
                      </div>
                      
                      {selectedEvent.conversation_id && (
                        <div className="detail-item">
                          <span className="detail-label">Conversation:</span>
                          <span className="detail-value conversation-id">
                            #{selectedEvent.conversation_id}
                          </span>
                        </div>
                      )}
                    </div>

                    {selectedEvent.status === 'scheduled' && (
                      <div className="event-actions">
                        <button 
                          className="cancel-btn"
                          onClick={() => setShowCancelModal(true)}
                          disabled={cancellingMeeting}
                        >
                          {cancellingMeeting ? 'Processing...' : 'Cancel Meeting'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <>
                {/* Calendar View Controls */}
                <div className="calendar-view-controls">
                  <div className="view-buttons">
                    <button 
                      className={`view-btn ${viewType === 'dayGridMonth' ? 'active' : ''}`}
                      onClick={() => handleViewChange('dayGridMonth')}
                    >
                      Month
                    </button>
                    <button 
                      className={`view-btn ${viewType === 'timeGridWeek' ? 'active' : ''}`}
                      onClick={() => handleViewChange('timeGridWeek')}
                    >
                      Week
                    </button>
                    <button 
                      className={`view-btn ${viewType === 'timeGridDay' ? 'active' : ''}`}
                      onClick={() => handleViewChange('timeGridDay')}
                    >
                      Day
                    </button>
                  </div>
                  
                  <div className="calendar-stats">
                    <div className="stat-badge scheduled">
                      <span className="stat-count">
                        {events.filter(e => e.extendedProps.status === 'scheduled').length}
                      </span>
                      <span className="stat-label">Upcoming</span>
                    </div>
                  </div>
                </div>

                {/* Desktop Layout */}
                <div className="calendar-details-container">
                  <div className="calendar-section">
                    <div className="calendar-wrapper">
                      {isLoading ? (
                        <div className="schedule-loading">
                          <div className="loading-spinner"></div>
                          <p>Loading schedule...</p>
                        </div>
                      ) : events.length === 0 && hasLoaded ? (
                        <div className="no-schedule">
                          <div className="no-schedule-icon">📅</div>
                          <h3>No Meetings Found</h3>
                          <p>You don't have any scheduled meetings yet.</p>
                        </div>
                      ) : (
                        <div className="calendar-container" key={`calendar-${viewType}-${isOpen}`}>
                          {isCalendarReady && (
                            <FullCalendar
                              key={`fullcalendar-${viewType}`}
                              ref={calendarRef}
                              plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                              initialView={viewType}
                              headerToolbar={{
                                left: 'prev,next today',
                                center: 'title',
                                right: ''
                              }}
                              events={events}
                              eventClick={handleEventClick}
                              dateClick={handleDateClick}
                              datesSet={handleDatesSet}
                              height="400px"
                              eventDisplay={viewType === 'timeGridWeek' || viewType === 'timeGridDay' ? 'list-item' : 'block'}
                              eventTimeFormat={{
                                hour: '2-digit',
                                minute: '2-digit',
                                hour12: true
                              }}
                              dayMaxEvents={3}
                              dayMaxEventRows={3}
                              slotMinTime="06:00:00"
                              slotMaxTime="22:00:00"
                              allDaySlot={false}
                              nowIndicator={true}
                              slotDuration="00:30:00"
                              slotLabelInterval="01:00"
                              slotLabelFormat={{
                                hour: '2-digit',
                                minute: '2-digit',
                                hour12: true
                              }}
                              views={{
                                dayGridMonth: {
                                  dayMaxEvents: 3,
                                  dayMaxEventRows: 3,
                                  titleFormat: { year: 'numeric', month: 'long' }
                                },
                                timeGridWeek: {
                                  dayMaxEvents: 3,
                                  dayMaxEventRows: 3,
                                  allDaySlot: false,
                                  slotMinTime: "06:00:00",
                                  slotMaxTime: "22:00:00",
                                  slotEventOverlap: false,
                                  eventMinHeight: 20
                                },
                                timeGridDay: {
                                  dayMaxEvents: 3,
                                  dayMaxEventRows: 3,
                                  allDaySlot: false,
                                  slotMinTime: "06:00:00",
                                  slotMaxTime: "22:00:00",
                                  slotEventOverlap: false,
                                  eventMinHeight: 20
                                }
                              }}
                              eventContent={(eventInfo) => {
                                if (viewType === 'timeGridWeek' || viewType === 'timeGridDay') {
                                  return (
                                    <div className="custom-calendar-event simple-event">
                                      <div className="event-time-badge">
                                        {eventInfo.timeText}
                                      </div>
                                      <div className="event-title">{eventInfo.event.title}</div>
                                    </div>
                                  );
                                }
                                return (
                                  <div className="custom-calendar-event">
                                    <div className="event-title">{eventInfo.event.title}</div>
                                    <div className="event-time">{eventInfo.timeText}</div>
                                    <div className="event-status">
                                      {getStatusText(eventInfo.event.extendedProps.status)}
                                    </div>
                                  </div>
                                );
                              }}
                              eventClassNames="custom-fc-event"
                              eventOverlap={false}
                              slotEventOverlap={false}
                              selectable={false}
                              editable={false}
                              droppable={false}
                              navLinks={true}
                              navLinkDayClick={(date, jsEvent) => {
                                handleViewChange('timeGridDay');
                                if (calendarApi) {
                                  calendarApi.gotoDate(date);
                                }
                                jsEvent.preventDefault();
                              }}
                              navLinkWeekClick={(weekStart, jsEvent) => {
                                handleViewChange('timeGridWeek');
                                if (calendarApi) {
                                  calendarApi.gotoDate(weekStart);
                                }
                                jsEvent.preventDefault();
                              }}
                              moreLinkContent={(args) => {
                                return `+${args.num} more`;
                              }}
                              locale="en"
                              firstDay={0}
                              weekNumbers={false}
                              weekText="Week"
                              buttonText={{
                                today: 'Today',
                                month: 'Month',
                                week: 'Week',
                                day: 'Day'
                              }}
                              dayHeaderFormat={{
                                weekday: 'short',
                                month: 'short',
                                day: 'numeric',
                                omitCommas: true
                              }}
                              noEventsContent="No events"
                              eventOrder="start,-duration,allDay,title"
                              eventOrderStrict={false}
                              progressiveEventRendering={true}
                              dragRevertDuration={500}
                              dragScroll={true}
                              snapDuration="00:30:00"
                              scrollTime="09:00:00"
                              expandRows={false}
                              stickyHeaderDates={true}
                              stickyFooterScrollbar={true}
                              themeSystem="standard"
                            />
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Desktop Details Panel */}
                  {!isMobile && (
                    <div className="details-section">
                      <div className="details-wrapper" ref={detailsPanelRef}>
                        {selectedEvent ? (
                          <div className="event-details-panel">
                            <div className="event-details-header">
                              <h3>Meeting Details</h3>
                              <button 
                                className="close-details-btn"
                                onClick={handleCloseDetails}
                              >
                                <CloseIcon />
                              </button>
                            </div>
                            
                            <div className="event-details-content">
                              <div className="detail-item">
                                <span className="detail-label">Meeting ID:</span>
                                <span className="detail-value">#{selectedEvent.id}</span>
                              </div>
                              
                              <div className="detail-item">
                                <span className="detail-label">Status:</span>
                                <span className={`status-badge status-${selectedEvent.status}`}>
                                  {getStatusText(selectedEvent.status)}
                                </span>
                              </div>
                              
                              <div className="detail-item">
                                <span className="detail-label">Date:</span>
                                <span className="detail-value">
                                  {formatDateTime(selectedEvent.scheduled_at).date}
                                </span>
                              </div>
                              
                              <div className="detail-item">
                                <span className="detail-label">Time:</span>
                                <span className="detail-value">
                                  {formatDateTime(selectedEvent.scheduled_at).time}
                                </span>
                              </div>
                              
                              <div className="detail-item">
                                <span className="detail-label">Participants:</span>
                                <span className="detail-value">
                                  {formatParticipants(selectedEvent.displayParticipants || selectedEvent.participants)}
                                </span>
                              </div>
                              
                              {selectedEvent.conversation_id && (
                                <div className="detail-item">
                                  <span className="detail-label">Conversation:</span>
                                  <span className="detail-value conversation-id">
                                    #{selectedEvent.conversation_id}
                                  </span>
                                </div>
                              )}
                            </div>

                            {selectedEvent.status === 'scheduled' && (
                              <div className="event-actions">
                                <button 
                                  className="cancel-btn"
                                  onClick={() => setShowCancelModal(true)}
                                  disabled={cancellingMeeting}
                                >
                                  {cancellingMeeting ? 'Processing...' : 'Cancel Meeting'}
                                </button>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="no-event-selected">
                            <div className="selection-guide">
                              <div className="guide-icon">👆</div>
                              <h4>Select a Meeting</h4>
                              <p>Click on any meeting in the calendar to view details</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          <div className="schedule-modal-footer">
            <div className="legend-container">
              <div className="legend-title">Status Legend:</div>
              <div className="legend-items">
                <div className="legend-item">
                  <span className="legend-dot scheduled"></span>
                  <span>Scheduled</span>
                </div>
                <div className="legend-item">
                  <span className="legend-dot cancelled"></span>
                  <span>Cancelled</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showCancelModal && (
        <div className="confirm-modal-overlay" onClick={() => setShowCancelModal(false)}>
          <div className="confirm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="confirm-modal-header">
              <div className="warning-icon">⚠️</div>
              <h3>Cancel Session?</h3>
            </div>
            
            <div className="confirm-modal-body">
              <p>Are you sure you want to cancel this session?</p>
              
              <div className="meeting-info">
                <div className="info-item">
                  <strong>Date:</strong> {selectedEvent && formatDateTime(selectedEvent.scheduled_at).date}
                </div>
                <div className="info-item">
                  <strong>Time:</strong> {selectedEvent && formatDateTime(selectedEvent.scheduled_at).time}
                </div>
                <div className="info-item">
                  <strong>With:</strong> {selectedEvent && formatParticipants(selectedEvent.displayParticipants || selectedEvent.participants)}
                </div>
              </div>
              
              <div className="warning-note">
                All participants will be notified of the cancellation.
              </div>
            </div>
            
            <div className="confirm-modal-actions">
              <button 
                className="confirm-btn cancel-confirm-btn"
                onClick={handleCancelMeeting}
                disabled={cancellingMeeting}
              >
                {cancellingMeeting ? 'Cancelling...' : 'Yes, Cancel Session'}
              </button>
              <button 
                className="confirm-btn keep-session-btn"
                onClick={() => setShowCancelModal(false)}
                disabled={cancellingMeeting}
              >
                Keep Session
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ScheduleManagement;