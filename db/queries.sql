SELECT * FROM appointments;

--Popular services this month
SELECT 
  s.name AS service_name, COUNT(a.id) AS total_bookings
FROM appointments a
JOIN services s ON a.service_id = s.id
WHERE strftime('%Y-%m', a.appointment_date) = strftime('%Y-%m', 'now')
GROUP BY a.service_id
ORDER BY total_bookings DESC;

--Repeat customers this month

  SELECT user_number, name, COUNT(*) AS appointment_count
  FROM appointments
  WHERE strftime('%Y-%m', appointment_date) = strftime('%Y-%m', 'now')
    AND status = 'Completed'
    AND appointment_date <= date('now')
  GROUP BY user_number, name
  HAVING COUNT(*) > 1

-- DELETE FROM appointments WHERE id = 21;
-- this month
SELECT 
      A.id,
      A.name,
      A.user_number,
      A.appointment_date,
      time(A.appointment_time, 'localtime') AS StartTime,
      time(datetime(A.appointment_date || ' ' || A.appointment_time, '+' || S.duration_minutes || ' minutes'), 'localtime') AS EndTime,
      datetime(A.appointment_date || ' ' || A.appointment_time) AS appointment_start,
      datetime(A.appointment_date || ' ' || A.appointment_time, '+' || S.duration_minutes || ' minutes') AS appointment_end,
      A.status,
      S.name AS service_name,
      S.price,
      S.duration_minutes,
      A.created_at,
      datetime('now', 'localtime') AS current_time
    FROM appointments AS A
    INNER JOIN services AS S
      ON A.service_id = S.id
    WHERE 
      strftime('%Y-%m', A.appointment_date) = strftime('%Y-%m', 'now', 'localtime')
      
    ORDER BY 
      A.appointment_date, 
      A.appointment_time ASC;


-- Today
SELECT 
  A.id,
  A.name,
  A.user_number,
  A.appointment_date,
  time(A.appointment_time) AS StartTime,
  time(datetime(A.appointment_date || ' ' || A.appointment_time, '+' || S.duration_minutes || ' minutes')) EndTime,
  datetime(A.appointment_date || ' ' || A.appointment_time) AS appoinment_start,
  datetime(A.appointment_date || ' ' || A.appointment_time, '+' || S.duration_minutes || ' minutes') AS appoitment_end,
  A.status,
  S.name AS service_name,
  S.price,
  S.duration_minutes,
  A.created_at,
  datetime('now') AS current_time
FROM appointments AS A
INNER JOIN services AS S
  ON A.service_id = S.id
WHERE A.appointment_date = date('now')
  AND EndTime >= time('now') 
  AND (A.status = 'Confirmed' OR A.status = 'Awaiting Confirmation')
ORDER BY A.appointment_date, A.appointment_time ASC;

-- Upcoming Appointments
SELECT 
  A.id,
  A.name,
  A.user_number,
  A.appointment_date,
  time(A.appointment_time) AS StartTime,
  time(datetime(A.appointment_date || ' ' || A.appointment_time, '+' || S.duration_minutes - 1 || ' minutes')) AS EndTime,
  datetime(A.appointment_date || ' ' || A.appointment_time) AS appointment_start,
  datetime(A.appointment_date || ' ' || A.appointment_time, '+' || S.duration_minutes || ' minutes') AS appointment_end,
  A.status,
  S.name AS service_name,
  S.price,
  S.duration_minutes,
  A.created_at,
  datetime('now') AS current_time
FROM appointments AS A
INNER JOIN services AS S
  ON A.service_id = S.id
WHERE 
  strftime('%Y-%m', A.appointment_date) = strftime('%Y-%m', 'now')
  AND (A.status = 'Confirmed' OR A.status = 'Awaiting Confirmation')
ORDER BY 
  A.appointment_date, 
  A.appointment_time ASC;

-- UPDATE appointments
-- SET status = 'Confirmed'
-- WHERE id = 3;


-- UPDATE appointments
-- SET appointment_time = time(datetime(appointment_date || ' ' || '15:00:00'))  
-- WHERE id = 1;


SELECT A.id,
s2.name,
    S2.duration_minutes,
    time(datetime(A.appointment_date || ' ' || '12:30:00')) newAppointmentStartTime,
    time(datetime(A.appointment_date || ' ' || '12:30:00', '+' || S2.duration_minutes || ' minutes')) newAppointmentEndTime,
      A.name,
      A.user_number,
      A.appointment_date,
      time(A.appointment_time) AS StartTime,
      time(datetime(A.appointment_date || ' ' || A.appointment_time, '+' || S.duration_minutes || ' minutes')) EndTime,
      datetime(A.appointment_date || ' ' || A.appointment_time) AS appoinment_start,
      datetime(A.appointment_date || ' ' || A.appointment_time, '+' || S.duration_minutes || ' minutes') AS appoitment_end,
      A.status
FROM appointments AS A
INNER JOIN services AS S
  ON A.service_id = S.id
LEFT JOIN services AS S2
  ON s2.id = 1
