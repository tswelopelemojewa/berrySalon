import { sendTextMessage } from './sender.js';
import { SalonAgent } from './SalonAgent.js';
import { getSession, clearSession } from "./session.js";
import { getServices, createAppointment, getUserAppointments, cancelAppointment } from './api.js';

export const handleIncoming = async (req, res) => {
    const message = req.body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
    if (!message) return res.sendStatus(200);

    const from = message.from;
    const userText = message.text?.body?.trim();
    if (!from || !userText) return res.sendStatus(200);

    const { session, wasReset } = getSession(from);

    // If session was reset (optional logic)
    if (wasReset) {
      await sendTextMessage(from, "⏳ Your previous session has expired due to inactivity. Let's start over 😊");
    }

    const allServicesData = await getServices();

    const allServices = Array.isArray(allServicesData) ? allServicesData : allServicesData?.data;

    if (!Array.isArray(allServices)) {
        console.error("API did not return an array for services. Response:", allServicesData);
        await sendTextMessage(from, "Sorry, we're having trouble fetching our services at the moment. Please try again later.");
        return res.sendStatus(200);
    }

    // 👉 NEW: Agent can return multiple actions - now with session context
    const agentResponses = await SalonAgent(userText, allServices, session.state, session.data);

    // 👉 Normalize to array
    const actions = Array.isArray(agentResponses) ? agentResponses : [agentResponses];

    for (const agentResponse of actions) {
        const { action, message: agentMessage, serviceName, date, time, selectedAppointmentId } = agentResponse;

        switch (action) {
            case 'GREETING':
                await sendTextMessage(from, agentMessage);
                session.state = 'AWAITING_INTENT';
                break;

            case 'SHOW_SERVICES':
                let serviceMenu = 'Here are our services: 💇‍♀️💅\n';
                allServices.forEach((s, i) => {
                    serviceMenu += `${i + 1}. ${s.name} (${s.duration_minutes} min)\n`;
                });
                serviceMenu += "\nWhich one would you like to book?";
                session.state = 'AWAITING_SERVICE_SELECTION';
                session.data = { services: allServices };
                await sendTextMessage(from, serviceMenu);
                break;

            case 'SELECT_SERVICE':
                const selectedService = allServices.find(s => s.name.toLowerCase() === serviceName?.toLowerCase());
                if (selectedService) {
                    session.data.selectedService = selectedService;
                    session.state = 'AWAITING_DATE';
                    await sendTextMessage(from, `Great choice! When would you like to book your *${selectedService.name}*? Please provide a date (e.g., tomorrow, Aug 1st).`);
                } else {
                    await sendTextMessage(from, `Hmm, I don't recognize the service "${serviceName}". Please pick a service from the list.`);
                }
                break;

            case 'SET_DATE':
                if (session.state === 'AWAITING_DATE' || session.data.selectedService) {
                    session.data.date = date;
                    session.state = 'AWAITING_TIME';
                    await sendTextMessage(from, `Perfect. For *${date}*, what time works for you?`);
                } else {
                    await sendTextMessage(from, "Are you trying to book an appointment? Let's pick a service first!");
                }
                break;

            case 'SET_TIME':
                if (session.state === 'AWAITING_TIME') {
                    session.data.time = time;
                    const { selectedService, date: bookingDate } = session.data;

                    try {
                        const appointmentData = {
                            user: from,
                            serviceId: selectedService.id,
                            time: `${bookingDate}T${time}:00`,
                        };
                        const newAppointment = await createAppointment(appointmentData);
                        await sendTextMessage(from, `✅ All set! Your *${selectedService.name}* is booked for *${bookingDate} at ${time}*. See you then!`);
                        // clearSession(from);
                        
                    } catch (error) {
                        await sendTextMessage(from, "❌ Sorry, we couldn't book that slot. It might be unavailable. Please try another time.");
                        session.state = 'AWAITING_TIME';
                    }
                } 
                else {
                    await sendTextMessage(from, "Sorry, I need a date before I can set a time. When would you like to come in?");
                }
                break;

            case 'VIEW_APPOINTMENT':
                const appointments = await getUserAppointments(from);
                if (appointments && appointments.length > 0) {
                    let appointmentList = "Here are your upcoming appointments:\n";
                    appointments.forEach(app => {
                        const service = allServices.find(s => s.id === app.service_id);
                        const serviceDisplayName = service ? service.name : 'Unknown Service';
                        appointmentList += `\n ${app.id} - *${serviceDisplayName}* on ${new Date(app.appointment_time).toLocaleDateString()} at ${new Date(app.appointment_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;
                    });
                    await sendTextMessage(from, appointmentList);
                }
                else {
                    await sendTextMessage(from, "You don't have any appointments with us yet.");
                }
                // clearSession(from);
                break;

            case 'CANCEL':
                    const appointments1 = await getUserAppointments(from);
                    if (appointments1.length === 0) {
                        await sendTextMessage(from, "📭 You don't have any appointments to cancel.");
                        clearSession(from);
                        break;
                    }

                    let cancelList = "Here are your upcoming appointments:\n";
                    appointments1.forEach(app => {
                        const service = allServices.find(s => s.id === app.service_id);
                        const serviceDisplayName = service ? service.name : 'Unknown Service';
                        cancelList += `\n${app.id}. *${serviceDisplayName}* on ${new Date(app.appointment_time).toLocaleDateString()} at ${new Date(app.appointment_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
                    });

                    cancelList += "\n\nReply with the *appointment number* to cancel.";
                    await sendTextMessage(from, cancelList);

                    session.state = 'AWAITING_APPOINTMENT_SELECTION';
                    session.data.cancelableAppointments = appointments1;
                break;

            case 'AWAITING_APPOINTMENT_SELECTION':
                // Extract the appointment ID from the agent's response
                let selectedId = selectedAppointmentId || agentMessage; // Try selectedAppointmentId first, fallback to message
                
                console.log("Selected Appointment ID from agent:", selectedId);
                
                // Convert to string for comparison
                selectedId = selectedId?.toString();

                if (!selectedId) {
                    await sendTextMessage(from, "❌ Please enter a valid appointment number.");
                    break;
                }

                // Make sure we have the cancelable appointments in session
                if (!session.data?.cancelableAppointments) {
                    await sendTextMessage(from, "❌ Session expired. Please try cancelling again.");
                    clearSession(from);
                    break;
                }

                const selectedAppointment = session.data.cancelableAppointments.find(app => app.id.toString() === selectedId);

                if (!selectedAppointment) {
                    await sendTextMessage(from, "❌ That number doesn't match any of your appointments. Please check and try again.");
                    break;
                }

                try {
                    // Cancel the appointment
                    const cancelResult = await cancelAppointment({ user: from, appointmentId: selectedAppointment.id });

                    if (!cancelResult) {
                        await sendTextMessage(from, "⚠️ Something went wrong while cancelling your appointment. Please try again.");
                        break;
                    }

                    // Get remaining appointments
                    const remainingAppointments = await getUserAppointments(from);

                    if (remainingAppointments.length > 0) {
                        let appointmentList = "🗓️ Your remaining appointments:\n";
                        remainingAppointments.forEach(app => {
                            const service = allServices.find(s => s.id === app.service_id);
                            const serviceDisplayName = service ? service.name : 'Unknown Service';
                            appointmentList += `\n${app.id} - *${serviceDisplayName}* on ${new Date(app.appointment_time).toLocaleDateString()} at ${new Date(app.appointment_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
                        });
                        await sendTextMessage(from, "✅ Appointment cancelled successfully.");
                        await sendTextMessage(from, appointmentList);
                    } else {
                        await sendTextMessage(from, "✅ Appointment cancelled successfully.\n\n📭 You have no remaining appointments.");
                    }

                    // Clear session after successful cancellation
                    clearSession(from);

                } catch (error) {
                    console.error("Error cancelling appointment:", error);
                    await sendTextMessage(from, "⚠️ Something went wrong while cancelling your appointment. Please try again.");
                }
                break;

            case 'GENERAL_CHAT':
                await sendTextMessage(from, agentMessage || "Sorry, I didn't quite understand. You can ask to 'see services' or 'book an appointment'.");
                break;

            default:
                await sendTextMessage(from, agentResponse.message || "Sorry, I'm not sure how to help. You can ask to 'see services' or 'book an appointment'.");
                break;
        }
    }

    res.sendStatus(200);
};