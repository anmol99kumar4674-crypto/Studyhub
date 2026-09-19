
function cumulativeSeconds(existing, incoming) {
  const oldValue = Number(existing || 0);
  const newValue = Number(incoming || 0);
  return Math.max(0, Math.floor(oldValue)) + Math.max(0, Math.floor(newValue));
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // GitHub settings
    const OWNER = env.GITHUB_OWNER || "anmol99kumar4674-crypto";
    const REPO = env.GITHUB_REPO || "Studyhub";
    const BRANCH = env.GITHUB_BRANCH || "main";
    const ATTENDANCE_FILE = "attendance.json";
    const TIME_FILE = "user-time.json";
    const VISITS_FILE = "user-visits.json";

    // Use the secret you already created in Cloudflare.
    // STUDYHUB_TOKEN is preferred; GITHUB_TOKEN also works.
    const TOKEN = env.STUDYHUB_TOKEN || env.GITHUB_TOKEN;

    // Attendance is stored centrally in GitHub so the admin can see every
    // student's attendance, while the student only needs to enter their name.
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders() });
    }

    // Subject -> GitHub JavaScript file
    const SUBJECT_FILES = {
      "Notices": { file:"notices.js", array:"NOTICES_LECTURES", idPrefix:"notices" },
      "Current Affairs": { file:"current-affairs.js", array:"CURRENT_AFFAIRS_LECTURES", idPrefix:"current-affairs" },
      "Polity": { file:"polity.js", array:"POLITY_LECTURES", idPrefix:"polity" },
      "History": { file:"history.js", array:"HISTORY_LECTURES", idPrefix:"history" },
      "Bihar Special": { file:"bihar-special.js", array:"BIHAR_SPECIAL_LECTURES", idPrefix:"bihar-special" },
      "Science": { file:"general-science.js", array:"GENERAL_SCIENCE_LECTURES", idPrefix:"science" },
      "Environment": { file:"environment.js", array:"ENVIRONMENT_LECTURES", idPrefix:"environment" },
      "Economics": { file:"economic.js", array:"ECONOMIC_LECTURES", idPrefix:"economy" },
      "Essay": { file:"essay.js", array:"ESSAY_LECTURES", idPrefix:"essay" },
      "Hindi (हिन्दी)": { file:"hindi.js", array:"HINDI_LECTURES", idPrefix:"hindi" },
      "Maths/DI": { file:"maths-di.js", array:"MATHS_DI_LECTURES", idPrefix:"maths-di" },
      "Bihar Current Wallah Monthly Compilation": { file:"bihar-current-wallah-monthly-compilation.js", array:"BIHAR_CURRENT_WALLAH_LECTURES", idPrefix:"bihar-current-wallah" },
      "NCERT": { file:"ncert.js", array:"NCERT_LECTURES", idPrefix:"ncert" }
    };

    const PDF_ONLY_SUBJECTS = new Set([
      "Bihar Current Wallah Monthly Compilation"
    ]);

    // Admin panel
    if (request.method === "GET" && url.pathname === "/") {
      return new Response(HTML, {
        headers: {
          "Content-Type": "text/html;charset=UTF-8",
          "Cache-Control": "no-store"
        }
      });
    }

    // Mark student attendance. One attendance per name per day.
    if (request.method === "POST" && url.pathname === "/api/attendance") {
      try {
        if (!TOKEN) return reply("Attendance server configured nahi hai.", 500);

        const data = await request.json();
        const name = String(data.name || "").trim().replace(/\s+/g, " ");
        if (!name || name.length < 2 || name.length > 80) {
          return reply("Valid name bharna zaroori hai.", 400);
        }

        const now = new Date();
        const ist = new Intl.DateTimeFormat("en-CA", {
          timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit"
        }).format(now);
        const time = new Intl.DateTimeFormat("en-IN", {
          timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true
        }).format(now);

        const api = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${ATTENDANCE_FILE}`;
        const headers = {
          "Authorization": `Bearer ${TOKEN}`,
          "Accept": "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
          "User-Agent": "StudyHub-Attendance"
        };

        const getResponse = await fetch(`${api}?ref=${encodeURIComponent(BRANCH)}`, { headers });
        let records = [];
        let sha = undefined;

        if (getResponse.ok) {
          const oldFile = await getResponse.json();
          sha = oldFile.sha;
          try {
            const decoded = decodeBase64(oldFile.content);
            const parsed = JSON.parse(decoded);
            records = Array.isArray(parsed) ? parsed : [];
          } catch (_) {
            records = [];
          }
        } else if (getResponse.status !== 404) {
          const err = await getResponse.json().catch(() => ({}));
          return reply(`Attendance file read failed: ${err.message || getResponse.status}`, 502);
        }

        const duplicate = records.some(x =>
          String(x.name || "").toLowerCase() === name.toLowerCase() && x.date === ist
        );

        if (duplicate) {
          return reply("Aaj ki attendance pehle hi lag chuki hai.", 200, { ok: true, alreadyMarked: true, date: ist });
        }

        records.push({ name, date: ist, time });

        const body = {
          message: `Attendance: ${name} - ${ist}`,
          content: encodeBase64(JSON.stringify(records, null, 2) + "\n"),
          branch: BRANCH
        };
        if (sha) body.sha = sha;

        const putResponse = await fetch(api, {
          method: "PUT",
          headers: { ...headers, "Content-Type": "application/json" },
          body: JSON.stringify(body)
        });
        const result = await putResponse.json();

        if (!putResponse.ok) {
          return reply(`Attendance save failed: ${result.message || putResponse.status}`, 502);
        }

        return reply("Attendance successfully marked.", 200, { ok: true, date: ist, time });
      } catch (error) {
        return reply(`Attendance error: ${error?.message || "Unknown error"}`, 500);
      }
    }

    // Admin can see the centrally stored attendance list.
    if (request.method === "GET" && url.pathname === "/api/attendance") {
      try {
        if (!TOKEN) return reply("Attendance server configured nahi hai.", 500);
        const api = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${ATTENDANCE_FILE}`;
        const response = await fetch(`${api}?ref=${encodeURIComponent(BRANCH)}`, {
          headers: {
            "Authorization": `Bearer ${TOKEN}`,
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
            "User-Agent": "StudyHub-Attendance"
          }
        });
        if (response.status === 404) return reply("Attendance abhi empty hai.", 200, { ok: true, records: [] });
        const file = await response.json();
        if (!response.ok) return reply(`Attendance read failed: ${file.message || response.status}`, 502);
        const records = JSON.parse(decodeBase64(file.content));
        return reply("Attendance list", 200, { ok: true, records: Array.isArray(records) ? records : [] });
      } catch (error) {
        return reply(`Attendance error: ${error?.message || "Unknown error"}`, 500);
      }
    }


    // Record each time an attended student arrives/returns to the website.
    if (request.method === "POST" && url.pathname === "/api/visit") {
      try {
        if (!TOKEN) return reply("Visit tracking server configured nahi hai.", 500);

        const data = await request.json();
        const name = String(data.name || "").trim().replace(/\s+/g, " ");
        if (!name || name.length < 2 || name.length > 80) {
          return reply("Valid name bharna zaroori hai.", 400);
        }

        const now = new Date();
        const date = new Intl.DateTimeFormat("en-CA", {
          timeZone: "Asia/Kolkata",
          year: "numeric", month: "2-digit", day: "2-digit"
        }).format(now);

        const time = new Intl.DateTimeFormat("en-IN", {
          timeZone: "Asia/Kolkata",
          hour: "2-digit", minute: "2-digit", second: "2-digit",
          hour12: true
        }).format(now);

        const api = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${VISITS_FILE}`;
        const headers = {
          "Authorization": `Bearer ${TOKEN}`,
          "Accept": "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
          "User-Agent": "StudyHub-Visit-Tracking"
        };

        const getResponse = await fetch(`${api}?ref=${encodeURIComponent(BRANCH)}`, { headers });

        let records = [];
        let sha;

        if (getResponse.ok) {
          const oldFile = await getResponse.json();
          sha = oldFile.sha;
          try {
            const parsed = JSON.parse(decodeBase64(oldFile.content));
            records = Array.isArray(parsed) ? parsed : [];
          } catch (_) {
            records = [];
          }
        } else if (getResponse.status !== 404) {
          const err = await getResponse.json().catch(() => ({}));
          return reply(`Visit file read failed: ${err.message || getResponse.status}`, 502);
        }

        records.push({ name, date, time });

        const body = {
          message: `Website visit: ${name} - ${date} ${time}`,
          content: encodeBase64(JSON.stringify(records, null, 2) + "\n"),
          branch: BRANCH
        };
        if (sha) body.sha = sha;

        const putResponse = await fetch(api, {
          method: "PUT",
          headers: { ...headers, "Content-Type": "application/json" },
          body: JSON.stringify(body)
        });

        const result = await putResponse.json().catch(() => ({}));
        if (!putResponse.ok) {
          return reply(`Visit save failed: ${result.message || putResponse.status}`, 502);
        }

        return reply("Website visit saved.", 200, { ok: true, date, time });
      } catch (error) {
        return reply(`Visit tracking error: ${error?.message || "Unknown error"}`, 500);
      }
    }

    // Admin can see every recorded website visit.
    if (request.method === "GET" && url.pathname === "/api/visits") {
      try {
        if (!TOKEN) return reply("Visit tracking server configured nahi hai.", 500);

        const api = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${VISITS_FILE}`;
        const response = await fetch(`${api}?ref=${encodeURIComponent(BRANCH)}`, {
          headers: {
            "Authorization": `Bearer ${TOKEN}`,
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
            "User-Agent": "StudyHub-Visit-Tracking"
          }
        });

        if (response.status === 404) {
          return reply("Website visits abhi empty hain.", 200, { ok: true, records: [] });
        }

        const file = await response.json();
        if (!response.ok) {
          return reply(`Visit read failed: ${file.message || response.status}`, 502);
        }

        const records = JSON.parse(decodeBase64(file.content));
        return reply("Website visits list", 200, {
          ok: true,
          records: Array.isArray(records) ? records : []
        });
      } catch (error) {
        return reply(`Visit tracking error: ${error?.message || "Unknown error"}`, 500);
      }
    }

    // Track how long an attended student stays on the website.
    // Time is aggregated centrally in GitHub, one record per student per IST date.
    if (request.method === "POST" && url.pathname === "/api/time") {
      try {
        if (!TOKEN) return reply("Time tracking server configured nahi hai.", 500);

        const data = await request.json();
        const name = String(data.name || "").trim().replace(/\s+/g, " ");
        const seconds = Math.floor(Number(data.seconds || 0));

        if (!name || name.length < 2 || name.length > 80) {
          return reply("Valid name bharna zaroori hai.", 400);
        }

        if (!Number.isFinite(seconds) || seconds < 1 || seconds > 300) {
          return reply("Invalid time value.", 400);
        }

        const now = new Date();
        const date = new Intl.DateTimeFormat("en-CA", {
          timeZone: "Asia/Kolkata",
          year: "numeric",
          month: "2-digit",
          day: "2-digit"
        }).format(now);

        const lastSeen = new Intl.DateTimeFormat("en-IN", {
          timeZone: "Asia/Kolkata",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: true
        }).format(now);

        const api = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${TIME_FILE}`;
        const headers = {
          "Authorization": `Bearer ${TOKEN}`,
          "Accept": "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
          "User-Agent": "StudyHub-Time-Tracking"
        };

        const getResponse = await fetch(
          `${api}?ref=${encodeURIComponent(BRANCH)}`,
          { headers }
        );

        let records = [];
        let sha;

        if (getResponse.ok) {
          const oldFile = await getResponse.json();
          sha = oldFile.sha;
          try {
            const parsed = JSON.parse(decodeBase64(oldFile.content));
            records = Array.isArray(parsed) ? parsed : [];
          } catch (_) {
            records = [];
          }
        } else if (getResponse.status !== 404) {
          const err = await getResponse.json().catch(() => ({}));
          return reply(
            `Time file read failed: ${err.message || getResponse.status}`,
            502
          );
        }

        const existing = records.find(x =>
          String(x.name || "").toLowerCase() === name.toLowerCase() &&
          x.date === date
        );

        if (existing) {
          existing.seconds = Math.max(0, Number(existing.seconds) || 0) + seconds;
          existing.lastSeen = lastSeen;
        } else {
          records.push({
            name,
            date,
            seconds,
            lastSeen
          });
        }

        const body = {
          message: `Website time: ${name} - ${date}`,
          content: encodeBase64(JSON.stringify(records, null, 2) + "\n"),
          branch: BRANCH
        };
        if (sha) body.sha = sha;

        const putResponse = await fetch(api, {
          method: "PUT",
          headers: { ...headers, "Content-Type": "application/json" },
          body: JSON.stringify(body)
        });

        const result = await putResponse.json().catch(() => ({}));

        if (!putResponse.ok) {
          return reply(
            `Time save failed: ${result.message || putResponse.status}`,
            502
          );
        }

        return reply("Website time saved.", 200, {
          ok: true,
          date,
          seconds
        });
      } catch (error) {
        return reply(
          `Time tracking error: ${error?.message || "Unknown error"}`,
          500
        );
      }
    }

    // Admin can see the centrally stored website-time list.
    if (request.method === "GET" && url.pathname === "/api/time") {
      try {
        if (!TOKEN) return reply("Time tracking server configured nahi hai.", 500);

        const api = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${TIME_FILE}`;
        const response = await fetch(
          `${api}?ref=${encodeURIComponent(BRANCH)}`,
          {
            headers: {
              "Authorization": `Bearer ${TOKEN}`,
              "Accept": "application/vnd.github+json",
              "X-GitHub-Api-Version": "2022-11-28",
              "User-Agent": "StudyHub-Time-Tracking"
            }
          }
        );

        if (response.status === 404) {
          return reply("Website time abhi empty hai.", 200, {
            ok: true,
            records: []
          });
        }

        const file = await response.json();

        if (!response.ok) {
          return reply(
            `Time read failed: ${file.message || response.status}`,
            502
          );
        }

        const records = JSON.parse(decodeBase64(file.content));

        return reply("Website time list", 200, {
          ok: true,
          records: Array.isArray(records) ? records : []
        });
      } catch (error) {
        return reply(
          `Time tracking error: ${error?.message || "Unknown error"}`,
          500
        );
      }
    }


    // Load lectures/posts for Admin "Manage Lectures".
    if (request.method === "GET" && url.pathname === "/api/lectures") {
      try {
        if (!TOKEN) return reply("Cloudflare Settings me STUDYHUB_TOKEN secret configure nahi hai.", 500);
        const subject = String(url.searchParams.get("subject") || "").trim();
        const config = SUBJECT_FILES[subject];
        if (!config) return reply("Valid subject select karein.", 400);

        const api = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${config.file}`;
        const headers = {
          "Authorization": `Bearer ${TOKEN}`,
          "Accept": "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
          "User-Agent": "StudyHub-Admin"
        };
        const response = await fetch(`${api}?ref=${encodeURIComponent(BRANCH)}`, { headers });
        const file = await response.json();
        if (response.status === 404) return reply("No content available", 200, { ok:true, posts:[] });
        if (!response.ok) return reply(`GitHub file read failed: ${file.message || response.status}`, 502);

        const source = decodeBase64(file.content);
        const posts = parseLectureArray(source, config.array);
        return reply("Posts loaded", 200, { ok:true, posts, file:config.file });
      } catch (error) {
        return reply(`Posts load failed: ${error?.message || "Unknown error"}`, 500);
      }
    }

    // Edit an existing lecture/post.
    if (request.method === "PUT" && url.pathname === "/api/lecture") {
      try {
        if (!TOKEN) return reply("Cloudflare Settings me STUDYHUB_TOKEN secret configure nahi hai.", 500);
        const data = await request.json();
        const subject = String(data.subject || "").trim();
        const id = String(data.id || "").trim();
        const chapter = String(data.chapter || "").trim();
        const title = String(data.title || "").trim();
        const video = String(data.video || "").trim();
        const pdf = String(data.pdf || "").trim();
        const notes = String(data.notes || "").trim();
        const date = String(data.date || "").trim();
        const duration = String(data.duration || "").trim();
        const pdfOnly = PDF_ONLY_SUBJECTS.has(subject);
        const contentUrl = pdfOnly ? pdf : video;
        const config = SUBJECT_FILES[subject];

        if (!config || !id || !chapter || !title || !date || (pdfOnly && !pdf)) {
          return reply(pdfOnly
            ? "Subject, ID, Chapter, Title, PDF URL aur Date zaroori hai."
            : "Subject, ID, Chapter, Title aur Date zaroori hai.", 400);
        }

        const api = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${config.file}`;
        const headers = {
          "Authorization": `Bearer ${TOKEN}`,
          "Accept": "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
          "User-Agent": "StudyHub-Admin"
        };
        const getResponse = await fetch(`${api}?ref=${encodeURIComponent(BRANCH)}`, { headers });
        const oldFile = await getResponse.json();
        if (!getResponse.ok) return reply(`GitHub file read failed: ${oldFile.message || getResponse.status}`, 502);

        const source = decodeBase64(oldFile.content);
        const posts = parseLectureArray(source, config.array);
        const index = posts.findIndex(x => String(x.id) === id);
        if (index === -1) return reply("Post nahi mila. Refresh Posts karke dobara try karein.", 404);

        posts[index] = {
          ...posts[index],
          chapter, title, date,
          duration: pdfOnly ? "" : duration,
          url: contentUrl,
          ...(pdfOnly ? { type:"pdf" } : { type: posts[index].type === "pdf" ? undefined : posts[index].type }),
          ...(notes ? { notes } : {})
        };
        if (!pdfOnly && !notes) delete posts[index].notes;
        if (!pdfOnly && posts[index].type === "pdf") delete posts[index].type;

        const updatedSource = replaceLectureArray(source, config.array, posts);
        const putResponse = await fetch(api, {
          method:"PUT",
          headers:{...headers, "Content-Type":"application/json"},
          body:JSON.stringify({
            message:`Edit ${subject} lecture: ${title}`,
            content:encodeBase64(updatedSource),
            sha:oldFile.sha,
            branch:BRANCH
          })
        });
        const result = await putResponse.json();
        if (!putResponse.ok) return reply(`GitHub update failed: ${result.message || putResponse.status}`, 502);
        return reply("Post successfully update ho gaya.", 200, {ok:true, id});
      } catch(error) {
        return reply(`Edit error: ${error?.message || "Unknown error"}`, 500);
      }
    }

    // Delete an existing lecture/post.
    if (request.method === "DELETE" && url.pathname === "/api/lecture") {
      try {
        if (!TOKEN) return reply("Cloudflare Settings me STUDYHUB_TOKEN secret configure nahi hai.", 500);
        const subject = String(url.searchParams.get("subject") || "").trim();
        const id = String(url.searchParams.get("id") || "").trim();
        const config = SUBJECT_FILES[subject];
        if (!config || !id) return reply("Subject aur post ID zaroori hai.", 400);

        const api = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${config.file}`;
        const headers = {
          "Authorization": `Bearer ${TOKEN}`,
          "Accept": "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
          "User-Agent": "StudyHub-Admin"
        };
        const getResponse = await fetch(`${api}?ref=${encodeURIComponent(BRANCH)}`, { headers });
        const oldFile = await getResponse.json();
        if (!getResponse.ok) return reply(`GitHub file read failed: ${oldFile.message || getResponse.status}`, 502);

        const source = decodeBase64(oldFile.content);
        const posts = parseLectureArray(source, config.array);
        const remaining = posts.filter(x => String(x.id) !== id);
        if (remaining.length === posts.length) return reply("Post nahi mila. Refresh Posts karke dobara try karein.", 404);

        const updatedSource = replaceLectureArray(source, config.array, remaining);
        const putResponse = await fetch(api, {
          method:"PUT",
          headers:{...headers, "Content-Type":"application/json"},
          body:JSON.stringify({
            message:`Delete ${subject} lecture: ${id}`,
            content:encodeBase64(updatedSource),
            sha:oldFile.sha,
            branch:BRANCH
          })
        });
        const result = await putResponse.json();
        if (!putResponse.ok) return reply(`GitHub update failed: ${result.message || putResponse.status}`, 502);
        return reply("Post successfully delete ho gaya.", 200, {ok:true, id});
      } catch(error) {
        return reply(`Delete error: ${error?.message || "Unknown error"}`, 500);
      }
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
        const pdf = String(data.pdf || "").trim();
        const notes = String(data.notes || "").trim();
        const date = String(data.date || "").trim();
        const duration = String(data.duration || "").trim();
        const pdfOnly = PDF_ONLY_SUBJECTS.has(subject);
        const contentUrl = pdfOnly ? pdf : video;

        // Video URL is optional for normal lectures.
        // PDF-only subjects still require their PDF URL.
        if (!subject || !chapter || !title || !date || (pdfOnly && !pdf)) {
          return reply(
            pdfOnly
              ? "Subject, Chapter, Title, PDF URL aur Date bharna zaroori hai."
              : "Subject, Chapter, Title aur Date bharna zaroori hai.",
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
          `    duration: ${jsString(pdfOnly ? "" : duration)},`,
          `    url: ${jsString(contentUrl)},`
        ];

        if (pdfOnly) {
          lectureLines.push(`    type: "pdf"`);
        } else if (notes) {
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


function parseLectureArray(source, arrayName) {
  const startMarker = `const ${arrayName} = [`;
  const start = source.indexOf(startMarker);
  if (start < 0) return [];
  const open = source.indexOf("[", start);
  const close = findMatchingBracket(source, open);
  if (open < 0 || close < 0) return [];

  const body = source.slice(open + 1, close);
  const blocks = [];
  let depth = 0, inString = false, escaped = false, blockStart = -1;
  for (let i = 0; i < body.length; i++) {
    const ch = body[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') { inString = true; continue; }
    if (ch === "{") {
      if (depth === 0) blockStart = i;
      depth++;
    } else if (ch === "}") {
      depth--;
      if (depth === 0 && blockStart >= 0) {
        const block = body.slice(blockStart, i + 1);
        const item = parseLectureObject(block);
        if (item) blocks.push(item);
        blockStart = -1;
      }
    }
  }
  return blocks;
}

function parseLectureObject(block) {
  const item = {};
  const fields = ["id","chapter","title","date","duration","url","notes","dpp","dppUrl","dppPdf","dppPdfUrl","type"];
  for (const key of fields) {
    const re = new RegExp("\\b" + key.replace(/[.*+?^${}()|[\\]\\\\]/g,"\\$&") + "\\s*:\\s*([\\s\\S]*?)(?:,\\s*\\n|\\n\\s*})");
    const m = block.match(re);
    if (m) {
      const raw = m[1].trim().replace(/,$/,"").trim();
      try { item[key] = JSON.parse(raw); }
      catch (_) { item[key] = raw.replace(/^"(.*)"$/s,"$1"); }
    }
  }
  return item.id ? item : null;
}

function findMatchingBracket(text, openIndex) {
  let depth = 0, inString = false, escaped = false;
  for (let i = openIndex; i < text.length; i++) {
    const ch = text[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') { inString = true; continue; }
    if (ch === "[") depth++;
    else if (ch === "]") {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

function jsObject(item) {
  const order = ["id","chapter","title","date","duration","url","notes","dpp","dppUrl","dppPdf","dppPdfUrl","type"];
  const lines = ["  {"];
  for (const key of order) {
    if (item[key] !== undefined && item[key] !== null && item[key] !== "") {
      lines.push(`    ${key}: ${jsString(String(item[key]))},`);
    }
  }
  if (lines.length > 1) lines[lines.length - 1] = lines[lines.length - 1].replace(/,$/,"");
  lines.push("  }");
  return lines.join("\n");
}

function replaceLectureArray(source, arrayName, posts) {
  const startMarker = `const ${arrayName} = [`;
  const start = source.indexOf(startMarker);
  if (start < 0) throw new Error(`${arrayName} array nahi mila.`);
  const open = source.indexOf("[", start);
  const close = findMatchingBracket(source, open);
  if (open < 0 || close < 0) throw new Error(`${arrayName} array closing bracket nahi mila.`);
  const body = posts.length ? "\n" + posts.map(jsObject).join(",\n") + "\n" : "\n";
  return source.slice(0, open + 1) + body + source.slice(close);
}


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
        "Cache-Control": "no-store",
        ...corsHeaders()
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
<select id="subject"><option>Notices</option>
  <option>Current Affairs</option>
  <option>Polity</option>
  <option>History</option>
  <option>Bihar Special</option>
  <option>Science</option>
  <option>Environment</option>
  <option>Economics</option>
  <option>Essay</option>
  <option>Hindi (हिन्दी)</option>
  <option>Maths/DI</option>
  <option>Bihar Current Wallah Monthly Compilation</option>
  <option>NCERT</option></select>

<label>Chapter</label>
<input id="chapter" placeholder="Introduction to Economy">

<label>Lecture Title</label>
<input id="title" placeholder="Economic Lecture 3 : Introduction to Economy">

<div id="videoFields">
<label>Video URL</label>
<input id="video" placeholder="https://...">

<label>PDF URL (Optional)</label>
<input id="notes" placeholder="https://...pdf">

<label>Duration (Optional)</label>
<input id="duration" placeholder="01:20:00">
</div>

<div id="pdfFields" style="display:none">
<label>PDF URL</label>
<input id="pdf" placeholder="https://...pdf">
</div>

<label>Date</label>
<input id="date" type="date">

<button id="btn" type="button" onclick="save()">Add Lecture</button>

<div id="msg"></div>
<div class="small">
Lecture save hone par selected subject ki GitHub file automatically update hogi.
</div>
</div>

<div class="box" style="margin-top:20px">
<h2>📋 Student Attendance</h2>
<button type="button" onclick="loadAttendance()">Refresh Attendance</button>
<div id="attendanceAdminMsg" class="small">Attendance list load karne ke liye Refresh Attendance dabaye.</div>
<div style="overflow:auto;margin-top:12px">
<table id="attendanceTable" style="width:100%;border-collapse:collapse;display:none">
<thead><tr><th style="text-align:left;padding:10px;border-bottom:1px solid #ddd">Name</th><th style="text-align:left;padding:10px;border-bottom:1px solid #ddd">Date</th><th style="text-align:left;padding:10px;border-bottom:1px solid #ddd">Time</th></tr></thead>
<tbody></tbody>
</table>
</div>
</div>

<div class="box" style="margin-top:20px">
<h2>⏱️ Website Time</h2>
<button type="button" onclick="loadWebsiteTime()">Refresh Website Time</button>
<div id="timeAdminMsg" class="small">Website par users ne kitna time diya hai dekhne ke liye Refresh Website Time dabaye.</div>
<div style="overflow:auto;margin-top:12px">
<table id="timeTable" style="width:100%;border-collapse:collapse;display:none">
<thead>
<tr>
<th style="text-align:left;padding:10px;border-bottom:1px solid #ddd">Name</th>
<th style="text-align:left;padding:10px;border-bottom:1px solid #ddd">Date</th>
<th style="text-align:left;padding:10px;border-bottom:1px solid #ddd">Time</th>
<th style="text-align:left;padding:10px;border-bottom:1px solid #ddd">Last Seen</th>
</tr>
</thead>
<tbody></tbody>
</table>
</div>
</div>

<script>
function formatTrackedTime(totalSeconds){
  const seconds = Math.max(0, Number(totalSeconds) || 0);
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if(hours) return hours + "h " + String(minutes).padStart(2,"0") + "m";
  if(minutes) return minutes + "m " + String(secs).padStart(2,"0") + "s";
  return secs + "s";
}

async function loadWebsiteTime(){
  const msg = document.getElementById("timeAdminMsg");
  const table = document.getElementById("timeTable");
  const body = table.querySelector("tbody");

  msg.textContent = "Loading...";
  table.style.display = "none";

  try{
    const response = await fetch("/api/time", { cache:"no-store" });
    const result = await response.json();

    if(!response.ok || !result.ok){
      throw new Error(result.message || "Website time load nahi hua.");
    }

    const records = [...(result.records || [])].sort((a,b) =>
      String(b.date || "").localeCompare(String(a.date || "")) ||
      (Number(b.seconds) || 0) - (Number(a.seconds) || 0)
    );

    body.innerHTML = "";

    records.forEach(item => {
      const tr = document.createElement("tr");

      [
        item.name,
        item.date,
        formatTrackedTime(item.seconds),
        item.lastSeen || ""
      ].forEach(value => {
        const td = document.createElement("td");
        td.textContent = value;
        td.style.padding = "10px";
        td.style.borderBottom = "1px solid #eee";
        tr.appendChild(td);
      });

      body.appendChild(tr);
    });

    table.style.display = records.length ? "table" : "none";
    msg.textContent = records.length
      ? records.length + " time entries."
      : "Abhi website time record nahi hai.";
  }catch(error){
    msg.textContent = error.message || "Website time load failed.";
  }
}
</script>


<div class="box" style="margin-top:20px">
<h2>🚶 Website Visits</h2>
<button type="button" onclick="loadWebsiteVisits()">Refresh Website Visits</button>
<div id="visitAdminMsg" class="small">Users website par kab-kab aaye dekhne ke liye Refresh Website Visits dabaye.</div>
<div style="overflow:auto;margin-top:12px">
<table id="visitTable" style="width:100%;border-collapse:collapse;display:none">
<thead>
<tr>
<th style="text-align:left;padding:10px;border-bottom:1px solid #ddd">Name</th>
<th style="text-align:left;padding:10px;border-bottom:1px solid #ddd">Date</th>
<th style="text-align:left;padding:10px;border-bottom:1px solid #ddd">Time</th>
</tr>
</thead>
<tbody></tbody>
</table>
</div>
</div>

<script>
async function loadWebsiteVisits(){
  const msg = document.getElementById("visitAdminMsg");
  const table = document.getElementById("visitTable");
  const body = table.querySelector("tbody");
  msg.textContent = "Loading...";
  table.style.display = "none";

  try{
    const response = await fetch("/api/visits", { cache:"no-store" });
    const result = await response.json();
    if(!response.ok || !result.ok){
      throw new Error(result.message || "Website visits load nahi hue.");
    }

    const records = [...(result.records || [])].reverse();
    body.innerHTML = "";

    records.forEach(item => {
      const tr = document.createElement("tr");
      [item.name, item.date, item.time].forEach(value => {
        const td = document.createElement("td");
        td.textContent = value || "";
        td.style.padding = "10px";
        td.style.borderBottom = "1px solid #eee";
        tr.appendChild(td);
      });
      body.appendChild(tr);
    });

    table.style.display = records.length ? "table" : "none";
    msg.textContent = records.length
      ? records.length + " visit entries."
      : "Abhi website visit record nahi hai.";
  }catch(error){
    msg.textContent = error.message || "Website visits load failed.";
  }
}
</script>

<script>
const subjectEl = document.getElementById("subject");
function updateContentFields(){
  const pdfOnly = subjectEl.value === "Bihar Current Wallah Monthly Compilation";
  document.getElementById("videoFields").style.display = pdfOnly ? "none" : "block";
  document.getElementById("pdfFields").style.display = pdfOnly ? "block" : "none";
}
subjectEl.addEventListener("change", updateContentFields);
updateContentFields();
</script>

<script>
async function loadAttendance(){
  const msg = document.getElementById("attendanceAdminMsg");
  const table = document.getElementById("attendanceTable");
  const body = table.querySelector("tbody");
  msg.textContent = "Loading...";
  table.style.display = "none";
  try {
    const response = await fetch("/api/attendance", { cache: "no-store" });
    const result = await response.json();
    if (!response.ok || !result.ok) throw new Error(result.message || "Attendance load nahi hui.");
    body.innerHTML = "";
    const records = [...(result.records || [])].reverse();
    records.forEach(item => {
      const tr = document.createElement("tr");
      [item.name, item.date, item.time].forEach(value => {
        const td = document.createElement("td");
        td.textContent = value || "";
        td.style.padding = "10px";
        td.style.borderBottom = "1px solid #eee";
        tr.appendChild(td);
      });
      body.appendChild(tr);
    });
    table.style.display = records.length ? "table" : "none";
    msg.textContent = records.length ? (records.length + " attendance entries.") : "Abhi attendance nahi hai.";
  } catch (error) {
    msg.textContent = error.message || "Attendance load failed.";
  }
}
</script>

<script>
async function save(){
  const msg = document.getElementById("msg");
  const btn = document.getElementById("btn");

  const data = {
    subject: document.getElementById("subject").value,
    chapter: document.getElementById("chapter").value.trim(),
    title: document.getElementById("title").value.trim(),
    video: document.getElementById("video").value.trim(),
    pdf: document.getElementById("pdf") ? document.getElementById("pdf").value.trim() : "",
    notes: document.getElementById("notes").value.trim(),
    date: document.getElementById("date").value,
    duration: document.getElementById("duration").value.trim()
  };

  const pdfOnly = data.subject === "Bihar Current Wallah Monthly Compilation";

  // Video URL is optional for normal lectures.
  // PDF URL remains required for PDF-only subjects.
  if(
    !data.chapter ||
    !data.title ||
    (pdfOnly && !data.pdf) ||
    !data.date
  ){
    msg.className = "err";
    msg.innerText = pdfOnly
      ? "Chapter, Title, PDF URL aur Date bharna zaroori hai."
      : "Chapter, Title aur Date bharna zaroori hai.";
    return;
  }

  btn.disabled = true;
  btn.innerText = "Adding...";
  msg.className = "";
  msg.style.display = "none";

  try{
    const editId = btn.dataset.editId || "";
    const response = await fetch("/api/lecture", {
      method: editId ? "PUT" : "POST",
      headers: {"Content-Type":"application/json"},
      body: JSON.stringify(editId ? {...data, id: editId} : data)
    });

    const result = await response.json();

    if(result.ok){
      msg.className = "ok";
      msg.innerText = result.message;
      delete btn.dataset.editId;
      btn.innerText = "Add Lecture";
      document.getElementById("title").value = "";
      document.getElementById("video").value = "";
      document.getElementById("notes").value = "";
      if(document.getElementById("pdf")) document.getElementById("pdf").value = "";
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

<div class="box" style="margin-top:20px">
<h2>📝 Manage Lectures</h2>
<label>Subject</label>
<select id="manageSubject"></select>
<button id="refreshPostsBtn" type="button">Refresh Posts</button>
<div id="manageMsg" class="small">Subject select karke posts load karein.</div>
<div id="managePosts" style="margin-top:12px"></div>
</div>

<script>
const manageSubject = document.getElementById("manageSubject");
const manageMsg = document.getElementById("manageMsg");
const managePosts = document.getElementById("managePosts");
const refreshPostsBtn = document.getElementById("refreshPostsBtn");
const subjectsForManage = Array.from(document.querySelectorAll("#subject option")).map(o => o.value);
subjectsForManage.forEach(name => {
  const o = document.createElement("option");
  o.value = name; o.textContent = name;
  manageSubject.appendChild(o);
});

function esc(v){
  return String(v ?? "").replace(/[&<>"']/g, c => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  }[c]));
}
function showManageMessage(text, error=false){
  manageMsg.textContent = text;
  manageMsg.className = error ? "err" : "small";
  if(!error) manageMsg.style.display = "block";
}
async function loadPosts(){
  const subject = manageSubject.value;
  if(!subject){ showManageMessage("Please select a subject.", true); return; }
  refreshPostsBtn.disabled = true;
  managePosts.innerHTML = "";
  showManageMessage("Loading posts...");
  try{
    const r = await fetch("/api/lectures?subject=" + encodeURIComponent(subject), {cache:"no-store"});
    const result = await r.json();
    if(!r.ok || !result.ok) throw new Error(result.message || "Posts load nahi hue.");
    const posts = Array.isArray(result.posts) ? result.posts : [];
    if(!posts.length){
      managePosts.innerHTML = '<div class="small" style="padding:12px 0">No content available</div>';
      showManageMessage("No content available");
      return;
    }
    manageMsg.textContent = posts.length + " posts loaded.";
    posts.forEach(post => {
      const card = document.createElement("div");
      card.style.cssText = "border:1px solid #ddd;border-radius:12px;padding:12px;margin:10px 0;background:#fff";
      card.innerHTML =
        '<div style="font-weight:700;font-size:16px">' + esc(post.title) + '</div>' +
        '<div class="small">Chapter: ' + esc(post.chapter) + ' · ' + esc(post.date) + '</div>' +
        '<div style="display:flex;gap:8px;margin-top:10px">' +
          '<button type="button" class="edit-post" style="flex:1;padding:10px">Edit</button>' +
          '<button type="button" class="delete-post" style="flex:1;padding:10px;background:#b42318">Delete</button>' +
        '</div>';
      card.querySelector(".edit-post").onclick = () => startEdit(post);
      card.querySelector(".delete-post").onclick = () => deletePost(post);
      managePosts.appendChild(card);
    });
  }catch(e){
    manageMsg.className = "err";
    manageMsg.textContent = e.message || "Posts load failed.";
  }finally{
    refreshPostsBtn.disabled = false;
  }
}
function startEdit(post){
  document.getElementById("subject").value = manageSubject.value;
  updateContentFields();
  document.getElementById("chapter").value = post.chapter || "";
  document.getElementById("title").value = post.title || "";
  document.getElementById("video").value = post.url || "";
  document.getElementById("notes").value = post.notes || "";
  document.getElementById("duration").value = post.duration || "";
  if(document.getElementById("pdf")) document.getElementById("pdf").value = post.url || "";
  document.getElementById("date").value = post.date || "";
  const btn = document.getElementById("btn");
  btn.textContent = "Update Lecture";
  btn.dataset.editId = post.id;
  window.scrollTo({top:0, behavior:"smooth"});
}
async function deletePost(post){
  if(!confirm("Is post ko delete karna hai?")) return;
  try{
    const r = await fetch("/api/lecture?subject=" + encodeURIComponent(manageSubject.value) + "&id=" + encodeURIComponent(post.id), {method:"DELETE"});
    const result = await r.json();
    if(!r.ok || !result.ok) throw new Error(result.message || "Delete failed.");
    await loadPosts();
  }catch(e){
    showManageMessage(e.message || "Delete failed.", true);
  }
}
refreshPostsBtn.addEventListener("click", loadPosts);
manageSubject.addEventListener("change", loadPosts);
</script>

</body>
</html>`;


function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  };
}
