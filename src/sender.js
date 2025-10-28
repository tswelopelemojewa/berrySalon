import axios from 'axios';

// export const sendTextMessage = async (to, message) => {
//     // Safety check
//     if (!to || typeof to !== 'string') {
//         console.error('❌ Invalid recipient number:', to);
//         return;
//     }

//     if (!message || typeof message !== 'string' || !message.trim()) {
//         console.error('❌ Invalid or empty message body:', message);
//         return;
//     }

//     const payload = {
//         messaging_product: 'whatsapp',
//         to,
//         text: { body: message.trim() }
//     };

//     const headers = {
//         Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
//         'Content-Type': 'application/json'
//     };

//     try {
//         const response = await axios.post(
//             `https://graph.facebook.com/v19.0/${process.env.PHONE_NUMBER_ID}/messages`,
//             payload,
//             { headers }
//         );
//         console.log('✅ Message sent:', response.data);
//     } catch (err) {
//         console.error('❌ Failed to send message');
//         console.error('Status:', err.response?.status);
//         console.error('Error:', err.response?.data || err.message);
//     }
// };


//module.exports = { sendTextMessage }; 

/**
 * Sends a text message back to a user via the WhatsApp Cloud API.
 * @param {string} to - The recipient's WhatsApp ID (wa_id).
 * @param {string} messageText - The text content of the message.
 */

export const sendTextMessage = async (to, message) => {
    // Safety checks
    if (!to || typeof to !== 'string') {
        console.error('❌ Invalid recipient number:', to);
        return;
    }
    if (!message || typeof message !== 'string' || !message.trim()) {
        console.error('❌ Invalid or empty message body:', message);
        return;
    }

    const trimmedMessage = message.trim();

    const payload = {
        messaging_product: 'whatsapp',
        to: to,
        type: 'text',
        text: {
            body: trimmedMessage
        }
    };

    const headers = {
        'Authorization': `Bearer ${process.env.WHATSAPP_TOKEN}`,
        'Content-Type': 'application/json'
    };

    try {
        const url = `https://graph.facebook.com/v19.0/${process.env.PHONE_NUMBER_ID}/messages`;
        // Using version from env variable or default '19.0'

        const response = await axios.post(url, payload, { headers });
        console.log('✅ Message sent:', response.data);
    } catch (err) {
        console.error('❌ Failed to send message');
        console.error('Status:', err.response?.status);
        console.error('Error:', err.response?.data || err.message);
    }
};