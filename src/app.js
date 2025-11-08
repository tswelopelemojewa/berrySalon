import 'dotenv/config'; 
import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import { handleIncoming } from './handler.js';
// import { handleIncoming } from './Sender1.js';
import { supabase } from './db.js';
import multer from 'multer';
// import path from 'path';
// import fs from 'fs';

const app = express();
app.use(bodyParser.json());

// app.use('/uploads', express.static('uploads'));
// const upload = multer({ storage: storage });
// 1. Use memory storage
const storage = multer.memoryStorage(); 

// 2. Define the upload middleware using memory storage
const upload = multer({ 
    storage: storage,
    // Optional: you can remove this if you don't need a file size limit
    limits: { fileSize: 5 * 1024 * 1024 } 
});


// ✅ Enable CORS for your frontend
app.use(
  cors({
    origin: ["http://localhost:5173", "http://localhost:4173", "https://berrysalon.onrender.com", "https://berrysbeautysalon.netlify.app",
             "https://berrysalonweb.onrender.com"], // both local & deployed frontend
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  })
);


// app.post('/login', async (req, res) => {
//   const { email, password } = req.body;

//   try {
//     const { data, error } = await supabase.auth.signInWithPassword({
//       email,
//       password
//     });

//     if (error) return res.status(401).json({ error: error.message });

//     // Optional: verify admin
//     const { data: userData, error: userError } = await supabase
//       .from('users')
//       .select('*')
//       .eq('id', data.user.id)
//       .single();

//     console.log('Data: ', data)

//     if (userError || !userData.is_admin) {
//       return res.status(403).json({ error: 'Not authorized' });
//     }

//     res.json({ message: 'Login successful', session: data.session, user: data.user });

//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ error: 'Server error' });
//   }
// });

// export const adminAuth = async (req, res, next) => {
//   const token = req.headers.authorization?.split(' ')[1];
//   if (!token) return res.status(401).json({ error: 'Unauthorized' });

//   const { data: user, error } = await supabase.auth.getUser(token);
//   if (error || !user || !user.is_admin) return res.status(403).json({ error: 'Forbidden' });

//   req.user = user;
//   next();
// };


app.post('/admin/login', async (req, res) => {
  const { email, password } = req.body;

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return res.status(401).json({ error: error.message });

  // Check if admin
  const { data: userData, error: userError } = await supabase
    .from('users_test')
    .select('*')
    .eq('id', data.user.id)
    .single();

    console.log("Data: ", data);
    
    console.log("email: ", data.user.email);

  if (data.user.email !== 'tmojewa@gmail.com') return res.status(403).json({ error: 'Yo!! Not authorized' });

  res.json({ message: 'Login successful', session: data.session, user: data.user });

});

// Middleware to protect admin routes
const adminAuth = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  const { data: user, error } = await supabase.auth.getUser(token);
  if (error || !user) return res.status(403).json({ error: 'Forbidden' });

  // Check admin
  const { data: userData } = await supabase
    .from('users')
    .select('is_admin')
    .eq('id', user.user.id)
    .single();

  if (!userData.is_admin) return res.status(403).json({ error: 'Forbidden' });

  req.user = user.user;
  next();
};



// Middleware to verify signature (Your existing working function)
function verifySignature(req, res, next) {
    const signatureHeader = req.header('X-Hub-Signature-256');
    const expectedPrefix = 'sha256=';
    
    if (!signatureHeader || !signatureHeader.startsWith(expectedPrefix)) {
        console.warn('Missing or invalid signature header');
        return res.sendStatus(401);
    }

    const receivedSignatureHex = signatureHeader.slice(expectedPrefix.length);
    const rawBodyBuffer = req.rawBody;
    
    // Safety check for rawBodyBuffer
    if (!rawBodyBuffer || !APP_SECRET) {
        console.error('❌ APP_SECRET or raw body is missing.');
        return res.sendStatus(500);
    }

    const hmac = crypto.createHmac('sha256', APP_SECRET);
    hmac.update(rawBodyBuffer);
    const computedDigestHex = hmac.digest('hex');

    try {
        const bufSig = Buffer.from(receivedSignatureHex, 'hex');
        const bufDigest = Buffer.from(computedDigestHex, 'hex');

        if (bufSig.length !== bufDigest.length || !crypto.timingSafeEqual(bufSig, bufDigest)) {
            console.warn('Signature did not match');
            return res.sendStatus(401);
        }
    } catch(err) {
        console.error('Error during signature comparison', err);
        return res.sendStatus(401);
    }

    console.log('✅ Signature verification passed');
    next();
}


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




