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

  // Only change the chapter/subject section (image 2).
  // Keep the lecture list section (image 1) exactly as it is.
  // The chapter containing the newest uploaded lecture is placed at the bottom.
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

    // Newest chapter goes last; all other chapters retain their original order.
    if (latestA === latestB) return 0;
    return latestA - latestB;
  });

  chapterEntries.forEach(([chapter, list]) => {
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

    const hasPdf = item.type === "pdf"
      ? !!item.url
      : !!item.notes;

    const hasVideo = item.type !== "pdf" && !!item.url;

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
        ${hasPdf ? '<span class="pdf-btn">📄 PDF</span>' : ""}
        ${hasVideo ? '<span class="video-btn">▶ Video</span>' : ""}
      </span>
    `;

    row.onclick = (event) => {
      if (event.target.closest(".pdf-btn")) {
        event.stopPropagation();
        // Always open PDFs inside the in-site PDF viewer.
        // Do not navigate directly to the PDF URL, because Android may
        // hand the file to an external "Open with" / download app.
        if (item.type === "pdf") {
          openPdf(item.url, item.title);
        } else if (item.notes) {
          openPdf(item.notes, item.title);
        }
        return;
      }

      if (event.target.closest(".video-btn")) {
        event.stopPropagation();
        openLectureDirect(item);
        return;
      }

      // If there is only one content type, clicking the row opens that content.
      if (hasVideo) {
        openLectureDirect(item);
      } else if (hasPdf) {
        // Always open PDFs inside the in-site PDF viewer.
        // Do not navigate directly to the PDF URL, because Android may
        // hand the file to an external "Open with" / download app.
        if (item.type === "pdf") {
          openPdf(item.url, item.title);
        } else if (item.notes) {
          openPdf(item.notes, item.title);
        }
      }
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
  const frame = $("#pdfFrame");
  const titleEl = $("#pdfTitle");
  if (!modal || !frame) return;

  if (titleEl) titleEl.textContent = title;

  // Some PDF hosts (including static.pw.live) send PDFs as downloads.
  // Load the PDF through Google's embedded viewer so Android browsers/WebView
  // render it inside our modal instead of opening the "Open with" dialog.
  const cleanUrl = String(url || "").trim();
  const viewerUrl = /(^|[?&])embedded=true(?:&|$)/i.test(cleanUrl)
    ? cleanUrl
    : `https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(cleanUrl)}`;
  frame.src = viewerUrl;
  modal.classList.remove("hidden");
  document.body.classList.add("pdf-open");
}

function closePdf() {
  const modal = $("#pdfViewer");
  const frame = $("#pdfFrame");
  if (!modal || !frame) return;
  frame.src = "about:blank";
  modal.classList.add("hidden");
  document.body.classList.remove("pdf-open");
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


<script id="studyhub-pdf-back-handler">
(function () {
  function closePdfViewer() {
    // Common viewer/modal close controls used by this project.
    var selectors = [
      '[data-pdf-viewer-close]',
      '.pdf-viewer-close',
      '.pdfViewerClose',
      '#pdfViewerClose',
      '.pdf-modal .close',
      '#pdfModal .close'
    ];
    for (var i = 0; i < selectors.length; i++) {
      var el = document.querySelector(selectors[i]);
      if (el) { el.click(); return true; }
    }
    // Fallback: close a visible PDF/modal overlay by common IDs/classes.
    var nodes = document.querySelectorAll('[id*="pdf" i], [class*="pdf" i], [id*="modal" i], [class*="modal" i]');
    for (var j = 0; j < nodes.length; j++) {
      var n = nodes[j];
      var s = getComputedStyle(n);
      if (s.display !== 'none' && s.visibility !== 'hidden') {
        var close = n.querySelector('.close, .modal-close, button[aria-label*="close" i], [data-close]');
        if (close) { close.click(); return true; }
      }
    }
    return false;
  }

  window.addEventListener('popstate', function () {
    if (closePdfViewer()) {
      history.pushState({studyhubPdfViewer:true}, '');
    }
  });

  // Mark PDF viewer history state whenever the viewer opens through a click.
  document.addEventListener('click', function (e) {
    var t = e.target && e.target.closest ? e.target.closest('button,a,[role="button"]') : null;
    if (!t) return;
    var label = ((t.textContent || '') + ' ' + (t.getAttribute('aria-label') || '')).toLowerCase();
    if (label.indexOf('pdf') !== -1 || label.indexOf('notes') !== -1) {
      setTimeout(function () {
        var visible = document.querySelector('[id*="pdf" i], [class*="pdf" i]');
        if (visible) history.pushState({studyhubPdfViewer:true}, '');
      }, 100);
    }
  });
})();
</script>
