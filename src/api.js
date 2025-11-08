import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

// Use an environment variable for your API URL in a real app
const API_BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

// Function to get the list of services
export const getServices = async () => {
    try {
        const response = await axios.get(`${API_BASE_URL}/services`);
        return response.data;
    } catch (error) {
        console.error("Error fetching services:", error);
        return []; // Return an empty list on error
    }
};

// Function to create a new appointment
export const createAppointment = async (appointmentData) => {
    try {
        const response = await axios.post(`${API_BASE_URL}/appointments`, appointmentData);
        return response.data;
    } catch (error) {
        console.error("Error creating appointment:", error);
        throw error; // Re-throw the error to be handled by the caller
    }
};


// Function to get user appointments - By the user's number [used by the client]
export const getUserAppointments = async (user_number) => {
    try {
        const response = await axios.get(`${API_BASE_URL}/appointments/${user_number}`);
        return response.data;
    } catch (error) {
        console.error("Error fetching user appointments:", error);
        return [];
    }
};

// function to cancel an appointment
export const cancelAppointment = async ({ user, appointmentId }) => {
    try {
        const response = await axios.post(`${API_BASE_URL}/cancel`, {
            user,
            appointmentId
        });
        return response.data;
    } catch (error) {
        console.error("Error cancelling appointment:", error);
        return null;
    }
};