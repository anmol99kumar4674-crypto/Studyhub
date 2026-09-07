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
  // Top category/filter bar removed by design.
}

function getChapterCount(subject) {
  const chapters = new Set(
    getFilteredLectures()
      .filter(x => x.subject === subject)
      .map(x => x.chapter || "General")
  );
  return chapters.size;
}

function showSubjects() {
  activeLectureSubject = null;
  activeChapter = null;

  subjectsView.classList.remove("hidden");
  lecturesView.classList.add("hidden");

  const data = getFilteredLectures();
  const grouped = {};

  subjects().forEach(subject => {
    grouped[subject] = getChapterCount(subject);
  });

  subjectGrid.innerHTML = "";

  Object.keys(grouped).forEach(subject => {
    const card = document.createElement("button");
    card.className = "subject-card";

    const count = grouped[subject];

    card.innerHTML = `
      <span class="subject-icon">${iconMap[subject] || "📘"}</span>
      <span>
        <b>${subject}</b>
        <small>${count} Chapter${count === 1 ? "" : "s"}</small>
      </span>
      <span class="arrow">›</span>
    `;

    card.onclick = () => showChapters(subject, true);
    subjectGrid.appendChild(card);
  });

  $("#countLabel").textContent =
    `${Object.values(grouped).reduce((a,b) => a+b, 0)} chapters`;
}

/* STEP 2: Subject ke andar sirf CHAPTERS dikhte hain */
function showChapters(subject, pushHistory = false) {
  activeLectureSubject = subject;
  activeChapter = null;

  if (pushHistory) {
    history.pushState(
      {studyLectures:true, view:"chapters", subject},
      "",
      location.href
    );
  }

  subjectsView.classList.add("hidden");
  lecturesView.classList.remove("hidden");

  setHeader(
    "← Subjects",
    subject,
    () => history.back()
  );

  const data = getFilteredLectures().filter(x => x.subject === subject);
  const chapters = {};

  data.forEach(item => {
    const chapter = item.chapter || "General";
    if (!chapters[chapter]) chapters[chapter] = [];
    chapters[chapter].push(item);
  });

  chapterList.innerHTML = "";


  const chapterEntries = Object.entries(chapters);
  chapterEntries.sort((a, b) => {
    const latestA = Math.max(...a[1].map(x => {
      const d = Date.parse(x.date || x.createdAt || x.updatedAt || "");
      return Number.isFinite(d) ? d : 0;
    }));
    const latestB = Math.max(...b[1].map(x => {
      const d = Date.parse(x.date || x.createdAt || x.updatedAt || "");
      return Number.isFinite(d) ? d : 0;
    }));
    if (latestA === latestB) return 0;
    return latestA - latestB;
  });

  chapterEntries.forEach(([chapter, list]) => {
    const card = document.createElement("button");
    card.className = "chapter-card";

    // A chapter can contain lecture records and/or note-only records.
    // Show the count according to the content that actually exists.
    const lectureCount = list.filter(item => !!item.url).length;
    const noteCount = list.filter(item => !!item.notes).length;
    const dppCount = list.filter(item => !!(item.dpp || item.dppUrl)).length;
    const dppPdfCount = list.filter(item => !!(item.dppPdf || item.dppPdfUrl)).length;

    const countParts = [];
    if (lectureCount) countParts.push(`${lectureCount} Lecture${lectureCount === 1 ? "" : "s"}`);
    if (noteCount) countParts.push(`${noteCount} Note${noteCount === 1 ? "" : "s"}`);
    if (dppCount) countParts.push(`${dppCount} DPP`);
    if (dppPdfCount) countParts.push(`${dppPdfCount} DPP PDF`);

    card.innerHTML = `
      <span class="chapter-card-text">
        <b>${chapter}</b>
        <small>${countParts.join(" • ") || "No content"}</small>
      </span>
      <span class="chapter-card-arrow">›</span>
    `;

    card.onclick = () => showChapterLectures(subject, chapter, true);
    chapterList.appendChild(card);
  });
}

/*
 * "All Content" combines every chapter for the selected subject.
 * It uses the same tabs as an individual chapter.
 */
