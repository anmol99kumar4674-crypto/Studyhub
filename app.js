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
  "NCERT",
  "Geography",
  "Art & Culture"
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

const LECTURES = Array.isArray(ALL_LECTURES) ? ALL_LECTURES : [];
const $ = (s) => document.querySelector(s);

const subjectsView = $("#subjectsView");
const lecturesView = $("#lecturesView");
const subjectGrid = $("#subjectGrid");
const chapterList = $("#chapterList");
const filters = $("#subjectFilters");
const searchInput = $("#searchInput");

const iconMap = {
  Notices:"📢",
  "Current Affairs":"📰",
  Polity:"⚖️",
  History:"📜",
  "Bihar Special":"🧪",
  Science:"🔬",
  Environment:"🌱",
  Economics:"📈",
  Essay:"📝",
  "Hindi (हिन्दी)":"ॐ",
  "Maths/DI":"🧪",
  "Bihar Current Wallah Monthly Compilation":"🧪",
  NCERT:"📚",
  Geography:"🌍",
  "Art & Culture":"🏺"
};

const PDF_ONLY_SUBJECT = "Bihar Current Wallah Monthly Compilation";

let activeSubject = "All";
let activeLectureSubject = null;
let activeChapter = null;

function subjects() {
  return [...new Set(SUBJECTS)].sort((a,b) => a.localeCompare(b));
}

function lectureDateValue(item) {
  const raw = String(item?.date || "").trim();
  if (!raw) return 0;

  // Supports YYYY-MM-DD, DD/MM/YYYY, DD-MM-YYYY and normal ISO dates.
  let m = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (m) return Date.UTC(+m[1], +m[2]-1, +m[3]);

  m = raw.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);
  if (m) return Date.UTC(+m[3], +m[2]-1, +m[1]);

  const t = Date.parse(raw);
  return Number.isNaN(t) ? 0 : t;
}

function lectureAddedValue(item) {
  const id = String(item?.id || "");
  // Admin IDs end with Date.now(), so this gives exact insertion order
  // when multiple lectures have the same date.
  const m = id.match(/(\d{10,})$/);
  return m ? Number(m[1]) : 0;
}

function compareLecturesLatestFirst(a, b) {
  const dateDiff = lectureDateValue(b) - lectureDateValue(a);
  if (dateDiff) return dateDiff;

  const addedDiff = lectureAddedValue(b) - lectureAddedValue(a);
  if (addedDiff) return addedDiff;

  return 0;
}

function getFilteredLectures() {
  const q = (searchInput?.value || "").trim().toLowerCase();

  return LECTURES
    .filter(x =>
      (activeSubject === "All" || x.subject === activeSubject) &&
      (!q || [x.title, x.subject, x.chapter]
        .join(" ")
        .toLowerCase()
        .includes(q))
    )
    .sort(compareLecturesLatestFirst);
}

