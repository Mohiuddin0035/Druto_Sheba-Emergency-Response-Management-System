-- milestone3_seed_data.sql
-- Seed data for dispatchers

-- Insert 15 pre-approved dummy dispatchers
INSERT INTO dispatchers (username, password, name, email, phone, nid_number, level, verification_status) VALUES 
('disp_sakib', 'password123', 'Sakib Al Hasan', 'sakib@drutosheba.com', '+8801711000001', '19877519283719', 'Senior', 'Approved'),
('disp_tamim', 'password123', 'Tamim Iqbal', 'tamim@drutosheba.com', '+8801711000002', '19897519283720', 'Junior', 'Approved'),
('disp_mushfiq', 'password123', 'Mushfiqur Rahim', 'mushfiq@drutosheba.com', '+8801711000003', '19877519283721', 'Junior', 'Approved'),
('disp_mahmudullah', 'password123', 'Mahmudullah Riyad', 'mahmudullah@drutosheba.com', '+8801711000004', '19867519283722', 'Senior', 'Approved'),
('disp_mashrafe', 'password123', 'Mashrafe Mortaza', 'mashrafe@drutosheba.com', '+8801711000005', '19837519283723', 'Senior', 'Approved'),
('disp_mustafizur', 'password123', 'Mustafizur Rahman', 'mustafizur@drutosheba.com', '+8801711000006', '19957519283724', 'Junior', 'Approved'),
('disp_liton', 'password123', 'Liton Das', 'liton@drutosheba.com', '+8801711000007', '19947519283725', 'Junior', 'Approved'),
('disp_soumya', 'password123', 'Soumya Sarkar', 'soumya@drutosheba.com', '+8801711000008', '19937519283726', 'Senior', 'Approved'),
('disp_mehedi', 'password123', 'Mehedi Hasan', 'mehedi@drutosheba.com', '+8801711000009', '19977519283727', 'Junior', 'Approved'),
('disp_taskin', 'password123', 'Taskin Ahmed', 'taskin@drutosheba.com', '+8801711000010', '19957519283728', 'Junior', 'Approved'),
('disp_rubel', 'password123', 'Rubel Hossain', 'rubel@drutosheba.com', '+8801711000011', '19907519283729', 'Senior', 'Approved'),
('disp_taijul', 'password123', 'Taijul Islam', 'taijul@drutosheba.com', '+8801711000012', '19927519283730', 'Junior', 'Approved'),
('disp_hasan', 'password123', 'Hasan Mahmud', 'hasan@drutosheba.com', '+8801711000013', '19997519283731', 'Junior', 'Approved'),
('disp_afif', 'password123', 'Afif Hossain', 'afif@drutosheba.com', '+8801711000014', '19997519283732', 'Junior', 'Approved'),
('disp_shoriful', 'password123', 'Shoriful Islam', 'shoriful@drutosheba.com', '+8801711000015', '20017519283733', 'Senior', 'Approved');

-- Give them some dummy verification data matching their levels
-- We use the new dispatcher_id to link
INSERT INTO dispatcher_verifications (dispatcher_id, hsc_year, hsc_reg_no, hsc_roll_no, hsc_board, nid_number, extra_qualifications, status) VALUES 
(1, '2015', '11223344', '556677', 'Dhaka', '19877519283719', '[{"type": "Bachelor", "institute": "Dhaka University", "year": "2019"}]', 'Approved'),
(2, '2018', '22334455', '667788', 'Chittagong', '19897519283720', '[]', 'Approved'),
(3, '2017', '33445566', '778899', 'Rajshahi', '19877519283721', '[{"type": "Diploma", "institute": "Polytechnic Institute", "year": "2020"}]', 'Approved'),
(4, '2014', '44556677', '889900', 'Sylhet', '19867519283722', '[{"type": "Bachelor", "institute": "BRAC University", "year": "2018"}]', 'Approved'),
(5, '2013', '55667788', '990011', 'Comilla', '19837519283723', '[{"type": "Bachelor", "institute": "North South University", "year": "2017"}]', 'Approved'),
(6, '2019', '66778899', '001122', 'Barisal', '19957519283724', '[]', 'Approved'),
(7, '2018', '77889900', '112233', 'Jessore', '19947519283725', '[{"type": "Diploma", "institute": "Medical Technology", "year": "2021"}]', 'Approved'),
(8, '2016', '88990011', '223344', 'Dinajpur', '19937519283726', '[{"type": "Bachelor", "institute": "Jahangirnagar University", "year": "2020"}]', 'Approved'),
(9, '2020', '99001122', '334455', 'Dhaka', '19977519283727', '[]', 'Approved'),
(10, '2019', '00112233', '445566', 'Dhaka', '19957519283728', '[]', 'Approved'),
(11, '2012', '12345678', '876543', 'Chittagong', '19907519283729', '[{"type": "Bachelor", "institute": "Chittagong University", "year": "2016"}]', 'Approved'),
(12, '2018', '23456789', '987654', 'Rajshahi', '19927519283730', '[{"type": "Diploma", "institute": "Nursing Institute", "year": "2021"}]', 'Approved'),
(13, '2021', '34567890', '098765', 'Sylhet', '19997519283731', '[]', 'Approved'),
(14, '2020', '45678901', '109876', 'Comilla', '19997519283732', '[]', 'Approved'),
(15, '2015', '56789012', '210987', 'Barisal', '20017519283733', '[{"type": "Bachelor", "institute": "Khulna University", "year": "2019"}]', 'Approved');