function showAllContent(subject, pushHistory = false, tab = "lectures") {
  activeLectureSubject = subject;
  activeChapter = "__ALL__";
  activeChapterTab = tab;

  if (pushHistory) {
    history.pushState(
      {
        studyLectures:true,
        view:"allContent",
        subject,
        tab
      },
      "",
      location.href
    );
  }

  subjectsView.classList.add("hidden");
  lecturesView.classList.remove("hidden");

  setHeader("← " + subject, "All Content", () => history.back());

  const data = getFilteredLectures().filter(x => x.subject === subject);
  chapterList.innerHTML = "";

  const tabs = document.createElement("div");
  tabs.className = "content-tabs";
  tabs.innerHTML = `
    <button class="${tab === "lectures" ? "active" : ""}" data-tab="lectures">Lectures</button>
    <button class="${tab === "notes" ? "active" : ""}" data-tab="notes">Notes</button>
    <button class="${tab === "dpp" ? "active" : ""}" data-tab="dpp">DPP</button>
    <button class="${tab === "dpp-pdf" ? "active" : ""}" data-tab="dpp-pdf">DPP PDF</button>
  `;
  tabs.querySelectorAll("button").forEach(btn => {
    btn.onclick = () => showAllContent(subject, false, btn.dataset.tab);
  });
  chapterList.appendChild(tabs);

  const content = document.createElement("div");
  content.className = "tab-content";

  if (tab === "lectures") {
    renderLectureRows(content, data.filter(item => !!item.url));
  } else if (tab === "notes") {
    renderLectureRows(content, data.filter(item => !!item.notes), "notes");
  } else if (tab === "dpp") {
    renderLectureRows(content, data.filter(item => !!(item.dpp || item.dppUrl)), "dpp");
  } else {
    renderLectureRows(content, data.filter(item => !!(item.dppPdf || item.dppPdfUrl)), "dpp-pdf");
  }

  if (!content.children.length) {
    const empty = document.createElement("div");
    empty.className = "empty-tab";
    empty.textContent = "No content available";
    content.appendChild(empty);
  }

  chapterList.appendChild(content);
}

/*
 * STEP 3: Chapter ke andar app-style tabs.
 * Lectures / Notes / DPP / DPP PDF ek hi chapter ke data se render hote hain.
 */
let activeChapterTab = "lectures";

function showChapterLectures(subject, chapter, pushHistory = false, tab = "lectures") {
  activeLectureSubject = subject;
  activeChapter = chapter;
  activeChapterTab = tab;

  if (pushHistory) {
    history.pushState(
      {
        studyLectures:true,
        view:"chapterLectures",
        subject,
        chapter,
        tab
      },
      "",
      location.href
    );
  }

  subjectsView.classList.add("hidden");
  lecturesView.classList.remove("hidden");

  setHeader(
    "← " + subject,
    chapter,
    () => history.back()
  );

  const data = getFilteredLectures()
    .filter(x =>
      x.subject === subject &&
      (x.chapter || "General") === chapter
    );

  chapterList.innerHTML = "";

  const tabs = document.createElement("div");
  tabs.className = "content-tabs";
  tabs.innerHTML = `
    <button class="${tab === "lectures" ? "active" : ""}" data-tab="lectures">Lectures</button>
    <button class="${tab === "notes" ? "active" : ""}" data-tab="notes">Notes</button>
    <button class="${tab === "dpp" ? "active" : ""}" data-tab="dpp">DPP</button>
    <button class="${tab === "dpp-pdf" ? "active" : ""}" data-tab="dpp-pdf">DPP PDF</button>
  `;

  tabs.querySelectorAll("button").forEach(btn => {
    btn.onclick = () => {
      showChapterLectures(subject, chapter, false, btn.dataset.tab);
      activeChapterTab = btn.dataset.tab;
    };
  });

  chapterList.appendChild(tabs);

  const content = document.createElement("div");
  content.className = "tab-content";

  if (tab === "lectures") {
    // Only records with an actual video URL belong in the Lectures tab.
    // Note-only records (url: "") must stay out of this tab.
    renderLectureRows(content, data.filter(item => !!item.url));
  } else if (tab === "notes") {
    renderLectureRows(content, data.filter(item => !!item.notes), "notes");
  } else if (tab === "dpp") {
    renderLectureRows(
      content,
      data.filter(item => !!(item.dpp || item.dppUrl)),
      "dpp"
    );
  } else if (tab === "dpp-pdf") {
    renderLectureRows(
      content,
      data.filter(item => !!(item.dppPdf || item.dppPdfUrl)),
      "dpp-pdf"
    );
  }

  if (!content.children.length) {
    const empty = document.createElement("div");
    empty.className = "empty-tab";
    empty.textContent = "No content available";
    content.appendChild(empty);
  }

  chapterList.appendChild(content);
}

