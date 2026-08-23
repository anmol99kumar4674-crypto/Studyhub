export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // GitHub settings
    const OWNER = env.GITHUB_OWNER || "anmol99kumar4674-crypto";
    const REPO = env.GITHUB_REPO || "Studyhub";
    const BRANCH = env.GITHUB_BRANCH || "main";

    // Use the secret you already created in Cloudflare.
    // STUDYHUB_TOKEN is preferred; GITHUB_TOKEN also works.
    const TOKEN = env.STUDYHUB_TOKEN || env.GITHUB_TOKEN;

    // Subject -> GitHub JavaScript file
    const SUBJECT_FILES = {
      "Economics": {
        file: "economic.js",
        array: "ECONOMIC_LECTURES",
        idPrefix: "economy"
      },
      "History": {
        file: "history.js",
        array: "HISTORY_LECTURES",
        idPrefix: "history"
      },
      "Geography": {
        file: "geography.js",
        array: "GEOGRAPHY_LECTURES",
        idPrefix: "geography"
      },
      "Polity": {
        file: "polity.js",
        array: "POLITY_LECTURES",
        idPrefix: "polity"
      },
      "Art & Culture": {
        file: "art-culture.js",
        array: "ART_CULTURE_LECTURES",
        idPrefix: "art-culture"
      },
      "General Science": {
        file: "general-science.js",
        array: "GENERAL_SCIENCE_LECTURES",
        idPrefix: "science"
      }
    };

    // Admin panel
    if (request.method === "GET" && url.pathname === "/") {
      return new Response(HTML, {
        headers: {
          "Content-Type": "text/html;charset=UTF-8",
          "Cache-Control": "no-store"
        }
      });
    }

    // Add a lecture to the selected GitHub subject file
    if (request.method === "POST" && url.pathname === "/api/lecture") {
      try {
        if (!TOKEN) {
          return reply(
            "Cloudflare Settings me STUDYHUB_TOKEN secret configure nahi hai.",
            500
          );
        }

        const data = await request.json();

        const subject = String(data.subject || "").trim();
        const chapter = String(data.chapter || "").trim();
        const title = String(data.title || "").trim();
        const video = String(data.video || "").trim();
        const notes = String(data.notes || "").trim();
        const date = String(data.date || "").trim();
        const duration = String(data.duration || "").trim();

        if (!subject || !chapter || !title || !video || !date) {
          return reply(
            "Subject, Chapter, Title, Video URL aur Date bharna zaroori hai.",
            400
          );
        }

        const config = SUBJECT_FILES[subject];

        if (!config) {
          return reply("Selected subject configured nahi hai.", 400);
        }

        const api =
          `https://api.github.com/repos/${OWNER}/${REPO}/contents/${config.file}`;

        const headers = {
          "Authorization": `Bearer ${TOKEN}`,
          "Accept": "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
          "User-Agent": "StudyHub-Admin"
        };

        // Read the current file from GitHub
        const getResponse = await fetch(
          `${api}?ref=${encodeURIComponent(BRANCH)}`,
          { headers }
        );

        const oldFile = await getResponse.json();

        if (!getResponse.ok) {
          return reply(
            `GitHub file read failed: ${oldFile.message || getResponse.status}`,
            502
          );
        }

        const source = decodeBase64(oldFile.content);

        // Find the exact lecture array:
        // const ECONOMIC_LECTURES = [
        const arrayStart = source.indexOf(
          `const ${config.array} = [`
        );

        if (arrayStart === -1) {
          return reply(
            `${config.file} me ${config.array} array nahi mila.`,
            500
          );
        }

        const arrayEnd = source.indexOf("];", arrayStart);

        if (arrayEnd === -1) {
          return reply(
            `${config.file} me lecture array ka closing ]; nahi mila.`,
            500
          );
        }

        // Create a unique lecture ID
        const id = `${config.idPrefix}-${Date.now()}`;

        const lectureLines = [
          "  {",
          `    id: ${jsString(id)},`,
          `    chapter: ${jsString(chapter)},`,
          `    title: ${jsString(title)},`,
          `    date: ${jsString(date)},`,
          `    duration: ${jsString(duration)},`,
          `    url: ${jsString(video)}${notes ? "," : ""}`
        ];

        if (notes) {
          lectureLines.push(`    notes: ${jsString(notes)}`);
        }

        lectureLines.push("  }");

        // Existing array may or may not already contain items.
        const beforeClose = source.slice(arrayStart, arrayEnd);
        const hasItems = /[^\s\[]/.test(
          beforeClose.slice(beforeClose.indexOf("[") + 1)
        );

        const insertion =
          (hasItems ? ",\n" : "\n") +
          lectureLines.join("\n") +
          "\n";

        const updatedSource =
          source.slice(0, arrayEnd) +
          insertion +
          source.slice(arrayEnd);

        // Update the GitHub file
        const putResponse = await fetch(api, {
          method: "PUT",
          headers: {
            ...headers,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            message: `Add ${subject} lecture: ${title}`,
            content: encodeBase64(updatedSource),
            sha: oldFile.sha,
            branch: BRANCH
          })
        });

        const result = await putResponse.json();

        if (!putResponse.ok) {
          return reply(
            `GitHub update failed: ${result.message || putResponse.status}`,
            502
          );
        }

        return reply(
          `Lecture successfully ${config.file} me add ho gaya.`,
          200,
          {
            ok: true,
            file: config.file,
            id,
            commit: result.commit?.html_url || ""
          }
        );
      } catch (error) {
        return reply(
          `Worker error: ${error?.message || "Unknown error"}`,
          500
        );
      }
    }

    return new Response("Not Found", { status: 404 });
  }
};

