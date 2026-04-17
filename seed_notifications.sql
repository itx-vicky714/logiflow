
-- This script adds sample notifications for LogiFlow
-- Ensure the notifications table exists first (run supabase_notifications.sql)

INSERT INTO notifications (user_id, title, message, type, is_read)
SELECT 
  id, 
  'High Risk Alert: NH-48 Delay', 
  'Shipment LF-2024-9921 is stuck near Jaipur due to heavy congestion. Risk score increased to 84%.', 
  'delay', 
  false
FROM auth.users
LIMIT 1;

INSERT INTO notifications (user_id, title, message, type, is_read)
SELECT 
  id, 
  'Weather Warning: Bihar Monsoon', 
  'Heavy rain warning on Patna-Surat route. Expect 3-5 hours delay for all road freight.', 
  'weather', 
  false
FROM auth.users
LIMIT 1;

INSERT INTO notifications (user_id, title, message, type, is_read)
SELECT 
  id, 
  'System Sync Success', 
  'Global fleet data recalibrated. All sensors are nominal.', 
  'system', 
  true
FROM auth.users
LIMIT 1;