function renderLectureRows(container, data, mode = "lectures") {
  // Do not create an empty lecture-list; this lets the tab show its empty-state message.
  if (!data || !data.length) return;

  const list = document.createElement("div");
  list.className = "lecture-list";

  data.forEach((item, index) => {
    const row = document.createElement("button");
    row.className = "lecture";

    const contentUrl =
      mode === "notes" ? item.notes :
      mode === "dpp" ? (item.dpp || item.dppUrl) :
      mode === "dpp-pdf" ? (item.dppPdf || item.dppPdfUrl) :
      item.url;

    const hasPdf =
      mode === "notes" || mode === "dpp-pdf" ||
      (item.type === "pdf" && !!contentUrl);

    const hasVideo =
      mode === "lectures" && item.type !== "pdf" && !!contentUrl;

    row.innerHTML = `
      <span class="lecture-no">${String(data.length - index).padStart(2,"0")}</span>
      <span class="lecture-main">
        <b>${mode === "notes" ? item.title.replace(/\s*\|\|.*$/, "") + " : Class Notes" : item.title}</b>
        <small>
          ${formatDate(item.date)}
          ${item.duration ? " • " + item.duration : ""}
        </small>
      </span>
      <span class="lecture-actions">
        ${hasPdf ? '<span class="pdf-btn">📄 PDF</span>' : ""}
        ${hasVideo ? '<span class="video-btn">▶ Video</span>' : ""}
      </span>
    `;

    row.onclick = (event) => {
      if (event.target.closest(".pdf-btn")) {
        event.stopPropagation();
        if (contentUrl) openPdf(contentUrl, item.title);
        return;
      }

      if (event.target.closest(".video-btn")) {
        event.stopPropagation();
        if (contentUrl) openLectureDirect(item);
        return;
      }

      if (mode === "notes" || mode === "dpp-pdf" || (mode === "dpp" && !item.dppVideo)) {
        if (contentUrl) openPdf(contentUrl, item.title);
      } else if (hasVideo) {
        openLectureDirect(item);
      } else if (hasPdf && contentUrl) {
        openPdf(contentUrl, item.title);
      }
    };

    list.appendChild(row);
  });

  container.appendChild(list);
}

function setHeader(backText, title, backAction) {
  const head = lecturesView.querySelector(".section-head");

  head.innerHTML = `
    <button class="back-btn" id="backBtn">${backText}</button>
    <h2 id="subjectTitle">${title}</h2>
  `;

  $("#backBtn").onclick = backAction;
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
  if (activeLectureSubject && activeChapter === "__ALL__") {
    showAllContent(activeLectureSubject, false, activeChapterTab);
  } else if (activeLectureSubject && activeChapter) {
    showChapterLectures(activeLectureSubject, activeChapter, false, activeChapterTab);
  } else if (activeLectureSubject) {
    showChapters(activeLectureSubject, false);
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

  if (state && state.view === "allContent") {
    activeSubject = "All";
    showAllContent(
      state.subject,
      false,
      state.tab || "lectures"
    );
    renderFilters();
    return;
  }

  if (state && state.view === "chapterLectures") {
    activeSubject = "All";
    showChapterLectures(
      state.subject,
      state.chapter,
      false,
      state.tab || "lectures"
    );
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
