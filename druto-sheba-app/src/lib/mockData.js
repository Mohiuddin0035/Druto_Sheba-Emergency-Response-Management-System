const now = '2026-05-03T10:00:00.000Z';

export const specializations = [
  { spec_id: 1, spec_name: 'Cardiology', name: 'Cardiology' },
  { spec_id: 2, spec_name: 'Neurology', name: 'Neurology' },
  { spec_id: 3, spec_name: 'Orthopedics', name: 'Orthopedics' },
  { spec_id: 4, spec_name: 'Trauma Surgery', name: 'Trauma Surgery' },
  { spec_id: 5, spec_name: 'Burn Unit', name: 'Burn Unit' },
  { spec_id: 6, spec_name: 'Pediatrics', name: 'Pediatrics' },
];

export const hospitals = [
  // Government
  { hospital_id: 1, id: 1, name: 'Dhaka Medical College', lat: 23.72564, lon: 90.3973998, lng: 90.3973998, general_beds: 500, icu_beds: 50, type: 'Government', specializations: ['Trauma Surgery', 'Burn Unit', 'Cardiology'] },
  { hospital_id: 2, id: 2, name: 'Dhaka Shishu (Children) Hospital', lat: 23.7729305, lon: 90.3693358, lng: 90.3693358, general_beds: 400, icu_beds: 30, type: 'Government', specializations: ['Pediatrics'] },
  { hospital_id: 3, id: 3, name: 'Infectious Diseases Hospital (IDH)', lat: 23.7761064, lon: 90.4058473, lng: 90.4058473, general_beds: 200, icu_beds: 10, type: 'Government', specializations: ['Infectious Diseases'] },
  { hospital_id: 4, id: 4, name: 'Kurmitola General Hospital', lat: 23.8191987, lon: 90.4093822, lng: 90.4093822, general_beds: 500, icu_beds: 30, type: 'Government', specializations: ['Trauma Surgery', 'Orthopedics'] },
  { hospital_id: 5, id: 5, name: 'Mugda Medical College and Hospital', lat: 23.731981, lon: 90.4301631, lng: 90.4301631, general_beds: 500, icu_beds: 50, type: 'Government', specializations: ['General'] },
  { hospital_id: 6, id: 6, name: 'Kuwait Bangladesh Friendship Hospital', lat: 23.8706354, lon: 90.4036312, lng: 90.4036312, general_beds: 200, icu_beds: 30, type: 'Government', specializations: ['General'] },
  { hospital_id: 7, id: 7, name: 'National Institute of Cancer', lat: 23.7782321, lon: 90.4094593, lng: 90.4094593, general_beds: 300, icu_beds: 20, type: 'Government', specializations: ['Oncology'] },
  { hospital_id: 8, id: 8, name: 'National Institute of Kidney Diseases (NIKDU)', lat: 23.7716087, lon: 90.368676, lng: 90.368676, general_beds: 300, icu_beds: 40, type: 'Government', specializations: ['Nephrology'] },
  { hospital_id: 9, id: 9, name: 'National Institute of Neurosciences (NINS)', lat: 23.7761345, lon: 90.3707896, lng: 90.3707896, general_beds: 450, icu_beds: 100, type: 'Government', specializations: ['Neurology'] },
  { hospital_id: 10, id: 10, name: 'National Institute of Ophthalmology', lat: 23.7742998, lon: 90.3696606, lng: 90.3696606, general_beds: 250, icu_beds: 15, type: 'Government', specializations: ['Ophthalmology'] },
  { hospital_id: 11, id: 11, name: 'NICVD (Heart Institute)', lat: 23.7704768, lon: 90.3696999, lng: 90.3696999, general_beds: 450, icu_beds: 60, type: 'Government', specializations: ['Cardiology'] },
  { hospital_id: 12, id: 12, name: 'NITOR (Orthopaedic Hospital)', lat: 23.7736036, lon: 90.3703256, lng: 90.3703256, general_beds: 1000, icu_beds: 60, type: 'Government', specializations: ['Orthopedics'] },
  { hospital_id: 13, id: 13, name: 'Shaheed Suhrawardy Hospital', lat: 23.7692378, lon: 90.371375, lng: 90.371375, general_beds: 800, icu_beds: 40, type: 'Government', specializations: ['General'] },
  { hospital_id: 14, id: 14, name: 'Sir Salimullah Medical College (Mitford)', lat: 23.7111967, lon: 90.4012507, lng: 90.4012507, general_beds: 900, icu_beds: 50, type: 'Government', specializations: ['General'] },
  { hospital_id: 15, id: 15, name: 'BSMMU (PG Hospital)', lat: 23.738572, lon: 90.39329, lng: 90.39329, general_beds: 1500, icu_beds: 150, type: 'Government', specializations: ['Cardiology', 'Neurology', 'Pediatrics'] },
  { hospital_id: 16, id: 16, name: 'BIRDEM General Hospital', lat: 23.7389228, lon: 90.3938372, lng: 90.3938372, general_beds: 700, icu_beds: 80, type: 'Government', specializations: ['General'] },

  // Private
  { hospital_id: 17, id: 17, name: 'AMZ Hospital Badda', lat: 23.7842676, lon: 90.4260183, lng: 90.4260183, general_beds: 150, icu_beds: 20, type: 'Private', specializations: ['General'] },
  { hospital_id: 18, id: 18, name: 'Anwar Khan Modern Hospital', lat: 23.7451679, lon: 90.3822133, lng: 90.3822133, general_beds: 400, icu_beds: 50, type: 'Private', specializations: ['General'] },
  { hospital_id: 19, id: 19, name: 'Bangladesh Specialized Hospital', lat: 23.7763525, lon: 90.3630434, lng: 90.3630434, general_beds: 350, icu_beds: 60, type: 'Private', specializations: ['General'] },
  { hospital_id: 20, id: 20, name: 'BRB Hospital Panthapath', lat: 23.7522514, lon: 90.3855489, lng: 90.3855489, general_beds: 400, icu_beds: 45, type: 'Private', specializations: ['General'] },
  { hospital_id: 21, id: 21, name: 'Central Hospital Ltd', lat: 23.7433793, lon: 90.3841359, lng: 90.3841359, general_beds: 200, icu_beds: 30, type: 'Private', specializations: ['General'] },
  { hospital_id: 22, id: 22, name: 'Comfort Hospital', lat: 23.7491851, lon: 90.3862398, lng: 90.3862398, general_beds: 100, icu_beds: 15, type: 'Private', specializations: ['General'] },
  { hospital_id: 23, id: 23, name: 'Evercare Hospital Bashundhara', lat: 23.8102668, lon: 90.4313219, lng: 90.4313219, general_beds: 300, icu_beds: 25, type: 'Private', specializations: ['Pediatrics', 'Orthopedics'] },
  { hospital_id: 24, id: 24, name: 'Green Life Hospital', lat: 23.7466132, lon: 90.3857066, lng: 90.3857066, general_beds: 300, icu_beds: 45, type: 'Private', specializations: ['General'] },
  { hospital_id: 25, id: 25, name: 'Ibne Sina Kalyanpur', lat: 23.7783273, lon: 90.3618028, lng: 90.3618028, general_beds: 250, icu_beds: 30, type: 'Private', specializations: ['Neurology', 'Trauma Surgery'] },
  { hospital_id: 26, id: 26, name: 'Impulse Hospital', lat: 23.7678558, lon: 90.3990674, lng: 90.3990674, general_beds: 250, icu_beds: 35, type: 'Private', specializations: ['General'] },
  { hospital_id: 27, id: 27, name: 'Japan East West Medical College', lat: 23.8941445, lon: 90.3769537, lng: 90.3769537, general_beds: 300, icu_beds: 40, type: 'Private', specializations: ['General'] },
  { hospital_id: 28, id: 28, name: 'LabAid Dhanmondi', lat: 23.7417264, lon: 90.3836682, lng: 90.3836682, general_beds: 300, icu_beds: 50, type: 'Private', specializations: ['General'] },
  { hospital_id: 29, id: 29, name: 'Popular Diagnostic Centre', lat: 23.7411436, lon: 90.4123524, lng: 90.4123524, general_beds: 100, icu_beds: 10, type: 'Private', specializations: ['General'] },
  { hospital_id: 30, id: 30, name: 'Square Hospital Panthapath', lat: 23.7528438, lon: 90.3815598, lng: 90.3815598, general_beds: 250, icu_beds: 15, type: 'Private', specializations: ['Cardiology', 'Neurology'] },
  { hospital_id: 31, id: 31, name: 'United Hospital Gulshan', lat: 23.8050557, lon: 90.4154048, lng: 90.4154048, general_beds: 500, icu_beds: 80, type: 'Private', specializations: ['Cardiology', 'Pediatrics'] },
  { hospital_id: 32, id: 32, name: 'Universal Medical College Hospital', lat: 23.7761687, lon: 90.3956724, lng: 90.3956724, general_beds: 200, icu_beds: 25, type: 'Private', specializations: ['General'] },
  { hospital_id: 33, id: 33, name: 'Asgar Ali Hospital', lat: 23.7075876, lon: 90.4230341, lng: 90.4230341, general_beds: 250, icu_beds: 40, type: 'Private', specializations: ['General'] },
];