WHERE A.appointment_date = date('2025-10-17')
      AND ((time(datetime(A.appointment_date || ' ' || '12:30:00'))  BETWEEN A.appointment_time 
      AND time(datetime(A.appointment_date || ' ' || A.appointment_time, '+' || S.duration_minutes || ' minutes')))
      OR (time(datetime(A.appointment_date || ' ' || '12:30:00', '+' || S2.duration_minutes || ' minutes'))  BETWEEN A.appointment_time 
      AND time(datetime(A.appointment_date || ' ' || A.appointment_time, '+' || S.duration_minutes || ' minutes'))))
LIMIT 1;

--- Check for appointment conflicts
-- Parameters to be provided dynamically:
SELECT 
    A.id,
    A.name,
    A.user_number,
    A.appointment_date,
    time(A.appointment_time) AS existing_start_time,
    time(datetime(A.appointment_date || ' ' || A.appointment_time, '+' || S.duration_minutes || ' minutes')) AS existing_end_time,
    
    -- new appointment times (dynamic placeholders)
    time(datetime(:appointment_date || ' ' || :appointment_time)) AS new_start_time,
    time(datetime(:appointment_date || ' ' || :appointment_time, '+' || S2.duration_minutes || ' minutes')) AS new_end_time,
    
    S.name AS existing_service,
    S.duration_minutes AS existing_duration,
    S2.name AS new_service,
    S2.duration_minutes AS new_duration,
    A.status

FROM appointments AS A
INNER JOIN services AS S
    ON A.service_id = S.id
LEFT JOIN services AS S2
    ON S2.id = :new_service_id

WHERE A.appointment_date = date(:appointment_date)
  AND (
        -- Case 1: New start time falls within an existing appointment window
        time(datetime(:appointment_date || ' ' || :appointment_time))
        BETWEEN time(A.appointment_time)
            AND time(datetime(A.appointment_date || ' ' || A.appointment_time, '+' || S.duration_minutes || ' minutes'))

        OR

        -- Case 2: New end time falls within an existing appointment window
        time(datetime(:appointment_date || ' ' || :appointment_time, '+' || S2.duration_minutes || ' minutes'))
        BETWEEN time(A.appointment_time)
            AND time(datetime(A.appointment_date || ' ' || A.appointment_time, '+' || S.duration_minutes || ' minutes'))

        OR

        -- Case 3: New appointment completely overlaps an existing one
        (
          time(A.appointment_time) 
          BETWEEN time(datetime(:appointment_date || ' ' || :appointment_time))
              AND time(datetime(:appointment_date || ' ' || :appointment_time, '+' || S2.duration_minutes || ' minutes'))
        )
    )
LIMIT 1;



SELECT 
      A.id,
      A.name,
      A.user_number,
      A.appointment_date,
      time(A.appointment_time) AS StartTime,
      time(datetime(A.appointment_date || ' ' || A.appointment_time, '+' || S.duration_minutes || ' minutes')) EndTime,
      datetime(A.appointment_date || ' ' || A.appointment_time) AS appoinment_start,
      datetime(A.appointment_date || ' ' || A.appointment_time, '+' || S.duration_minutes || ' minutes') AS appoitment_end,
      A.status,
      S.name AS service_name,
      S.price,
      S.duration_minutes,
      A.created_at,
      datetime('now') AS current_time
    FROM appointments AS A
    INNER JOIN services AS S
      ON A.service_id = S.id
    WHERE A.appointment_date >= date('now')
      AND (A.appointment_time >= time('now')
      OR EndTime >= time('now') )
      AND (A.status = 'Confirmed' OR A.status = 'Awaiting Confirmation')
    ORDER BY A.appointment_date, A.appointment_time ASC;

SELECT 
      A.id,
      A.name,
      A.user_number,
      A.appointment_date,
      time(A.appointment_time) AS StartTime,
      time(datetime(A.appointment_date || ' ' || A.appointment_time, '+' || S.duration_minutes || ' minutes')) EndTime,
      datetime(A.appointment_date || ' ' || A.appointment_time) AS appoinment_start,
      datetime(A.appointment_date || ' ' || A.appointment_time, '+' || S.duration_minutes || ' minutes') AS appoitment_end,
      A.status,
      S.name AS service_name,
      S.price,
      S.duration_minutes,
      A.created_at,
      datetime('now') AS current_time
    FROM appointments AS A
    INNER JOIN services AS S
      ON A.service_id = S.id
    WHERE A.appointment_date = date('now')
      AND EndTime >= time('now') 
      AND (A.status = 'Confirmed' OR A.status = 'Awaiting Confirmation')
    ORDER BY A.appointment_date, A.appointment_time ASC;

--AND (A.status = 'Confirmed' OR A.status = 'Awaiting Confirmation' OR A.status = 'Completed')
SELECT * FROM services;

UPDATE services
SET name = '	Full glam (Lashes included)'
WHERE id = 2;

SELECT * FROM appointments
WHERE user_number = '27790985214'
 AND appointment_time >= datetime('now')
 ORDER BY appointment_time ASC;


UPDATE appointments
SET service_id = 4
WHERE user_number = '27790985214' 
  AND appointment_time = '2025-07-25T12:00:00';


-- DELETE FROM appointments
-- WHERE user_number = '27790985214' 
--   AND appointment_time = '2025-07-25T12:00:00';