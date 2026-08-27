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
const filters = document.createElement("div");
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

  Object.entries(chapters).forEach(([chapter, list]) => {
    const card = document.createElement("button");
    card.className = "chapter-card";

    card.innerHTML = `
      <span class="chapter-card-text">
        <b>${chapter}</b>
        <small>${list.length} lecture${list.length === 1 ? "" : "s"}</small>
      </span>
      <span class="chapter-card-arrow">›</span>
    `;

    /* Chapter par click karne ke baad hi lectures khulenge */
    card.onclick = () => showChapterLectures(subject, chapter, true);

    chapterList.appendChild(card);
  });
}

/* STEP 3: Chapter ke andar lectures */
function showChapterLectures(subject, chapter, pushHistory = false) {
  activeLectureSubject = subject;
  activeChapter = chapter;

  if (pushHistory) {
    history.pushState(
      {
        studyLectures:true,
        view:"chapterLectures",
        subject,
        chapter
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

  const list = document.createElement("div");
  list.className = "lecture-list";

  data.forEach((item, index) => {
    const row = document.createElement("button");
    row.className = "lecture";

    row.innerHTML = `
      <span class="lecture-no">${String(data.length - index).padStart(2,"0")}</span>

      <span class="lecture-main">
        <b>${item.title}</b>
        <small>
          ${formatDate(item.date)}
          ${item.duration ? " • " + item.duration : ""}
        </small>
      </span>

      <span class="lecture-actions">
        ${item.notes ? '<span class="notes-btn">📄 Notes</span>' : ""}
        <span class="play">▶</span>
      </span>
    `;

    row.onclick = (event) => {
      if (event.target.closest(".notes-btn")) {
        event.stopPropagation();
        openNotes(item);
        return;
      }

      openLectureDirect(item);
    };

    list.appendChild(row);
  });

  chapterList.appendChild(list);
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
  if (activeLectureSubject && activeChapter) {
    showChapterLectures(activeLectureSubject, activeChapter, false);
  } else if (activeLectureSubject) {
    showChapters(activeLectureSubject, false);
  } else {
    showSubjects();
  }
});

/* Browser Back/Forward */
window.addEventListener("popstate", event => {
  const state = event.state;

  if (state && state.view === "chapterLectures") {
    activeSubject = "All";
    showChapterLectures(
      state.subject,
      state.chapter,
      false
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

  if (!player || !video) return;

  $("#playerTitle").textContent = item.title;
  $("#playerMeta").textContent =
    `${item.subject} • ${item.chapter} • ${formatDate(item.date)}`;

  $("#openOriginal").href = item.url;

  $("#unsupported").classList.add("hidden");
  video.classList.remove("hidden");

  video.src = item.url;
  video.load();
  video.play().catch(() => {});

  player.classList.remove("hidden");
}

function closePlayer() {
  const player = $("#player");
  const video = $("#video");

  if (!player || !video) return;

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
  window.location.href = item.url;
}

function openNotes(item) {
  if (!hasTodayAttendance()) { lockContentForAttendance(); return; }
  if (!item.notes) return;
  window.location.href = item.notes;
}

/* Start */
lockContentForAttendance();
recordWebsiteVisit();
startWebsiteTimeTracking();
renderFilters();
showSubjects();

})();
