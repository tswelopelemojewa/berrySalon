// import { sendTextMessage } from './sender.js';
// import { SalonAgent } from './SalonAgent.js';
// import axios from 'axios';
// import { getSession } from './session.js';

// // import axios from 'axios';

// export const handleIncoming = async (req, res) => {
    
//     const message = req.body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
//     const from = message?.from;
//     const text = message?.text?.body?.trim();

//     if (!message || !from || !text) return res.sendStatus(200);

//     const userPrompt = text;
//     const reply = await SalonAgent(userPrompt);

//     await sendTextMessage(from, reply);
//     console.log(reply);

//     res.sendStatus(200);
// }


import { sendTextMessage } from './sender.js';
import { SalonAgent } from './SalonAgent.js';
import axios from 'axios';
import { getSession } from './session.js';

export const handleIncoming = async (req, res) => {
  const message = req.body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
  const from = message?.from;
  const text = message?.text?.body?.trim();

  if (!message || !from || !text) return res.sendStatus(200);

  const session = getSession(from);

  // Use AI agent to understand intent
  const agentResponse = await SalonAgent(text, session);

  // Default to just replying if no action
  if (!agentResponse.action) {
    await sendTextMessage(from, agentResponse.message);
    return res.sendStatus(200);
  }

  switch (agentResponse.action) {
    case 'SHOW_SERVICES': {
      const apiRes = await axios.get('http://localhost:3000/services');
      session.data.services = apiRes.data;

      let reply = agentResponse.message + '\n\n';
      apiRes.data.forEach((s, i) => {
        reply += `${i + 1}. ${s.name} (${s.duration_minutes} min)\n`;
      });

      session.state = 'AWAITING_SERVICE_SELECTION';
      await sendTextMessage(from, reply);
      break;
    }

    case 'BOOK_SERVICE': {
      const apiRes = await axios.get('http://localhost:3000/services');
      const matched = apiRes.data.find(s =>
        s.name.toLowerCase().includes(agentResponse.serviceName.toLowerCase())
      );

      if (matched) {
        session.data.selectedService = matched;
        session.state = 'AWAITING_DATE';
        await sendTextMessage(from, `${agentResponse.message} On what date would you like to book? (yyyy-mm-dd)`);
      } else {
        await sendTextMessage(from, `Sorry, we couldn't find a service called "${agentResponse.serviceName}".`);
      }
      break;
    }

    case 'SET_DATE': {
      session.data.date = agentResponse.date;
      session.state = 'AWAITING_TIME';
      await sendTextMessage(from, `${agentResponse.message} What time would you prefer? (e.g., 14:00)`);
      break;
    }

    default:
      await sendTextMessage(from, agentResponse.message);
  }

  // Final step: if user already selected time
  if (session.state === 'AWAITING_TIME' && /^\d{2}:\d{2}$/.test(text)) {
    const time = text;
    const { selectedService, date } = session.data;
    const datetime = `${date}T${time}:00`;

    try {
      const saveRes = await axios.post('http://localhost:3000/appointments', {
        user: from,
        serviceId: selectedService.id,
        time: datetime,
      });

      session.state = null;
      session.data = {};
      await sendTextMessage(from, `✅ Booking confirmed! Appointment ID: ${saveRes.data.id}`);
    } catch (err) {
      console.error(err);
      await sendTextMessage(from, `❌ Couldn't book. Try another time.`);
    }
  }

  res.sendStatus(200);
};


//Old Code

// handleIncoming().catch(console.error);

// export const handleIncoming = async (req, res) => {
//     const message = req.body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
//     const from = message?.from;
//     const text = message?.text?.body?.trim();

//     if (!message || !from || !text) return res.sendStatus(200);


//   const session = getSession(from);

//   if (!session.state) {
//     // Initial menu
//     session.state = 'AWAITING_CHOICE';
//     const reply = `👋 Welcome! What would you like to do?\n1️⃣ Services\n2️⃣ My Appointment`;
//     await sendTextMessage(from, reply);
//   } else if (session.state === 'AWAITING_CHOICE') {
//     if (text === '1') {
//       // Fetch services
//       const apiRes = await axios.get('http://localhost:3000/services');
//       session.data.services = apiRes.data;

//       let menu = 'Choose a service:\n';
//       apiRes.data.forEach((s, i) => {
//         menu += `${i + 1}. ${s.name} (${s.duration_minutes} min)\n`;
//       });

//       session.state = 'AWAITING_SERVICE_SELECTION';
//       await sendTextMessage(from, menu);
//     } else {
//       await sendTextMessage(from, `Sorry, please enter 1 or 2.`);
//     }
//   } else if (session.state === 'AWAITING_SERVICE_SELECTION') {
//     const idx = parseInt(text, 10) - 1;
//     const service = session.data.services[idx];
//     if (!service) {
//       return await sendTextMessage(from, `Invalid choice. Please select a service number.`);
//     }
//     session.data.selectedService = service;
//     session.state = 'AWAITING_DATE';
//     await sendTextMessage(from, `Great! When would you like to come? Please reply with a date (yyyy-mm-dd).`);
//   } else if (session.state === 'AWAITING_DATE') {
//     const date = text;
//     // You'd ideally validate date format here
//     session.data.date = date;
//     session.state = 'AWAITING_TIME';

//     // TODO: fetch available slots
//     // For now, prompt placeholder
//     await sendTextMessage(from, `Thanks! What time would you like? (e.g., 09:30)`);
//   } else if (session.state === 'AWAITING_TIME') {
//     const time = text;
//     const { selectedService, date } = session.data;
//     const datetime = `${date}T${time}:00`;

//     // Save appointment directly using your API
//     try {
//       const saveRes = await axios.post('http://localhost:3000/appointments', {
//         user: from,
//         serviceId: selectedService.id,
//         time: datetime,
//       });

//       session.state = null;
//       await sendTextMessage(from, `✅ Booking confirmed! Your appointment ID is ${saveRes.data.id}`);
//     } catch (err) {
//       console.error(err);
//       await sendTextMessage(from, `❌ Sorry, couldn't book that slot. Try again later.`);
//     }
//   }

//   res.sendStatus(200);
// };


