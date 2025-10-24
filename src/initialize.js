//import the OpenAI library
// Ensure you have the OpenAI library installed: npm install openai
import { OpenAI } from "openai";
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
dotenv.config();

//set up the OpenAI client with your API key
// const openai = new OpenAI({
//   apiKey: process.env.OPENROUTER_API,
//   baseURL: "https://openrouter.ai/api/v1",
// });

// // Define the type for chat messages
// async function chat(messages) {
//   const res = await openai.chat.completions.create({
//     model: "deepseek/deepseek-r1-distill-llama-70b:free",
//     messages,
//   });
//   return res.choices?.[0]?.message?.content;
// }





// Set up the Google Gemini client
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API,
});

// Define the type for chat messages
async function chat(messages) {
  const res = await ai.models.generateContent({
    model: 'gemini-2.5-flash-lite',
    contents: messages.map(msg => msg.content).join('\n'),
  });
  return res.text;
}

export { chat };