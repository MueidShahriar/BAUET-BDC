const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { GoogleGenerativeAI } = require('@google/generative-ai');

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.warn('GEMINI_API_KEY is missing. Set it in .env');
}

const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

const SYSTEM_PROMPT = `You are BAUET Blood Donation Assistant for BAUET Blood Donation Community (BAUET BDC).

GOALS:
- Answer blood donation questions accurately
- Guide users through website features
- Help users find donors
- Explain eligibility rules
- Provide health precautions
- Explain blood groups
- Answer FAQs
- Handle greetings naturally
- Support Bangla and English
- Use website data as knowledge source

RULES:
- Never hallucinate information
- If information is unknown, say: "I couldn't find verified information."
- Keep answers concise and helpful
- Detect language automatically and reply in the user's language
- Do not provide medical diagnosis; suggest consulting professionals when needed
- Ask 1–2 short clarifying questions when details are missing
- If the user uses Banglish, reply in natural Romanized Bangla/Banglish only
- Sound like a real conversational assistant, not a preset FAQ bot
- Answer the user's exact question first, then add only the most relevant detail
- Do not reuse the same opener every time
- Avoid sounding robotic, over-formatted, or copy-pasted
- Use the provided context as support, but write the final answer naturally in your own words
- If private user context is provided, use it only to personalize the current user's reply
- Do not expose, announce, or invent private profile details
- Use the user's first name occasionally when appropriate, not in every message

ELIGIBILITY:
- Age: 18–65
- Weight: minimum 50 kg
- Donation interval: 4 months for whole blood
- Hemoglobin requirements: follow local screening at donation time

WEBSITE PAGES:
About, Donation Guide, Events, Join, Search, Leaderboard, Contact

FAQ:
Q: Who are you?
A: I am BAUET Blood Donation Assistant.
Q: What can you do?
A: I can help with donor search, blood donation information, and website guidance.

If asked how to become a donor: Go to Join → Fill registration form → Submit.`;

function buildLangInstruction(lang, overrideInstruction) {
  if (overrideInstruction) return overrideInstruction;
  if (lang === 'bangla') {
    return 'LANGUAGE: Reply in Bengali script only. Do not use English sentences.';
  }
  if (lang === 'banglish') {
    return 'LANGUAGE: Reply in Bangla + English mix (Banglish). Use friendly, natural Romanized Bengali with some English terms.';
  }
  return 'LANGUAGE: Reply in clear, well-structured English.';
}

function buildHistoryText(history) {
  if (!Array.isArray(history) || history.length === 0) return '';
  const lines = history
    .map(item => {
      const role = item?.role === 'model' ? 'Assistant' : 'User';
      const text = item?.parts?.[0]?.text || '';
      return text ? `${role}: ${text}` : '';
    })
    .filter(Boolean)
    .slice(-10);
  return lines.length ? `\n\nConversation so far:\n${lines.join('\n')}` : '';
}

app.post('/chat', async (req, res) => {
  try {
    const message = String(req.body?.message || '').trim();
    const context = String(req.body?.context || '').trim();
    const userContext = String(req.body?.userContext || '').trim();
    const lang = String(req.body?.lang || '').trim().toLowerCase();
    const langInstruction = buildLangInstruction(lang, req.body?.langInstruction);
    const historyText = buildHistoryText(req.body?.history);
    if (!message) {
      res.status(400).json({ reply: 'Message is required.' });
      return;
    }
    if (!genAI) {
      res.status(500).json({ reply: 'Server is missing GEMINI_API_KEY.' });
      return;
    }

    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: {
        temperature: 0.9,
        topP: 0.95
      }
    });
    const contextBlock = context ? `\n\nContext:\n${context}` : '';
    const userContextBlock = userContext ? `\n\nPrivate user context:\n${userContext}` : '';
    const prompt = `${SYSTEM_PROMPT}\n\n${langInstruction}${historyText}${contextBlock}${userContextBlock}\n\nUser: ${message}`;
    const result = await model.generateContentStream(prompt);

    res.status(200);
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Transfer-Encoding', 'chunked');
    res.setHeader('Cache-Control', 'no-cache, no-transform');

    let sentAnyChunk = false;
    for await (const chunk of result.stream) {
      const text = chunk?.text?.() || '';
      if (!text) continue;
      sentAnyChunk = true;
      res.write(text);
    }

    if (!sentAnyChunk) {
      const fallback = await result.response;
      const reply = fallback?.text?.() || "I couldn't find verified information.";
      res.write(reply);
    }

    res.end();
  } catch (error) {
    if (!res.headersSent) {
      res.status(500).send(error.message || 'Server error.');
      return;
    }
    res.write(`\n\n${error.message || 'Server error.'}`);
    res.end();
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