export const patients = [
  { patient_id: 1, id: 1, name: 'Abdur Rahman', phone: '01711000000', blood_type: 'O+', allergies: 'Penicillin', conditions: ['Type 2 Diabetes', 'Hypertension'] },
  { patient_id: 2, id: 2, name: 'Nusrat Jahan', phone: '01822000000', blood_type: 'A-', allergies: 'Dust, shellfish', conditions: ['Asthma'] },
  { patient_id: 3, id: 3, name: 'Rafiq Islam', phone: '01912000000', blood_type: 'B+', allergies: 'None reported', conditions: ['Epilepsy'] },
  { patient_id: 4, id: 4, name: 'Tanjina Akter', phone: '01633000000', blood_type: 'AB+', allergies: 'Latex', conditions: ['Pregnancy'] },
];

export const drivers = [
  { driver_id: 1, id: 1, name: 'Rahim Uddin', license_no: 'BD-DL-99384', license: 'BD-DL-99384', shift_status: 'On_Duty', status: 'On_Duty' },
  { driver_id: 2, id: 2, name: 'Karim Mia', license_no: 'BD-DL-22839', license: 'BD-DL-22839', shift_status: 'On_Duty', status: 'On_Duty' },
  { driver_id: 3, id: 3, name: 'Zahirul Islam', license_no: 'BD-DL-44556', license: 'BD-DL-44556', shift_status: 'Off_Duty', status: 'Off_Duty' },
  { driver_id: 4, id: 4, name: 'Mim Chowdhury', license_no: 'BD-DL-77120', license: 'BD-DL-77120', shift_status: 'Available', status: 'Available' },
  { driver_id: 5, id: 5, name: 'Sabbir Ahmed', license_no: 'BD-DL-55221', license: 'BD-DL-55221', shift_status: 'On_Duty', status: 'On_Duty' },
  { driver_id: 6, id: 6, name: 'Farhan Kabir', license_no: 'BD-DL-66332', license: 'BD-DL-66332', shift_status: 'On_Duty', status: 'On_Duty' },
  { driver_id: 7, id: 7, name: 'Nabila Islam', license_no: 'BD-DL-88443', license: 'BD-DL-88443', shift_status: 'Off_Duty', status: 'Off_Duty' },
  { driver_id: 8, id: 8, name: 'Tanvir Hasan', license_no: 'BD-DL-11990', license: 'BD-DL-11990', shift_status: 'Available', status: 'Available' },
  { driver_id: 9, id: 9, name: 'Lutfur Rahman', license_no: 'BD-DL-44229', license: 'BD-DL-44229', shift_status: 'On_Duty', status: 'On_Duty' },
  { driver_id: 10, id: 10, name: 'Jasim Uddin', license_no: 'BD-DL-11223', license: 'BD-DL-11223', shift_status: 'On_Duty', status: 'On_Duty' },
  { driver_id: 11, id: 11, name: 'Sumon Ahmed', license_no: 'BD-DL-33445', license: 'BD-DL-33445', shift_status: 'Available', status: 'Available' },
  { driver_id: 12, id: 12, name: 'Rokeya Begum', license_no: 'BD-DL-55667', license: 'BD-DL-55667', shift_status: 'On_Duty', status: 'On_Duty' },
  { driver_id: 13, id: 13, name: 'Abid Hasan', license_no: 'BD-DL-77889', license: 'BD-DL-77889', shift_status: 'On_Duty', status: 'On_Duty' },
  { driver_id: 14, id: 14, name: 'Momena Akter', license_no: 'BD-DL-99001', license: 'BD-DL-99001', shift_status: 'Available', status: 'Available' },
  { driver_id: 15, id: 15, name: 'Sharif Khan', license_no: 'BD-DL-11220', license: 'BD-DL-11220', shift_status: 'On_Duty', status: 'On_Duty' },
  { driver_id: 16, id: 16, name: 'Shohel Rana', license_no: 'BD-DL-22334', license: 'BD-DL-22334', shift_status: 'On_Duty', status: 'On_Duty' },
  { driver_id: 17, id: 17, name: 'Anika Tabassum', license_no: 'BD-DL-44557', license: 'BD-DL-44557', shift_status: 'On_Duty', status: 'On_Duty' },
  { driver_id: 18, id: 18, name: 'Mustafizur Rahman', license_no: 'BD-DL-66778', license: 'BD-DL-66778', shift_status: 'On_Duty', status: 'On_Duty' },
  { driver_id: 19, id: 19, name: 'Salma Khatun', license_no: 'BD-DL-88990', license: 'BD-DL-88990', shift_status: 'On_Duty', status: 'On_Duty' },
  { driver_id: 20, id: 20, name: 'Imran Hossain', license_no: 'BD-DL-00112', license: 'BD-DL-00112', shift_status: 'On_Duty', status: 'On_Duty' },
];

