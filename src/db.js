
// import sqlite3 from 'sqlite3';
// import { open } from 'sqlite';
// import path from 'path';
// import fs from 'fs/promises';

// // Initialize the database connection and execute the schema
// export async function initDb() {
//   const db = await open({
//     filename: path.resolve('./db/salon.db'),
//     driver: sqlite3.Database
//   });

//   // Read the schema file
//   const schemaFile = path.resolve('db', 'schema.sql');
//   const schema = await fs.readFile(schemaFile, 'utf8');

//   // Execute its SQL content
//   await db.exec(schema);

//   return db;
// }

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseServiceKey, supabaseAnonKey);


// Create a single supabase client for interacting with your database
// export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Helper function to verify if user is admin
export const isAdmin = async (token) => {
  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      return false;
    }

    // Check if user has admin role in user_metadata or app_metadata
    // You can customize this based on how you store admin status
    return user.user_metadata?.role === 'admin' || 
           user.app_metadata?.role === 'admin';
  } catch (err) {
    console.error('Error verifying admin:', err);
    return false;
  }
};

// Middleware to protect admin routes
export const requireAdmin = async (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const adminStatus = await isAdmin(token);
  
  if (!adminStatus) {
    return res.status(403).json({ error: 'Admin access required' });
  }

  // Attach user to request for use in route handlers
  const { data: { user } } = await supabase.auth.getUser(token);
  req.user = user;
  
  next();
};