function chapterCount(subject) {
  const rows = Array.isArray(LECTURES) ? LECTURES : [];
  return new Set(
    rows
      .filter(x => x && x.subject === subject)
      .map(x => x.chapter || "General")
  ).size;
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

/* Subject screen: every subject is visible, even when it has 0 chapters. */
function showSubjects() {
  activeLectureSubject = null;
  activeChapter = null;

  subjectsView.classList.remove("hidden");
  lecturesView.classList.add("hidden");

  const visibleSubjects = activeSubject === "All"
    ? subjects()
    : subjects().filter(s => s === activeSubject);

  subjectGrid.innerHTML = "";

  visibleSubjects.forEach(subject => {
    const chapters = chapterCount(subject);
    const card = document.createElement("button");
    card.className = "subject-card";

    card.innerHTML = `
      <span class="subject-icon">${iconMap[subject] || "📘"}</span>
      <span>
        <b>${subject}</b>
        <small>${chapters} Chapter${chapters === 1 ? "" : "s"}</small>
      </span>
      <span class="arrow">›</span>
    `;

    card.onclick = () => showChapters(subject, true);
    subjectGrid.appendChild(card);
  });

  $("#countLabel").textContent =
    `${visibleSubjects.length} subject${visibleSubjects.length === 1 ? "" : "s"}`;
}

/* Subject -> Chapter */
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

  setHeader("← Subjects", subject, () => history.back());

  const data = LECTURES.filter(x => x.subject === subject);
  const chapters = {};

  data.forEach(item => {
    const chapter = item.chapter || "General";
    if (!chapters[chapter]) chapters[chapter] = [];
    chapters[chapter].push(item);
  });

  chapterList.innerHTML = "";

  if (!Object.keys(chapters).length) {
    chapterList.innerHTML = `
      <div class="empty-state">
        <b>No chapters added yet</b>
        <small>Is subject me admin se chapter/lecture add kar sakte hain.</small>
      </div>
    `;
    return;
  }

  // Latest chapter first. Within each chapter, the latest lecture
  // determines the chapter's position.
  Object.entries(chapters)
    .sort((a,b) => {
      const latestA = [...a[1]].sort(compareLecturesLatestFirst)[0];
      const latestB = [...b[1]].sort(compareLecturesLatestFirst)[0];
      return compareLecturesLatestFirst(latestA, latestB);
    })
    .forEach(([chapter, list]) => {
      const card = document.createElement("button");
      card.className = "chapter-card";

      card.innerHTML = `
        <span class="chapter-card-text">
          <b>${chapter}</b>
          <small>${list.length} Lecture${list.length === 1 ? "" : "s"}</small>
        </span>
        <span class="chapter-card-arrow">›</span>
      `;

      card.onclick = () => showChapterLectures(subject, chapter, true);
      chapterList.appendChild(card);
    });
}

/* Chapter -> Lectures / PDFs */
function showChapterLectures(subject, chapter, pushHistory = false) {
  activeLectureSubject = subject;
  activeChapter = chapter;

  if (pushHistory) {
    history.pushState(
      {studyLectures:true, view:"chapterLectures", subject, chapter},
      "",
      location.href
    );
  }

  subjectsView.classList.add("hidden");
  lecturesView.classList.remove("hidden");

  setHeader("← Chapters", chapter, () => history.back());

  const data = LECTURES
    .filter(x =>
      x.subject === subject &&
      (x.chapter || "General") === chapter
    )
    .sort(compareLecturesLatestFirst);

  chapterList.innerHTML = "";

  const list = document.createElement("div");
  list.className = "lecture-list";

  data.forEach((item, index) => {
    const row = document.createElement("button");
    row.className = "lecture";

    const isPdf = subject === PDF_ONLY_SUBJECT || item.type === "pdf";

    row.innerHTML = `
      <span class="lecture-no">${String(index + 1).padStart(2,"0")}</span>
      <span class="lecture-main">
        <b>${item.title}</b>
        <small>
          ${formatDate(item.date)}
          ${item.duration ? " • " + item.duration : ""}
        </small>
      </span>
      <span class="lecture-actions">
        ${item.notes && !isPdf ? '<span class="notes-btn">📄 Notes</span>' : ""}
        <span class="play">${isPdf ? "📄" : "▶"}</span>
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
  return new Date(value + "T00:00:00").toLocaleDateString("en-IN", {
    day:"2-digit",
    month:"short",
    year:"numeric"
  });
}

if (searchInput) {
  searchInput.addEventListener("input", () => {
    if (activeLectureSubject && activeChapter) {
      showChapterLectures(activeLectureSubject, activeChapter, false);
    } else if (activeLectureSubject) {
      showChapters(activeLectureSubject, false);
    } else {
      showSubjects();
    }
  });
}

window.addEventListener("popstate", event => {
  const state = event.state;

  if (state?.view === "chapterLectures") {
    showChapterLectures(state.subject, state.chapter, false);
    renderFilters();
    return;
  }

  if (state?.view === "chapters") {
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
    {studyLectures:true, view:"subjects", subject:null},
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

function openLectureDirect(item) {
  if (!item.url) return;
  window.location.href = item.url;
}

function openNotes(item) {
  if (!item.notes) return;
  window.location.href = item.notes;
}

renderFilters();
showSubjects();
