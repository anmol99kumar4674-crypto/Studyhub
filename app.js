/* StudyHub: Subject → Chapter → Lecture/PDF */
const SUBJECTS=[
"Notices","Current Affairs","Polity","History","Bihar Special","Science",
"Environment","Economics","Essay","Hindi (हिन्दी)","Maths/DI",
"Bihar Current Wallah Monthly Compilation","NCERT"
];

const ALL_LECTURES=[
 ...(typeof ECONOMIC_LECTURES!=="undefined"?ECONOMIC_LECTURES.map(x=>({...x,subject:"Economics"})):[]),
 ...(typeof HISTORY_LECTURES!=="undefined"?HISTORY_LECTURES.map(x=>({...x,subject:"History"})):[]),
 ...(typeof GEOGRAPHY_LECTURES!=="undefined"?GEOGRAPHY_LECTURES.map(x=>({...x,subject:"Geography"})):[]),
 ...(typeof POLITY_LECTURES!=="undefined"?POLITY_LECTURES.map(x=>({...x,subject:"Polity"})):[]),
 ...(typeof GENERAL_SCIENCE_LECTURES!=="undefined"?GENERAL_SCIENCE_LECTURES.map(x=>({...x,subject:"Science"})):[]),
 ...(typeof CURRENT_AFFAIRS_LECTURES!=="undefined"?CURRENT_AFFAIRS_LECTURES.map(x=>({...x,subject:"Current Affairs"})):[]),
 ...(typeof NOTICES_LECTURES!=="undefined"?NOTICES_LECTURES.map(x=>({...x,subject:"Notices"})):[]),
 ...(typeof BIHAR_SPECIAL_LECTURES!=="undefined"?BIHAR_SPECIAL_LECTURES.map(x=>({...x,subject:"Bihar Special"})):[]),
 ...(typeof ENVIRONMENT_LECTURES!=="undefined"?ENVIRONMENT_LECTURES.map(x=>({...x,subject:"Environment"})):[]),
 ...(typeof ESSAY_LECTURES!=="undefined"?ESSAY_LECTURES.map(x=>({...x,subject:"Essay"})):[]),
 ...(typeof HINDI_LECTURES!=="undefined"?HINDI_LECTURES.map(x=>({...x,subject:"Hindi (हिन्दी)"})):[]),
 ...(typeof MATHS_DI_LECTURES!=="undefined"?MATHS_DI_LECTURES.map(x=>({...x,subject:"Maths/DI"})):[]),
 ...(typeof NCERT_LECTURES!=="undefined"?NCERT_LECTURES.map(x=>({...x,subject:"NCERT"})):[]),
 ...(typeof BIHAR_CURRENT_WALLAH_LECTURES!=="undefined"?BIHAR_CURRENT_WALLAH_LECTURES.map(x=>({...x,subject:"Bihar Current Wallah Monthly Compilation"})):[])
];
const LECTURES=ALL_LECTURES,$=s=>document.querySelector(s);
const subjectsView=$("#subjectsView"),lecturesView=$("#lecturesView"),subjectGrid=$("#subjectGrid"),
chapterList=$("#chapterList"),filters=$("#subjectFilters"),searchInput=$("#searchInput");
const iconMap={"Notices":"📢","Current Affairs":"📰","Polity":"⚖️","History":"📜","Bihar Special":"🧪",
"Science":"🔬","Environment":"🌱","Economics":"📈","Essay":"📝","Hindi (हिन्दी)":"ॐ",
"Maths/DI":"∑","Bihar Current Wallah Monthly Compilation":"🧪","NCERT":"📚"};
const pdfOnly=s=>s==="Bihar Current Wallah Monthly Compilation";
let activeSubject="All",activeLectureSubject=null,activeChapter=null;

