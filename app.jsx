import React, { useState, useEffect, useRef } from 'react';
import { Plus, X, ChevronLeft, ChevronRight, Users, MapPin, Calendar, AlertCircle, FileText, Upload, Download, Eye } from 'lucide-react';

const ResourcePlanner = () => {
  const [engineers, setEngineers] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [showNewEngineer, setShowNewEngineer] = useState(false);
  const [showNewBooking, setShowNewBooking] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [newEngineer, setNewEngineer] = useState({ name: '', region: '' });
  const [newBooking, setNewBooking] = useState({
    engineerId: '',
    jobName: '',
    jobDescription: '',
    location: '',
    region: '',
    startDate: '',
    endDate: '',
    additionalDetails: '',
    documents: [],
  });
  const [selectedEngineer, setSelectedEngineer] = useState(null);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [lastSync, setLastSync] = useState(new Date());
  const [expandedBooking, setExpandedBooking] = useState(null);
  const fileInputRef = useRef(null);
  const syncIntervalRef = useRef(null);

  // Load data from storage
  const loadData = async () => {
    try {
      const engResult = await window.storage.get('engineers-v2');
      const bookResult = await window.storage.get('bookings-v2');
      
      if (engResult) setEngineers(JSON.parse(engResult.value));
      if (bookResult) setBookings(JSON.parse(bookResult.value));
      setLastSync(new Date());
    } catch (error) {
      console.log('Loading initial data or no data exists yet');
    }
  };

  // Save data to storage
  const saveData = async (newEngineers, newBookings) => {
    try {
      await window.storage.set('engineers-v2', JSON.stringify(newEngineers));
      await window.storage.set('bookings-v2', JSON.stringify(newBookings));
      setLastSync(new Date());
    } catch (error) {
      console.error('Save error:', error);
    }
  };

  // Sync data periodically
  useEffect(() => {
    loadData();
    syncIntervalRef.current = setInterval(loadData, 2000);
    return () => clearInterval(syncIntervalRef.current);
  }, []);

  // Add engineer
  const handleAddEngineer = async () => {
    if (!newEngineer.name.trim() || !newEngineer.region.trim()) {
      alert('Please fill in both name and region');
      return;
    }
    
    const id = Date.now().toString();
    const updated = [...engineers, { 
      id, 
      name: newEngineer.name, 
      region: newEngineer.region 
    }];
    setEngineers(updated);
    await saveData(updated, bookings);
    setNewEngineer({ name: '', region: '' });
    setShowNewEngineer(false);
  };

  // Delete engineer
  const handleDeleteEngineer = async (id) => {
    const updated = engineers.filter(e => e.id !== id);
    const updatedBookings = bookings.filter(b => b.engineerId !== id);
    setEngineers(updated);
    setBookings(updatedBookings);
    await saveData(updated, updatedBookings);
  };

  // Handle file upload
  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const document = {
          id: Date.now().toString() + Math.random(),
          name: file.name,
          type: file.type,
          size: file.size,
          data: event.target.result,
          uploadedAt: new Date().toISOString(),
        };
        setNewBooking(prev => ({
          ...prev,
          documents: [...prev.documents, document]
        }));
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  };

  // Remove document from new booking
  const handleRemoveDocument = (docId) => {
    setNewBooking(prev => ({
      ...prev,
      documents: prev.documents.filter(d => d.id !== docId)
    }));
  };

  // Add booking
  const handleAddBooking = async () => {
    if (!newBooking.engineerId || !newBooking.jobName || !newBooking.location || !newBooking.region || !newBooking.startDate || !newBooking.endDate) {
      alert('Please fill in all required fields');
      return;
    }

    if (new Date(newBooking.startDate) > new Date(newBooking.endDate)) {
      alert('Start date must be before end date');
      return;
    }

    const id = Date.now().toString();
    const booking = {
      id,
      ...newBooking,
      startDate: new Date(newBooking.startDate).toISOString(),
      endDate: new Date(newBooking.endDate).toISOString(),
    };

    const updated = [...bookings, booking];
    setBookings(updated);
    await saveData(engineers, updated);
    setNewBooking({
      engineerId: '',
      jobName: '',
      jobDescription: '',
      location: '',
      region: '',
      startDate: '',
      endDate: '',
      additionalDetails: '',
      documents: [],
    });
    setShowNewBooking(false);
  };

  // Delete booking
  const handleDeleteBooking = async (id) => {
    const updated = bookings.filter(b => b.id !== id);
    setBookings(updated);
    await saveData(engineers, updated);
    setExpandedBooking(null);
  };

  // Download document
  const handleDownloadDocument = (doc) => {
    const link = document.createElement('a');
    link.href = doc.data;
    link.download = doc.name;
    link.click();
  };

  // Get days in month
  const getDaysInMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  // Get first day of month
  const getFirstDayOfMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  // Check if booking spans a date
  const isBookingOnDate = (booking, date) => {
    const start = new Date(booking.startDate);
    const end = new Date(booking.endDate);
    const check = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
    return check >= start && check <= end;
  };

  // Get engineer by ID
  const getEngineer = (id) => {
    return engineers.find(e => e.id === id);
  };

  // Format file size
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  // Month view
  const renderMonth = () => {
    const daysInMonth = getDaysInMonth(currentDate);
    const firstDay = getFirstDayOfMonth(currentDate);
    const days = [];

    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="h-24 bg-gray-50 border border-gray-200"></div>);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
      const dayBookings = bookings.filter(b => isBookingOnDate(b, date));

      days.push(
        <div key={day} className="h-24 border border-gray-200 p-2 bg-white hover:bg-gray-50 transition-colors overflow-hidden">
          <div className="text-sm font-semibold text-gray-700 mb-1">{day}</div>
          <div className="space-y-0.5 text-xs">
            {dayBookings.map(booking => {
              const engineer = getEngineer(booking.engineerId);
              return (
                <div
                  key={booking.id}
                  onClick={() => setExpandedBooking(booking.id)}
                  className="bg-blue-100 text-blue-900 px-2 py-0.5 rounded truncate cursor-pointer hover:bg-blue-200 transition-colors font-medium"
                  title={`${engineer?.name} - ${booking.jobName}`}
                >
                  {engineer?.name.split(' ')[0]}
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    return days;
  };

  // List view for detailed bookings
  const renderBookingsList = () => {
    const sortedBookings = [...bookings].sort((a, b) => 
      new Date(a.startDate) - new Date(b.startDate)
    );

    return sortedBookings.map(booking => {
      const start = new Date(booking.startDate);
      const end = new Date(booking.endDate);
      const duration = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
      const engineer = getEngineer(booking.engineerId);
      const isExpanded = expandedBooking === booking.id;

      return (
        <div key={booking.id} className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow">
          <div 
            onClick={() => setExpandedBooking(isExpanded ? null : booking.id)}
            className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 cursor-pointer hover:from-blue-100 hover:to-indigo-100 transition-colors flex justify-between items-start"
          >
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className="font-bold text-lg text-gray-900">{booking.jobName}</span>
                <span className="bg-indigo-600 text-white text-xs px-2 py-1 rounded font-medium">
                  {duration} day{duration > 1 ? 's' : ''}
                </span>
              </div>
              <div className="text-sm text-gray-700 space-y-1">
                <div className="flex items-center gap-2">
                  <Users size={16} className="text-indigo-600" />
                  <span className="font-medium">{engineer?.name}</span>
                  <span className="text-xs bg-gray-200 px-2 py-0.5 rounded text-gray-700">{engineer?.region}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin size={16} className="text-indigo-600" />
                  <span>{booking.location}</span>
                  <span className="text-xs bg-gray-200 px-2 py-0.5 rounded text-gray-700">{booking.region}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar size={16} className="text-indigo-600" />
                  <span>{start.toLocaleDateString()} → {end.toLocaleDateString()}</span>
                </div>
              </div>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteBooking(booking.id);
              }}
              className="ml-4 p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {isExpanded && (
            <div className="bg-white border-t border-gray-200 p-6 space-y-6">
              {/* Job Description */}
              {booking.jobDescription && (
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                    <FileText size={18} className="text-indigo-600" />
                    Job Description
                  </h4>
                  <p className="text-gray-700 whitespace-pre-wrap bg-gray-50 p-4 rounded-lg border border-gray-200">
                    {booking.jobDescription}
                  </p>
                </div>
              )}

              {/* Additional Details */}
              {booking.additionalDetails && (
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                    <AlertCircle size={18} className="text-indigo-600" />
                    Additional Details
                  </h4>
                  <p className="text-gray-700 whitespace-pre-wrap bg-gray-50 p-4 rounded-lg border border-gray-200">
                    {booking.additionalDetails}
                  </p>
                </div>
              )}

              {/* Documents */}
              {booking.documents && booking.documents.length > 0 && (
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <Upload size={18} className="text-indigo-600" />
                    Documents ({booking.documents.length})
                  </h4>
                  <div className="space-y-2">
                    {booking.documents.map(doc => (
                      <div key={doc.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <FileText size={18} className="text-indigo-600 flex-shrink-0" />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-gray-900 truncate">{doc.name}</p>
                            <p className="text-xs text-gray-500">{formatFileSize(doc.size)} • {new Date(doc.uploadedAt).toLocaleDateString()}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => handleDownloadDocument(doc)}
                          className="ml-2 p-2 text-indigo-600 hover:bg-indigo-100 rounded-lg transition-colors flex-shrink-0"
                          title="Download document"
                        >
                          <Download size={18} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {!booking.jobDescription && !booking.additionalDetails && (!booking.documents || booking.documents.length === 0) && (
                <div className="text-center py-6 text-gray-500">
                  <p className="text-sm">No additional details or documents for this booking</p>
                </div>
              )}
            </div>
          )}
        </div>
      );
    });
  };

  const monthName = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700&family=Inter:wght@400;500;600&display=swap');
        
        * {
          font-family: 'Inter', sans-serif;
        }
        
        h1, h2, h3, .font-display {
          font-family: 'Syne', sans-serif;
        }
      `}</style>

      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-50 backdrop-blur-sm bg-white/95">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-display font-bold text-gray-900">Team Resource Planner</h1>
              <p className="text-sm text-gray-500 mt-1">Engineering allocation, job tracking & documentation</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">Last sync: {lastSync.toLocaleTimeString()}</p>
              <p className="text-xs text-gray-400 mt-0.5">{engineers.length} engineers • {bookings.length} bookings</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {/* Engineers Panel */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display font-bold text-lg text-gray-900">Engineers</h2>
                <button
                  onClick={() => setShowNewEngineer(!showNewEngineer)}
                  className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                  title="Add engineer"
                >
                  <Plus size={18} />
                </button>
              </div>

              {showNewEngineer && (
                <div className="mb-4 p-4 bg-indigo-50 rounded-lg border border-indigo-200 space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                    <input
                      type="text"
                      value={newEngineer.name}
                      onChange={(e) => setNewEngineer({ ...newEngineer, name: e.target.value })}
                      placeholder="Engineer name"
                      className="w-full px-3 py-2 border border-indigo-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      autoFocus
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Region</label>
                    <input
                      type="text"
                      value={newEngineer.region}
                      onChange={(e) => setNewEngineer({ ...newEngineer, region: e.target.value })}
                      placeholder="e.g., North, South, London"
                      className="w-full px-3 py-2 border border-indigo-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={handleAddEngineer}
                      className="flex-1 bg-indigo-600 text-white px-3 py-1 rounded text-sm font-medium hover:bg-indigo-700 transition-colors"
                    >
                      Add
                    </button>
                    <button
                      onClick={() => setShowNewEngineer(false)}
                      className="flex-1 bg-gray-200 text-gray-700 px-3 py-1 rounded text-sm font-medium hover:bg-gray-300 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                {engineers.length === 0 ? (
                  <p className="text-sm text-gray-500 italic">No engineers yet</p>
                ) : (
                  engineers.map(engineer => {
                    const engineerBookings = bookings.filter(b => b.engineerId === engineer.id);
                    const activeBooking = engineerBookings.find(b => {
                      const now = new Date();
                      const start = new Date(b.startDate);
                      const end = new Date(b.endDate);
                      return now >= start && now <= end;
                    });

                    return (
                      <div
                        key={engineer.id}
                        onClick={() => setSelectedEngineer(selectedEngineer === engineer.id ? null : engineer.id)}
                        className={`p-3 rounded-lg border cursor-pointer transition-all ${
                          selectedEngineer === engineer.id
                            ? 'bg-indigo-100 border-indigo-400'
                            : 'bg-gray-50 border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm text-gray-900">{engineer.name}</p>
                            <p className="text-xs text-gray-500 font-medium">{engineer.region}</p>
                            {activeBooking && (
                              <p className="text-xs text-indigo-600 font-medium mt-1 line-clamp-1">
                                📍 {activeBooking.location}
                              </p>
                            )}
                            <p className="text-xs text-gray-500 mt-1">{engineerBookings.length} booking{engineerBookings.length !== 1 ? 's' : ''}</p>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteEngineer(engineer.id);
                            }}
                            className="p-1 text-red-600 hover:bg-red-100 rounded transition-colors flex-shrink-0 ml-2"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Quick Stats */}
            <div className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-xl border border-indigo-200 p-6">
              <h3 className="font-display font-bold text-lg text-gray-900 mb-4">Overview</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Total Engineers</span>
                  <span className="font-bold text-2xl text-indigo-600">{engineers.length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Active Bookings</span>
                  <span className="font-bold text-2xl text-indigo-600">
                    {bookings.filter(b => {
                      const now = new Date();
                      const start = new Date(b.startDate);
                      const end = new Date(b.endDate);
                      return now >= start && now <= end;
                    }).length}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Total Bookings</span>
                  <span className="font-bold text-2xl text-indigo-600">{bookings.length}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3 space-y-6">
            {/* Calendar Section */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="bg-gradient-to-r from-indigo-600 to-blue-600 px-6 py-4 flex items-center justify-between">
                <button
                  onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors text-white"
                >
                  <ChevronLeft size={20} />
                </button>
                <h2 className="text-xl font-display font-bold text-white">{monthName}</h2>
                <button
                  onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors text-white"
                >
                  <ChevronRight size={20} />
                </button>
              </div>

              <div className="grid grid-cols-7 bg-gray-100 border-b border-gray-200">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                  <div key={day} className="p-3 text-center font-semibold text-sm text-gray-700">
                    {day}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-0">
                {renderMonth()}
              </div>
            </div>

            {/* Bookings List Section */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-display font-bold text-xl text-gray-900">All Bookings</h2>
                <button
                  onClick={() => setShowNewBooking(!showNewBooking)}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium flex items-center gap-2"
                >
                  <Plus size={18} /> New Booking
                </button>
              </div>

              {showNewBooking && (
                <div className="mb-6 p-6 bg-indigo-50 rounded-lg border border-indigo-200 max-h-[70vh] overflow-y-auto">
                  <h3 className="font-semibold text-gray-900 mb-4 sticky top-0 bg-indigo-50 py-2">Create New Booking</h3>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Engineer *</label>
                        <select
                          value={newBooking.engineerId}
                          onChange={(e) => setNewBooking({ ...newBooking, engineerId: e.target.value })}
                          className="w-full px-3 py-2 border border-indigo-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                          <option value="">Select an engineer</option>
                          {engineers.map(e => (
                            <option key={e.id} value={e.id}>{e.name} ({e.region})</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Job Name *</label>
                        <input
                          type="text"
                          value={newBooking.jobName}
                          onChange={(e) => setNewBooking({ ...newBooking, jobName: e.target.value })}
                          placeholder="e.g., Server Migration"
                          className="w-full px-3 py-2 border border-indigo-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Job Description</label>
                      <textarea
                        value={newBooking.jobDescription}
                        onChange={(e) => setNewBooking({ ...newBooking, jobDescription: e.target.value })}
                        placeholder="Detailed description of the job..."
                        rows="4"
                        className="w-full px-3 py-2 border border-indigo-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Location *</label>
                        <input
                          type="text"
                          value={newBooking.location}
                          onChange={(e) => setNewBooking({ ...newBooking, location: e.target.value })}
                          placeholder="e.g., London Office"
                          className="w-full px-3 py-2 border border-indigo-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Region *</label>
                        <input
                          type="text"
                          value={newBooking.region}
                          onChange={(e) => setNewBooking({ ...newBooking, region: e.target.value })}
                          placeholder="e.g., South East"
                          className="w-full px-3 py-2 border border-indigo-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Start Date *</label>
                        <input
                          type="date"
                          value={newBooking.startDate}
                          onChange={(e) => setNewBooking({ ...newBooking, startDate: e.target.value })}
                          className="w-full px-3 py-2 border border-indigo-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">End Date *</label>
                        <input
                          type="date"
                          value={newBooking.endDate}
                          onChange={(e) => setNewBooking({ ...newBooking, endDate: e.target.value })}
                          className="w-full px-3 py-2 border border-indigo-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Additional Details</label>
                      <textarea
                        value={newBooking.additionalDetails}
                        onChange={(e) => setNewBooking({ ...newBooking, additionalDetails: e.target.value })}
                        placeholder="Any additional information, notes, or requirements..."
                        rows="3"
                        className="w-full px-3 py-2 border border-indigo-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Documents</label>
                      <div className="mb-3">
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          className="w-full px-4 py-2 border-2 border-dashed border-indigo-300 rounded-lg text-indigo-600 font-medium hover:border-indigo-500 hover:bg-indigo-50 transition-colors flex items-center justify-center gap-2"
                        >
                          <Upload size={18} />
                          Click to upload or drag & drop
                        </button>
                        <input
                          ref={fileInputRef}
                          type="file"
                          multiple
                          onChange={handleFileUpload}
                          className="hidden"
                          accept="*/*"
                        />
                      </div>

                      {newBooking.documents.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-sm font-medium text-gray-700">Uploaded files ({newBooking.documents.length}):</p>
                          {newBooking.documents.map(doc => (
                            <div key={doc.id} className="flex items-center justify-between p-2 bg-white rounded-lg border border-indigo-200">
                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                <FileText size={16} className="text-indigo-600 flex-shrink-0" />
                                <span className="text-sm text-gray-700 truncate">{doc.name}</span>
                                <span className="text-xs text-gray-500">({formatFileSize(doc.size)})</span>
                              </div>
                              <button
                                onClick={() => handleRemoveDocument(doc.id)}
                                className="ml-2 p-1 text-red-600 hover:bg-red-100 rounded transition-colors"
                              >
                                <X size={16} />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2 pt-4 sticky bottom-0 bg-indigo-50 -mx-6 -mb-6 px-6 py-4">
                      <button
                        onClick={handleAddBooking}
                        className="flex-1 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
                      >
                        Create Booking
                      </button>
                      <button
                        onClick={() => setShowNewBooking(false)}
                        className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-300 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {bookings.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <AlertCircle className="text-gray-400 mb-3" size={32} />
                  <p className="text-gray-600 font-medium">No bookings yet</p>
                  <p className="text-gray-500 text-sm mt-1">Create a booking to get started</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {renderBookingsList()}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResourcePlanner;
