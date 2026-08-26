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
const $ = (s) => document.querySelector(s);

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
  if (!item.url) return;
  window.location.href = item.url;
}

function openNotes(item) {
  if (!item.notes) return;
  window.location.href = item.notes;
}

/* Start */
renderFilters();
showSubjects();

})();


/* ===== Anonymous daily attendance =====
   No name/roll number is collected. A random browser ID is used only
   to prevent the same browser from counting more than once per day.
*/
const ATTENDANCE_ID_KEY = "studyhub_attendance_browser_id";
const ATTENDANCE_DONE_KEY = "studyhub_attendance_done_date";

function getAttendanceBrowserId(){
  let id = localStorage.getItem(ATTENDANCE_ID_KEY);
  if(!id){
    id = (crypto.randomUUID ? crypto.randomUUID() :
      "sh-" + Date.now() + "-" + Math.random().toString(36).slice(2));
    localStorage.setItem(ATTENDANCE_ID_KEY, id);
  }
  return id;
}

function getIndiaDate(){
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone:"Asia/Kolkata",
    year:"numeric", month:"2-digit", day:"2-digit"
  }).formatToParts(new Date());
  const map = Object.fromEntries(parts.map(p => [p.type,p.value]));
  return `${map.year}-${map.month}-${map.day}`;
}

async function loadAttendance(){
  const countEl = document.getElementById("attendanceCount");
  const btn = document.getElementById("attendanceBtn");
  const icon = document.getElementById("attendanceIcon");
  if(!countEl || !btn) return;

  const today = getIndiaDate();
  const done = localStorage.getItem(ATTENDANCE_DONE_KEY) === today;

  if(done){
    btn.classList.add("marked");
    if(icon) icon.textContent = "☑";
  }

  try{
    const r = await fetch("/api/attendance", {
      method:"GET",
      cache:"no-store",
      headers:{"Cache-Control":"no-cache"}
    });
    const data = await r.json();
    if(r.ok) countEl.textContent = `Today: ${Number(data.count || 0)}`;
  }catch(e){
    countEl.textContent = "Today: —";
  }
}

async function markAttendance(){
  const btn = document.getElementById("attendanceBtn");
  const icon = document.getElementById("attendanceIcon");
  const countEl = document.getElementById("attendanceCount");
  if(!btn) return;

  const today = getIndiaDate();
  if(localStorage.getItem(ATTENDANCE_DONE_KEY) === today){
    return;
  }

  btn.disabled = true;

  try{
    const r = await fetch("/api/attendance", {
      method:"POST",
      cache:"no-store",
      headers:{
        "Content-Type":"application/json",
        "Cache-Control":"no-cache"
      },
      body:JSON.stringify({visitorId:getAttendanceBrowserId()})
    });

    const data = await r.json();

    if(!r.ok || !data.ok){
      throw new Error(data.message || "Attendance failed");
    }

    localStorage.setItem(ATTENDANCE_DONE_KEY, data.date || today);
    btn.classList.add("marked");
    if(icon) icon.textContent = "☑";
    if(countEl) countEl.textContent = `Today: ${Number(data.count || 0)}`;
  }catch(e){
    alert("Attendance save nahi ho paya. Please try again.");
  }finally{
    btn.disabled = false;
  }
}

document.getElementById("attendanceBtn")?.addEventListener("click", markAttendance);
loadAttendance();
