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
