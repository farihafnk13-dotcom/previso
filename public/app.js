const views = {
  home: document.getElementById("homeView"),
  check: document.getElementById("checkView"),
  analyzing: document.getElementById("loadingView"),
  report: document.getElementById("reportView"),
  message: document.getElementById("messageView")
};

let uploaded = [];
let latestReport = null;
let currentLanguage = "en";
let messageEnglish = "";
let messageBangla = "";

function showView(name) {
  Object.values(views).forEach(v => v.classList.remove("active"));
  (views[name] || views.home).classList.add("active");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

document.addEventListener("click", (event) => {
  const viewButton = event.target.closest("[data-view]");
  if (viewButton) {
    event.preventDefault();
    showView(viewButton.dataset.view);
  }
  const scrollButton = event.target.closest("[data-scroll]");
  if (scrollButton) {
    event.preventDefault();
    showView("home");
    setTimeout(() => document.getElementById(scrollButton.dataset.scroll)?.scrollIntoView({ behavior: "smooth" }), 80);
  }
});

const uploadInputs = [
  { id: "adsFiles", label: "Product advertisement" },
  { id: "chatFiles", label: "Seller conversation" },
  { id: "termsFiles", label: "Purchase terms" }
];

uploadInputs.forEach(group => {
  document.getElementById(group.id).addEventListener("change", (event) => {
    const newFiles = Array.from(event.target.files || []);
    const error = document.getElementById("formError");
    error.textContent = "";
    for (const file of newFiles) {
      if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
        error.textContent = `${file.name}: only JPG, PNG and WEBP images are supported.`;
        continue;
      }
      if (file.size > 5 * 1024 * 1024) {
        error.textContent = `${file.name}: image must be 5 MB or smaller.`;
        continue;
      }
      if (uploaded.length >= 5) {
        error.textContent = "You can upload a maximum of 5 images.";
        break;
      }
      uploaded.push({ file, label: group.label, id: crypto.randomUUID() });
    }
    event.target.value = "";
    renderFiles();
  });
});


const dropHint = document.getElementById("dropHint");
["dragenter", "dragover"].forEach(name => dropHint.addEventListener(name, event => {
  event.preventDefault();
  dropHint.classList.add("drag-over");
}));
["dragleave", "drop"].forEach(name => dropHint.addEventListener(name, event => {
  event.preventDefault();
  dropHint.classList.remove("drag-over");
}));
dropHint.addEventListener("drop", event => {
  const files = Array.from(event.dataTransfer.files || []);
  const error = document.getElementById("formError");
  error.textContent = "";
  for (const file of files) {
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      error.textContent = `${file.name}: only JPG, PNG and WEBP images are supported.`;
      continue;
    }
    if (file.size > 5 * 1024 * 1024) {
      error.textContent = `${file.name}: image must be 5 MB or smaller.`;
      continue;
    }
    if (uploaded.length >= 5) {
      error.textContent = "You can upload a maximum of 5 images.";
      break;
    }
    uploaded.push({ file, label: "Other evidence", id: crypto.randomUUID() });
  }
  renderFiles();
});

function renderFiles() {
  const list = document.getElementById("fileList");
  list.innerHTML = "";
  uploaded.forEach(item => {
    const row = document.createElement("div");
    row.className = "file-item";
    const image = document.createElement("img");
    image.src = URL.createObjectURL(item.file);
    image.alt = "";
    const name = document.createElement("span");
    name.textContent = `${item.label} · ${item.file.name}`;
    const remove = document.createElement("button");
    remove.type = "button";
    remove.setAttribute("aria-label", `Remove ${item.file.name}`);
    remove.textContent = "×";
    remove.addEventListener("click", () => {
      uploaded = uploaded.filter(file => file.id !== item.id);
      renderFiles();
    });
    row.append(image, name, remove);
    list.appendChild(row);
  });
}

