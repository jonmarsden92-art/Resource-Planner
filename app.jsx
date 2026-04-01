import React, { useState, useEffect, useRef } from 'react';
import { Plus, X, ChevronLeft, ChevronRight, Users, MapPin, Calendar, AlertCircle, FileText, Upload, Download } from 'lucide-react';

// --- STORAGE FIX FOR WEB ---
// This makes sure your data saves in a normal web browser
if (!window.storage) {
  window.storage = {
    get: (key) => Promise.resolve({ value: localStorage.getItem(key) }),
    set: (key, value) => {
      localStorage.setItem(key, value);
      return Promise.resolve();
    }
  };
}

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
  const [lastSync, setLastSync] = useState(new Date());
  const [expandedBooking, setExpandedBooking] = useState(null);
  const fileInputRef = useRef(null);
  const syncIntervalRef = useRef(null);

  const loadData = async () => {
    try {
      const engResult = await window.storage.get('engineers-v2');
      const bookResult = await window.storage.get('bookings-v2');
      
      if (engResult.value) setEngineers(JSON.parse(engResult.value));
      if (bookResult.value) setBookings(JSON.parse(bookResult.value));
      setLastSync(new Date());
    } catch (error) {
      console.log('Loading initial data...');
    }
  };

  const saveData = async (newEngineers, newBookings) => {
    try {
      await window.storage.set('engineers-v2', JSON.stringify(newEngineers));
      await window.storage.set('bookings-v2', JSON.stringify(newBookings));
      setLastSync(new Date());
    } catch (error) {
      console.error('Save error:', error);
    }
  };

  useEffect(() => {
    loadData();
    syncIntervalRef.current = setInterval(loadData, 2000);
    return () => clearInterval(syncIntervalRef.current);
  }, []);

  const handleAddEngineer = async () => {
    if (!newEngineer.name.trim() || !newEngineer.region.trim()) {
      alert('Please fill in both name and region');
      return;
    }
    const id = Date.now().toString();
    const updated = [...engineers, { id, name: newEngineer.name, region: newEngineer.region }];
    setEngineers(updated);
    await saveData(updated, bookings);
    setNewEngineer({ name: '', region: '' });
    setShowNewEngineer(false);
  };

  const handleDeleteEngineer = async (id) => {
    const updated = engineers.filter(e => e.id !== id);
    const updatedBookings = bookings.filter(b => b.engineerId !== id);
    setEngineers(updated);
    setBookings(updatedBookings);
    await saveData(updated, updatedBookings);
  };

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

  const handleAddBooking = async () => {
    if (!newBooking.engineerId || !newBooking.jobName || !newBooking.location || !newBooking.region || !newBooking.startDate || !newBooking.endDate) {
      alert('Please fill in all required fields');
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
      engineerId: '', jobName: '', jobDescription: '', location: '',
      region: '', startDate: '', endDate: '', additionalDetails: '', documents: [],
    });
    setShowNewBooking(false);
  };

  const handleDeleteBooking = async (id) => {
    const updated = bookings.filter(b => b.id !== id);
    setBookings(updated);
    await saveData(engineers, updated);
    setExpandedBooking(null);
  };

  const getDaysInMonth = (date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const getFirstDayOfMonth = (date) => new Date(date.getFullYear(), date.getMonth(), 1).getDay();

  const isBookingOnDate = (booking, date) => {
    const start = new Date(booking.startDate);
    const end = new Date(booking.endDate);
    const check = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
    return check >= start && check <= end;
  };

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
        <div key={day} className="h-24 border border-gray-200 p-2 bg-white overflow-hidden">
          <div className="text-sm font-semibold text-gray-700 mb-1">{day}</div>
          <div className="space-y-0.5 text-xs">
            {dayBookings.map(booking => (
              <div key={booking.id} className="bg-blue-100 text-blue-900 px-2 py-0.5 rounded truncate font-medium">
                {engineers.find(e => e.id === booking.engineerId)?.name.split(' ')[0]}
              </div>
            ))}
          </div>
        </div>
      );
    }
    return days;
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8 font-sans">
      {/* Basic Header */}
      <div className="max-w-7xl mx-auto mb-8 flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Resource Planner</h1>
        <div className="text-right text-xs text-gray-500">Sync: {lastSync.toLocaleTimeString()}</div>
      </div>

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Sidebar */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-bold">Engineers</h2>
              <button onClick={() => setShowNewEngineer(!showNewEngineer)} className="p-1 bg-indigo-600 text-white rounded"><Plus size={16}/></button>
            </div>
            {showNewEngineer && (
               <div className="space-y-2 mb-4 bg-indigo-50 p-3 rounded">
                 <input 
                  className="w-full p-2 text-sm border rounded" 
                  placeholder="Name" 
                  value={newEngineer.name} 
                  onChange={e => setNewEngineer({...newEngineer, name: e.target.value})}
                 />
                 <input 
                  className="w-full p-2 text-sm border rounded" 
                  placeholder="Region" 
                  value={newEngineer.region} 
                  onChange={e => setNewEngineer({...newEngineer, region: e.target.value})}
                 />
                 <button onClick={handleAddEngineer} className="w-full bg-indigo-600 text-white py-1 rounded text-sm">Save</button>
               </div>
            )}
            <div className="space-y-2">
              {engineers.map(e => (
                <div key={e.id} className="flex justify-between p-2 bg-gray-50 rounded text-sm">
                  <span>{e.name}</span>
                  <button onClick={() => handleDeleteEngineer(e.id)} className="text-red-500"><X size={14}/></button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Main Calendar */}
        <div className="lg:col-span-3 space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="bg-indigo-600 p-4 flex justify-between items-center text-white">
              <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))}><ChevronLeft/></button>
              <h2 className="font-bold">{currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}</h2>
              <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))}><ChevronRight/></button>
            </div>
            <div className="grid grid-cols-7 text-center font-bold text-xs py-2 bg-gray-100 border-b">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => <div key={d}>{d}</div>)}
            </div>
            <div className="grid grid-cols-7">
              {renderMonth()}
            </div>
          </div>

          {/* New Booking Button */}
          <button 
            onClick={() => setShowNewBooking(true)}
            className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold shadow-lg hover:bg-indigo-700 transition-colors"
          >
            + Create New Booking
          </button>

          {/* Booking Modal (Simplified) */}
          {showNewBooking && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-2xl p-6 max-w-md w-full space-y-4">
                <h2 className="text-xl font-bold">New Job Booking</h2>
                <select 
                  className="w-full p-2 border rounded"
                  value={newBooking.engineerId}
                  onChange={e => setNewBooking({...newBooking, engineerId: e.target.value})}
                >
                  <option value="">Select Engineer</option>
                  {engineers.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                </select>
                <input className="w-full p-2 border rounded" placeholder="Job Name" onChange={e => setNewBooking({...newBooking, jobName: e.target.value})}/>
                <input className="w-full p-2 border rounded" placeholder="Location" onChange={e => setNewBooking({...newBooking, location: e.target.value})}/>
                <input className="w-full p-2 border rounded" placeholder="Region" onChange={e => setNewBooking({...newBooking, region: e.target.value})}/>
                <div className="grid grid-cols-2 gap-2">
                  <input type="date" className="p-2 border rounded" onChange={e => setNewBooking({...newBooking, startDate: e.target.value})}/>
                  <input type="date" className="p-2 border rounded" onChange={e => setNewBooking({...newBooking, endDate: e.target.value})}/>
                </div>
                <div className="flex gap-2">
                  <button onClick={handleAddBooking} className="flex-1 bg-indigo-600 text-white py-2 rounded">Create</button>
                  <button onClick={() => setShowNewBooking(false)} className="flex-1 bg-gray-200 py-2 rounded">Cancel</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResourcePlanner;