// =========================================================================================================================================================================

// get all the services from the database
// app.get('/services', async (req, res) => {
//   const items = await db.all('SELECT * FROM services');
//   res.json(items);
// });

// ✅ GET all services from Supabase
app.get('/users', async (req, res) => {
  try {
    const { data, error } = await supabase.from('users').select('*')

    if (error) throw error
    res.json(data)
  } catch (err) {
    console.error('Error fetching users:', err)
    res.status(500).json({ error: 'Failed to fetch users' })
  }
})




// get all the services from the database
// app.get('/services', async (req, res) => {
//   const items = await db.all('SELECT * FROM services');
//   res.json(items);
// });



// ✅ GET all services from Supabase
app.get('/services', async (req, res) => {
  try {
    const { data, error } = await supabase.from('services').select('*')

    if (error) throw error
    res.json(data)
  } catch (err) {
    console.error('Error fetching services:', err)
    res.status(500).json({ error: 'Failed to fetch services' })
  }
})



// //Create a new service
// app.post('/services/add', upload.single('coverImg'), async (req, res) => {
//   try {
//     if (!db) {
//       return res.status(500).json({ message: "Database not initialized yet." });
//     }
//     const { name, Price, duration_minutes } = req.body;
//     const coverImg = req.file ? `uploads/${req.file.filename}` : null;
//     const result = await db.run(
//       `INSERT INTO services (name, Price, duration_minutes, coverImg) VALUES (?, ?, ?, ?);`,
//       [name, Price, duration_minutes, coverImg]
//     );
//     res.status(201).json({ id: result.lastID, name, Price, duration_minutes, coverImg });
//   } catch (error) {
//     console.error("Error creating service:", error);
//     res.status(500).json({ message: "Server error", error: error.message });
//   }
// });

// app.js (around line 110)

