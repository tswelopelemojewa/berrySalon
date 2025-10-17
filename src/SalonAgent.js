import { chat } from './initialize.js';

export const SalonAgent = async (userPrompt, availableServices, sessionState = null, sessionData = {}) => {
    // Create a simple list of service names for the AI's context
    const serviceList = availableServices.map((s, i) => `${i + 1}. ${s.name}`).join('\n');
    
    // Get today's date for relative date calculation (e.g., "tomorrow")
    const today = new Date().toISOString().split('T')[0];

    // Build context about current conversation state
    let contextInfo = "";
    if (sessionState) {
        switch (sessionState) {
            case 'AWAITING_SERVICE_SELECTION':
                contextInfo = `\nCONTEXT: The user is currently selecting a service from the menu. If they provide a number, it's likely a service selection.`;
                break;
            case 'AWAITING_APPOINTMENT_SELECTION':
                contextInfo = `\nCONTEXT: The user is currently canceling an appointment. If they provide a number, it's an appointment ID to cancel.`;
                break;
            case 'AWAITING_DATE':
                contextInfo = `\nCONTEXT: The user is providing a date for their selected service: ${sessionData.selectedService?.name || 'unknown service'}.`;
                break;
            case 'AWAITING_TIME':
                contextInfo = `\nCONTEXT: The user is providing a time for their appointment on ${sessionData.date || 'selected date'}.`;
                break;
        }
    }

    const msgs = [
        {
            role: 'system',
            content: `You are a friendly and efficient assistant for Berry's Beauty Salon.
Your primary role is to understand the user's request and classify it into a specific action.
You MUST ALWAYS respond with a JSON object.

Here are the available services:
${serviceList}

${contextInfo}

---
POSSIBLE ACTIONS & JSON FORMAT:

If the user asks to see the list of services:
    { "action": "SHOW_SERVICES", "message": "Sure, here are the services we offer." }

If the user asks to book a specific service OR selects a service by number (when in AWAITING_SERVICE_SELECTION state):
    { "action": "SELECT_SERVICE", "serviceName": "Extracted Service Name" }
    - "serviceName" MUST exactly match a name from the service list.
    - If user provides a number (like "1", "2", etc.) and we're in service selection mode, match it to the corresponding service.

If the user provides a date (e.g., "tomorrow", "August 10th", "2025-08-10"):
    { "action": "SET_DATE", "date": "YYYY-MM-DD" }
    - Convert relative dates to 'YYYY-MM-DD'. Today is ${today}.

If the user provides a time (e.g., "at 3pm", "14:30"):
    { "action": "SET_TIME", "time": "HH:MM" }
    - Convert to 24-hour 'HH:MM' format.

If the user asks to see their existing appointments:
    { "action": "VIEW_APPOINTMENT", "message": "Let me check your appointments." }

For general greetings (hi, hello):
    { "action": "GREETING", "message": "Hi, Welcome to Berry's Beauty Salon💆🏽‍♀️💇🏽‍♀️\\nWhat would you like to do today?\\n\\n- *View Services*\\n- *Make a Booking*\\n- *View My Appointment*\\n- *Cancel Appointment* " }

If the user cancels or wants to cancel an appointment:
    { "action": "CANCEL", "message": "Okay, let me show you your appointments to cancel." }

If the user provides an appointment number to cancel (when in AWAITING_APPOINTMENT_SELECTION state):
    { "action": "AWAITING_APPOINTMENT_SELECTION", "selectedAppointmentId": "extracted_number" }
    - "selectedAppointmentId" MUST be extracted as a number or string from the user's input.
    - This should ONLY be used when the context indicates we're in appointment cancellation mode.

For anything else or unclear requests:
    { "action": "GENERAL_CHAT", "message": "Sorry, I didn't quite understand. You can ask to 'see services' or 'book an appointment'." }

---

IMPORTANT RULES:
1. If sessionState is "AWAITING_SERVICE_SELECTION" and user sends a number, treat it as service selection.
2. If sessionState is "AWAITING_APPOINTMENT_SELECTION" and user sends a number, treat it as appointment cancellation.
3. If sessionState is "AWAITING_DATE" and user sends a date-like input, treat it as date setting.
4. If sessionState is "AWAITING_TIME" and user sends a time-like input, treat it as time setting.

Analyze the user's message and return ONLY the corresponding action from the JSON object.
Your response MUST ONLY be the raw JSON object. 
DO NOT explain anything. DO NOT use markdown. DO NOT include any introductory text or code blocks.
`
        },
        {
            role: 'user',
            content: userPrompt
        }
    ];

    const responseClean = await chat(msgs);

    const response = responseClean
        .replace(/```json\s*/g, '')
        .replace(/```/g, '')
        .trim();

    console.log("AI Response:", response);

    try {
        const jsonOnly = response.match(/{[\s\S]*}/)?.[0]; // Gets the first JSON-like object
        if (!jsonOnly) throw new Error("No JSON found in response");
        return JSON.parse(jsonOnly);
    } catch (e) {
        console.error("Error parsing AI response:", e, response);
        return {
            action: "GENERAL_CHAT",
            message: "Sorry, I didn't quite understand. You can ask to 'see services' or 'book an appointment'."
        };
    }
};