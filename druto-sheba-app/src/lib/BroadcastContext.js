'use client';
import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useUser } from './UserContext';
import mqttService from './mqttService';

const BroadcastContext = createContext();

export function BroadcastProvider({ children }) {
  const { activeDriver } = useUser();
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [gpsError, setGpsError] = useState(null);
  const [speed, setSpeed] = useState(0);
  const [accuracy, setAccuracy] = useState(0);
  const [uptime, setUptime] = useState('00:00');
  const [realtimeMarker, setRealtimeMarker] = useState(null);

  const watchId = useRef(null);
  const tripStartTime = useRef(null);
  const lastSentTime = useRef(0);
  const activeDriverRef = useRef(activeDriver);

  // Keep track of activeDriver in ref for async callbacks
  useEffect(() => {
    activeDriverRef.current = activeDriver;
  }, [activeDriver]);

  // Clean up broadcasting on driver switch
  useEffect(() => {
    stopBroadcasting();
    if (activeDriver?.id) {
      mqttService.connect(`driver-${activeDriver.id}`);
    }
    return () => {
      stopBroadcasting();
      mqttService.disconnect();
    };
  }, [activeDriver?.id]);

  // Uptime counter
  useEffect(() => {
    if (!isBroadcasting) return;
    const interval = setInterval(() => {
      if (!tripStartTime.current) return;
      const diff = Math.floor((Date.now() - tripStartTime.current) / 1000);
      const m = Math.floor(diff / 60).toString().padStart(2, '0');
      const s = (diff % 60).toString().padStart(2, '0');
      setUptime(`${m}:${s}`);
    }, 1000);
    return () => clearInterval(interval);
  }, [isBroadcasting]);

  const startBroadcasting = useCallback(() => {
    if (!navigator.geolocation || !activeDriverRef.current?.id) {
      if (!navigator.geolocation) setGpsError('Geolocation is not supported by your browser.');
      return;
    }

    if (watchId.current) {
      navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
    }

    setGpsError(null);
    setIsBroadcasting(true);
    tripStartTime.current = Date.now();

    const onGeoSuccess = (pos) => {
      const { latitude, longitude, speed: rawSpeed, accuracy: acc } = pos.coords;
      const currentSpeed = (rawSpeed || 0) * 3.6; // m/s to km/h
      
      setSpeed(currentSpeed);
      setAccuracy(acc);
      setGpsError(null);
      setRealtimeMarker({ lat: latitude, lng: longitude, speed: currentSpeed.toFixed(1), acc });

      const now = Date.now();
      if (now - lastSentTime.current > 500) {
        mqttService.publish({
          id: `ambulance-${activeDriverRef.current.id}`,
          driver_name: activeDriverRef.current.name,
          lat: latitude,
          lng: longitude,
          speed: currentSpeed.toFixed(1),
          acc: acc,
          status: 'active'
        });
        lastSentTime.current = now;
      }

      if (!window.lastDbUpdate || now - window.lastDbUpdate > 1500) {
        window.lastDbUpdate = now;
        fetch('/api/driver/location', {
          method: 'POST',
          body: JSON.stringify({ driver_id: activeDriverRef.current.id, lat: latitude, lng: longitude })
        }).catch(err => console.error('DB Location Sync Error:', err));
      }
    };

    const onGeoError = (err) => {
      console.warn('GPS Geolocation Error:', err);
      if (err.code === 1) {
        setGpsError('Permission Denied: Please allow location access in browser/Windows settings.');
      } else if (err.code === 2) {
        setGpsError('Position Unavailable: Hardware GPS or network location cannot be found.');
      } else if (err.code === 3) {
        setGpsError('Location Timeout: Searching for active GPS satellite/network lock...');
      } else {
        setGpsError('Location Error: ' + err.message);
      }
    };

    const geoOptions = { 
      enableHighAccuracy: true, 
      maximumAge: 0, 
      timeout: 20000 
    };

    // 1. Initial immediate location query to fire Windows Location service icon immediately
    navigator.geolocation.getCurrentPosition(onGeoSuccess, onGeoError, geoOptions);

    // 2. Continuous real-time location stream to keep Windows Location service active in taskbar
    watchId.current = navigator.geolocation.watchPosition(onGeoSuccess, onGeoError, geoOptions);
  }, []);

  const stopBroadcasting = useCallback(() => {
    setIsBroadcasting(false);
    setGpsError(null);
    if (watchId.current) {
      navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
    }
    if (activeDriverRef.current?.id) {
      mqttService.publishOffline(`ambulance-${activeDriverRef.current.id}`);
    }
    setRealtimeMarker(null);
    setSpeed(0);
    setAccuracy(0);
    setUptime('00:00');
  }, []);

  return (
    <BroadcastContext.Provider value={{
      isBroadcasting,
      gpsError,
      speed,
      accuracy,
      uptime,
      realtimeMarker,
      startBroadcasting,
      stopBroadcasting
    }}>
      {children}
    </BroadcastContext.Provider>
  );
}

export function useBroadcast() {
  return useContext(BroadcastContext);
}