export const ambulances = [
  { vehicle_id: 1, id: 1, license_plate: 'DHK-METRO-AMB-101', equipment_level: 'Advanced Life Support', current_status: 'Dispatched', hub: 'Gulshan', next_service_date: '2026-06-18', lat: 23.7928, lon: 90.4142 },
  { vehicle_id: 2, id: 2, license_plate: 'DHK-METRO-AMB-204', equipment_level: 'Basic Life Support', current_status: 'Available', hub: 'Dhanmondi', next_service_date: '2026-06-24', lat: 23.7462, lon: 90.3763 },
  { vehicle_id: 3, id: 3, license_plate: 'DHK-METRO-AMB-305', equipment_level: 'ICU Support', current_status: 'Available', hub: 'Bashundhara', next_service_date: '2026-07-03', lat: 23.8121, lon: 90.4251 },
  { vehicle_id: 4, id: 4, license_plate: 'DHK-METRO-AMB-412', equipment_level: 'Basic Life Support', current_status: 'Available', hub: 'Mirpur', next_service_date: '2026-06-29', lat: 23.8067, lon: 90.3689 },
  { vehicle_id: 5, id: 5, license_plate: 'DHK-METRO-AMB-500', equipment_level: 'Advanced Life Support', current_status: 'Available', hub: 'Uttara', next_service_date: '2026-07-10', lat: 23.8738, lon: 90.4006 },
  { vehicle_id: 6, id: 6, license_plate: 'DHK-METRO-AMB-618', equipment_level: 'ICU Support', current_status: 'Available' },
  { vehicle_id: 7, id: 7, license_plate: 'DHK-METRO-AMB-722', equipment_level: 'Basic Life Support', current_status: 'Available' },
  { vehicle_id: 8, id: 8, license_plate: 'DHK-METRO-AMB-834', equipment_level: 'Advanced Life Support', current_status: 'Available' },
  { vehicle_id: 9, id: 9, license_plate: 'DHK-METRO-AMB-945', equipment_level: 'Basic Life Support', current_status: 'Available' },
  { vehicle_id: 10, id: 10, license_plate: 'DHK-METRO-AMB-010', equipment_level: 'ICU Support', current_status: 'Available' },
  { vehicle_id: 11, id: 11, license_plate: 'DHK-METRO-AMB-111', equipment_level: 'Advanced Life Support', current_status: 'Available' },
  { vehicle_id: 12, id: 12, license_plate: 'DHK-METRO-AMB-222', equipment_level: 'Basic Life Support', current_status: 'Available' },
  { vehicle_id: 13, id: 13, license_plate: 'DHK-METRO-AMB-333', equipment_level: 'ICU Support', current_status: 'Available' },
  { vehicle_id: 14, id: 14, license_plate: 'DHK-METRO-AMB-444', equipment_level: 'Basic Life Support', current_status: 'Available' },
  { vehicle_id: 15, id: 15, license_plate: 'DHK-METRO-AMB-555', equipment_level: 'Advanced Life Support', current_status: 'Available' },
  { vehicle_id: 16, id: 16, license_plate: 'DHK-METRO-AMB-666', equipment_level: 'ICU Support', current_status: 'Available' },
  { vehicle_id: 17, id: 17, license_plate: 'DHK-METRO-AMB-777', equipment_level: 'Advanced Life Support', current_status: 'Available' },
  { vehicle_id: 18, id: 18, license_plate: 'DHK-METRO-AMB-888', equipment_level: 'Basic Life Support', current_status: 'Available' },
  { vehicle_id: 19, id: 19, license_plate: 'DHK-METRO-AMB-999', equipment_level: 'ICU Support', current_status: 'Available' },
  { vehicle_id: 20, id: 20, license_plate: 'DHK-METRO-AMB-000', equipment_level: 'Advanced Life Support', current_status: 'Available' },
];

