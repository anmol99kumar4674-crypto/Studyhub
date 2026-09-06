(async function () {
  // Always load lecture data fresh. This prevents normal-browser cache
  // from showing old lectures after the admin panel updates GitHub.
  const DATA_FILES = ["economic.js", "history.js", "geography.js", "polity.js", "art-culture.js", "general-science.js", "notices.js", "current-affairs.js", "bihar-special.js", "environment.js", "essay.js", "hindi.js", "maths-di.js", "bihar-current-wallah-monthly-compilation.js", "ncert.js"];

  await Promise.all(DATA_FILES.map(file => new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `${file}?v=${Date.now()}-${Math.random().toString(36).slice(2)}`;
    script.onload = resolve;
    script.onerror = () => reject(new Error(`Failed to load ${file}`));
    document.head.appendChild(script);
  })));

const SUBJECTS = [
  "Notices",
  "Current Affairs",
  "Polity",
  "History",
  "Bihar Special",
  "Science",
  "Environment",
  "Economics",
  "Essay",
  "Hindi (हिन्दी)",
  "Maths/DI",
  "Bihar Current Wallah Monthly Compilation",
  "NCERT"
];

const ALL_LECTURES = [
  ...ECONOMIC_LECTURES.map(x => ({...x, subject:"Economics"})),
  ...HISTORY_LECTURES.map(x => ({...x, subject:"History"})),
  ...GEOGRAPHY_LECTURES.map(x => ({...x, subject:"Geography"})),
  ...POLITY_LECTURES.map(x => ({...x, subject:"Polity"})),
  ...ART_CULTURE_LECTURES.map(x => ({...x, subject:"Art & Culture"})),
  ...GENERAL_SCIENCE_LECTURES.map(x => ({...x, subject:"Science"})),
  ...NOTICES_LECTURES.map(x => ({...x, subject:"Notices"})),
  ...CURRENT_AFFAIRS_LECTURES.map(x => ({...x, subject:"Current Affairs"})),
  ...BIHAR_SPECIAL_LECTURES.map(x => ({...x, subject:"Bihar Special"})),
  ...ENVIRONMENT_LECTURES.map(x => ({...x, subject:"Environment"})),
  ...ESSAY_LECTURES.map(x => ({...x, subject:"Essay"})),
  ...HINDI_LECTURES.map(x => ({...x, subject:"Hindi (हिन्दी)"})),
  ...MATHS_DI_LECTURES.map(x => ({...x, subject:"Maths/DI"})),
  ...BIHAR_CURRENT_WALLAH_LECTURES.map(x => ({...x, subject:"Bihar Current Wallah Monthly Compilation"})),
  ...NCERT_LECTURES.map(x => ({...x, subject:"NCERT"}))
];

const LECTURES = ALL_LECTURES;

function studyhubTimeKey(){
  const d = new Date();
  return d.toISOString().slice(0,10);
}
function studyhubSessionStoreKey(name){
  return "studyhub_time_" + studyhubTimeKey() + "_" + String(name||"").trim().toLowerCase();
}
function studyhubGetAccumulated(name){
  const v = Number(localStorage.getItem(studyhubSessionStoreKey(name)) || 0);
  return Number.isFinite(v) ? v : 0;
}
function studyhubSaveAccumulated(name, seconds){
  localStorage.setItem(studyhubSessionStoreKey(name), String(Math.max(0, Math.floor(seconds))));
}

const $ = (s) => document.querySelector(s);

// Attendance is required before any study content can be opened.
const ATTENDANCE_API = "https://studyhub-admin.molkitofficial.workers.dev/api/attendance";
const ATTENDANCE_KEY = "studyhub_attendance_v1";

function attendanceTodayKey() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit"
  }).formatToParts(new Date());
  const get = type => parts.find(x => x.type === type)?.value || "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

function hasTodayAttendance() {
  try {
    const data = JSON.parse(localStorage.getItem(ATTENDANCE_KEY) || "null");
    return !!(data && data.date === attendanceTodayKey() && data.name);
  } catch (_) { return false; }
}

function lockContentForAttendance() {
  const gate = $("#attendanceGate");
  if (!gate || hasTodayAttendance()) {
    gate?.classList.add("hidden");
    document.body.classList.remove("attendance-locked");
    return;
  }
  gate.classList.remove("hidden");
  document.body.classList.add("attendance-locked");
}

