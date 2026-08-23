const ALL_LECTURES = [
  ...ECONOMIC_LECTURES.map(x => ({...x, subject:"Economics"})),
  ...HISTORY_LECTURES.map(x => ({...x, subject:"History"})),
  ...GEOGRAPHY_LECTURES.map(x => ({...x, subject:"Geography"})),
  ...POLITY_LECTURES.map(x => ({...x, subject:"Polity & Governance"})),
  ...ART_CULTURE_LECTURES.map(x => ({...x, subject:"Art & Culture"})),
  ...GENERAL_SCIENCE_LECTURES.map(x => ({...x, subject:"General Science"}))
];

const LECTURES = ALL_LECTURES;
const $ = (s) => document.querySelector(s);
const subjectsView = $("#subjectsView");
const lecturesView = $("#lecturesView");
const subjectGrid = $("#subjectGrid");
const chapterList = $("#chapterList");
const filters = $("#subjectFilters");
const searchInput = $("#searchInput");
const player = $("#player");
const video = $("#video");
const unsupported = $("#unsupported");
const openOriginal = $("#openOriginal");

const iconMap = {
  Economics:"📈", History:"📜", Geography:"🌍", "Art & Culture":"🏺",
  "Polity & Governance":"⚖️", "Maths / DI":"∑", "General Science":"🔬",
  "Current Affairs":"📰", "General Studies":"📚"
};

let activeSubject = "All";
let activeLectureSubject = null;

function subjects() {
  return [...new Set(LECTURES.map(x => x.subject))].sort();
}
function filteredLectures() {
  const q = searchInput.value.trim().toLowerCase();
  return LECTURES.filter(x =>
    (activeSubject === "All" || x.subject === activeSubject) &&
    (!q || [x.title,x.subject,x.chapter].join(" ").toLowerCase().includes(q))
  ).sort((a,b) => (b.date || "").localeCompare(a.date || "") || b.id.localeCompare(a.id));
}
function renderFilters() {
  filters.innerHTML = "";
  ["All", ...subjects()].forEach(s => {
    const b = document.createElement("button");
    b.className = "filter " + (activeSubject === s ? "active" : "");
    b.textContent = s;
    b.onclick = () => { activeSubject=s; activeLectureSubject=null; showSubjects(); renderFilters(); };
    filters.appendChild(b);
  });
}
function showSubjects() {
  subjectsView.classList.remove("hidden");
  lecturesView.classList.add("hidden");
  const data = filteredLectures();
  const grouped = {};
  data.forEach(x => grouped[x.subject] = (grouped[x.subject] || 0) + 1);
  subjectGrid.innerHTML = "";
  Object.keys(grouped).sort().forEach(subject => {
    const card = document.createElement("button");
    card.className = "subject-card";
    card.innerHTML = `<span class="subject-icon">${iconMap[subject] || "📘"}</span>
      <span><b>${subject}</b><small>${grouped[subject]} lecture${grouped[subject]===1?"":"s"}</small></span><span class="arrow">›</span>`;
    card.onclick = () => showLectures(subject);
    subjectGrid.appendChild(card);
  });
  $("#countLabel").textContent = `${data.length} lecture${data.length===1?"":"s"}`;
}
function showLectures(subject) {
  activeLectureSubject = subject;
  subjectsView.classList.add("hidden");
  lecturesView.classList.remove("hidden");
  $("#subjectTitle").textContent = subject;
  const data = filteredLectures().filter(x => x.subject === subject);
  const chapters = {};
  data.forEach(x => (chapters[x.chapter] ||= []).push(x));
  chapterList.innerHTML = "";
  Object.entries(chapters).forEach(([chapter, list]) => {
    const section = document.createElement("section");
    section.className = "chapter";
    section.innerHTML = `<div class="chapter-head"><div><h3>${chapter}</h3><span>${list.length} lecture${list.length===1?"":"s"}</span></div></div>`;
    const ul = document.createElement("div");
    ul.className = "lecture-list";
    list.forEach((x,i) => {
      const row = document.createElement("button");
      row.className = "lecture";
      row.innerHTML = `<span class="lecture-no">${String(i+1).padStart(2,"0")}</span>
        <span class="lecture-main"><b>${x.title}</b><small>${formatDate(x.date)}${x.duration ? " • "+x.duration : ""}</small></span>
        <span class="lecture-actions">
          ${x.notes ? '<span class="notes-btn">📄 Notes</span>' : ''}
          <span class="play">▶</span>
        </span>`;
      row.onclick = (e) => {
        if (e.target.closest(".notes-btn")) {
          e.stopPropagation();
          openNotes(x);
        } else {
          openPlayer(x);
        }
      };
      ul.appendChild(row);
    });
    section.appendChild(ul);
    chapterList.appendChild(section);
  });
}
function formatDate(s) {
  if (!s) return "";
  const d = new Date(s+"T00:00:00");
  return d.toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"});
}
function openPlayer(item) {
  $("#playerTitle").textContent = item.title;
  $("#playerMeta").textContent = `${item.subject} • ${item.chapter} • ${formatDate(item.date)}`;
  openOriginal.href = item.url;
  unsupported.classList.add("hidden");
  video.classList.remove("hidden");
  video.src = item.url;
  video.load();
  video.play().catch(()=>{});
  player.classList.remove("hidden");
}
function closePlayer() {
  video.pause();
  video.removeAttribute("src");
  video.load();
  const frame = $("#notesFrame");
  if (frame) { frame.src = "about:blank"; frame.classList.add("hidden"); }
  player.classList.add("hidden");
}
video.addEventListener("error", () => {
  video.classList.add("hidden");
  unsupported.classList.remove("hidden");
});
$("#closePlayer").onclick = closePlayer;
player.addEventListener("click", e => { if(e.target === player) closePlayer(); });
$("#backBtn").onclick = showSubjects;
searchInput.addEventListener("input", () => activeLectureSubject ? showLectures(activeLectureSubject) : showSubjects());

$("#menuBtn").onclick = () => { $("#drawer").classList.remove("hidden"); $("#backdrop").classList.remove("hidden"); };
$("#closeDrawer").onclick = closeDrawer;
$("#backdrop").onclick = closeDrawer;
function closeDrawer(){ $("#drawer").classList.add("hidden"); $("#backdrop").classList.add("hidden"); }

renderFilters();
showSubjects();
function openNotes(item) {
  if (!item.notes) return;
  $("#playerTitle").textContent = item.title + " — Notes";
  $("#playerMeta").textContent = `${item.subject} • ${item.chapter}`;
  video.pause();
  video.classList.add("hidden");
  unsupported.classList.add("hidden");
  let frame = document.querySelector("#notesFrame");
  if (!frame) {
    frame = document.createElement("iframe");
    frame.id = "notesFrame";
    frame.title = "Lecture Notes";
    frame.style.cssText = "width:100%;height:100%;border:0;background:#fff;";
    document.querySelector(".video-frame").appendChild(frame);
  }
  frame.src = item.notes;
  frame.classList.remove("hidden");
  player.classList.remove("hidden");
}
