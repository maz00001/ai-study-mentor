/* =============================================
   AI Study Mentor — script.js
   Author: AI Study Mentor Team
   Description: Handles all AI API calls,
   speech recognition, and UI interactions.
   ============================================= */

// ─────────────────────────────────────────────
//  API CONFIGURATION
//  This app uses the Anthropic Claude API.
//  The API key is managed securely by the
//  Anthropic claude.ai platform and does NOT
//  need to be set here when running inside
//  Claude artifacts or the AI-powered app.
//
//  If running STANDALONE (outside Claude),
//  uncomment and set your key below, OR
//  use a backend proxy (recommended for safety).
//
//  NEVER commit an API key to GitHub!
// ─────────────────────────────────────────────
const API_URL = "https://api.anthropic.com/v1/messages";
const MODEL   = "claude-sonnet-4-20250514";

/**
 * Calls the Claude AI API with a given prompt.
 * @param {string} userPrompt  - The message to send to the AI
 * @param {string} systemPrompt - Optional system instruction
 * @returns {Promise<string>} - The AI's response text
 */
async function callAI(userPrompt, systemPrompt = "") {
  const body = {
    model: MODEL,
    max_tokens: 1500,
    system: systemPrompt || "You are a helpful AI study mentor for Nigerian university students. Be clear, structured, and encouraging.",
    messages: [
      { role: "user", content: userPrompt }
    ]
  };

  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
      // NOTE: The API key is injected automatically by
      // the Anthropic platform when this runs inside claude.ai.
      // For standalone use, add:
      // "x-api-key": "YOUR_API_KEY_HERE",
      // "anthropic-version": "2023-06-01",
      // "anthropic-dangerous-direct-browser-access": "true"
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err?.error?.message || `API error: ${response.status}`);
  }

  const data = await response.json();
  // Extract text from the response content array
  const text = data.content
    .filter(block => block.type === "text")
    .map(block => block.text)
    .join("\n");

  return text;
}

// ─────────────────────────────────────────────
//  OUTPUT HELPERS
// ─────────────────────────────────────────────

/** Shows a loading spinner in the output box */
function setLoading(outputId) {
  const box = document.getElementById(outputId);
  box.className = "output-box loading";
  box.innerHTML = `
    <div class="loader">
      <div class="spinner"></div>
      <span>AI is thinking… please wait</span>
    </div>`;
}

