//import the OpenAI library
// Ensure you have the OpenAI library installed: npm install openai
import { OpenAI } from "openai";
import { GoogleGenAI } from '@google/genai';

//set up the OpenAI client with your API key
const openai = new OpenAI({
  apiKey: "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",
  baseURL: "https://openrouter.ai/api/v1",
});

// Define the type for chat messages
async function chat(messages) {
  const res = await openai.chat.completions.create({
    model: "deepseek/deepseek-r1-distill-llama-70b:free",
    messages,
  });
  return res.choices?.[0]?.message?.content;
}





// Set up the Google Gemini client
const ai = new GoogleGenAI({
  apiKey: 'AIzaSyDpkqX78mVt_oKql3kpJR1IknrSYNMCaww',
});

// Define the type for chat messages
// async function chat(messages) {
//   const res = await ai.models.generateContent({
//     model: 'gemini-2.5-pro-preview-03-25',
//     contents: messages.map(msg => msg.content).join('\n'),
//   });
//   return res.text;
// }

export { chat };