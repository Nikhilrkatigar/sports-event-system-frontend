const resolveSocketUrl = () => {
  const apiUrl = (process.env.REACT_APP_API_URL || '').trim();

  if (apiUrl && /^https?:\/\//i.test(apiUrl)) {
    return new URL(apiUrl).origin;
  }

  if (process.env.REACT_APP_SOCKET_URL) {
    return process.env.REACT_APP_SOCKET_URL.trim();
  }

  if (process.env.NODE_ENV === 'production') {
    return 'https://sports-event-system-backend.onrender.com';
  }

  return 'http://localhost:5003';
};

export default resolveSocketUrl;
