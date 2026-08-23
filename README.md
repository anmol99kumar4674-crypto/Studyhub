# Study Lectures — Separate Subject Files

Ab har subject ka data alag JavaScript file me hai:

- `economic.js` → Economics
- `history.js` → History
- `geography.js` → Geography
- `polity.js` → Polity & Governance
- `art-culture.js` → Art & Culture
- `general-science.js` → General Science

## Daily lecture add karna

Example: Economics ke liye sirf `economic.js` open karein:

```js
{
  id: "economy-03",
  chapter: "Introduction to Economy",
  title: "Economic Lecture 3 : Introduction to Economy Part 3",
  date: "2026-08-24",
  duration: "01:20:00",
  url: "YOUR-AUTHORIZED-LECTURE-URL"
}
```

History ke liye `history.js` me add karein:

```js
{
  id: "history-02",
  chapter: "Ancient History",
  title: "History Lecture 2 : Buddhism",
  date: "2026-08-24",
  duration: "01:21:52",
  url: "YOUR-AUTHORIZED-LECTURE-URL"
}
```

Website ka main code change nahi karna padega. Subject file me lecture add karte hi website par automatically show hoga.

Aap baad me `science.js`, `current-affairs.js`, `maths.js` jaise files bhi add kar sakte hain; unhe `index.html` me ek script line aur `app.js` ke ALL_LECTURES array me connect karna hoga.


## Notes

A lecture can have an optional `notes` URL:

```js
{
  id: "economy-01",
  title: "Economic Lecture 1 : Introduction to Economy",
  url: "VIDEO_URL",
  notes: "GOOGLE_VIEWER_OR_OTHER_PDF_URL"
}
```

If `notes` exists, a **📄 Notes** button appears beside that lecture. The PDF is loaded only when the user clicks Notes.


### Notes viewer

The Notes button now opens the PDF in a full-screen viewer. The PDF is loaded only after clicking **Notes**. Use the ← button to return to the lecture list.


### Notes behavior

Clicking **📄 Notes** now navigates directly to the supplied Google PDF Viewer URL. There is no website popup or iframe around it. Use the browser/device Back button to return to the lecture list.


### Lecture video behavior

Lecture URLs are now opened directly in the browser instead of being forced into an HTML5 video element. This removes the **"Video cannot be played directly"** popup for protected/player URLs.