/** Renders the AI's plain-text response as structured HTML */
function renderOutput(outputId, text) {
  const box = document.getElementById(outputId);
  box.className = "output-box has-content";

  // Convert basic markdown-like formatting to HTML
  let html = text
    // Headers: lines starting with ## or ###
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h3>$1</h3>')
    .replace(/^# (.+)$/gm, '<h3>$1</h3>')
    // Bold **text**
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    // Bullet points
    .replace(/^[-•*] (.+)$/gm, '<li>$1</li>')
    // Numbered lists
    .replace(/^\d+\. (.+)$/gm, '<li>$1</li>')
    // Wrap consecutive <li> in <ul>
    .replace(/(<li>[\s\S]*?<\/li>)(\s*)(?=<li>|$)/g, '$1$2')
    // Paragraphs: double newlines
    .split('\n\n')
    .map(para => para.trim())
    .filter(Boolean)
    .map(para => {
      if (para.startsWith('<h3>') || para.startsWith('<li>')) return para;
      if (para.includes('<li>')) return `<ul>${para}</ul>`;
      return `<p>${para.replace(/\n/g, '<br>')}</p>`;
    })
    .join('\n');

  // Wrap loose <li> tags in <ul>
  html = html.replace(/(<li>.*?<\/li>)/gs, match => `<ul>${match}</ul>`);

  box.innerHTML = html;
}

/** Shows an error in the output box */
function renderError(outputId, message) {
  const box = document.getElementById(outputId);
  box.className = "output-box";
  box.innerHTML = `<p style="color:#c0392b;font-weight:600;">⚠️ ${message}</p>
    <p style="color:#888;font-size:0.85rem;margin-top:8px;">
      Make sure you're using this app via the AI Study Mentor platform, 
      or configure your API key in script.js for standalone use.
    </p>`;
}

/** Disables/enables a button during loading */
function setButtonState(btnEl, loading) {
  if (loading) {
    btnEl.disabled = true;
    btnEl.dataset.originalText = btnEl.innerHTML;
    btnEl.innerHTML = `<div class="spinner" style="width:16px;height:16px;border-width:2px;border-color:rgba(255,255,255,0.3);border-top-color:#fff;display:inline-block;border-radius:50%;animation:spin 0.8s linear infinite;"></div> Working…`;
  } else {
    btnEl.disabled = false;
    btnEl.innerHTML = btnEl.dataset.originalText || btnEl.innerHTML;
  }
}

// ─────────────────────────────────────────────
//  TOOL 1: STUDY PLAN GENERATOR
// ─────────────────────────────────────────────
async function generateStudyPlan() {
  const course   = document.getElementById("course-name").value.trim();
  const examDate = document.getElementById("exam-date").value;

  if (!course) {
    alert("Please enter a course name.");
    return;
  }
  if (!examDate) {
    alert("Please select your exam date.");
    return;
  }

  const today    = new Date().toISOString().split("T")[0];
  const daysLeft = Math.ceil((new Date(examDate) - new Date(today)) / (1000 * 60 * 60 * 24));

  if (daysLeft <= 0) {
    alert("Please select a future exam date.");
    return;
  }

  const btn = document.querySelector("#study-plan-section .btn");
  setButtonState(btn, true);
  setLoading("study-plan-output");

  const prompt = `
You are an expert academic tutor for Nigerian university students.

A student is preparing for their **${course}** exam in **${daysLeft} days** (exam date: ${examDate}).

Create a practical, day-by-day study plan. Structure it as follows:

## Study Plan Overview
(Brief 2-sentence motivational intro)

## Phase 1: Foundation (Days 1–${Math.floor(daysLeft * 0.4)})
- Daily reading suggestions (specific topics to cover each day)
- Key concepts to focus on

## Phase 2: Practice (Days ${Math.floor(daysLeft * 0.4) + 1}–${Math.floor(daysLeft * 0.7)})
- Past question practice sessions
- Topic review exercises

## Phase 3: Revision (Days ${Math.floor(daysLeft * 0.7) + 1}–${daysLeft})
- Final revision schedule
- Day-before-exam tips

## Quick Tips
- 3 specific tips for ${course} success

Keep it encouraging, realistic, and tailored to Nigerian university culture.
`;

  try {
    const result = await callAI(prompt);
    renderOutput("study-plan-output", result);
  } catch (err) {
    renderError("study-plan-output", err.message);
  } finally {
    setButtonState(btn, false);
  }
}

// ─────────────────────────────────────────────
//  TOOL 2: PAST QUESTION EXPLAINER
// ─────────────────────────────────────────────
async function explainQuestion() {
  const question = document.getElementById("past-question").value.trim();

  if (!question) {
    alert("Please paste a past exam question.");
    return;
  }

  const btn = document.querySelector("#past-question-section .btn");
  setButtonState(btn, true);
  setLoading("past-question-output");

  const prompt = `
You are an expert tutor helping a Nigerian university student understand an exam question.

**Question:** ${question}

Provide a thorough breakdown in this format:

## What the Question is Asking
(Plain-English explanation of what the examiner wants)

## Step-by-Step Answer
(Solve or answer the question step by step, numbered clearly)

## Key Concepts
(2–4 bullet points of the core theory/concepts behind this question)

## Concept Summary
(One clear paragraph summarising the topic for revision)

## Common Mistakes to Avoid
(2–3 bullet points of pitfalls students often make on this type of question)

Use simple, clear language suitable for a Nigerian university student.
`;

  try {
    const result = await callAI(prompt);
    renderOutput("past-question-output", result);
  } catch (err) {
    renderError("past-question-output", err.message);
  } finally {
    setButtonState(btn, false);
  }
}

// ─────────────────────────────────────────────
//  TOOL 3: LECTURE NOTE SUMMARISER
// ─────────────────────────────────────────────
async function summariseNotes() {
  const notes = document.getElementById("lecture-notes").value.trim();

  if (!notes || notes.length < 50) {
    alert("Please paste your lecture notes (at least a paragraph).");
    return;
  }

  const btn = document.querySelector("#note-summariser-section .btn");
  setButtonState(btn, true);
  setLoading("note-summariser-output");

  const prompt = `
You are an expert academic tutor. A Nigerian university student has provided lecture notes.

**Lecture Notes:**
${notes}

Produce the following:

## Summary
(A clear, concise 3–5 sentence summary of the entire lecture)

## Key Points
(8–12 bullet points of the most important facts, definitions, and concepts)

## Topic Headings
(List the main topics/sections covered in this lecture)

## Practice Questions
Generate exactly 3 exam-style practice questions based on this lecture:
1. (Question 1)
2. (Question 2)
3. (Question 3)

## Revision Tip
(One sentence on the most important thing to remember from this lecture)

Keep language simple and clear for Nigerian university students.
`;

  try {
    const result = await callAI(prompt);
    renderOutput("note-summariser-output", result);
  } catch (err) {
    renderError("note-summariser-output", err.message);
  } finally {
    setButtonState(btn, false);
  }
}

// ─────────────────────────────────────────────
//  TOOL 4: LECTURE RECORDING TO NOTES
// ─────────────────────────────────────────────

// -- Speech Recognition setup --
let recognition = null;
let isRecording = false;
let recordTimer = null;
let recordSeconds = 0;

/**
 * Initialises the Web Speech API (SpeechRecognition).
 * Falls back gracefully if unsupported.
 */
function initSpeechRecognition() {
  // Check for browser support
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SpeechRecognition) {
    return null; // Not supported
  }

  const rec = new SpeechRecognition();
  rec.continuous      = true;   // Keep listening
  rec.interimResults  = true;   // Show partial results
  rec.lang            = "en-NG"; // Nigerian English, falls back to en-US

  // Append words as they come in
  rec.onresult = (event) => {
    let transcript = "";
    for (let i = 0; i < event.results.length; i++) {
      transcript += event.results[i][0].transcript + " ";
    }
    document.getElementById("transcript-text").value = transcript.trim();
  };

  rec.onerror = (event) => {
    console.warn("Speech recognition error:", event.error);
    if (isRecording) stopRecording();
  };

  rec.onend = () => {
    if (isRecording) stopRecording();
  };

  return rec;
}

