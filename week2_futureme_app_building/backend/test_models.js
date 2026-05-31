require("dotenv").config();
const { GoogleGenerativeAI } = require("@google/generative-ai");

const apiKey = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey);

const modelsToTest = [
  "gemini-1.5-flash",
  "gemini-1.5-flash-latest",
  "gemini-1.5-pro",
  "gemini-2.0-flash",
  "gemini-2.0-flash-exp",
  "gemini-2.5-flash",
  "gemini-2.5-pro"
];

async function test() {
  for (const modelName of modelsToTest) {
    try {
      console.log(`Testing model: ${modelName}...`);
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent("Hello, respond in 5 words.");
      const text = await result.response.text();
      console.log(`✅ SUCCESS for ${modelName}: "${text.trim()}"\n`);
    } catch (err) {
      console.log(`❌ FAILED for ${modelName}: ${err.message}\n`);
    }
  }
}

test();
