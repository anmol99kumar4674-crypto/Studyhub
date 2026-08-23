# Study Lectures — GitHub Pages

A responsive lecture website inspired by the layout shown in the screenshots.

## Daily lecture upload

All lecture data is inside `lectures.js`.

Add a new object like:

```js
{
  id: "economy-03",
  subject: "Economics",
  chapter: "Introduction to Economy",
  title: "Economic Lecture 3 : Introduction to Economy Part 3",
  date: "2026-08-24",
  duration: "",
  url: "YOUR-AUTHORIZED-LECTURE-URL"
}
```

Then commit and push the file to GitHub. GitHub Pages will automatically show the new lecture after deployment.

## Important

Use only lecture/video URLs that you are authorized to publish or link to. Some protected player URLs cannot be played by a normal HTML5 `<video>` element because of CORS, DRM, authentication, or the provider's player restrictions. The site automatically shows an **Open lecture link** fallback in that case.

## GitHub Pages

1. Create a GitHub repository.
2. Upload `index.html`, `style.css`, `app.js`, `lectures.js`, and `README.md`.
3. Repository → Settings → Pages.
4. Select **Deploy from a branch**.
5. Select `main` and `/root`.
6. Save.
7. Your website will get a GitHub Pages URL.

No database is required for the basic version. Daily updates are made by editing only `lectures.js`.
