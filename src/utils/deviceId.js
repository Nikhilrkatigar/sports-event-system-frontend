// Generate a unique device identifier for anonymous users
export const getDeviceId = () => {
  const storageKey = 'sports_event_device_id';
  let deviceId = localStorage.getItem(storageKey);
  
  if (!deviceId) {
    deviceId = `device_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    localStorage.setItem(storageKey, deviceId);
  }
  
  return deviceId;
};