/** Starts or stops the recording */
function toggleRecording() {
  if (isRecording) {
    stopRecording();
  } else {
    startRecording();
  }
}

function startRecording() {
  recognition = initSpeechRecognition();

  if (!recognition) {
    // Browser doesn't support speech recognition — inform user
    alert("⚠️ Your browser does not support live speech recognition.\n\nTip: Use Google Chrome for best results, or paste the transcribed text manually into the text box below.");
    return;
  }

  recognition.start();
  isRecording = true;

  // Update UI
  const btn = document.getElementById("record-btn");
  btn.classList.add("recording");
  document.getElementById("record-icon").textContent = "⏹";
  document.getElementById("record-label").textContent = "Stop Recording";

  // Start timer
  recordSeconds = 0;
  recordTimer = setInterval(() => {
    recordSeconds++;
    const mins = String(Math.floor(recordSeconds / 60)).padStart(2, "0");
    const secs = String(recordSeconds % 60).padStart(2, "0");
    document.getElementById("record-timer").textContent = `${mins}:${secs}`;
  }, 1000);
}

function stopRecording() {
  if (recognition) recognition.stop();
  isRecording = false;

  // Reset UI
  const btn = document.getElementById("record-btn");
  btn.classList.remove("recording");
  document.getElementById("record-icon").textContent = "🔴";
  document.getElementById("record-label").textContent = "Start Recording";

  clearInterval(recordTimer);
}

/** Handles audio file upload (reads filename; full STT requires a backend) */
function handleAudioUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  document.getElementById("file-name-display").textContent = `✅ ${file.name}`;

  // NOTE: Browser-side audio-to-text for uploaded files requires a
  // backend service (e.g. OpenAI Whisper, Google Speech-to-Text).
  // For this prototype, we prompt the user to paste the transcript,
  // OR we use what's in the transcript text area.
  //
  // To add Whisper support:
  //   1. Send the file to your backend
  //   2. Backend calls: POST https://api.openai.com/v1/audio/transcriptions
  //   3. Return transcript to frontend
  //   4. Set document.getElementById("transcript-text").value = transcript

  document.getElementById("transcript-text").placeholder =
    `File "${file.name}" selected.\n\nFor uploaded audio files, paste the transcript here (or use the live recording feature in Chrome for automatic transcription).`;
}

