-- Run this script in the Supabase SQL Editor
-- This strictly removes the predicted fields so the Pi uploads raw real-time data efficiently

ALTER TABLE public.traffic_logs
DROP COLUMN IF EXISTS predicted_vehicle_count,
DROP COLUMN IF EXISTS predicted_density;

-- Ensure constraints or anything else dependent on it hasn't broken. Done!
