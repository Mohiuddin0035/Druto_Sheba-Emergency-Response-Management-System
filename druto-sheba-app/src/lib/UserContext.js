'use client';
import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const UserContext = createContext();

export function UserProvider({ children }) {
  const [availableDrivers, setAvailableDrivers] = useState([]);
  const [availablePatients, setAvailablePatients] = useState([]);
  const [activeDriver, setActiveDriver] = useState(null);
  const [activePatient, setActivePatient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dbConnected, setDbConnected] = useState(false);
  const [dbError, setDbError] = useState(null);

  const loadData = useCallback(async () => {
    try {
      const [patRes, drvRes] = await Promise.all([
        fetch('/api/patients'),
        fetch('/api/drivers')
      ]);

      if (!patRes.ok) {
        const errJson = await patRes.json().catch(() => ({}));
        throw new Error(errJson.error || `HTTP ${patRes.status}`);
      }

      const dbPatients = await patRes.json();
      const dbDrivers = drvRes.ok ? await drvRes.json().catch(() => []) : [];

      // Process Drivers
      if (Array.isArray(dbDrivers) && dbDrivers.length > 0) {
        const formattedDrivers = dbDrivers.map(d => ({
          id: d.driver_id,
          name: d.name,
          license: d.license_no,
          status: d.shift_status,
          role: d.shift_status === 'On_Duty' ? 'Active Emergency Driver' : 'On-Call Driver'
        }));
        setAvailableDrivers(formattedDrivers);

        // Check permanent authentication session for driver from HTTP-only cookie
        try {
          const drvAuthCheck = await fetch('/api/auth/driver/me', { cache: 'no-store' });
          if (drvAuthCheck.ok) {
            const drvAuthData = await drvAuthCheck.json();
            if (drvAuthData.authenticated && drvAuthData.driver) {
              const matchingDrv = formattedDrivers.find(x => String(x.id) === String(drvAuthData.driver.id));
              const finalDrv = {
                ...(matchingDrv || {}),
                ...drvAuthData.driver,
                id: drvAuthData.driver.id,
                verification_status: drvAuthData.driver.verification_status || (matchingDrv?.verification_status) || 'Pending',
                nid_number: drvAuthData.driver.nid_number || null,
                own_ambulance_plate: drvAuthData.driver.own_ambulance_plate || null
              };
              setActiveDriver(finalDrv);
              localStorage.setItem('emergency_active_driver', String(finalDrv.id));
            } else {
              localStorage.removeItem('emergency_active_driver');
              setActiveDriver(null);
            }
          } else {
            localStorage.removeItem('emergency_active_driver');
            setActiveDriver(null);
          }
        } catch (drvErr) {
          console.warn('Driver auth check warning:', drvErr);
        }
      } else {
        setAvailableDrivers([]);
        setActiveDriver(null);
      }

      // Process Patients
      if (Array.isArray(dbPatients) && dbPatients.length > 0) {
        const formattedPatients = dbPatients.map(p => ({
          ...p,
          id: p.patient_id || p.id
        }));
        setAvailablePatients(formattedPatients);
        setDbConnected(true);
        setDbError(null);

        // Check permanent authentication session from HTTP-only cookie
        try {
          const authCheck = await fetch('/api/auth/patient/me', { cache: 'no-store' });
          if (authCheck.ok) {
            const authData = await authCheck.json();
            if (authData.authenticated && authData.patient) {
              const matchingPat = formattedPatients.find(x => String(x.id) === String(authData.patient.id));
              const finalPat = matchingPat || { ...authData.patient, id: authData.patient.id };
              setActivePatient(finalPat);
              localStorage.setItem('emergency_active_patient', String(finalPat.id));
              return;
            } else {
              // User has signed out or session invalid: Do NOT auto-login to any patient
              localStorage.removeItem('emergency_active_patient');
              setActivePatient(null);
              if (authData.revoked) {
                window.alert(authData.message || 'You were logged out because this account was accessed from another browser.');
              }
              return;
            }
          }
        } catch (authErr) {
          console.warn('Patient auth check warning:', authErr);
        }

        setActivePatient(null);
      } else {
        setAvailablePatients([]);
        setActivePatient(null);
        setDbConnected(true);
      }
    } catch (err) {
      console.error('Database connection error in UserContext:', err.message);
      setDbConnected(false);
      setDbError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const patientLogout = async () => {
    try {
      await fetch('/api/auth/patient/logout', { method: 'POST' });
    } catch (e) {}
    localStorage.removeItem('emergency_active_patient');
    setActivePatient(null);
    window.location.replace('/login?portal=patient');
  };

  const driverLogout = async () => {
    try {
      await fetch('/api/auth/driver/logout', { method: 'POST' });
    } catch (e) {}
    localStorage.removeItem('emergency_active_driver');
    setActiveDriver(null);
    window.location.replace('/login?portal=driver');
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, [loadData]);

  const setDriver = (driverId) => {
    const d = availableDrivers.find(x => String(x.id) === String(driverId));
    if (d) {
      setActiveDriver(d);
      localStorage.setItem('emergency_active_driver', d.id.toString());
    }
  };

  const setPatient = (patientId) => {
    const p = availablePatients.find(x => String(x.id) === String(patientId));
    if (p) {
      setActivePatient(p);
      localStorage.setItem('emergency_active_patient', p.id.toString());
    }
  };

  const addPatient = async (patientData) => {
    const res = await fetch('/api/patients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patientData),
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || 'Failed to register patient');
    }
    const newPatient = await res.json();
    await loadData();
    const newId = newPatient.patient_id || newPatient.id;
    if (newId) {
      localStorage.setItem('emergency_active_patient', String(newId));
      setActivePatient({ ...newPatient, id: newId });
    }
    return newPatient;
  };

  const addDriver = async (driverData) => {
    const res = await fetch('/api/drivers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(driverData),
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || 'Failed to register driver');
    }
    const newDriver = await res.json();
    await loadData();
    const newId = newDriver.driver_id || newDriver.id;
    if (newId) {
      localStorage.setItem('emergency_active_driver', String(newId));
      setActiveDriver({
        ...newDriver,
        id: newId,
        name: newDriver.name,
        license: newDriver.license_no,
        status: newDriver.shift_status || 'Off_Duty',
        role: 'On-Call Driver'
      });
    }
    return newDriver;
  };

  return (
    <UserContext.Provider value={{ 
      activeDriver, setDriver, availableDrivers, 
      activePatient, setPatient, availablePatients, 
      loading,
      dbConnected,
      dbError,
      refreshUserContext: loadData,
      addPatient,
      addDriver,
      patientLogout,
      driverLogout,
    }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  return useContext(UserContext);
}