/** Converts the transcript text into structured lecture notes using AI */
async function convertRecordingToNotes() {
  const transcript = document.getElementById("transcript-text").value.trim();

  if (!transcript || transcript.length < 30) {
    alert("Please record audio or paste a lecture transcript in the text box first.");
    return;
  }

  const btn = document.querySelector("#recording-section .btn:last-of-type");
  setButtonState(btn, true);
  setLoading("recording-output");

  const prompt = `
You are an expert academic note-taker for Nigerian university students.

Below is a transcript from a lecture recording. Convert it into clean, structured lecture notes.

**Transcript:**
${transcript}

Format the notes as follows:

## Lecture Title
(Infer a suitable title from the content)

## Topic Headings
(Break the lecture into clear topic sections with headings)

## Structured Notes
(For each topic, write organised bullet-point notes)

## Key Points to Remember
(8–10 of the most important facts from this lecture)

## Definitions
(Any key terms or definitions mentioned — list them clearly)

## Summary
(3–4 sentence summary of the entire lecture)

Make the notes clear, organised, and easy to revise from.
`;

  try {
    const result = await callAI(prompt);
    renderOutput("recording-output", result);
  } catch (err) {
    renderError("recording-output", err.message);
  } finally {
    setButtonState(btn, false);
  }
}

// ─────────────────────────────────────────────
//  TOOL 5: SEMESTER STUDY PLANNER
// ─────────────────────────────────────────────
async function generateSemesterPlan() {
  const syllabus  = document.getElementById("semester-syllabus").value.trim();
  const duration  = document.getElementById("semester-duration").value.trim();

  if (!syllabus || syllabus.length < 30) {
    alert("Please paste your semester syllabus or course outline.");
    return;
  }
  if (!duration || isNaN(duration) || duration < 1) {
    alert("Please enter a valid semester duration in weeks.");
    return;
  }

  const btn = document.querySelector("#semester-planner-section .btn");
  setButtonState(btn, true);
  setLoading("semester-plan-output");

  const prompt = `
You are an expert academic planner for Nigerian university students.

A student has a **${duration}-week semester** and the following syllabus/course materials:

**Syllabus:**
${syllabus}

Create a comprehensive semester study plan:

## Semester Overview
(Brief overview of the semester strategy)

## Weekly Study Schedule
Create a week-by-week breakdown for all ${duration} weeks:
- Week 1–${Math.ceil(duration * 0.6)}: Topic coverage (list which topics each week)
- Week ${Math.ceil(duration * 0.6) + 1}–${Math.ceil(duration * 0.8)}: Practice and assignments
- Week ${Math.ceil(duration * 0.8) + 1}–${duration}: Revision and exam preparation

## Topic Breakdown
(How many days/sessions each major topic deserves)

## Suggested Revision Periods
(Specific weeks/dates recommended for mid-semester and end-of-semester revision)

## Study Tips
(5 practical tips for Nigerian university students to stay consistent)

## Weekly Routine Template
(A sample daily schedule: morning, afternoon, evening study blocks)

Make it realistic, structured, and motivating for a Nigerian student.
`;

  try {
    const result = await callAI(prompt);
    renderOutput("semester-plan-output", result);
  } catch (err) {
    renderError("semester-plan-output", err.message);
  } finally {
    setButtonState(btn, false);
  }
}

// ─────────────────────────────────────────────
//  INITIALISATION
// ─────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  // Set today as minimum date for exam date input
  const examDateInput = document.getElementById("exam-date");
  const today = new Date().toISOString().split("T")[0];
  examDateInput.min = today;

  // Animate cards in on load
  const cards = document.querySelectorAll(".card");
  cards.forEach((card, i) => {
    card.style.opacity = "0";
    card.style.transform = "translateY(24px)";
    card.style.transition = `opacity 0.5s ease ${i * 0.1}s, transform 0.5s ease ${i * 0.1}s`;
    setTimeout(() => {
      card.style.opacity = "1";
      card.style.transform = "translateY(0)";
    }, 100);
  });

  console.log("✅ AI Study Mentor loaded successfully.");
  console.log("📚 Built for Nigerian university students.");
});