// Create a new service (Supabase + Supabase Storage for coverImg)
app.post('/services/add', upload.single('coverImg'), async (req, res) => {
  try {
    const { name, Price, duration_minutes } = req.body;
    
    let coverImgUrl = null;

    if (req.file) {
      // 1. Prepare unique and clean filename for Supabase
      const originalName = req.file.originalname.replace(/\s/g, '_').replace(/[^a-zA-Z0-9._-]/g, '');
      const fileName = `cover_${Date.now()}_${originalName}`;
      
      // 2. Upload to the 'services' bucket (using req.file.buffer)
      const { data: storageData, error: storageError } = await supabase.storage
        .from("services") // <-- NEW BUCKET NAME: 'services'
        .upload(fileName, req.file.buffer, {
          contentType: req.file.mimetype,
          upsert: false,
        });

      if (storageError) throw storageError;

      // 3. Get the public URL for the uploaded file
      const { data: publicUrlData } = supabase.storage
        .from("services")
        .getPublicUrl(fileName);
        
      coverImgUrl = publicUrlData.publicUrl; // Store the full URL
    }

    // 4. Insert service data with the public image URL
    const { data, error } = await supabase
      .from('services')
      .insert([{ 
        name, 
        Price, 
        duration_minutes, 
        coverImg: coverImgUrl // <-- Saving the Supabase URL
      }])
      .select();

    if (error) throw error

    res.status(201).json({
      message: 'Service created successfully',
      service: data[0],
    });

    console.log('Service created:', data[0]);
  } catch (error) {
    console.error('Error creating service:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});


// // get all the services for a specific service
// app.get('/services/:id', async (req, res) => {
//   const items = await db.all(`
//     SELECT 
//       G.Id, G.Service_Id, IFNULL(G.Image, S.coverImg) AS Image,
//       S.name, S.Price, S.duration_minutes, S.coverImg
//     FROM services AS S
//     LEFT JOIN gallery AS G
//       ON G.Service_Id = S.Id
//     WHERE S.id = ?
//     ORDER BY G.Id DESC`, req.params.id);
//   res.json(items);
// });

app.get('/services/:id', async (req, res) => {
  try {
    const { id } = req.params
    const { data, error } = await supabase
      .from('service_gallery_view')
      .select('*')
      .eq('service_Id', id)
      
      console.log('Service Id: ', id)

    if (error) throw error
    res.json(data)
  } catch (error) {
    console.error('Error fetching service details:', error)
    res.status(500).json({ message: 'Server error', error: error.message })
  }
})

app.get('/services/editing/:id', async (req, res) => {
  try {
    const { id } = req.params
    const { data, error } = await supabase
      .from('services')
      .select('*')
      .eq('id', id)
      
      console.log('Service Id: ', id)

    if (error) throw error
    res.json(data)
  } catch (error) {
    console.error('Error fetching service details:', error)
    res.status(500).json({ message: 'Server error', error: error.message })
  }
})


// app.js (Update Service Route)

app.put('/services/:id', upload.single('coverImg'), async (req, res) => {
    try {
        const { id } = req.params;
        
        // Multer populates req.body with text fields
        const { name, Price, duration_minutes } = req.body; 
        
        // Start the updates object
        const updates = {};
        let coverImgUrl = null;

        // 1. Handle file upload if a NEW file was provided (req.file is set by Multer)
        if (req.file) {
            // Prepare unique and clean filename
            const originalName = req.file.originalname.replace(/\s/g, '_').replace(/[^a-zA-Z0-9._-]/g, '');
            const fileName = `cover_${Date.now()}_${originalName}`;
            
            // Upload the new file to the 'services' bucket
            const { error: storageError } = await supabase.storage
                .from("services")
                .upload(fileName, req.file.buffer, {
                    contentType: req.file.mimetype,
                    upsert: false,
                });

            if (storageError) throw storageError;

            // Get the public URL for the newly uploaded file
            const { data: publicUrlData } = supabase.storage
                .from("services")
                .getPublicUrl(fileName);
                
            coverImgUrl = publicUrlData.publicUrl;
            
            // NOTE ON CLEANUP: If you want to delete the OLD image from the bucket 
            // when a new one is uploaded, you would add that logic here (requires 
            // fetching the old coverImg URL and parsing the file path from it first).
        }

        // 2. Add text fields to the updates object if they exist
        if (name !== undefined) updates.name = name;
        if (Price !== undefined) updates.Price = Price;
        if (duration_minutes !== undefined) updates.duration_minutes = duration_minutes;

        // 3. Add the new image URL to the updates object
        if (coverImgUrl) {
            updates.coverImg = coverImgUrl;
        }

        if (Object.keys(updates).length === 0) {
            return res.status(400).json({ message: "No fields or file provided for update." });
        }

        // 4. Update the Supabase database row
        const { data, error } = await supabase
            .from('services')
            .update(updates) 
            .eq('id', id)   
            .select();      

        if (error) throw error;
        
        if (!data || data.length === 0) {
            return res.status(404).json({ message: "Service not found." });
        }

        res.json({ 
            message: `Service ID ${id} updated successfully.`,
            updated_service: data[0]
        });

    } catch (error) {
        console.error('Error updating service:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// app.js

// ✅ DELETE a service by ID (DELETE)
app.delete('/services/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // NOTE: If you have a foreign key constraint set up (which you should), 
        // deleting the service might fail if there are still records in the 
        // 'gallery' or 'appointments' tables linked to this service ID. 
        // You would need to handle those dependencies first (e.g., set to NULL or delete them).
        
        const { error, count } = await supabase
            .from('services')
            .delete()
            .eq('id', id)
            .select(); // Use select() to get the number of deleted rows if needed

        if (error) throw error;

        // The count property is not reliably available in the standard JS client, 
        // so checking for error is the main indicator of success/failure.
        
        res.status(200).json({ 
            message: `Service ID ${id} and all related data deleted successfully.`
        });

    } catch (error) {
        console.error('Error deleting service:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Assuming 'app' is your Express app instance and 'supabase' is your Supabase client initialized earlier.

app.delete('/gallery/:imageId', async (req, res) => {
    const { imageId } = req.params;

    try {
        // --- 1. Fetch the image URL/path for Storage deletion ---
        // This is necessary because Supabase delete on the DB table doesn't automatically delete the file.
        const { data: imageDetails, error: fetchError } = await supabase
            .from('gallery')
            .select('Image') // Assuming you store the storage path in a column named 'image_path'
            .eq('id', imageId)
            .single();

        if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 means "No rows found"
            throw fetchError;
        }

        let storagePath = null;
        if (imageDetails && imageDetails.image_path) {
            storagePath = imageDetails.image_path;
        }

        // --- 2. Delete the record from the 'gallery' table ---
        const { error: dbError } = await supabase
            .from('gallery')
            .delete()
            .eq('id', imageId);

        if (dbError) throw dbError;

        // --- 3. Delete the file from Supabase Storage (if path was found) ---
        if (storagePath) {
            // Assuming your bucket is named 'gallery_images'
            const bucketName = 'gallery'; 
            
            // Delete the file using the path stored in the database
            const { error: storageError } = await supabase.storage
                .from(bucketName)
                .remove([storagePath]); 

            if (storageError) {
                // IMPORTANT: Log the storage error but don't fail the response,
                // as the database record is already gone.
                console.warn(`Warning: Could not delete file from storage at path: ${storagePath}`, storageError);
            }
        }

        // --- 4. Success Response ---
        res.status(200).json({ message: 'Image deleted successfully' });

    } catch (error) {
        console.error('Error deleting image:', error);
        // Send a 500 response if anything critical (like DB delete) fails
        res.status(500).json({ message: 'Server error while deleting image', error: error.message });
    }
});




// Add more images into the gallery for a specific service
//update appointement to completed
// app.post("/services/:id/add", upload.array("images"), async (req, res) => {
//   try {
//     if (!db) {
//       return res.status(500).json({ message: "Database not initialized yet." });
//     }

//     const service_Id = req.params.id;
//     const uploadedFiles = req.files;

//     if (!uploadedFiles || uploadedFiles.length === 0) {
//       return res.status(400).json({ message: "No files uploaded" });
//     }

//     const insertPromises = uploadedFiles.map(async (file) => {
//       const filePath = `uploads/${file.filename}`;
//       const result = await db.run(
//         `INSERT INTO gallery (service_Id, Image) VALUES (?, ?);`,
//         [service_Id, filePath]
//       );
//       return { id: result.lastID, service_Id, Image: filePath };
//     });

//     const savedImages = await Promise.all(insertPromises);

//     res.status(201).json({
//       message: "Images uploaded successfully",
//       uploaded: savedImages,
//     });
//   } catch (error) {
//     console.error("Error saving images:", error);
//     res.status(500).json({ message: "Server error", error: error.message });
//   }
// });

// setup storage
// const storage = multer.diskStorage({
//   destination: (req, file, cb) => {
//     const uploadDir = "uploads/";
//     if (!fs.existsSync(uploadDir)) {
//       fs.mkdirSync(uploadDir);
//     }
//     cb(null, uploadDir);
//   },
//   filename: (req, file, cb) => {
//     cb(null, Date.now() + path.extname(file.originalname));
//   },
// });



app.post("/services/:id/add", upload.array("images"), async (req, res) => {
  try {
    const service_Id = req.params.id;
    const uploadedFiles = req.files;

    if (!uploadedFiles || uploadedFiles.length === 0) {
      return res.status(400).json({ message: "No files uploaded" });
    }

    const insertPromises = uploadedFiles.map(async (file) => {
      // const fileName = `${Date.now()}_${file.originalname}`;
      const originalName = file.originalname.replace(/\s/g, '_').replace(/[^a-zA-Z0-9._-]/g, '');
      const fileName = `${Date.now()}_${originalName}`;

      const { data: storageData, error: storageError } = await supabase.storage
        .from("gallery")
        .upload(fileName, file.buffer, { contentType: file.mimetype });

      if (storageError) throw storageError;

      const { data: publicUrlData } = supabase.storage
        .from("gallery")
        .getPublicUrl(fileName);

      const { data: dbData, error: dbError } = await supabase
        .from("gallery")
        .insert([{ service_Id, Image: publicUrlData.publicUrl }])
        .select();

      if (dbError) throw dbError;

      return dbData[0];
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


// app.get('/hours/:dow', async (req, res) => {
//   const dow = parseInt(req.params.dow);
//   const hours = await db.get(
//     'SELECT * FROM operating_hours WHERE day_of_week = ?', dow
//   );
//   res.json(hours);
// });


// // get all the appointments for a user
// app.get('/appointments/:user_number', async (req, res) => {
//   const appts = await db.all(
//     `SELECT * FROM appointments
//      WHERE user_number = ?
//      AND appointment_time >= datetime('now', 'localtime')
//      AND (status = 'confirmed' OR status = 'Pending')
//      ORDER BY appointment_time ASC;`,
//     [req.params.user_number]
//   );
//   res.json(appts);
// });

// create a new appointment
// Create a new appointment
// app.post('/new/appointments', async (req, res) => {
//   const { name, user_number, serviceId, date, time } = req.body;

//   try {
//     // Step 1: Check for overlapping appointment
//     const existing = await db.get(
//       `
//       SELECT 1
//       FROM appointments AS A
//       INNER JOIN services AS S
//           ON A.service_id = S.id
//       LEFT JOIN services AS S2
//           ON S2.id = ?
//       WHERE A.appointment_date = date(?)
//         AND (
//               -- Case 1: New start overlaps existing
//               (time(datetime(? || ' ' || ?)) >= time(A.appointment_time)
//               AND time(datetime(? || ' ' || ?)) < time(datetime(A.appointment_date || ' ' || A.appointment_time, '+' || S.duration_minutes || ' minutes')))

//               OR

//               -- Case 2: New end overlaps existing
//               (time(datetime(? || ' ' || ?, '+' || S2.duration_minutes || ' minutes')) > time(A.appointment_time)
//               AND time(datetime(? || ' ' || ?, '+' || S2.duration_minutes || ' minutes')) <= time(datetime(A.appointment_date || ' ' || A.appointment_time, '+' || S.duration_minutes || ' minutes')))

//               OR

//               -- Case 3: New appointment completely overlaps existing
//               (time(A.appointment_time) BETWEEN time(datetime(? || ' ' || ?))
//               AND time(datetime(? || ' ' || ?, '+' || S2.duration_minutes || ' minutes')))
//             )
//         AND (A.status = 'Confirmed' OR A.status = 'Awaiting Confirmation');
//       LIMIT 1;

//       `,
//       // Parameters for all placeholders (9 total)
//       [
//         serviceId,        // S2.id = ?
//         date,             // A.appointment_date = date(?)
//         date, time,       // datetime(? || ' ' || ?)
//         date, time,       // datetime(? || ' ' || ?, '+' || S2.duration_minutes || ' minutes')
//         date, time,       // datetime(? || ' ' || ?)
//         date, time        // datetime(? || ' ' || ?, '+' || S2.duration_minutes || ' minutes')
//       ]
//     );

//     // Step 2: Return error if conflict found
//     if (existing) {
//       return res.status(400).json({ error: 'That appointment slot has already been booked.' });
//     }

//     // Step 3: Insert new appointment
//     const result = await db.run(
//       `
//       INSERT INTO appointments 
//         (name, user_number, service_id, appointment_date, appointment_time, status) 
//       VALUES (?, ?, ?, ?, ?, 'Awaiting Confirmation')
//       `,
//       [name, user_number, serviceId, date, time]
//     );

//     res.status(201).json({ id: result.lastID, message: 'Appointment created successfully.' });

//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ error: 'Internal server error' });
//   }
// });


app.post('/new/appointments', async (req, res) => {
  const { name, user_number, serviceId, date, time } = req.body;

  try {
    // Check overlap manually using Supabase
    const { data: existing, error: overlapError } = await supabase
      .rpc('check_appointment_overlap', { service_id_input: serviceId, date_input: date, time_input: time });

    if (overlapError) throw overlapError;
    if (existing && existing.length > 0) {
      return res.status(400).json({ error: 'That appointment slot has already been booked.' });
    }

    // Create new appointment
    const { error: insertError } = await supabase
      .from('appointments')
      .insert({
        name,
        user_number,
        service_id: serviceId,
        appointment_date: date,
        appointment_time: time,
        status: 'Awaiting Confirmation',
      });

    if (insertError) throw insertError;

    res.status(201).json({ message: 'Appointment created successfully.' });
  } catch (error) {
    console.error("Error creating appointment:", error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});



// Functions for the ownwer to manage appointments
// get all upcoming appointments
// app.get('/upcoming/appointments', async (req, res) => {
//   const appts = await db.all(
//     `SELECT 
//       A.id,
//       A.name,
//       A.user_number,
//       A.appointment_date,
//       time(A.appointment_time) AS StartTime,
//       time(datetime(A.appointment_date || ' ' || A.appointment_time, '+' || S.duration_minutes || ' minutes')) AS EndTime,
//       datetime(A.appointment_date || ' ' || A.appointment_time) AS appointment_start,
//       datetime(A.appointment_date || ' ' || A.appointment_time, '+' || S.duration_minutes || ' minutes') AS appointment_end,
//       A.status,
//       S.name AS service_name,
//       S.price,
//       S.duration_minutes,
//       A.created_at,
//       datetime('now') AS current_time
//     FROM appointments AS A
//     INNER JOIN services AS S
//       ON A.service_id = S.id
//     WHERE A.status = 'Confirmed' OR A.status = 'Awaiting Confirmation'
     
//     ORDER BY 
//       A.appointment_date, 
//       A.appointment_time ASC;`);
//       res.json(appts);
// });

app.get('/upcoming/appointments', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('upcoming_appointments')
      .select('*')
      .order('appointment_date', { ascending: true })
      .order('appointment_time', { ascending: true });

    if (error) throw error;

    res.json(data);
  } catch (error) {
    console.error("Error fetching appointments:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// get all upcoming appointments for the curent day
// app.get('/today/appointments/', async (req, res) => {
//   const appts = await db.all(
//     `SELECT 
//       A.id,
//       A.name,
//       A.user_number,
//       A.appointment_date,
//       time(A.appointment_time) AS StartTime,
//       time(datetime(A.appointment_date || ' ' || A.appointment_time, '+' || S.duration_minutes || ' minutes')) EndTime,
//       datetime(A.appointment_date || ' ' || A.appointment_time) AS appoinment_start,
//       datetime(A.appointment_date || ' ' || A.appointment_time, '+' || S.duration_minutes || ' minutes') AS appoitment_end,
//       A.status,
//       S.name AS service_name,
//       S.price,
//       S.duration_minutes,
//       A.created_at,
//       datetime('now') AS current_time
//     FROM appointments AS A
//     INNER JOIN services AS S
//       ON A.service_id = S.id
//     WHERE A.appointment_date = date('now')
//       AND EndTime >= time('now') 
//       AND (A.status = 'Confirmed' OR A.status = 'Awaiting Confirmation')
//     ORDER BY A.appointment_date, A.appointment_time ASC;`);
//   res.json(appts);
// });

app.get('/today/appointments', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('today_appointments')
      .select('*')
      .order('appointment_date', { ascending: true })
      .order('appointment_time', { ascending: true });

    if (error) throw error;

    // ✅ Return empty array quietly if no data
    res.json(data || []);
  } catch (error) {
    // ✅ Fail quietly — return empty array, no console noise
    res.json([]);
  }
});


// get all the appointments from the current month
// app.get('/month/appointments', async (req, res) => {
//   const appts = await db.all(
//     `SELECT 
//       A.id,
//       A.name,
//       A.user_number,
//       A.appointment_date,
//       time(A.appointment_time) AS StartTime,
//       time(datetime(A.appointment_date || ' ' || A.appointment_time, '+' || S.duration_minutes || ' minutes')) AS EndTime,
//       datetime(A.appointment_date || ' ' || A.appointment_time) AS appointment_start,
//       datetime(A.appointment_date || ' ' || A.appointment_time, '+' || S.duration_minutes || ' minutes') AS appointment_end,
//       A.status,
//       S.name AS service_name,
//       S.price,
//       S.duration_minutes,
//       A.created_at,
//       datetime('now') AS current_time
//     FROM appointments AS A
//     INNER JOIN services AS S
//       ON A.service_id = S.id
//     WHERE 
//       strftime('%Y-%m', A.appointment_date) = strftime('%Y-%m', 'now')
      
//     ORDER BY 
//       A.appointment_date, 
//       A.appointment_time ASC;
// `);
//   res.json(appts);
// });

app.get('/month/appointments', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('month_appointments')
      .select('*')
      .order('appointment_date', { ascending: true })
      .order('appointment_time', { ascending: true });

    if (error) throw error;

    res.json(data);
  } catch (error) {
    console.error("Error fetching month's appointments:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// get popular services for the current month
// app.get('/month/appointments/popular', async (req, res) => {
//   const appts = await db.all(
//     `SELECT s.name AS service_name, COUNT(a.id) AS total_bookings
//       FROM appointments a
//       JOIN services s ON a.service_id = s.id
//       WHERE strftime('%Y-%m', a.appointment_date) = strftime('%Y-%m', 'now')
//       GROUP BY a.service_id
//       ORDER BY total_bookings DESC;
// `);
//   res.json(appts);
// });

app.get('/month/appointments/popular', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('month_appointments_popular')
      .select('*')
      .order('total_bookings', { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error("Error fetching popular services:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});


// get all the appointments from the current month
// app.get('/month/appointments/repeat-users', async (req, res) => {
//   const appts = await db.all(
//     `SELECT user_number, name, COUNT(*) AS appointment_count
//     FROM appointments
//     WHERE strftime('%Y-%m', appointment_date) = strftime('%Y-%m', 'now')
//       AND status = 'Completed'
//       AND appointment_date <= date('now')
//     GROUP BY user_number, name
//     HAVING COUNT(*) > 1
//     ORDER BY appointment_count DESC;
// `);
//   res.json(appts);
// });

app.get('/month/appointments/repeat-users', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('month_appointments_repeat_users')
      .select('*')
      .order('appointment_count', { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error("Error fetching repeat users:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});


//update appointement to completed
// app.post('/complete', async (req, res) => {
//   const { user, appointmentId } = req.body;
//   const result = await db.run(
//     `UPDATE appointments
//      SET Status = 'Completed'
//      WHERE user_number = ? AND id = ?;
//      `,
//     user, appointmentId
//   );
//   res.status(201).json({ id: result.lastID });
// });
app.post('/complete', async (req, res) => {
  const { user, appointmentId } = req.body;

  try {
    const { error } = await supabase
      .from('appointments')
      .update({ status: 'Completed' })
      .eq('user_number', user)
      .eq('id', appointmentId);

    if (error) throw error;

    res.status(201).json({ message: 'Appointment marked as completed.' });
  } catch (error) {
    console.error("Error completing appointment:", error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});


// update an appointment to cancelled
// app.post('/cancel', async (req, res) => {
//   const { user, appointmentId } = req.body;
//   const result = await db.run(
//     `UPDATE appointments
//      SET Status = 'Cancelled'
//      WHERE user_number = ? AND id = ?;
//      `,
//     user, appointmentId
//   );
//   res.status(201).json({ id: result.lastID });
// });

app.post('/cancel', async (req, res) => {
  const { user, appointmentId } = req.body;

  try {
    const { error } = await supabase
      .from('appointments')
      .update({ status: 'Cancelled' })
      .eq('user_number', user)
      .eq('id', appointmentId);

    if (error) throw error;

    res.status(201).json({ message: 'Appointment marked as Cancelled.' });
  } catch (error) {
    console.error("Error cancelling appointment:", error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// app.post('/confirm', async (req, res) => {
//   const { user, appointmentId } = req.body;
//   const result = await db.run(
//     `UPDATE appointments
//      SET Status = 'Confirmed'
//      WHERE user_number = ? AND id = ?;
//      `,
//     user, appointmentId
//   );
//   res.status(201).json({ id: result.lastID });
// });

app.post('/confirm', async (req, res) => {
  const { user, appointmentId } = req.body;

  try {
    const { error } = await supabase
      .from('appointments')
      .update({ status: 'Confirmed' })
      .eq('user_number', user)
      .eq('id', appointmentId);

    if (error) throw error;

    res.status(201).json({ message: 'Appointment marked as Confirmed.' });
  } catch (error) {
    console.error("Error confirming appointment:", error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

//block certian time slots for various reasons

// have a list of available time slots for the user to choose from

//manage payments

// add new services

// set notice to the users


app.listen(3000, () => console.log('🚀 Server running on port 3000'));