async function markAttendance() {
  const input = $("#attendanceName");
  const button = $("#attendanceBtn");
  const msg = $("#attendanceMsg");
  const name = (input?.value || "").trim().replace(/\s+/g, " ");

  if (name.length < 2) {
    msg.textContent = "Apna valid naam likhiye.";
    return;
  }

  button.disabled = true;
  button.textContent = "Attendance lag rahi hai...";
  msg.textContent = "";

  try {
    // Use a CORS-safelisted content type so mobile/Incognito browsers do not
    // need a preflight request before sending the attendance request.
    // The Worker still reads the body with request.json().
    const response = await fetch(ATTENDANCE_API, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain;charset=UTF-8",
        "Accept": "application/json"
      },
      body: JSON.stringify({ name })
    });
    const result = await response.json().catch(() => ({}));

    if (!response.ok || !result.ok) {
      throw new Error(result.message || "Attendance nahi lagi.");
    }

    localStorage.setItem(ATTENDANCE_KEY, JSON.stringify({
      name, date: attendanceTodayKey()
    }));
    lockContentForAttendance();
    recordWebsiteVisit();
    startWebsiteTimeTracking();
  } catch (error) {
    msg.textContent = error.message || "Attendance server se connect nahi hua.";
  } finally {
    button.disabled = false;
    button.textContent = "Attendance Lagao";
  }
}

$("#attendanceBtn")?.addEventListener("click", markAttendance);
$("#attendanceName")?.addEventListener("keydown", e => {
  if (e.key === "Enter") markAttendance();
});


const VISIT_API = "https://studyhub-admin.molkitofficial.workers.dev/api/visit";
let visitSending = false;

async function recordWebsiteVisit() {
  if (!hasTodayAttendance() || document.visibilityState !== "visible" || visitSending) return;

  const last = Number(sessionStorage.getItem("studyhub_visit_recorded") || 0);
  // Avoid duplicate records caused by multiple startup calls in the same page load.
  if (last && Date.now() - last < 15000) return;

  let data;
  try {
    data = JSON.parse(localStorage.getItem(ATTENDANCE_KEY) || "{}");
  } catch (_) {
    data = {};
  }
  if (!data.name) return;

  visitSending = true;
  try {
    const response = await fetch(VISIT_API, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain;charset=UTF-8",
        "Accept": "application/json"
      },
      body: JSON.stringify({ name: data.name })
    });

    if (response.ok) {
      sessionStorage.setItem("studyhub_visit_recorded", String(Date.now()));
    }
  } catch (_) {
    // A failed visit will be retried on the next visible return.
  } finally {
    visitSending = false;
  }
}

/*
 * Website time tracking:
 * - Starts only after today's attendance is marked.
 * - Counts only while this page is visible.
 * - Sends small periodic heartbeats to the Worker.
 * - Does not change the existing lecture/theme logic.
 */
const TIME_API = "https://studyhub-admin.molkitofficial.workers.dev/api/time";
let timeTrackingTimer = null;
let timeLastTick = null;
let timeSending = false;

function startWebsiteTimeTracking() {
  if (!hasTodayAttendance()) return;

  timeLastTick = Date.now();

  if (timeTrackingTimer) clearInterval(timeTrackingTimer);

  timeTrackingTimer = setInterval(() => {
    sendWebsiteTimeHeartbeat(false);
  }, 60000);
}

async function sendWebsiteTimeHeartbeat(keepalive = false) {
  if (!hasTodayAttendance() || document.visibilityState !== "visible" || timeSending) {
    return;
  }

  const now = Date.now();

  if (!timeLastTick) {
    timeLastTick = now;
    return;
  }

  const seconds = Math.floor((now - timeLastTick) / 1000);

  if (seconds < 10) return;

  timeSending = true;

  try {
    const data = {
      name: JSON.parse(localStorage.getItem(ATTENDANCE_KEY) || "{}").name || "",
      seconds: Math.min(seconds, 300)
    };

    if (!data.name) return;

    const response = await fetch(TIME_API, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain;charset=UTF-8",
        "Accept": "application/json"
      },
      body: JSON.stringify(data),
      keepalive
    });

    if (response.ok) {
      timeLastTick = now;
    }
  } catch (_) {
    // Keep the unsent time so the next heartbeat can retry.
  } finally {
    timeSending = false;
  }
}

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") {
    recordWebsiteVisit();
    timeLastTick = Date.now();
    startWebsiteTimeTracking();
  } else {
    sendWebsiteTimeHeartbeat(true);
  }
});