document.getElementById("analysisForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const error = document.getElementById("formError");
  error.textContent = "";
  if (!uploaded.length) {
    error.textContent = "Please upload at least one screenshot before continuing.";
    return;
  }

  const button = document.getElementById("analyzeButton");
  button.disabled = true;
  button.innerHTML = "Analysing your evidence…";
  showView("analyzing");
  animateProgress();

  const formData = new FormData();
  uploaded.forEach(item => {
    formData.append("evidence", item.file);
  });
  formData.append("labels", JSON.stringify(uploaded.map(item => item.label)));
  formData.append("productName", document.getElementById("productName").value.trim());
  formData.append("category", document.getElementById("category").value);
  formData.append("language", document.querySelector('input[name="language"]:checked').value);

  try {
    const response = await fetch("/api/analyze", { method: "POST", body: formData });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Analysis could not be completed.");
    latestReport = data;
    currentLanguage = document.querySelector('input[name="language"]:checked').value;
    renderReport(data);
    setTimeout(() => showView("report"), 450);
  } catch (err) {
    clearInterval(progressTimer);
    showView("check");
    error.textContent = err.message || "Something went wrong. Please try again.";
  } finally {
    button.disabled = false;
    button.innerHTML = 'Analyse my purchase <span>→</span>';
  }
});

let progressTimer;
function animateProgress() {
  const bar = document.getElementById("progressBar");
  const text = document.getElementById("loadingText");
  const steps = ["loadStep1", "loadStep2", "loadStep3"];
  let stage = 0;
  bar.style.width = "8%";
  steps.forEach((id, i) => document.getElementById(id).classList.toggle("current", i === 0));
  clearInterval(progressTimer);
  progressTimer = setInterval(() => {
    stage = Math.min(stage + 1, 2);
    bar.style.width = ["8%", "48%", "78%"][stage];
    text.textContent = ["Reading your uploaded screenshots...", "Comparing the information across sources...", "Preparing your evidence-based report..."][stage];
    steps.forEach((id, i) => document.getElementById(id).classList.toggle("current", i === stage));
    if (stage === 2) clearInterval(progressTimer);
  }, 1700);
}

function safe(value, fallback = "Not found in the provided evidence") {
  return value === null || value === undefined || value === "" ? fallback : String(value);
}
function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));
}
function renderReport(data) {
  const statusMap = {
    clear_based_on_available_evidence: ["Clear based on available evidence", "The provided screenshots did not reveal a clear contradiction. This is not a guarantee.", "ok"],
    needs_clarification: ["Needs clarification", "Some details should be confirmed with the seller before paying.", "warn"],
    important_issues_found: ["Important issues found", "Review these findings carefully and clarify the details before deciding.", "danger"],
    insufficient_evidence: ["Insufficient evidence", "There is not enough readable information to make a useful comparison.", "warn"]
  };
  const status = statusMap[data.overall_status] || statusMap.insufficient_evidence;
  const findings = Array.isArray(data.findings) ? data.findings : [];
  const missing = Array.isArray(data.missing_information) ? data.missing_information : [];
  const questions = Array.isArray(data.clarification_questions) ? data.clarification_questions : [];
  const summary = data.purchase_summary || {};

  const findingsHtml = findings.length ? findings.map(f => `
    <article class="finding">
      <div class="finding-title"><h4>${escapeHtml(f.title || "Finding")}</h4><span class="severity ${escapeHtml(f.severity || "medium")}">${escapeHtml(f.severity || "medium")}</span></div>
      <p>${escapeHtml(f.explanation || "")}</p>
      ${(Array.isArray(f.evidence) ? f.evidence : []).map(e => `<div class="evidence-quote-box"><small>${escapeHtml(e.source_id || "SOURCE")}</small>“${escapeHtml(e.quote || "No readable quote supplied")}”</div>`).join("")}
      ${f.suggested_action ? `<p class="action-text"><strong>Suggested action:</strong> ${escapeHtml(f.suggested_action)}</p>` : ""}
    </article>`).join("") : `<p class="empty-note">No clear contradiction was identified in the supplied evidence. Check the missing-information section and verify important details directly.</p>`;

  document.getElementById("reportContent").innerHTML = `
    <div class="report-status">
      <div class="status-icon ${status[2] === "ok" ? "" : status[2]}">${status[2] === "ok" ? "✓" : "!"}</div>
      <div><small>OVERALL REVIEW</small><strong>${escapeHtml(status[0])}</strong><p>${escapeHtml(status[1])}</p></div>
    </div>
    <div class="report-grid">
      <div>
        <section class="report-panel"><h3>Purchase summary</h3><div class="summary-list">
          <div><small>Product</small><strong>${escapeHtml(safe(summary.product_name, "Not identified"))}</strong></div>
          <div><small>Advertised price</small><strong>${escapeHtml(safe(summary.advertised_price))}</strong></div>
          <div><small>Delivery charge</small><strong>${escapeHtml(safe(summary.delivery_charge))}</strong></div>
          <div><small>Currency</small><strong>${escapeHtml(safe(summary.currency, "Not specified"))}</strong></div>
        </div></section>
        <section class="report-panel"><h3>What needs attention</h3>${findingsHtml}</section>
      </div>
      <div>
        <section class="report-panel"><h3>Information not found</h3>
          ${missing.length ? missing.map(m => `<div class="missing-item"><strong>${escapeHtml(m.item || "Missing detail")}</strong><p>${escapeHtml(m.reason || "")}</p></div>`).join("") : `<p class="empty-note">No specific missing information was identified.</p>`}
        </section>
        <section class="report-panel"><h3>Questions worth asking</h3>
          ${questions.length ? `<ol class="question-list">${questions.map(q => `<li>${escapeHtml(q)}</li>`).join("")}</ol>` : `<p class="empty-note">No additional questions were generated. Consider asking the seller to confirm the final total and relevant purchase terms.</p>`}
        </section>
        <section class="report-panel"><h3>Next step</h3><p class="empty-note">You can prepare a polite message using the findings above, then edit it before sending.</p><button class="button button-primary button-wide" id="generateMessage">Generate seller message →</button></section>
      </div>
    </div>`;
  document.getElementById("generateMessage").addEventListener("click", () => {
    messageEnglish = data.seller_message || buildFallbackMessage(data, "en");
    messageBangla = buildFallbackMessage(data, "bn");
    document.getElementById("sellerMessage").value = currentLanguage === "bn" ? messageBangla : messageEnglish;
    setMessageLanguage(currentLanguage);
    showView("message");
  });
}

