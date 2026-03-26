import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import API from '../../utils/api';

export default function RegistrationCheckIn() {
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [studentData, setStudentData] = useState(null);
  const [registeredEvents, setRegisteredEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showingStudent, setShowingStudent] = useState(false);

  const formatGender = (gender) => {
    if (gender === 'male') return 'Male';
    if (gender === 'female') return 'Female';
    return 'Unspecified';
  };

  // Step 1: Find student by registration number
  const handleSearchStudent = async () => {
    if (!registrationNumber.trim()) {
      toast.error('Enter registration number');
      return;
    }

    setLoading(true);
    try {
      // Extract last 5 characters (includes letter like S0087)
      const input = registrationNumber.toUpperCase().trim();
      const regNum = input.slice(-5);
      
      const res = await API.get(`/registrations/by-registration-number/${regNum}`);
      setStudentData(res.data.student);
      setRegisteredEvents(res.data.events);
      setSelectedEventId('');
      setResult(null);
      setShowingStudent(true);
      toast.success(`Found student: ${res.data.student.name}`);
    } catch (err) {
      setStudentData(null);
      setRegisteredEvents([]);
      setShowingStudent(false);
      toast.error(err.response?.data?.message || 'Student not found');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Check in for selected event
  const handleCheckIn = async () => {
    if (!selectedEventId) {
      toast.error('Select an event');
      return;
    }

    setLoading(true);
    try {
      // Extract last 5 characters (includes letter like S0087)
      const input = registrationNumber.toUpperCase().trim();
      const regNum = input.slice(-5);
      
      const res = await API.post('/registrations/checkin/registration-number', {
        eventId: selectedEventId,
        registrationNumber: regNum
      });
      setResult(res.data);
      toast.success(res.data.message);
    } catch (err) {
      setResult(null);
      toast.error(err.response?.data?.message || 'Check-in failed');
    } finally {
      setLoading(false);
    }
  };

  const handleStartOver = () => {
    setRegistrationNumber('');
    setStudentData(null);
    setRegisteredEvents([]);
    setSelectedEventId('');
    setResult(null);
    setShowingStudent(false);
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Check-In</h1>

      <div className="max-w-2xl space-y-4">
        {/* Step 1: Search by Registration Number */}
        {!showingStudent ? (
          <div className="card">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Registration Number</label>
                <input
                  className="input-field text-2xl font-mono font-bold text-center tracking-widest"
                  placeholder="S0087"
                  value={registrationNumber}
                  onChange={e => setRegistrationNumber(e.target.value.toUpperCase().slice(0, 10))}
                  onKeyDown={e => e.key === 'Enter' && handleSearchStudent()}
                  maxLength="10"
                  autoFocus
                />
                <p className="text-xs text-gray-500 mt-2">Enter the registration number (e.g., S0087) and press Enter</p>
              </div>

              <button
                onClick={handleSearchStudent}
                disabled={loading}
                className="btn-primary w-full py-3 rounded-xl font-semibold text-lg"
              >
                {loading ? 'Searching...' : '🔍 Find Student'}
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Step 2: Show Student & Select Event */}
            <div className="card bg-blue-50 border-blue-200">
              <div className="mb-4 pb-4 border-b border-blue-200">
                <p className="text-sm text-blue-600 mb-1">Student Found</p>
                <h3 className="text-lg font-bold text-blue-900">{studentData?.name}</h3>
                <p className="text-sm text-blue-700">{studentData?.uucms} • {studentData?.department}</p>
                <p className="text-xs text-blue-600 mt-1">Gender: {formatGender(studentData?.gender)}</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Select Event to Check-In</label>
                  <select
                    className="input-field"
                    value={selectedEventId}
                    onChange={e => setSelectedEventId(e.target.value)}
                  >
                    <option value="">-- Choose Event --</option>
                    {registeredEvents.map(ev => (
                      <option key={ev._id} value={ev._id}>
                        {ev.title} {ev.checkInStatus ? '✓ (Already checked in)' : '(Pending)'}
                      </option>
                    ))}
                  </select>
                  {registeredEvents.length === 0 && (
                    <p className="text-sm text-red-600 mt-2">No registrations found for this student</p>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={handleCheckIn}
                    disabled={loading || !selectedEventId}
                    className="btn-primary flex-1 py-2 rounded-lg font-semibold"
                  >
                    {loading ? 'Checking in...' : '✓ Check In'}
                  </button>
                  <button
                    onClick={handleStartOver}
                    disabled={loading}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 font-medium"
                  >
                    Start Over
                  </button>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Check-In Result */}
        {result && (
          <div className={`card ${result.type === 'team' ? 'bg-amber-50 border-amber-200' : 'bg-green-50 border-green-200'}`}>
            <div className="text-center">
              <div className="text-5xl mb-3">
                {result.player?.checkInStatus === false ? '⏳' : '✅'}
              </div>
              <h3 className="font-bold text-xl text-gray-900">{result.player?.name}</h3>
              <p className="text-sm text-gray-700 mt-2">{result.player?.uucms} • {result.player?.department}</p>
              <p className="text-xs text-gray-600 mt-1">Gender: {formatGender(result.player?.gender)}</p>
              <p className="mt-4 text-lg font-semibold text-green-600">✓ {result.message}</p>

              <button
                onClick={handleStartOver}
                className="w-full mt-4 px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 font-medium"
              >
                Check In Another Student
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