function reply(message, status = 200, extra = {}) {
  return new Response(
    JSON.stringify({
      message,
      ...extra
    }),
    {
      status,
      headers: {
        "Content-Type": "application/json;charset=UTF-8",
        "Cache-Control": "no-store"
      }
    }
  );
}

function jsString(value) {
  // Produces valid JavaScript string literals.
  return JSON.stringify(String(value));
}

function decodeBase64(value) {
  const clean = value.replace(/\s/g, "");
  const binary = atob(clean);
  const bytes = Uint8Array.from(binary, c => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function encodeBase64(value) {
  const bytes = new TextEncoder().encode(value);
  let binary = "";

  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(
      ...bytes.subarray(i, i + 0x8000)
    );
  }

  return btoa(binary);
}

const HTML = `<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>StudyHub Admin</title>
<style>
*{box-sizing:border-box}
body{
  font-family:Arial,sans-serif;
  background:#f5f3ff;
  margin:0;
  padding:20px;
  color:#111
}
.box{
  max-width:620px;
  margin:auto;
  background:#fff;
  padding:25px;
  border-radius:20px;
  box-shadow:0 8px 30px rgba(0,0,0,.08)
}
h1{
  color:#5638d4;
  margin-top:0
}
label{
  display:block;
  font-weight:700;
  margin-top:14px
}
input,select{
  width:100%;
  padding:14px;
  margin:8px 0 14px;
  box-sizing:border-box;
  border:1px solid #ddd;
  border-radius:10px;
  font-size:16px;
  background:#fff
}
button{
  width:100%;
  padding:15px;
  background:#5638d4;
  color:#fff;
  border:0;
  border-radius:10px;
  font-size:17px;
  cursor:pointer
}
button:disabled{
  opacity:.6;
  cursor:wait
}
#msg{
  display:none;
  margin:15px 0 0;
  padding:13px;
  border-radius:10px;
  white-space:pre-wrap;
  word-break:break-word
}
.ok{
  display:block!important;
  background:#eaf8ef;
  color:#176b38
}
.err{
  display:block!important;
  background:#fdeaea;
  color:#a52222
}
.small{
  color:#666;
  font-size:13px;
  margin-top:12px
}
</style>
</head>
<body>
<div class="box">
<h1>📚 StudyHub Admin</h1>

<label>Subject</label>
<select id="subject">
  <option>Economics</option>
  <option>History</option>
  <option>Geography</option>
  <option>Polity</option>
  <option>Art & Culture</option>
  <option>General Science</option>
</select>

<label>Chapter</label>
<input id="chapter" placeholder="Introduction to Economy">

<label>Lecture Title</label>
<input id="title" placeholder="Economic Lecture 3 : Introduction to Economy">

<label>Video URL</label>
<input id="video" placeholder="https://...">

<label>Notes URL (Optional)</label>
<input id="notes" placeholder="https://...">

<label>Date</label>
<input id="date" type="date">

<label>Duration (Optional)</label>
<input id="duration" placeholder="01:20:00">

<button id="btn" type="button" onclick="save()">Add Lecture</button>

<div id="msg"></div>
<div class="small">
Lecture save hone par selected subject ki GitHub file automatically update hogi.
</div>
</div>

<script>
async function save(){
  const msg = document.getElementById("msg");
  const btn = document.getElementById("btn");

  const data = {
    subject: document.getElementById("subject").value,
    chapter: document.getElementById("chapter").value.trim(),
    title: document.getElementById("title").value.trim(),
    video: document.getElementById("video").value.trim(),
    notes: document.getElementById("notes").value.trim(),
    date: document.getElementById("date").value,
    duration: document.getElementById("duration").value.trim()
  };

  if(!data.chapter || !data.title || !data.video || !data.date){
    msg.className = "err";
    msg.innerText = "Chapter, Title, Video URL aur Date bharna zaroori hai.";
    return;
  }

  btn.disabled = true;
  btn.innerText = "Adding...";
  msg.className = "";
  msg.style.display = "none";

  try{
    const response = await fetch("/api/lecture", {
      method: "POST",
      headers: {"Content-Type":"application/json"},
      body: JSON.stringify(data)
    });

    const result = await response.json();

    if(result.ok){
      msg.className = "ok";
      msg.innerText = result.message;
      document.getElementById("title").value = "";
      document.getElementById("video").value = "";
      document.getElementById("notes").value = "";
    }else{
      msg.className = "err";
      msg.innerText = result.message || "Lecture add nahi hua.";
    }
  }catch(error){
    msg.className = "err";
    msg.innerText = "Request failed: " + error.message;
  }

  btn.disabled = false;
  btn.innerText = "Add Lecture";
}
</script>
</body>
</html>`;