window.addEventListener("pagehide", () => {
  sendWebsiteTimeHeartbeat(true);
});

const subjectsView = $("#subjectsView");
const lecturesView = $("#lecturesView");
const subjectGrid = $("#subjectGrid");
const chapterList = $("#chapterList");
const filters = $("#subjectFilters");
const searchInput = $("#searchInput");

const iconMap = {
  Economics:"📈",
  History:"📜",
  Geography:"🌍",
  "Art & Culture":"🏺",
  "Polity & Governance":"⚖️",
  "General Science":"🔬"
};

let activeSubject = "All";
let activeLectureSubject = null;
let activeChapter = null;

function subjects() {
  return [...new Set([...SUBJECTS, ...LECTURES.map(x => x.subject)])];
}

function getFilteredLectures() {
  const q = searchInput.value.trim().toLowerCase();

  return LECTURES
    .filter(x =>
      (activeSubject === "All" || x.subject === activeSubject) &&
      (!q || [x.title, x.subject, x.chapter]
        .join(" ")
        .toLowerCase()
        .includes(q))
    )
    .sort((a,b) =>
      (b.date || "").localeCompare(a.date || "") ||
      String(b.id).localeCompare(String(a.id))
    );
}

function renderFilters() {
  filters.innerHTML = "";

  ["All", ...subjects()].forEach(subject => {
    const button = document.createElement("button");
    button.className = "filter " + (activeSubject === subject ? "active" : "");
    button.textContent = subject;

    button.onclick = () => {
      activeSubject = subject;
      activeLectureSubject = null;
      activeChapter = null;

      history.pushState(
        {studyLectures:true, view:"subjects", subject},
        "",
        location.href
      );

      showSubjects();
      renderFilters();
    };

    filters.appendChild(button);
  });
}

function showSubjects() {
  activeLectureSubject = null;
  activeChapter = null;

  subjectsView.classList.remove("hidden");
  lecturesView.classList.add("hidden");

  const data = getFilteredLectures();
  const grouped = {};

  subjects().forEach(subject => {
    grouped[subject] = 0;
  });

  data.forEach(item => {
    grouped[item.subject] = (grouped[item.subject] || 0) + 1;
  });

  subjectGrid.innerHTML = "";

  Object.keys(grouped).forEach(subject => {
    const card = document.createElement("button");
    card.className = "subject-card";

    card.innerHTML = `
      <span class="subject-icon">${iconMap[subject] || "📘"}</span>
      <span>
        <b>${subject}</b>
        <small>${grouped[subject]} lecture${grouped[subject] === 1 ? "" : "s"}</small>
      </span>
      <span class="arrow">›</span>
    `;

    card.onclick = () => showChapters(subject, true);
    subjectGrid.appendChild(card);
  });

  $("#countLabel").textContent =
    `${data.length} lecture${data.length === 1 ? "" : "s"}`;
}

/* STEP 2: Subject page — app-style tabs (Lectures / Notes / DPP / DPP PDF) */
let activeContentTab = "lectures";

function getItemVideo(item) {
  return item.type === "pdf" ? "" : String(item.url || "").trim();
}
function getItemNotes(item) {
  return String(item.notes || "").trim();
}
function getItemDpp(item) {
  return String(item.dpp || item.dppUrl || "").trim();
}
function getItemDppPdf(item) {
  return String(item.dppPdf || item.dppPDF || item.dpp_pdf || "").trim();
}

function contentTypeForItem(item) {
  const title = String(item.title || "").toLowerCase();
  const dpp = getItemDpp(item);
  const dppPdf = getItemDppPdf(item);
  if (dppPdf) return "dppPdf";
  if (dpp || /\bdpp\b/.test(title)) return "dpp";
  if (getItemNotes(item) && !getItemVideo(item)) return "notes";
  return "lectures";
}