export const emergencyRequests = [
  { request_id: 1, id: 1, patient_id: 1, patient_lat: 23.7925, patient_lon: 90.4125, lat: 23.7925, lon: 90.4125, lng: 90.4125, severity_level: 'Critical', severity: 'Critical', emergency_type: 'Cardiac', requested_for: 'Self', status: 'En Route', timestamp_created: now },
  { request_id: 2, id: 2, patient_id: 2, patient_lat: 23.7500, patient_lon: 90.3800, lat: 23.7500, lon: 90.3800, lng: 90.3800, severity_level: 'High', severity: 'High', emergency_type: 'Accident', requested_for: 'Brother', status: 'Pending', timestamp_created: '2026-05-03T10:15:00.000Z' },
  { request_id: 3, id: 3, patient_id: 3, patient_lat: 23.7431, patient_lon: 90.3822, lat: 23.7431, lon: 90.3822, lng: 90.3822, severity_level: 'Medium', severity: 'Medium', emergency_type: 'General', requested_for: 'Self', status: 'Resolved', timestamp_created: '2026-05-02T17:30:00.000Z' },
  { request_id: 4, id: 4, patient_id: 4, patient_lat: 23.8100, patient_lon: 90.4210, lat: 23.8100, lon: 90.4210, lng: 90.4210, severity_level: 'Critical', severity: 'Critical', emergency_type: 'Maternity', requested_for: 'Self', status: 'Resolved', timestamp_created: '2026-05-01T08:45:00.000Z' },
];

