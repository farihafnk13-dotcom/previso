require("dotenv").config();
const express = require("express");
const multer = require("multer");
const path = require("path");
const { GoogleGenAI } = require("@google/genai");

const app = express();
const PORT = process.env.PORT || 3000;
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 5 },
  fileFilter: (req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (allowed.includes(file.mimetype)) return cb(null, true);
    cb(new Error("Only JPG, PNG and WEBP images are supported."));
  }
});

app.use(express.static(path.join(__dirname, "public")));
app.use(express.json());
app.get("/api/health", (req, res) => {
  res.json({ ok: true, aiConfigured: Boolean(process.env.GEMINI_API_KEY) });
});

function extractJson(text) {
  const cleaned = String(text || "").trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "");
  return JSON.parse(cleaned);
}

app.post("/api/analyze", upload.array("evidence", 5), async (req, res) => {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return res.status(503).json({
        error: "Gemini API is not configured. Add GEMINI_API_KEY to your environment secrets and restart the app."
      });
    }
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: "Please upload at least one screenshot." });
    }

    const labels = JSON.parse(req.body.labels || "[]");
    const productName = req.body.productName || "";
    const category = req.body.category || "Other";
    const language = req.body.language === "bn" ? "Bangla" : "English";

    if (!Array.isArray(labels) || labels.length !== req.files.length) {
      return res.status(400).json({ error: "Evidence labels could not be matched to the uploaded images. Please try again." });
    }
    const counters = { A: 0, B: 0, T: 0, E: 0 };
    const evidenceParts = req.files.map((file, index) => {
      const label = String(labels[index] || "Other evidence");
      const lower = label.toLowerCase();
      const prefix = lower.includes("advert") ? "A" :
                     lower.includes("conversation") ? "B" :
                     lower.includes("terms") ? "T" : "E";
      counters[prefix] += 1;
      return { file, sourceId: `${prefix}${counters[prefix]}`, label };
    });

    const instructions = `
You are Previso, an evidence-based consumer purchase assistant for Bangladesh social-commerce purchases.
Analyze the attached screenshots. Understand Bangla, English and Banglish.
Product name supplied by user: ${productName || "Not supplied"}.
Category: ${category}.
Write explanations and seller message in ${language}.

Rules:
- Extract ONLY information visibly present. Never invent details.
- Compare advertisements, seller conversations and purchase terms.
- Separate contradictions, missing information and unclear/unreadable information.
- Each finding must cite source IDs and short exact visible quotes. If a quote cannot be read confidently, say so and do not fabricate it.
- Do not call anyone a scammer, do not guarantee seller authenticity, product quality or delivery, and do not give legal advice.
- Do not produce numerical safety scores or unsupported risk percentages.
- If evidence is insufficient, say so.
- Be practical, calm, and non-accusatory.
Return ONLY valid JSON matching this exact structure:
{
 "purchase_summary":{"product_name":null,"advertised_price":null,"delivery_charge":null,"currency":"BDT"},
 "overall_status":"clear_based_on_available_evidence|needs_clarification|important_issues_found|insufficient_evidence",
 "findings":[{"id":"finding_1","type":"contradiction|unclear_information","severity":"low|medium|high","title":"...","explanation":"...","evidence":[{"source_id":"A1","quote":"..."}],"suggested_action":"..."}],
 "missing_information":[{"item":"...","reason":"..."}],
 "clarification_questions":["..."],
 "seller_message":"..."
}
For the source IDs, use the labels shown immediately before each image. Do not invent IDs.
If no contradictions are found, findings must be an empty array. Return concise useful results.
`;

    const parts = [{ text: instructions }];
    for (const item of evidenceParts) {
      parts.push({ text: `Evidence source ${item.sourceId}; category: ${item.label}. Read this image as part of the same purchase.` });
      parts.push({
        inlineData: {
          mimeType: item.file.mimetype,
          data: item.file.buffer.toString("base64")
        }
      });
    }

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const response = await ai.models.generateContent({
      model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
      contents: [{ role: "user", parts }],
      config: { responseMimeType: "application/json", temperature: 0.2 }
    });

    const result = extractJson(response.text);
    if (!result || !Array.isArray(result.findings) ||
        !Array.isArray(result.missing_information) ||
        !Array.isArray(result.clarification_questions)) {
      throw new Error("The AI returned an unexpected report format. Please try again.");
    }

    res.json(result);
  } catch (error) {
    console.error("Analysis error:", error.message);
    const message = error.code === "LIMIT_FILE_SIZE"
      ? "Each image must be 5 MB or smaller."
      : error.message || "Analysis failed. Please try again.";
    res.status(500).json({ error: message });
  }
});

app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    const message = err.code === "LIMIT_FILE_SIZE" ? "Each image must be 5 MB or smaller." :
      err.code === "LIMIT_FILE_COUNT" ? "You can upload a maximum of 5 images." : "Upload could not be completed.";
    return res.status(400).json({ error: message });
  }
  if (err) return res.status(400).json({ error: err.message || "Invalid upload." });
  next();
});

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
  console.log(`Previso is running at http://localhost:${PORT}`);
});