function hasContentForTab(item, tab) {
  if (tab === "lectures") return !!getItemVideo(item);
  if (tab === "notes") return !!getItemNotes(item);
  if (tab === "dpp") return !!getItemDpp(item);
  if (tab === "dppPdf") return !!getItemDppPdf(item);
  return false;
}

function contentUrl(item, tab) {
  if (tab === "notes") return getItemNotes(item);
  if (tab === "dpp") return getItemDpp(item);
  if (tab === "dppPdf") return getItemDppPdf(item);
  return getItemVideo(item);
}

function showChapters(subject, pushHistory = false) {
  activeLectureSubject = subject;
  activeChapter = null;
  activeContentTab = "lectures";

  if (pushHistory) {
    history.pushState(
      {studyLectures:true, view:"chapters", subject},
      "",
      location.href
    );
  }

  subjectsView.classList.add("hidden");
  lecturesView.classList.remove("hidden");

  setHeader("‹", subject, () => history.back());
  setupContentTabs();
  renderSubjectContent(subject);
}

function setupContentTabs() {
  const tabs = document.querySelectorAll(".content-tab");
  tabs.forEach(tab => {
    tab.onclick = () => {
      activeContentTab = tab.dataset.tab || "lectures";
      tabs.forEach(t => t.classList.toggle("active", t === tab));
      renderSubjectContent(activeLectureSubject);
    };
  });

  const closeInfo = $("#closeInfoBar");
  if (closeInfo) {
    closeInfo.onclick = () => closeInfo.parentElement.classList.add("hidden");
  }
}

function renderSubjectContent(subject) {
  const data = getFilteredLectures()
    .filter(x => x.subject === subject)
    .sort((a,b) => (b.date || "").localeCompare(a.date || "") || String(b.id).localeCompare(String(a.id)));

  const list = data.filter(item => hasContentForTab(item, activeContentTab));
  chapterList.innerHTML = "";

  if (!list.length) {
    const empty = document.createElement("div");
    empty.className = "content-empty";
    const labels = {lectures:"Lectures", notes:"Notes", dpp:"DPP", dppPdf:"DPP PDF"};
    empty.innerHTML = `<div class="empty-icon">📚</div><b>${labels[activeContentTab] || "Content"} available nahi hai</b><small>Is section me abhi koi content upload nahi hua hai.</small>`;
    chapterList.appendChild(empty);
    return;
  }

  const listWrap = document.createElement("div");
  listWrap.className = "app-lecture-list";

  list.forEach((item, index) => {
    const row = document.createElement("article");
    row.className = "app-lecture-card";

    const videoUrl = getItemVideo(item);
    const notesUrl = getItemNotes(item);
    const dppUrl = getItemDpp(item);
    const dppPdfUrl = getItemDppPdf(item);

    const showVideo = activeContentTab === "lectures" && !!videoUrl;
    const showPdf = activeContentTab === "notes" && !!notesUrl;
    const showDpp = activeContentTab === "dpp" && !!dppUrl;
    const showDppPdf = activeContentTab === "dppPdf" && !!dppPdfUrl;

    row.innerHTML = `
      <div class="app-lecture-number">${String(list.length - index).padStart(2,"0")}</div>
      <div class="app-lecture-main">
        <b>${item.title || "Untitled Lecture"}</b>
        <small>${formatDate(item.date)}${item.duration ? " • " + item.duration : ""}</small>
      </div>
      <div class="app-lecture-actions">
        ${showVideo ? '<button class="circle-play" type="button" aria-label="Play video">▶</button>' : ""}
        ${showPdf ? '<button class="content-pill" type="button">📄 PDF</button>' : ""}
        ${showDpp ? '<button class="content-pill" type="button">📝 DPP</button>' : ""}
        ${showDppPdf ? '<button class="content-pill" type="button">📄 PDF</button>' : ""}
        <button class="more-btn" type="button" aria-label="More">⋮</button>
      </div>
    `;

    const action = row.querySelector(".circle-play, .content-pill");
    if (action) {
      action.onclick = (event) => {
        event.stopPropagation();
        if (activeContentTab === "lectures") openLectureDirect(item);
        else {
          const url = contentUrl(item, activeContentTab);
          if (url) openPdf(url, item.title);
        }
      };
    }

    row.onclick = () => {
      if (activeContentTab === "lectures" && videoUrl) openLectureDirect(item);
      else if (activeContentTab === "notes" && notesUrl) openPdf(notesUrl, item.title);
      else if (activeContentTab === "dpp" && dppUrl) openPdf(dppUrl, item.title);
      else if (activeContentTab === "dppPdf" && dppPdfUrl) openPdf(dppPdfUrl, item.title);
    };

    listWrap.appendChild(row);
  });

  chapterList.appendChild(listWrap);
}