export const tripLogs = [
  { trip_id: 1001, request_id: 1, vehicle_id: 1, driver_id: 1, hospital_id: 6, time_dispatched: '2026-05-03T10:04:00.000Z', time_completed: null },
  { trip_id: 1002, request_id: 3, vehicle_id: 2, driver_id: 1, hospital_id: 2, time_dispatched: '2026-05-02T17:36:00.000Z', time_completed: '2026-05-02T18:18:00.000Z' },
  { trip_id: 1003, request_id: 4, vehicle_id: 3, driver_id: 2, hospital_id: 3, time_dispatched: '2026-05-01T08:50:00.000Z', time_completed: '2026-05-01T09:28:00.000Z' },
];

export const maintenanceLogs = [
  { log_id: 1, vehicle_id: 4, maintenance_type: 'Brake Inspection', description: 'Brake pressure warning from driver report', cost: 0, date_started: '2026-05-02', date_completed: null, technician_name: 'Hasan Motors' },
  { log_id: 2, vehicle_id: 2, maintenance_type: 'Oxygen System Refill', description: 'Cylinder refill and regulator check', cost: 4200, date_started: '2026-04-21', date_completed: '2026-04-22', technician_name: 'MediServ Dhaka' },
  { log_id: 3, vehicle_id: 1, maintenance_type: 'Tire Replacement', description: 'Rear tires replaced after 20k km', cost: 18500, date_started: '2026-04-10', date_completed: '2026-04-11', technician_name: 'Nitol Service' },
];

