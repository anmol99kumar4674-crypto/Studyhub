const NOTICES_LECTURES = [
  {
    id: "notices-1788269136390",
    chapter: "Batch Demo Videos",
    title: "Ankit Sir : Environment",
    date: "2026-08-01",
    duration: "",
    url: "https://stream.srv-1.pimaxer.in/ffa928e1-f330-4c5b-ab68-9b19c5d22ef9/master.m3u8",
  }
,
  {
    id: "notices-1788269170126",
    chapter: "Batch Demo Videos",
    title: "Abhay Sir : History",
    date: "2026-08-01",
    duration: "",
    url: "https://stream.srv-1.pimaxer.in/8ceecc29-5b18-4310-a5fc-38c9941fb995/master.m3u8",
  }
,
  {
    id: "notices-1788269197984",
    chapter: "Batch Demo Videos",
    title: "Deepak Sir : History",
    date: "2026-08-01",
    duration: "",
    url: "https://stream.srv-1.pimaxer.in/75a3d86c-41e3-4e06-93f1-7e5fc8c6b4ab/master.m3u8",
  }
,
  {
    id: "notices-1788269225388",
    chapter: "Batch Demo Videos",
    title: "Rahul sir (Essay)",
    date: "2026-08-01",
    duration: "",
    url: "https://stream.srv-1.pimaxer.in/ee9d6392-c2e4-461f-9a9b-036b62a226eb/master.m3u8",
  }
,
  {
    id: "notices-1788269248266",
    chapter: "Batch Demo Videos",
    title: "Rahul Sir : Economics",
    date: "2026-08-01",
    duration: "",
    url: "https://stream.srv-1.pimaxer.in/afb046ea-75a7-497a-bb10-5f13b5978e79/master.m3u8",
  }
,
  {
    id: "notices-1788269271310",
    chapter: "Batch Demo Videos",
    title: "Shashi Sir : Polity Demo",
    date: "2026-08-01",
    duration: "",
    url: "https://stream.srv-1.pimaxer.in/d37bdd88-398d-4d64-bfd6-34bf55432fa5/master.m3u8",
  }
,
  {
    id: "notices-1788269303170",
    chapter: "Batch Demo Videos",
    title: "Nishit Sir : Maths",
    date: "2026-08-01",
    duration: "",
    url: "https://stream.srv-1.pimaxer.in/c2a670d1-07cc-4e68-b52f-e15a8bd3a1fd/master.m3u8",
  }
,
  {
    id: "notices-1788269325235",
    chapter: "Batch Demo Videos",
    title: "Abhay Sir : Geography",
    date: "2026-08-01",
    duration: "",
    url: "https://stream.srv-1.pimaxer.in/ca3642a6-a0af-43a0-a44d-99a0512bb433/master.m3u8",
  }
,
  {
    id: "notices-1788269350285",
    chapter: "Batch Demo Videos",
    title: "Ankit Sir : Science",
    date: "2026-08-01",
    duration: "",
    url: "https://stream.srv-1.pimaxer.in/12f5b289-4e26-4c9d-b2db-887c05d15e04/master.m3u8",
  }
,
  {
    id: "notices-1788269371617",
    chapter: "Batch Demo Videos",
    title: "Abhay Sir : Bihar Special",
    date: "2026-08-01",
    duration: "",
    url: "https://stream.srv-1.pimaxer.in/be020c27-4310-48e4-9afc-5ba37994faaa/master.m3u8",
  }
,
  {
    id: "notices-1788269609282",
    chapter: "Lecture Planner || PDF Only",
    title: "Lecture Planner : NCERT Economy",
    date: "2026-08-19",
    duration: "",
    url: "",
    notes: "https://docs.google.com/gview?url=https%3A%2F%2Fstatic.pw.live%2F5eb393ee95fab7468a79d189%2FADMIN%2F29faa166-ae32-4cc7-adc1-d4ae4bb09169.pdf&embedded=true"
  }
,
  {
    id: "notices-1788269673249",
    chapter: "Lecture Planner || PDF Only",
    title: "Telegram Group Link || Pdf Only",
    date: "2026-08-23",
    duration: "",
    url: "Telegram Group Link || Pdf Only",
    notes: "https://docs.google.com/gview?url=https%3A%2F%2Fstatic.pw.live%2F5eb393ee95fab7468a79d189%2FADMIN%2Fe5033030-2c64-4c8c-9f47-587005efed31.pdf&embedded=true"
  }
];


<script id="studyhub-pdf-back-handler">
(function () {
  function closePdfViewer() {
    // Common viewer/modal close controls used by this project.
    var selectors = [
      '[data-pdf-viewer-close]',
      '.pdf-viewer-close',
      '.pdfViewerClose',
      '#pdfViewerClose',
      '.pdf-modal .close',
      '#pdfModal .close'
    ];
    for (var i = 0; i < selectors.length; i++) {
      var el = document.querySelector(selectors[i]);
      if (el) { el.click(); return true; }
    }
    // Fallback: close a visible PDF/modal overlay by common IDs/classes.
    var nodes = document.querySelectorAll('[id*="pdf" i], [class*="pdf" i], [id*="modal" i], [class*="modal" i]');
    for (var j = 0; j < nodes.length; j++) {
      var n = nodes[j];
      var s = getComputedStyle(n);
      if (s.display !== 'none' && s.visibility !== 'hidden') {
        var close = n.querySelector('.close, .modal-close, button[aria-label*="close" i], [data-close]');
        if (close) { close.click(); return true; }
      }
    }
    return false;
  }

  window.addEventListener('popstate', function () {
    if (closePdfViewer()) {
      history.pushState({studyhubPdfViewer:true}, '');
    }
  });

  // Mark PDF viewer history state whenever the viewer opens through a click.
  document.addEventListener('click', function (e) {
    var t = e.target && e.target.closest ? e.target.closest('button,a,[role="button"]') : null;
    if (!t) return;
    var label = ((t.textContent || '') + ' ' + (t.getAttribute('aria-label') || '')).toLowerCase();
    if (label.indexOf('pdf') !== -1 || label.indexOf('notes') !== -1) {
      setTimeout(function () {
        var visible = document.querySelector('[id*="pdf" i], [class*="pdf" i]');
        if (visible) history.pushState({studyhubPdfViewer:true}, '');
      }, 100);
    }
  });
})();
</script>