/* Kept for compatibility with older history states. */
function showChapterLectures(subject, chapter, pushHistory = false) {
  showChapters(subject, pushHistory);
  activeContentTab = "lectures";
  renderSubjectContent(subject);
}

function setHeader(backText, title, backAction) {
  const titleEl = $("#subjectTitle");
  const backBtn = $("#backBtn");
  if (titleEl) titleEl.textContent = title;
  if (backBtn) {
    backBtn.textContent = backText;
    backBtn.onclick = backAction;
  }
}

function formatDate(value) {
  if (!value) return "";

  const date = new Date(value + "T00:00:00");

  return date.toLocaleDateString("en-IN", {
    day:"2-digit",
    month:"short",
    year:"numeric"
  });
}

/* Search current screen ko hi update karega */
searchInput.addEventListener("input", () => {
  if (activeLectureSubject) {
    renderSubjectContent(activeLectureSubject);
  } else {
    showSubjects();
  }
});

/* Browser Back/Forward + in-site PDF viewer */
let pdfHistoryActive = false;
let pdfBackClosing = false;

window.addEventListener("popstate", event => {
  // If the PDF viewer is open, the device/browser Back button should
  // close the viewer first instead of navigating to an intermediate blank
  // PDF/Google Viewer page.
  const pdfViewer = $("#pdfViewer");
  if (pdfViewer && !pdfViewer.classList.contains("hidden")) {
    pdfHistoryActive = false;
    pdfBackClosing = true;
    closePdf(false);
    pdfBackClosing = false;
    return;
  }

  const state = event.state;

  if (state && state.view === "chapterLectures") {
    activeSubject = "All";
    showChapters(state.subject, false);
    renderFilters();
    return;
  }

  if (state && state.view === "chapters") {
    activeSubject = "All";
    showChapters(state.subject, false);
    renderFilters();
    return;
  }

  activeLectureSubject = null;
  activeChapter = null;
  showSubjects();
  renderFilters();
});

if (!history.state || !history.state.studyLectures) {
  history.replaceState(
    {
      studyLectures:true,
      view:"subjects",
      subject:null
    },
    "",
    location.href
  );
}

/* Menu */
$("#menuBtn").onclick = () => {
  $("#drawer").classList.remove("hidden");
  $("#backdrop").classList.remove("hidden");
};

$("#closeDrawer").onclick = closeDrawer;
$("#backdrop").onclick = closeDrawer;

function closeDrawer() {
  $("#drawer").classList.add("hidden");
  $("#backdrop").classList.add("hidden");
}

/* Existing player support */
function openPlayer(item) {
  const player = $("#player");
  const video = $("#video");
  const loading = $("#videoLoading");
  if (!player || !video) return;

  $("#playerTitle").textContent = item.title;
  $("#playerMeta").textContent =
    [item.chapter, item.date].filter(Boolean).join(" • ");

  // Remember playback position separately for each lecture on this device.
  const progressKey = `studyhub_video_progress_${item.id || item.url || item.title}`;
  video.dataset.progressKey = progressKey;

  const getSavedPosition = () => {
    try {
      const value = Number(localStorage.getItem(progressKey));
      return Number.isFinite(value) && value > 0 ? value : 0;
    } catch (_) {
      return 0;
    }
  };

  const savePosition = () => {
    try {
      if (Number.isFinite(video.currentTime) && video.currentTime > 0) {
        localStorage.setItem(progressKey, String(video.currentTime));
      }
    } catch (_) {}
  };

  const clearPosition = () => {
    try {
      localStorage.removeItem(progressKey);
    } catch (_) {}
  };

  const showLoading = () => {
    if (loading) loading.classList.remove("hidden");
  };
  const hideLoading = () => {
    if (loading) loading.classList.add("hidden");
  };

  showLoading();

  video.classList.remove("hidden");
  video.pause();
  video.removeAttribute("src");
  video.load();

  video.src = item.url;

  // Restore the saved position once duration/metadata is available.
  video.onloadedmetadata = () => {
    const saved = getSavedPosition();

    if (saved > 0 && Number.isFinite(video.duration)) {
      video.currentTime = Math.min(saved, Math.max(0, video.duration - 0.5));
    }
  };

  video.load();

  video.onwaiting = showLoading;
  video.onstalled = showLoading;
  video.onplaying = hideLoading;
  video.oncanplay = hideLoading;

  // Keep the position updated while the lecture is playing.
  video.ontimeupdate = savePosition;
  video.onpause = savePosition;

  // A completed lecture starts from the beginning next time.
  video.onended = clearPosition;

  video.onerror = () => {
    hideLoading();
    video.classList.add("hidden");
  };

  video.play().catch(() => {});

  player.classList.remove("hidden");
}

