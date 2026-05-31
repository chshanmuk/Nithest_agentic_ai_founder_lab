const express = require("express");
const cors = require("cors");
const path = require("path");
require("dotenv").config();
const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from the frontend directory (for local testing)
app.use(express.static(path.join(__dirname, "../frontend")));

// Initialize Gemini API
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error("WARNING: GEMINI_API_KEY is not defined in the environment variables.");
}
const genAI = new GoogleGenerativeAI(apiKey || "DUMMY_KEY");

// Helper to sanitize Gemini response text
function cleanGeminiJSON(text) {
  let cleanText = text.trim();
  if (cleanText.startsWith("```")) {
    cleanText = cleanText.replace(/^```(json)?\s*/i, "");
    cleanText = cleanText.replace(/\s*```$/i, "");
  }
  return cleanText.trim();
}

// Tone mappings
const toneMapping = {
  motivational: "Motivational: warm, inspiring, supportive, high energy",
  brutally_honest: "Brutally Honest: direct, sharp, no excuses, tough love, high urgency",
  calm_mentor: "Calm Mentor: peaceful, wise, grounded, patient, reflective",
  ceo_mode: "CEO Mode: strategic, focused, execution-heavy, objective, productivity-focused"
};

// Create Express Router for APIs
const router = express.Router();

// API Endpoint 1: Generate FutureMe Profile
router.post("/generate-futureme", async (req, res) => {
  try {
    const { name, age, goal, struggle, oneYearVision, tone } = req.body;

    // Validation
    if (!name || !age || !goal || !struggle || !oneYearVision || !tone) {
      return res.status(400).json({
        success: false,
        error: "All fields (name, age, goal, struggle, oneYearVision, tone) are required."
      });
    }

    const toneDescription = toneMapping[tone] || tone;

    const prompt = `You are FutureMe, the future successful version of the user. You are not a generic motivational coach. You speak with emotional intelligence, clarity, and deep personal understanding. Your job is to help the user see who they are becoming, what they must change, and what they should do next.

Write as if you are the user’s future self speaking directly to their current self.

Tone selected by user: ${toneDescription}

User details:
Name: ${name}
Age: ${age}
Goal: ${goal}
Current struggle: ${struggle}
One-year vision: ${oneYearVision}

Return only valid JSON in this exact format:
{
  "message": "A powerful 120-180 word message from the future self.",
  "futureIdentity": "A concise description of who the user is becoming.",
  "nextMoves": ["Action 1", "Action 2", "Action 3"],
  "habit": "One small daily habit they should start today.",
  "warning": "One mistake their future self warns them about.",
  "mantra": "A short memorable line they can repeat daily."
}

Make it specific. Avoid generic motivation. Avoid clichés. Make it emotional but practical.`;

    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: { responseMimeType: "application/json" }
    });

    const result = await model.generateContent(prompt);
    const responseText = await result.response.text();
    
    // Parse response
    const cleanedText = cleanGeminiJSON(responseText);
    const parsedData = JSON.parse(cleanedText);

    return res.json({
      success: true,
      data: parsedData
    });

  } catch (error) {
    console.error("Error in /api/generate-futureme:", error);
    return res.status(500).json({
      success: false,
      error: "FutureMe could not respond right now. Try again."
    });
  }
});

// API Endpoint 2: Chat with FutureMe
router.post("/chat-futureme", async (req, res) => {
  try {
    const { userProfile, chatHistory, question } = req.body;

    // Validation
    if (!userProfile || !question) {
      return res.status(400).json({
        success: false,
        error: "UserProfile and question are required."
      });
    }

    const { name, age, goal, struggle, oneYearVision, tone } = userProfile;
    const toneDescription = toneMapping[tone] || tone;

    // Format chat history
    let historyFormatted = "";
    if (chatHistory && chatHistory.length > 0) {
      historyFormatted = chatHistory.map(item => {
        const roleName = item.role === "user" ? "User (Current Self)" : "FutureMe (Future Self)";
        return `${roleName}: ${item.message || item.reply}`;
      }).join("\n");
    } else {
      historyFormatted = "(No prior chat history)";
    }

    const prompt = `You are FutureMe, the future version of the user who already achieved their one-year vision. Reply directly to the user’s question. Be personal, sharp, honest, and useful. Do not sound like a normal AI assistant. Do not mention that you are Gemini or an AI model. Speak like the user's future self.

User profile:
Name: ${name}
Age: ${age}
Goal: ${goal}
Struggle: ${struggle}
One-year vision: ${oneYearVision}
Tone: ${toneDescription}

Recent chat history:
${historyFormatted}

Current question:
${question}

Reply in 2-5 short paragraphs. Give at least one clear action.`;

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const result = await model.generateContent(prompt);
    const replyText = await result.response.text();

    return res.json({
      success: true,
      reply: replyText.trim()
    });

  } catch (error) {
    console.error("Error in /api/chat-futureme:", error);
    return res.status(500).json({
      success: false,
      error: "FutureMe could not respond right now. Try again."
    });
  }
});

// Health check endpoint
router.get("/health", (req, res) => {
  res.json({ status: "ok", time: new Date() });
});

// Mount the router with multiple prefixes to support local and serverless paths safely
app.use("/api", router);
app.use("/.netlify/functions/api", router);
app.use("/", router);

// Fallback to serve index.html on root access (for local running)
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/index.html"));
});

// Export Express app
module.exports = app;

// Listen only when script is run directly
if (require.main === module) {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });
}
