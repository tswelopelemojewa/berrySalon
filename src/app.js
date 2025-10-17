import 'dotenv/config'; 
import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import { handleIncoming } from './handler.js';
// import { handleIncoming } from './Sender1.js';
import { initDb } from './db.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const app = express();
app.use(bodyParser.json());

app.use('/uploads', express.static('uploads'));


// ✅ Enable CORS for your frontend
app.use(cors({
  origin: "http://localhost:5173", // Allow your React app
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true,
}));

// Meta Webhook verification
app.get('/webhook', (req, res) => {
    const token = process.env.VERIFY_TOKEN;
    const challenge = req.query['hub.challenge'];
    const mode = req.query['hub.mode'];
    const incomingToken = req.query['hub.verify_token'];

    if (mode && incomingToken === token) {
        return res.status(200).send(challenge);
    } else {
        return res.sendStatus(403);
    }
});

// Webhook to receive messages
app.post('/webhook', handleIncoming);


let db;
initDb().then(dbHandle => { db = dbHandle });


// setup storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = "uploads/";
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir);
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});


const upload = multer({ storage: storage });

// get all the services from the database
app.get('/services', async (req, res) => {
  const items = await db.all('SELECT * FROM services');
  res.json(items);
});

//Create a new service
app.post('/services/add', upload.single('coverImg'), async (req, res) => {
  try {
    if (!db) {
      return res.status(500).json({ message: "Database not initialized yet." });
    }
    const { name, Price, duration_minutes } = req.body;
    const coverImg = req.file ? `uploads/${req.file.filename}` : null;
    const result = await db.run(
      `INSERT INTO services (name, Price, duration_minutes, coverImg) VALUES (?, ?, ?, ?);`,
      [name, Price, duration_minutes, coverImg]
    );
    res.status(201).json({ id: result.lastID, name, Price, duration_minutes, coverImg });
  } catch (error) {
    console.error("Error creating service:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// get all the services for a specific service
app.get('/services/:id', async (req, res) => {
  const items = await db.all(`
    SELECT 
      G.Id, G.Service_Id, IFNULL(G.Image, S.coverImg) AS Image,
      S.name, S.Price, S.duration_minutes, S.coverImg
    FROM services AS S
    LEFT JOIN gallery AS G
      ON G.Service_Id = S.Id
    WHERE S.id = ?
    ORDER BY G.Id DESC`, req.params.id);
  res.json(items);
});

// Add more images into the gallery for a specific service
//update appointement to completed
app.post("/services/:id/add", upload.array("images"), async (req, res) => {
  try {
    if (!db) {
      return res.status(500).json({ message: "Database not initialized yet." });
    }

    const service_Id = req.params.id;
    const uploadedFiles = req.files;

    if (!uploadedFiles || uploadedFiles.length === 0) {
      return res.status(400).json({ message: "No files uploaded" });
    }

    const insertPromises = uploadedFiles.map(async (file) => {
      const filePath = `uploads/${file.filename}`;
      const result = await db.run(
        `INSERT INTO gallery (service_Id, Image) VALUES (?, ?);`,
        [service_Id, filePath]
      );
      return { id: result.lastID, service_Id, Image: filePath };
    });

    const savedImages = await Promise.all(insertPromises);

    res.status(201).json({
      message: "Images uploaded successfully",
      uploaded: savedImages,
    });
  } catch (error) {
    console.error("Error saving images:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});



app.get('/hours/:dow', async (req, res) => {
  const dow = parseInt(req.params.dow);
  const hours = await db.get(
    'SELECT * FROM operating_hours WHERE day_of_week = ?', dow
  );
  res.json(hours);
});


// get all the appointments for a user
app.get('/appointments/:user_number', async (req, res) => {
  const appts = await db.all(
    `SELECT * FROM appointments
     WHERE user_number = ?
     AND appointment_time >= datetime('now', 'localtime')
     AND (status = 'confirmed' OR status = 'Pending')
     ORDER BY appointment_time ASC;`,
    [req.params.user_number]
  );
  res.json(appts);
});

// create a new appointment
// Create a new appointment
app.post('/new/appointments', async (req, res) => {
  const { name, user_number, serviceId, date, time } = req.body;

  try {
    // Step 1: Check for overlapping appointment
    const existing = await db.get(
      `
      SELECT 1
      FROM appointments AS A
      INNER JOIN services AS S
          ON A.service_id = S.id
      LEFT JOIN services AS S2
          ON S2.id = ?
      WHERE A.appointment_date = date(?)
        AND (
              -- Case 1: New start overlaps existing
              (time(datetime(? || ' ' || ?)) >= time(A.appointment_time)
              AND time(datetime(? || ' ' || ?)) < time(datetime(A.appointment_date || ' ' || A.appointment_time, '+' || S.duration_minutes || ' minutes')))

              OR

              -- Case 2: New end overlaps existing
              (time(datetime(? || ' ' || ?, '+' || S2.duration_minutes || ' minutes')) > time(A.appointment_time)
              AND time(datetime(? || ' ' || ?, '+' || S2.duration_minutes || ' minutes')) <= time(datetime(A.appointment_date || ' ' || A.appointment_time, '+' || S.duration_minutes || ' minutes')))

              OR

              -- Case 3: New appointment completely overlaps existing
              (time(A.appointment_time) BETWEEN time(datetime(? || ' ' || ?))
              AND time(datetime(? || ' ' || ?, '+' || S2.duration_minutes || ' minutes')))
            )
        AND (A.status = 'Confirmed' OR A.status = 'Awaiting Confirmation');
      LIMIT 1;

      `,
      // Parameters for all placeholders (9 total)
      [
        serviceId,        // S2.id = ?
        date,             // A.appointment_date = date(?)
        date, time,       // datetime(? || ' ' || ?)
        date, time,       // datetime(? || ' ' || ?, '+' || S2.duration_minutes || ' minutes')
        date, time,       // datetime(? || ' ' || ?)
        date, time        // datetime(? || ' ' || ?, '+' || S2.duration_minutes || ' minutes')
      ]
    );

    // Step 2: Return error if conflict found
    if (existing) {
      return res.status(400).json({ error: 'That appointment slot has already been booked.' });
    }

    // Step 3: Insert new appointment
    const result = await db.run(
      `
      INSERT INTO appointments 
        (name, user_number, service_id, appointment_date, appointment_time, status) 
      VALUES (?, ?, ?, ?, ?, 'Awaiting Confirmation')
      `,
      [name, user_number, serviceId, date, time]
    );

    res.status(201).json({ id: result.lastID, message: 'Appointment created successfully.' });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// update an appointment to confirmed





// Functions for the ownwer to manage appointments
// get all upcoming appointments
app.get('/upcoming/appointments', async (req, res) => {
  const appts = await db.all(
    `SELECT 
      A.id,
      A.name,
      A.user_number,
      A.appointment_date,
      time(A.appointment_time) AS StartTime,
      time(datetime(A.appointment_date || ' ' || A.appointment_time, '+' || S.duration_minutes || ' minutes')) AS EndTime,
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
      A.appointment_time ASC;`);
      res.json(appts);
});

// get all upcoming appointments for the curent day
app.get('/today/appointments/', async (req, res) => {
  const appts = await db.all(
    `SELECT 
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
    ORDER BY A.appointment_date, A.appointment_time ASC;`);
  res.json(appts);
});

// get all the appointments from the current month
app.get('/month/appointments', async (req, res) => {
  const appts = await db.all(
    `SELECT 
      A.id,
      A.name,
      A.user_number,
      A.appointment_date,
      time(A.appointment_time) AS StartTime,
      time(datetime(A.appointment_date || ' ' || A.appointment_time, '+' || S.duration_minutes || ' minutes')) AS EndTime,
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
      
    ORDER BY 
      A.appointment_date, 
      A.appointment_time ASC;
`);
  res.json(appts);
});



//update appointement to completed
app.post('/complete', async (req, res) => {
  const { user, appointmentId } = req.body;
  const result = await db.run(
    `UPDATE appointments
     SET Status = 'Completed'
     WHERE user_number = ? AND id = ?;
     `,
    user, appointmentId
  );
  res.status(201).json({ id: result.lastID });
});

// update an appointment to cancelled
app.post('/cancel', async (req, res) => {
  const { user, appointmentId } = req.body;
  const result = await db.run(
    `UPDATE appointments
     SET Status = 'Cancelled'
     WHERE user_number = ? AND id = ?;
     `,
    user, appointmentId
  );
  res.status(201).json({ id: result.lastID });
});


app.post('/confirm', async (req, res) => {
  const { user, appointmentId } = req.body;
  const result = await db.run(
    `UPDATE appointments
     SET Status = 'Confirmed'
     WHERE user_number = ? AND id = ?;
     `,
    user, appointmentId
  );
  res.status(201).json({ id: result.lastID });
});
//block certian time slots for various reasons

// have a list of available time slots for the user to choose from

//manage payments

// add new services

// set notice to the users


app.listen(3000, () => console.log('🚀 Server running on port 3000'));