function closePlayer() {
  const player = $("#player");
  const video = $("#video");

  if (!player || !video) return;

  // Save the current position before closing the player.
  try {
    if (video.currentTime > 0 && video.dataset.progressKey) {
      localStorage.setItem(video.dataset.progressKey, String(video.currentTime));
    }
  } catch (_) {}

  video.pause();
  video.removeAttribute("src");
  video.load();

  player.classList.add("hidden");
}
if ($("#closePlayer")) {
  $("#closePlayer").onclick = closePlayer;
}

if ($("#player")) {
  $("#player").addEventListener("click", event => {
    if (event.target === $("#player")) closePlayer();
  });
}

function openLectureDirect(item) {
  if (!hasTodayAttendance()) { lockContentForAttendance(); return; }
  if (!item.url) return;

  // Open the lecture inside the website player instead of navigating
  // the whole page to a new tab/window.
  openPlayer(item);
}

function openPdf(url, title = "PDF") {
  const modal = $("#pdfViewer");
  const titleEl = $("#pdfTitle");
  if (!modal) return;

  if (titleEl) titleEl.textContent = title;

  const cleanUrl = String(url || "").trim();
  const viewerUrl = /(^|[?&])embedded=true(?:&|$)/i.test(cleanUrl)
    ? cleanUrl
    : `https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(cleanUrl)}`;

  // Keep exactly one top-level history entry for the in-site PDF viewer.
  // The iframe is created directly with its final URL, rather than first
  // loading about:blank. This prevents Android Back from going to a blank
  // iframe page before the PDF viewer closes.
  if (!pdfHistoryActive) {
    history.pushState(
      {
        studyLectures: true,
        view: "pdfViewer",
        pdfViewer: true
      },
      "",
      location.href
    );
    pdfHistoryActive = true;
  }

  // Remove any old iframe and create a fresh browsing context whose initial
  // document is the actual viewer URL.
  const oldFrame = $("#pdfFrame");
  if (oldFrame) oldFrame.remove();

  const frame = document.createElement("iframe");
  frame.id = "pdfFrame";
  frame.title = "PDF viewer";
  frame.setAttribute("allow", "fullscreen");
  frame.setAttribute("allowfullscreen", "");
  frame.src = viewerUrl;

  const box = modal.querySelector(".pdf-viewer-box");
  if (box) box.appendChild(frame);

  modal.classList.remove("hidden");
  document.body.classList.add("pdf-open");
}

function closePdf(useHistory = true) {
  const modal = $("#pdfViewer");
  if (!modal) return;

  const frame = $("#pdfFrame");
  if (frame) frame.remove();

  modal.classList.add("hidden");
  document.body.classList.remove("pdf-open");

  if (useHistory && pdfHistoryActive && !pdfBackClosing) {
    pdfHistoryActive = false;
    history.back();
  } else {
    pdfHistoryActive = false;
  }
}

if ($("#closePdf")) {
  $("#closePdf").onclick = closePdf;
}

if ($("#pdfViewer")) {
  $("#pdfViewer").addEventListener("click", event => {
    if (event.target === $("#pdfViewer")) closePdf();
  });
}

function openNotes(item) {
  if (!hasTodayAttendance()) { lockContentForAttendance(); return; }
  if (!item.notes) return;
  openPdf(item.notes, item.title);
}

/* Start */
lockContentForAttendance();
recordWebsiteVisit();
startWebsiteTimeTracking();
renderFilters();
showSubjects();

})();
