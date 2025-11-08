
** Session Based **
session.js 
- creates and manages sessions for a limited period of time. 
- After a certain period the session ends. 
- A new session will be created when the user starts a conversation again.

** Database connection **
db.js
- Makes a connection to the database

** Create API EndPoints **
app.js
-- Create API endpoint for communication between the application and the database
-- has SQL queries to communicate with the database

** Run API Endpoint **
api.js
-- Runs and executes the endpoint which works like postman and .http
-- Queries and inserts into the database

** Initialize AI connectivity **
initialize.js
-- Setup the LLM(AI) API keys to be used

** Create the Agent **
salonAgent.js
-- handles the messages from the client and determines what the user really wants
-- Acts as the brain of the application
-- Sends back the sessionState

** Send response to the user **
Handler.js
-- Sends the predefined message to the user based on the session-state determined by the agent

** Sends message on WhatsApp **
sender.js
-- Connects to whatsApp
-- Sends the message on whatsapp