function subjects(){return [...new Set([...SUBJECTS,...LECTURES.map(x=>x.subject).filter(Boolean)])].sort()}
function filteredLectures(){
 const q=(searchInput?.value||"").trim().toLowerCase();
 return LECTURES.filter(x=>(activeSubject==="All"||x.subject===activeSubject)&&
 (!q||[x.title,x.subject,x.chapter].join(" ").toLowerCase().includes(q)))
 .sort((a,b)=>(b.date||"").localeCompare(a.date||"")||String(b.id||"").localeCompare(String(a.id||"")));
}
function renderFilters(){
 filters.innerHTML="";
 ["All",...subjects()].forEach(s=>{
  const b=document.createElement("button");b.className="filter "+(activeSubject===s?"active":"");b.textContent=s;
  b.onclick=()=>{activeSubject=s;activeLectureSubject=null;activeChapter=null;
   history.pushState({studyLectures:true,view:"subjects",subject:s},"",location.href);showSubjects();renderFilters()};
  filters.appendChild(b);
 });
}
function showSubjects(){
 subjectsView.classList.remove("hidden");lecturesView.classList.add("hidden");
 activeLectureSubject=null;activeChapter=null;subjectGrid.innerHTML="";
 subjects().forEach(subject=>{
  const n=filteredLectures().filter(x=>x.subject===subject).length;
  const card=document.createElement("button");card.className="subject-card";
  card.innerHTML=`<span class="subject-icon">${iconMap[subject]||"📘"}</span>
  <span><b>${subject}</b><small>${n} lecture${n===1?"":"s"}</small></span><span class="arrow">›</span>`;
  card.onclick=()=>showChapters(subject,true);subjectGrid.appendChild(card);
 });
}
function showChapters(subject,push=true){
 activeLectureSubject=subject;activeChapter=null;
 if(push)history.pushState({studyLectures:true,view:"chapters",subject},"",location.href);
 subjectsView.classList.add("hidden");lecturesView.classList.remove("hidden");
 renderChapterHeader(subject);
 const data=filteredLectures().filter(x=>x.subject===subject),groups={};
 data.forEach(x=>(groups[x.chapter||"General"]||=[]).push(x));chapterList.innerHTML="";
 if(!Object.keys(groups).length){chapterList.innerHTML='<div class="empty-state"><b>No chapters added yet.</b><small>Is subject me admin se content add kar sakte hain.</small></div>';return}
 Object.entries(groups).forEach(([chapter,list])=>{
  const c=document.createElement("button");c.className="chapter-card";
  c.innerHTML=`<span class="chapter-card-main"><b>${chapter}</b><small>${list.length} lecture${list.length===1?"":"s"}</small></span><span class="chapter-arrow">›</span>`;
  c.onclick=()=>showChapterLectures(subject,chapter,true);chapterList.appendChild(c);
 });
}
function showChapterLectures(subject,chapter,push=true){
 activeLectureSubject=subject;activeChapter=chapter;
 if(push)history.pushState({studyLectures:true,view:"chapterLectures",subject,chapter},"",location.href);
 subjectsView.classList.add("hidden");lecturesView.classList.remove("hidden");renderChapterLectureHeader(subject,chapter);
 const data=filteredLectures().filter(x=>x.subject===subject&&(x.chapter||"General")===chapter);
 chapterList.innerHTML="";const ul=document.createElement("div");ul.className="lecture-list chapter-lecture-list";
 data.forEach((x,i)=>{
  const row=document.createElement("button");row.className="lecture";const pdf=x.type==="pdf"||pdfOnly(subject);
  row.innerHTML=`<span class="lecture-no">${String(i+1).padStart(2,"0")}</span><span class="lecture-main"><b>${x.title}</b><small>${formatDate(x.date)}${x.duration?" • "+x.duration:""}</small></span><span class="lecture-actions"><span class="play">${pdf?"📄":"▶"}</span></span>`;
  row.onclick=()=>pdf?openPdf(x):openLectureDirect(x);ul.appendChild(row);
 });chapterList.appendChild(ul);
}
function renderChapterHeader(subject){const h=lecturesView.querySelector(".section-head");h.innerHTML=`<button class="back-btn" id="backBtn">← Subjects</button><h2 id="subjectTitle">${subject}</h2>`;$("#backBtn").onclick=()=>history.back()}
function renderChapterLectureHeader(subject,chapter){const h=lecturesView.querySelector(".section-head");h.innerHTML=`<button class="back-btn" id="backBtn">← Chapters</button><h2 id="subjectTitle">${chapter}</h2>`;$("#backBtn").onclick=()=>history.back()}
function formatDate(s){if(!s)return "";return new Date(s+"T00:00:00").toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"})}
function openPdf(x){if(x.url)location.href=x.url}
function openLectureDirect(x){if(x.url)location.href=x.url}
if(searchInput)searchInput.addEventListener("input",()=>activeChapter?showChapterLectures(activeLectureSubject,activeChapter,false):activeLectureSubject?showChapters(activeLectureSubject,false):showSubjects());
window.addEventListener("popstate",e=>{const s=e.state;if(s?.view==="chapterLectures")showChapterLectures(s.subject,s.chapter,false);else if(s?.view==="chapters")showChapters(s.subject,false);else showSubjects();renderFilters()});
if(!history.state?.studyLectures)history.replaceState({studyLectures:true,view:"subjects"},"",location.href);
renderFilters();showSubjects();
