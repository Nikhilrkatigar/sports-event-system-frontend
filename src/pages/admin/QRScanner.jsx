import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import jsQR from 'jsqr';
import API from '../../utils/api';

export default function QRScanner() {
  const [eventId, setEventId] = useState('');
  const [events, setEvents] = useState([]);
  const [manualInput, setManualInput] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [isCameraActive, setIsCameraActive] = useState(false);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const detectorRef = useRef(null);
  const frameRef = useRef(null);
  const lastScanRef = useRef({ value: '', at: 0 });
  const eventIdRef = useRef('');

  useEffect(() => {
    API.get('/events').then(r => setEvents(r.data));
    return () => stopCamera();
  }, []);

  useEffect(() => {
    eventIdRef.current = eventId;
  }, [eventId]);

  const supportsCameraScan = () => (
    navigator.mediaDevices &&
    typeof navigator.mediaDevices.getUserMedia === 'function'
  );

  const stopCamera = () => {
    if (frameRef.current) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  const handleScanPayload = async (qrData) => {
    const selectedEventId = eventIdRef.current || eventId;
    if (!selectedEventId) {
      toast.error('Select event first');
      return;
    }
    setLoading(true);
    try {
      const res = await API.post('/registrations/checkin/scan', { eventId: selectedEventId, qrData });
      setResult(res.data);
      toast.success(res.data.message);
      setManualInput('');
    } catch (err) {
      setResult(null);
      toast.error(err.response?.data?.message || 'Check-in failed');
    } finally {
      setLoading(false);
    }
  };

  const scanFrame = async () => {
    const video = videoRef.current;
    if (!video) {
      frameRef.current = requestAnimationFrame(scanFrame);
      return;
    }

    if (video.readyState >= 2) {
      try {
        let raw = '';

        if (detectorRef.current) {
          const barcodes = await detectorRef.current.detect(video);
          if (barcodes && barcodes.length > 0) {
            raw = String(barcodes[0].rawValue || '').trim();
          }
        }

        if (!raw) {
          const width = video.videoWidth;
          const height = video.videoHeight;
          if (width > 0 && height > 0) {
            if (!canvasRef.current) canvasRef.current = document.createElement('canvas');
            const canvas = canvasRef.current;
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            if (ctx) {
              ctx.drawImage(video, 0, 0, width, height);
              const imageData = ctx.getImageData(0, 0, width, height);
              const code = jsQR(imageData.data, width, height, { inversionAttempts: 'dontInvert' });
              raw = String(code?.data || '').trim();
            }
          }
        }

        const now = Date.now();
        if (raw && (raw !== lastScanRef.current.value || now - lastScanRef.current.at > 2500)) {
          lastScanRef.current = { value: raw, at: now };
          await handleScanPayload(raw);
        }
      } catch {
        // Ignore frame-level decoding errors and continue scanning.
      }
    }

    frameRef.current = requestAnimationFrame(scanFrame);
  };

  const startCamera = async () => {
    if (!supportsCameraScan()) {
      setCameraError('Camera access is not available in this browser. Please use a modern browser or manual input.');
      return;
    }

    try {
      setCameraError('');
      detectorRef.current = 'BarcodeDetector' in window
        ? new window.BarcodeDetector({ formats: ['qr_code'] })
        : null;
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setIsCameraActive(true);
      frameRef.current = requestAnimationFrame(scanFrame);
    } catch {
      setCameraError('Unable to access camera. Please allow camera permission and retry.');
      stopCamera();
    }
  };

  const handleManualCheckin = () => {
    if (!manualInput || !eventId) return toast.error('Enter code/UUCMS and select event');
    handleScanPayload(manualInput.trim());
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">QR Check-In Scanner</h1>

      <div className="max-w-2xl space-y-4">
        <div className="card">
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Event</label>
              <select className="input-field" value={eventId} onChange={e => { setEventId(e.target.value); eventIdRef.current = e.target.value; }}>
                <option value="">Select Event</option>
                {events.map(ev => <option key={ev._id} value={ev._id}>{ev.title}</option>)}
              </select>
            </div>

            <div className="flex gap-2">
              {!isCameraActive ? (
                <button onClick={startCamera} className="btn-primary" disabled={loading}>
                  Start Camera Scan
                </button>
              ) : (
                <button onClick={stopCamera} className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">
                  Stop Camera
                </button>
              )}
              <span className="text-xs text-gray-500 self-center">
                Team QR scans will check in the whole team.
              </span>
            </div>

            {cameraError && <p className="text-sm text-red-600">{cameraError}</p>}

            <div className="rounded-lg overflow-hidden border border-gray-200 bg-black">
              <video ref={videoRef} className="w-full h-64 object-cover" autoPlay muted playsInline />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Manual UUCMS / QR text</label>
              <input
                className="input-field text-lg font-mono"
                placeholder="U02CG23S0001 or QR payload"
                value={manualInput}
                onChange={e => setManualInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleManualCheckin()}
              />
              <p className="text-xs text-gray-400 mt-1">If camera is unavailable, paste scanned text here and press Enter.</p>
            </div>

            <button onClick={handleManualCheckin} disabled={loading} className="btn-primary w-full py-3 rounded-xl font-semibold">
              {loading ? 'Checking in...' : 'Check In'}
            </button>
          </div>
        </div>

        {result && (
          <div className={`card ${result.type === 'team' ? 'bg-blue-50 border-blue-200' : 'bg-green-50 border-green-200'}`}>
            <div className="text-center">
              <h3 className="font-bold text-lg">
                {result.type === 'team'
                  ? (result.teamName || result.teamId || 'Team Checked In')
                  : result.player?.name}
              </h3>
              {result.type === 'team' ? (
                <p className="text-sm text-blue-800 mt-1">
                  {result.players?.filter(p => p.checkInStatus).length || 0} players checked in
                </p>
              ) : (
                <p className="text-sm text-green-700 mt-1">
                  {result.player?.uucms} {result.player?.department ? `• ${result.player.department}` : ''}
                </p>
              )}
              <p className="mt-2 font-medium">{result.message}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
