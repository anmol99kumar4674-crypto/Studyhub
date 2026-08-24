/* Cloudflare Worker update.
   Expand FILES with the subjects below and make Bihar Current Wallah Monthly Compilation PDF-only.
   Keep your existing GitHub OWNER/REPO/TOKEN code.
*/
const SUBJECT_FILES={
"Notices":"notices.js","Current Affairs":"current-affairs.js","Polity":"polity.js","History":"history.js",
"Bihar Special":"bihar-special.js","Science":"science.js","Environment":"environment.js","Economics":"economic.js",
"Essay":"essay.js","Hindi (हिन्दी)":"hindi.js","Maths/DI":"maths-di.js",
"Bihar Current Wallah Monthly Compilation":"bihar-current-wallah-monthly-compilation.js","NCERT":"ncert.js"
};
const PDF_ONLY=new Set(["Bihar Current Wallah Monthly Compilation"]);

/* In your POST /api/lecture handler:
   const pdfOnly=PDF_ONLY.has(subject);
   const contentUrl=pdfOnly ? String(d.pdf||"").trim() : String(d.video||"").trim();
   if(!subject||!chapter||!title||!date||!contentUrl) return reply(pdfOnly?"Chapter, Title, PDF URL और Date भरें.":"Subject, Chapter, Title, Video URL और Date भरें.",400);
   const item={id:`${slug}-${Date.now()}`,chapter,title,date,duration:pdfOnly?"":duration,url:contentUrl};
   if(pdfOnly)item.type="pdf";
   if(!pdfOnly && notes)item.notes=notes;
   Write item to SUBJECT_FILES[subject].
*/

/* Admin UI behavior:
   - When subject is Bihar Current Wallah Monthly Compilation, hide Video URL,
     Notes URL and Duration and show only PDF URL.
*/