function buildFallbackMessage(data, language) {
  const first = (data.clarification_questions || [])[0];
  if (language === "bn") {
    const question = first ? `\n\nআমি আরও জানতে চাই: ${first}` : "";
    return `আসসালামু আলাইকুম। অর্ডার করার আগে কয়েকটি বিষয় নিশ্চিত হতে চাই। পণ্যের চূড়ান্ত মূল্য, ডেলিভারি চার্জ এবং প্রযোজ্য শর্তগুলো কি অনুগ্রহ করে নিশ্চিত করবেন?${question}\n\nধন্যবাদ।`;
  }
  const question = first ? `\n\nCould you also clarify: ${first}` : "";
  return `Hello! Before placing my order, I'd like to confirm a few details. Could you please confirm the final product price, delivery charge, and applicable purchase terms?${question}\n\nThank you.`;
}

function setMessageLanguage(lang) {
  currentLanguage = lang;
  document.querySelectorAll(".message-lang").forEach(btn => btn.classList.toggle("active", btn.dataset.lang === lang));
  document.getElementById("sellerMessage").value = lang === "bn" ? messageBangla : messageEnglish;
  document.getElementById("copyFeedback").textContent = "";
}
document.querySelectorAll(".message-lang").forEach(btn => {
  btn.addEventListener("click", () => {
    const current = document.getElementById("sellerMessage").value;
    if (currentLanguage === "bn") messageBangla = current;
    else messageEnglish = current;
    setMessageLanguage(btn.dataset.lang);
  });
});

document.getElementById("copyMessage").addEventListener("click", async () => {
  const text = document.getElementById("sellerMessage").value;
  try {
    await navigator.clipboard.writeText(text);
    document.getElementById("copyFeedback").textContent = "Message copied to clipboard.";
  } catch {
    document.getElementById("sellerMessage").select();
    document.getElementById("copyFeedback").textContent = "Select and copy the message manually.";
  }
});
document.getElementById("printReport").addEventListener("click", () => window.print());

document.getElementById("headerLanguage").addEventListener("click", () => {
  alert("The interface is currently in English. Bangla analysis and seller-message output can be selected on the purchase review page.");
});
