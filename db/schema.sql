-- services: salon offerings
CREATE TABLE IF NOT EXISTS services (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  Price INTEGER NOT NULL,
  duration_minutes INTEGER NOT NULL,
  coverImg TEXT DEFAULT 'uploads/shinobu.jpg',  -- URL or file path
  created_at TEXT NOT NULL DEFAULT (DATETIME('now'))
);

-- DROP TABLE IF EXISTS services;

-- TRUNCATE TABLE services;

-- operating_hours: salon daily schedule
CREATE TABLE IF NOT EXISTS operating_hours (
  day_of_week INTEGER NOT NULL,  -- 0 = Sunday
  open_time TEXT NOT NULL,       -- 'HH:MM'
  close_time TEXT NOT NULL,      -- 'HH:MM'
  PRIMARY KEY (day_of_week)
);

-- appointments: booked slots
2
-- DROP TABLE IF EXISTS appointments;


-- INSERT INTO appointments (name, user_number, service_id, appointment_date, appointment_time, status)
-- VALUES 
-- ('Annah','0712345678', 1, '2025-10-16', '09:30', 'Awaiting Confirmation'),
-- ('Bennet', '0787654321', 2, '2025-10-17', '11:00', 'Confirmed'),
-- ('Cecilia', '0651237890', 3, '2025-10-18', '14:15', 'Completed'),
-- ('Dorcas', '0724567890', 1, '2025-10-19', '10:45', 'Cancelled'),
-- ('Eva', '0799876543', 2, '2025-10-20', '13:00', 'Awaiting Confirmation');


-- -- Makeup Services
-- INSERT INTO services (name, price, duration_minutes) VALUES 
--   ('Soft glam (Lashes included)', 200, 60),
--   ('Full glam (Lashes included)', 250, 75),
--   ('Natural look (No lashes)', 150, 45);
  

-- -- -- Hair Installation
-- INSERT INTO services (name, price, duration_minutes) VALUES 
--   ('Basic installation', 200, 90),
--   ('Installation + Styling', 250, 135);


-- -- -- Bridal
-- INSERT INTO services (name, price, duration_minutes) VALUES 
--   ('Bridal Full glam (1:30hr)', 350, 90),
--   ('Bridal full glam (Full day)',500, 480),
--   ('Bridal installation + Styling', 300, 120),
--   ('Bridal full glam + installation', 500, 150);

-- -- -- Combos
-- INSERT INTO services (name, price, duration_minutes) VALUES 
--   ('Basic installation + Soft glam', 350, 120),
--   ('Basic installation + Full glam', 400, 165),
--   ('Basic installation + natural look', 300, 135);

-- SELECT * FROM services



-- SELECT 
--   G.Id, G.Service_Id, IFNULL(G.Image, S.coverImg) AS Image,
--   S.name, S.Price, S.duration_minutes, S.coverImg
-- FROM services AS S
-- LEFT JOIN gallery AS G
--   ON G.Service_Id = S.Id
-- WHERE S.id = ?
-- ORDER BY G.Id DESC