export const billing = [
  { bill_id: 1, trip_id: 1002, patient_id: 3, amount: 1450, tax: 72.5, total_amount: 1522.5, payment_status: 'Paid', date_issued: '2026-05-02' },
  { bill_id: 2, trip_id: 1003, patient_id: 4, amount: 1800, tax: 90, total_amount: 1890, payment_status: 'Pending', date_issued: '2026-05-01' },
];

export const vehicleInventory = [
  { inventory_id: 1, vehicle_id: 1, item_name: 'Oxygen Tank', quantity: 1, expiry_date: null },
  { inventory_id: 2, vehicle_id: 1, item_name: 'Trauma Kit', quantity: 2, expiry_date: '2026-12-01' },
  { inventory_id: 3, vehicle_id: 2, item_name: 'First Aid Kit', quantity: 5, expiry_date: '2027-01-01' },
  { inventory_id: 4, vehicle_id: 3, item_name: 'Defibrillator Pads', quantity: 2, expiry_date: '2027-05-01' },
];

export const shiftSchedules = [
  { driver_id: 1, shift_date: '2026-05-03', date: '2026-05-03', start_time: '08:00:00', end_time: '16:00:00' },
  { driver_id: 1, shift_date: '2026-05-04', date: '2026-05-04', start_time: '08:00:00', end_time: '16:00:00' },
  { driver_id: 2, shift_date: '2026-05-03', date: '2026-05-03', start_time: '16:00:00', end_time: '23:59:00' },
  { driver_id: 3, shift_date: '2026-05-04', date: '2026-05-04', start_time: '00:00:00', end_time: '08:00:00' },
];

export const dispatchZones = [
  { zone_name: 'Gulshan-Banani', count: 2 },
  { zone_name: 'Dhanmondi-Panthapath', count: 1 },
  { zone_name: 'Bashundhara', count: 1 },
];

export const tripFeedback = [
  { feedback_id: 1, trip_id: 1002, rating: 5, comments: 'Great driver, arrived fast!' }
];

export const staffUsers = [
  // Hashed password is 'password123'
  { user_id: 1, username: 'admin', password_hash: '$2b$10$auoWRTr.mNN9VZw8ZzcgoekJnIOikmzEvgjyfpBLgYilURYwS6L2C', role: 'Admin', created_at: now },
  { user_id: 2, username: 'dispatcher', password_hash: '$2b$10$auoWRTr.mNN9VZw8ZzcgoekJnIOikmzEvgjyfpBLgYilURYwS6L2C', role: 'Dispatcher', created_at: now }
];

export const pricingConfig = {
  base_fare: 500,
  per_km_charge: 25,
  night_multiplier: 1.35,
  critical_surcharge: 500,
};

export const auditLogs = [
  { audit_id: 1, table_name: 'Emergency_Requests', operation: 'UPDATE', record_id: 1, changed_by: 'dispatcher', changed_at: now, summary: 'Auto-dispatch assigned DHK-METRO-AMB-101' },
  { audit_id: 2, table_name: 'Ambulances', operation: 'UPDATE', record_id: 1, changed_by: 'system', changed_at: now, summary: 'Vehicle moved to Dispatched' },
];

export const mockData = {
  ambulances,
  billing,
  dispatchZones,
  drivers,
  emergencyRequests,
  hospitals,
  maintenanceLogs,
  patients,
  shiftSchedules,
  specializations,
  tripLogs,
  vehicleInventory,
  chatMessages: [],
  tripFeedback,
  staffUsers,
  pricingConfig,
  auditLogs,
};

export default mockData;
