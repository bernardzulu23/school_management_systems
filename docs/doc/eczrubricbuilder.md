<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>ECZ Rubric Builder — Zambia CBC</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=DM+Sans:wght@300;400;500;600&display=swap');

:root {
--green: #1a5c36;
--green-light: #e8f5ee;
--green-mid: #2d7a4a;
--amber: #b45309;
--amber-light: #fef3c7;
--red: #991b1b;
--red-light: #fee2e2;
--blue: #1e40af;
--blue-light: #eff6ff;
--ink: #111827;
--ink2: #374151;
--ink3: #6b7280;
--line: #e5e7eb;
--surface: #f9fafb;
--white: #ffffff;
--radius: 10px;
}

- { box-sizing: border-box; margin: 0; padding: 0; }

body {
font-family: 'DM Sans', sans-serif;
background: var(--surface);
color: var(--ink);
min-height: 100vh;
}

header {
background: var(--green);
color: white;
padding: 1.25rem 2rem;
display: flex;
align-items: center;
gap: 1rem;
}
.header-flag {
width: 36px; height: 36px;
border-radius: 50%;
background: linear-gradient(135deg, #198A44 33%, #000 33% 66%, #DE2010 66%);
flex-shrink: 0;
}
header h1 {
font-family: 'DM Serif Display', serif;
font-size: 1.2rem;
font-weight: 400;
line-height: 1.2;
}
header p { font-size: 0.72rem; opacity: .7; margin-top: 2px; }

.tabs {
display: flex;
background: var(--white);
border-bottom: 2px solid var(--line);
padding: 0 2rem;
gap: 0;
overflow-x: auto;
}
.tab {
padding: .85rem 1.4rem;
font-size: .82rem;
font-weight: 500;
color: var(--ink3);
cursor: pointer;
border-bottom: 2px solid transparent;
margin-bottom: -2px;
white-space: nowrap;
transition: color .15s;
}
.tab:hover { color: var(--ink); }
.tab.active { color: var(--green); border-bottom-color: var(--green); }

.panel { display: none; padding: 1.5rem 2rem 3rem; max-width: 900px; margin: 0 auto; }
.panel.active { display: block; }

.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: .75rem; }
.form-grid.cols3 { grid-template-columns: 1fr 1fr 1fr; }
.col2 { grid-column: span 2; }
.field { display: flex; flex-direction: column; gap: .3rem; }
label { font-size: .78rem; font-weight: 500; color: var(--ink2); }
select, input, textarea {
border: 1px solid var(--line);
border-radius: 6px;
padding: .55rem .75rem;
font-size: .82rem;
font-family: 'DM Sans', sans-serif;
color: var(--ink);
background: var(--white);
outline: none;
transition: border-color .15s;
}
select:focus, input:focus, textarea:focus { border-color: var(--green-mid); }
textarea { resize: vertical; min-height: 80px; }

.btn {
display: inline-flex;
align-items: center;
gap: .5rem;
padding: .6rem 1.2rem;
border-radius: 6px;
font-size: .82rem;
font-weight: 500;
font-family: 'DM Sans', sans-serif;
cursor: pointer;
border: 1px solid transparent;
transition: opacity .15s, background .15s;
}
.btn:disabled { opacity: .45; cursor: not-allowed; }
.btn-primary { background: var(--green); color: white; }
.btn-primary:hover:not(:disabled) { background: var(--green-mid); }
.btn-outline { background: transparent; border-color: var(--line); color: var(--ink2); }
.btn-outline:hover { background: var(--surface); }
.btn-danger { background: var(--red-light); color: var(--red); border-color: #fca5a5; }
.btn-sm { padding: .35rem .8rem; font-size: .76rem; }

.card {
background: var(--white);
border: 1px solid var(--line);
border-radius: var(--radius);
padding: 1.25rem;
margin-bottom: 1rem;
}
.card-title {
font-family: 'DM Serif Display', serif;
font-size: 1rem;
font-weight: 400;
color: var(--ink);
margin-bottom: .75rem;
}

.section-divider {
font-size: .72rem;
font-weight: 600;
letter-spacing: .08em;
text-transform: uppercase;
color: var(--ink3);
margin: 1.25rem 0 .75rem;
padding-bottom: .4rem;
border-bottom: 1px solid var(--line);
}

/_ ── Rubric Table ────────────────────────────────── _/
.rubric-table { width: 100%; border-collapse: collapse; font-size: .8rem; }
.rubric-table th {
padding: .6rem .75rem;
text-align: left;
font-size: .72rem;
font-weight: 600;
letter-spacing: .05em;
text-transform: uppercase;
border-bottom: 2px solid var(--line);
}
.rubric-table td { padding: .6rem .75rem; border-bottom: 1px solid var(--line); vertical-align: top; }
.rubric-table tr:last-child td { border-bottom: none; }

.level-badge {
display: inline-flex; align-items: center; gap: .35rem;
padding: .25rem .7rem;
border-radius: 20px;
font-size: .72rem;
font-weight: 600;
white-space: nowrap;
}
.level-4 { background: #dcfce7; color: #166534; }
.level-3 { background: #dbeafe; color: #1e40af; }
.level-2 { background: var(--amber-light); color: var(--amber); }
.level-1 { background: var(--red-light); color: var(--red); }

.criteria-label { font-weight: 500; color: var(--ink); font-size: .82rem; }
.criteria-desc { font-size: .76rem; color: var(--ink3); margin-top: 2px; }

.rubric-cell-text { font-size: .78rem; color: var(--ink2); line-height: 1.5; }

.add-criteria-btn {
width: 100%;
padding: .6rem;
border: 1px dashed var(--line);
border-radius: 6px;
background: transparent;
color: var(--ink3);
font-size: .78rem;
cursor: pointer;
font-family: 'DM Sans', sans-serif;
transition: border-color .15s, color .15s;
margin-top: .5rem;
}
.add-criteria-btn:hover { border-color: var(--green-mid); color: var(--green); }

/_ ── Score Table ─────────────────────────────────── _/
.score-table { width: 100%; border-collapse: collapse; font-size: .8rem; }
.score-table th {
padding: .5rem .6rem;
font-size: .7rem;
font-weight: 600;
text-transform: uppercase;
letter-spacing: .04em;
text-align: center;
border: 1px solid var(--line);
background: var(--surface);
}
.score-table th.left { text-align: left; }
.score-table td { border: 1px solid var(--line); padding: .35rem .5rem; }
.score-table input[type=number], .score-table input[type=text] {
border: none;
padding: .2rem .4rem;
width: 100%;
font-size: .8rem;
background: transparent;
}
.score-table input[type=number]:focus, .score-table input[type=text]:focus {
background: #f0fdf4;
border-radius: 4px;
}
.total-cell {
font-weight: 600;
text-align: center;
font-size: .82rem;
}
.total-cell.over { color: var(--red); }
.total-cell.ok { color: var(--green); }

/_ ── ECZ Submission Sheet ────────────────────────── _/
.ecz-header {
border: 2px solid var(--ink);
border-radius: 6px;
padding: 1rem;
margin-bottom: 1rem;
}
.ecz-header h2 {
font-family: 'DM Serif Display', serif;
font-size: 1.1rem;
text-align: center;
margin-bottom: .75rem;
font-weight: 400;
}
.ecz-meta { display: grid; grid-template-columns: 1fr 1fr; gap: .5rem; }
.ecz-field {
display: flex;
gap: .5rem;
align-items: center;
font-size: .8rem;
padding-bottom: .25rem;
border-bottom: 1px solid var(--ink);
}
.ecz-field span { font-weight: 600; white-space: nowrap; }
.ecz-field input { border: none; flex: 1; font-size: .8rem; font-family: 'DM Sans', sans-serif; outline: none; }

/_ ── Warning / Info banners ──────────────────────── _/
.banner {
display: flex; gap: .6rem; align-items: flex-start;
padding: .75rem 1rem;
border-radius: 6px;
font-size: .78rem;
line-height: 1.5;
margin-bottom: 1rem;
}
.banner-warn { background: var(--amber-light); color: var(--amber); border: 1px solid #fcd34d; }
.banner-info { background: var(--blue-light); color: var(--blue); border: 1px solid #bfdbfe; }
.banner-green { background: var(--green-light); color: var(--green); border: 1px solid #86efac; }
.banner-icon { font-size: 1rem; flex-shrink: 0; margin-top: 1px; }

.loading-dots span {
display: inline-block;
animation: blink 1.2s infinite;
font-size: 1.2rem;
}
.loading-dots span:nth-child(2) { animation-delay: .2s; }
.loading-dots span:nth-child(3) { animation-delay: .4s; }
@keyframes blink { 0%,80%,100%{opacity:.2} 40%{opacity:1} }

.btn-row { display: flex; flex-wrap: wrap; gap: .5rem; margin-top: 1rem; }

.deadline-chip {
display: inline-flex; align-items: center; gap: .4rem;
background: var(--red-light); color: var(--red);
border: 1px solid #fca5a5;
border-radius: 20px; padding: .3rem .75rem;
font-size: .75rem; font-weight: 500;
}

@media print {
header, .tabs, .btn-row, .btn, .add-criteria-btn, .no-print { display: none !important; }
.panel { display: block !important; padding: 0; }
body { background: white; }
.card { border: 1px solid #ccc; box-shadow: none; page-break-inside: avoid; }
}

@media (max-width: 600px) {
.form-grid, .form-grid.cols3 { grid-template-columns: 1fr; }
.col2 { grid-column: span 1; }
.panel { padding: 1rem; }
.ecz-meta { grid-template-columns: 1fr; }
}
</style>

</head>
<body>

<header>
  <div class="header-flag"></div>
  <div>
    <h1>ECZ Rubric &amp; SBA Assessment Builder</h1>
    <p>Zambia Competency-Based Curriculum · Forms 1–4 · Aligned with ECZ/ZECF 2023</p>
  </div>
</header>

<div class="tabs">
  <div class="tab active" onclick="switchTab('rubric')">Rubric Builder</div>
  <div class="tab" onclick="switchTab('tracker')">Task Tracking Sheet</div>
  <div class="tab" onclick="switchTab('ecz')">ECZ Submission Sheet</div>
</div>

<!-- ═══════════════════════════════════════════════════
     TAB 1 — RUBRIC BUILDER
═══════════════════════════════════════════════════ -->
<div id="tab-rubric" class="panel active">

  <div id="form4-warn-rubric" class="banner banner-warn" style="display:none">
    <span class="banner-icon">⚠️</span>
    <span><strong>Form 4 — SBA not administered.</strong> No School-Based Assessment tasks are set, administered, or scored in Form 4 (the year of ECZ examination).</span>
  </div>

  <div class="card">
    <div class="card-title">Task details</div>
    <div class="form-grid">
      <div class="field">
        <label>Subject</label>
        <select id="rb-subject">
          <optgroup label="Languages">
            <option>English Language</option>
            <option>Literature in English</option>
            <option>Zambian Languages</option>
            <option>French</option>
          </optgroup>
          <optgroup label="Mathematics">
            <option>Mathematics I</option>
            <option>Mathematics II</option>
          </optgroup>
          <optgroup label="Sciences">
            <option>Biology</option>
            <option>Chemistry</option>
            <option>Physics</option>
          </optgroup>
          <optgroup label="Humanities &amp; Social Sciences">
            <option>Civic Education</option>
            <option>History</option>
            <option>Geography</option>
            <option>Religious Education</option>
            <option>Social Studies</option>
          </optgroup>
          <optgroup label="Technology &amp; Computing">
            <option>Computer Studies / ICT</option>
            <option>Technical Drawing</option>
          </optgroup>
          <optgroup label="Practical &amp; Applied">
            <option>Agriculture</option>
            <option>Home Economics</option>
            <option>Art &amp; Design</option>
            <option>Music Arts</option>
            <option>Food &amp; Nutrition</option>
            <option>Physical Education &amp; Sport</option>
          </optgroup>
          <optgroup label="Vocational &amp; Technical">
            <option>Carpentry &amp; Joinery</option>
            <option>Plumbing</option>
            <option>Electrical Installation</option>
            <option>Motor Vehicle Technology</option>
            <option>Fashion &amp; Fabrics</option>
            <option>Building &amp; Construction</option>
          </optgroup>
          <optgroup label="Tourism &amp; Business">
            <option>Travel &amp; Tourism</option>
            <option>Business Studies</option>
            <option>Principles of Accounts</option>
            <option>Commerce</option>
          </optgroup>
          <optgroup label="Special Education">
            <option>Special Needs Education</option>
          </optgroup>
        </select>
      </div>
      <div class="field">
        <label>Form level</label>
        <select id="rb-form" onchange="checkForm4('rubric')">
          <option value="Form 1">Form 1</option>
          <option value="Form 2">Form 2</option>
          <option value="Form 3">Form 3</option>
          <option value="Form 4" style="color:#991b1b">Form 4 (Exam year — no SBA)</option>
        </select>
      </div>
      <div class="field">
        <label>SBA task type (ECZ)</label>
        <select id="rb-tasktype">
          <option>Project (extended investigation)</option>
          <option>Practical task (hands-on activity)</option>
          <option>Assignment / Homework</option>
          <option>Presentation (oral/visual)</option>
          <option>Fieldwork (data collection outside classroom)</option>
          <option>Portfolio (collection of work over time)</option>
          <option>Observation (teacher observation record)</option>
          <option>End of term test (formal written)</option>
        </select>
      </div>
      <div class="field">
        <label>Number of criteria</label>
        <select id="rb-numcriteria">
          <option value="3">3 criteria</option>
          <option value="4" selected>4 criteria (recommended)</option>
          <option value="5">5 criteria</option>
          <option value="6">6 criteria</option>
        </select>
      </div>
      <div class="field col2">
        <label>Task title</label>
        <input id="rb-title" type="text" placeholder="e.g. Integer Number Line Model — Form 1 Mathematics I">
      </div>
      <div class="field col2">
        <label>Task description / scenario (brief)</label>
        <textarea id="rb-desc" placeholder="Describe the SBA task — what learners must do, the Zambian context, and what they must demonstrate..."></textarea>
      </div>
    </div>

    <div class="btn-row">
      <button class="btn btn-primary" id="rb-generate-btn" onclick="generateRubric()">
        ✦ Generate ECZ rubric
      </button>
      <button class="btn btn-outline" onclick="clearRubric()">Clear</button>
    </div>

  </div>

  <!-- Rubric output -->
  <div id="rubric-output" style="display:none">
    <div class="section-divider">Generated rubric — edit any cell to customise</div>

    <div class="banner banner-green no-print">
      <span class="banner-icon">✓</span>
      <span>This rubric follows the ECZ 4-level scale: <strong>Excellent (4) / Good (3) / Fair (2) / Needs Improvement (1)</strong>. Scores are totalled out of a maximum of 4 × number of criteria.</span>
    </div>

    <div class="card" style="padding:0;overflow:hidden">
      <div style="padding:.75rem 1.25rem;background:var(--green);color:white;display:flex;justify-content:space-between;align-items:center">
        <div>
          <div style="font-family:'DM Serif Display',serif;font-size:.95rem;font-weight:400" id="rubric-header-title">SBA Rubric</div>
          <div style="font-size:.72rem;opacity:.75;margin-top:2px" id="rubric-header-meta"></div>
        </div>
        <div style="font-size:.72rem;opacity:.75">School-Based Assessment · ECZ/ZECF 2023</div>
      </div>
      <div style="overflow-x:auto">
        <table class="rubric-table">
          <thead>
            <tr>
              <th style="width:18%">Criteria</th>
              <th><span class="level-badge level-4">Excellent — 4</span></th>
              <th><span class="level-badge level-3">Good — 3</span></th>
              <th><span class="level-badge level-2">Fair — 2</span></th>
              <th><span class="level-badge level-1">Needs improvement — 1</span></th>
              <th style="width:7%;text-align:center">Score</th>
            </tr>
          </thead>
          <tbody id="rubric-tbody"></tbody>
        </table>
      </div>
      <div style="padding:.75rem 1.25rem;border-top:1px solid var(--line);display:flex;align-items:center;gap:1rem;font-size:.78rem;color:var(--ink3)">
        <span>Total out of <strong id="rubric-max">16</strong></span>
        <span>·</span>
        <span>Learner name: ___________________________</span>
        <span>·</span>
        <span>Date: ______________</span>
      </div>
    </div>

    <button class="add-criteria-btn no-print" onclick="addCriteriaRow()">+ Add criteria row</button>

    <div class="btn-row no-print">
      <button class="btn btn-primary" onclick="window.print()">🖨 Print rubric</button>
      <button class="btn btn-outline" onclick="copyRubricText()">📋 Copy as text</button>
    </div>

  </div>

  <div id="rubric-loading" style="display:none;padding:2rem;text-align:center;color:var(--ink3)">
    <div class="loading-dots"><span>●</span><span>●</span><span>●</span></div>
    <div style="margin-top:.5rem;font-size:.82rem">Generating ECZ-aligned rubric…</div>
  </div>
</div>

<!-- ═══════════════════════════════════════════════════
     TAB 2 — TASK TRACKING SHEET
═══════════════════════════════════════════════════ -->
<div id="tab-tracker" class="panel">

  <div id="form4-warn-tracker" class="banner banner-warn" style="display:none">
    <span class="banner-icon">⚠️</span>
    <span><strong>Form 4 — SBA not administered.</strong> SBA scores are not collected in Form 4. The ECZ provides an alternative assessment for GCE candidates.</span>
  </div>

  <div class="banner banner-info no-print">
    <span class="banner-icon">ℹ️</span>
    <span>ECZ weighting: <strong>Term 1 = 20%</strong> · <strong>Term 2 = 30%</strong> · <strong>Term 3 = 50%</strong>. Each task scores out of 20; end-of-term test scores out of 40. Total SBA = 100 per learner per subject.</span>
  </div>

  <div class="card">
    <div class="card-title">School &amp; class details</div>
    <div class="form-grid cols3">
      <div class="field">
        <label>School name</label>
        <input id="tr-school" type="text" placeholder="e.g. Munali Secondary School">
      </div>
      <div class="field">
        <label>Centre number</label>
        <input id="tr-centre" type="text" placeholder="e.g. 10042">
      </div>
      <div class="field">
        <label>Subject</label>
        <select id="tr-subject">
          <option>English Language</option><option>Literature in English</option><option>Zambian Languages</option>
          <option>Mathematics I</option><option>Mathematics II</option>
          <option>Biology</option><option>Chemistry</option><option>Physics</option>
          <option>Civic Education</option><option>History</option><option>Geography</option><option>Religious Education</option>
          <option>Computer Studies / ICT</option><option>Agriculture</option><option>Art &amp; Design</option>
          <option>Music Arts</option><option>Food &amp; Nutrition</option><option>Physical Education &amp; Sport</option>
          <option>Travel &amp; Tourism</option><option>Business Studies</option>
        </select>
      </div>
      <div class="field">
        <label>Form level</label>
        <select id="tr-form" onchange="checkForm4('tracker')">
          <option>Form 1</option><option>Form 2</option><option>Form 3</option>
          <option style="color:#991b1b">Form 4 (no SBA)</option>
        </select>
      </div>
      <div class="field">
        <label>Term</label>
        <select id="tr-term">
          <option value="1">Term 1 (weight: 20%)</option>
          <option value="2">Term 2 (weight: 30%)</option>
          <option value="3">Term 3 (weight: 50%)</option>
        </select>
      </div>
      <div class="field">
        <label>Year</label>
        <input id="tr-year" type="text" value="2025">
      </div>
    </div>
  </div>

  <div class="card" style="padding:0;overflow:hidden">
    <div style="padding:.75rem 1.25rem;background:var(--surface);border-bottom:1px solid var(--line);display:flex;justify-content:space-between;align-items:center">
      <div style="font-size:.82rem;font-weight:500">SBA task tracking sheet</div>
      <div class="deadline-chip no-print">⏰ Submit by 31 January</div>
    </div>
    <div style="overflow-x:auto">
      <table class="score-table" id="tracker-table">
        <thead>
          <tr>
            <th class="left" style="width:30px">S/N</th>
            <th class="left" style="min-width:160px">Learner name</th>
            <th style="width:80px">Task 1<br><small style="font-weight:400;font-size:.65rem">max 20</small></th>
            <th style="width:80px">Task 2<br><small style="font-weight:400;font-size:.65rem">max 20</small></th>
            <th style="width:80px">Task 3<br><small style="font-weight:400;font-size:.65rem">max 20</small></th>
            <th style="width:90px">Term test<br><small style="font-weight:400;font-size:.65rem">max 40</small></th>
            <th style="width:80px;background:#f0fdf4">Total<br><small style="font-weight:400;font-size:.65rem">/ 100</small></th>
          </tr>
        </thead>
        <tbody id="tracker-tbody"></tbody>
      </table>
    </div>
    <div style="padding:.75rem 1.25rem;border-top:1px solid var(--line);display:flex;gap:.5rem;flex-wrap:wrap" class="no-print">
      <button class="btn btn-outline btn-sm" onclick="addTrackerRow()">+ Add learner</button>
      <button class="btn btn-outline btn-sm" onclick="addTrackerRows(5)">+ Add 5 learners</button>
      <button class="btn btn-danger btn-sm" onclick="clearTrackerRows()">Clear all</button>
    </div>
  </div>

  <!-- Term SBA totals -->
  <div class="card">
    <div class="card-title">Term SBA summary</div>
    <div id="tracker-summary" style="font-size:.82rem;color:var(--ink3)">Add learner scores above to see summary.</div>
  </div>

  <div class="btn-row no-print">
    <button class="btn btn-primary" onclick="window.print()">🖨 Print tracking sheet</button>
    <button class="btn btn-outline" onclick="exportToECZ()">→ Export to ECZ submission sheet</button>
  </div>
</div>

<!-- ═══════════════════════════════════════════════════
     TAB 3 — ECZ SUBMISSION SHEET
═══════════════════════════════════════════════════ -->
<div id="tab-ecz" class="panel">

  <div class="banner banner-warn no-print">
    <span class="banner-icon">⚠️</span>
    <span><strong>ECZ submission deadline: 31 January</strong> of the following year. SBA scores for Form 1, 2, and 3 learners must be submitted to ECZ in raw form (out of 100). Schools must keep all evidence for at least 2 years for moderation.</span>
  </div>

  <div class="ecz-header">
    <h2>Examinations Council of Zambia<br>School-Based Assessment (SBA) Score Submission</h2>
    <div class="ecz-meta">
      <div class="ecz-field"><span>SUBJECT:</span><input id="ecz-subject" placeholder="e.g. Mathematics I"></div>
      <div class="ecz-field"><span>FORM:</span><input id="ecz-form" placeholder="e.g. Form 2"></div>
      <div class="ecz-field"><span>SCHOOL:</span><input id="ecz-school" placeholder="School name"></div>
      <div class="ecz-field"><span>CENTRE NUMBER:</span><input id="ecz-centre" placeholder="e.g. 10042"></div>
      <div class="ecz-field"><span>TEACHER:</span><input id="ecz-teacher" placeholder="Teacher name"></div>
      <div class="ecz-field"><span>YEAR:</span><input id="ecz-year" placeholder="e.g. 2025"></div>
    </div>
  </div>

  <div class="card" style="padding:0;overflow:hidden">
    <table class="score-table" id="ecz-table">
      <thead>
        <tr>
          <th class="left" style="width:36px">S/N</th>
          <th class="left" style="min-width:180px">Learner name</th>
          <th style="width:130px">Learner number</th>
          <th style="width:120px;background:#f0fdf4">SBA score (0–100)</th>
          <th style="width:100px">Remarks</th>
        </tr>
      </thead>
      <tbody id="ecz-tbody"></tbody>
    </table>
    <div style="padding:.75rem 1.25rem;border-top:1px solid var(--line);display:flex;gap:.5rem;flex-wrap:wrap" class="no-print">
      <button class="btn btn-outline btn-sm" onclick="addECZRow()">+ Add learner</button>
      <button class="btn btn-outline btn-sm" onclick="addECZRows(10)">+ Add 10 learners</button>
      <button class="btn btn-danger btn-sm" onclick="clearECZRows()">Clear all</button>
    </div>
  </div>

  <!-- Summary statistics -->
  <div class="card">
    <div class="card-title">Submission summary</div>
    <div id="ecz-summary" style="font-size:.82rem;color:var(--ink3)">Add scores to see class statistics.</div>
  </div>

  <div style="border:1px solid var(--line);border-radius:6px;padding:1rem;font-size:.78rem;color:var(--ink2);margin-bottom:1rem">
    <div style="font-weight:500;margin-bottom:.5rem">Teacher declaration</div>
    I hereby certify that the SBA scores listed above are genuine records of learner performance assessed under the ECZ School-Based Assessment guidelines, and that all assessment evidence is available for moderation purposes.
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-top:1rem">
      <div style="border-bottom:1px solid var(--ink);padding-bottom:2px">Signature: _________________________</div>
      <div style="border-bottom:1px solid var(--ink);padding-bottom:2px">Date: ______________________________</div>
      <div style="border-bottom:1px solid var(--ink);padding-bottom:2px">HOD signature: _____________________</div>
      <div style="border-bottom:1px solid var(--ink);padding-bottom:2px">School stamp: ______________________</div>
    </div>
  </div>

  <div class="btn-row no-print">
    <button class="btn btn-primary" onclick="window.print()">🖨 Print ECZ submission sheet</button>
  </div>
</div>

<script>
/* ── Tab switching ──────────────────────────────── */
function switchTab(id) {
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.getElementById('tab-' + id).classList.add('active');
  event.currentTarget.classList.add('active');
}

/* ── Form 4 warning ─────────────────────────────── */
function checkForm4(ctx) {
  const sel = ctx === 'rubric' ? 'rb-form' : 'tr-form';
  const warn = ctx === 'rubric' ? 'form4-warn-rubric' : 'form4-warn-tracker';
  const v = document.getElementById(sel).value;
  document.getElementById(warn).style.display = v.includes('Form 4') ? 'flex' : 'none';
}

/* ══════════════════════════════════════════════════
   RUBRIC BUILDER — AI generation
══════════════════════════════════════════════════ */
async function generateRubric() {
  const subject = document.getElementById('rb-subject').value;
  const form    = document.getElementById('rb-form').value;
  const ttype   = document.getElementById('rb-tasktype').value;
  const ncrit   = parseInt(document.getElementById('rb-numcriteria').value);
  const title   = document.getElementById('rb-title').value.trim() || 'SBA Task';
  const desc    = document.getElementById('rb-desc').value.trim();

  if (form.includes('Form 4')) { alert('SBA rubrics are not required for Form 4.'); return; }

  document.getElementById('rubric-output').style.display = 'none';
  document.getElementById('rubric-loading').style.display = 'block';
  document.getElementById('rb-generate-btn').disabled = true;

  const prompt = `You are an expert in Zambia's 2023 Competency-Based Curriculum (CBC) and ECZ assessment guidelines.

Generate a School-Based Assessment (SBA) rubric for:
- Subject: ${subject}
- Form: ${form}
- Task type: ${ttype}
- Task title: ${title}
- Task description: ${desc || 'A standard SBA task for this subject and form level'}
- Number of criteria: ${ncrit}

Rules:
1. Use EXACTLY ${ncrit} criteria, each with a short name and brief sub-description
2. For each criterion write descriptors at 4 levels: Excellent (4), Good (3), Fair (2), Needs Improvement (1)
3. Each descriptor: 1–2 sentences, concrete and observable, avoiding vague words like "adequate"
4. Use Zambian school contexts where relevant
5. Criteria must reflect the ECZ Competence-Based Assessment principles — focus on what learners CAN DO, not just what they know

Respond with ONLY valid JSON in this exact structure (no markdown, no preamble):
{
  "criteria": [
    {
      "name": "Criteria name",
      "description": "Brief sub-description (what this measures)",
      "excellent": "Descriptor for Excellent (4)",
      "good": "Descriptor for Good (3)",
      "fair": "Descriptor for Fair (2)",
      "needs_improvement": "Descriptor for Needs Improvement (1)"
    }
  ]
}`;

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        messages: [{ role: 'user', content: prompt }]
      })
    });
    const data = await res.json();
    const raw = data.content.map(b => b.text || '').join('').replace(/```json|```/g,'').trim();
    const parsed = JSON.parse(raw);
    renderRubric(parsed.criteria, subject, form, ttype, title);
  } catch(e) {
    alert('Error generating rubric. Please check your connection and try again.');
    console.error(e);
  } finally {
    document.getElementById('rubric-loading').style.display = 'none';
    document.getElementById('rb-generate-btn').disabled = false;
  }
}

function renderRubric(criteria, subject, form, ttype, title) {
  document.getElementById('rubric-header-title').textContent = title;
  document.getElementById('rubric-header-meta').textContent = `${subject} · ${form} · ${ttype}`;
  document.getElementById('rubric-max').textContent = criteria.length * 4;

  const tbody = document.getElementById('rubric-tbody');
  tbody.innerHTML = '';
  criteria.forEach((c, i) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>
        <div class="criteria-label" contenteditable="true">${c.name}</div>
        <div class="criteria-desc" contenteditable="true">${c.description}</div>
      </td>
      <td><div class="rubric-cell-text" contenteditable="true">${c.excellent}</div></td>
      <td><div class="rubric-cell-text" contenteditable="true">${c.good}</div></td>
      <td><div class="rubric-cell-text" contenteditable="true">${c.fair}</div></td>
      <td><div class="rubric-cell-text" contenteditable="true">${c.needs_improvement}</div></td>
      <td style="text-align:center;vertical-align:middle">
        <input type="number" min="1" max="4" style="width:44px;text-align:center;border:1px solid var(--line);border-radius:4px;padding:4px" placeholder="—">
      </td>
    `;
    tbody.appendChild(tr);
  });

  document.getElementById('rubric-output').style.display = 'block';
}

function addCriteriaRow() {
  const tbody = document.getElementById('rubric-tbody');
  const n = tbody.querySelectorAll('tr').length + 1;
  const tr = document.createElement('tr');
  tr.innerHTML = `
    <td><div class="criteria-label" contenteditable="true">Criteria ${n}</div><div class="criteria-desc" contenteditable="true">Description</div></td>
    <td><div class="rubric-cell-text" contenteditable="true">Excellent descriptor</div></td>
    <td><div class="rubric-cell-text" contenteditable="true">Good descriptor</div></td>
    <td><div class="rubric-cell-text" contenteditable="true">Fair descriptor</div></td>
    <td><div class="rubric-cell-text" contenteditable="true">Needs improvement descriptor</div></td>
    <td style="text-align:center"><input type="number" min="1" max="4" style="width:44px;text-align:center;border:1px solid var(--line);border-radius:4px;padding:4px" placeholder="—"></td>
  `;
  tbody.appendChild(tr);
  document.getElementById('rubric-max').textContent = tbody.querySelectorAll('tr').length * 4;
}

function clearRubric() {
  document.getElementById('rubric-output').style.display = 'none';
  document.getElementById('rb-title').value = '';
  document.getElementById('rb-desc').value = '';
}

function copyRubricText() {
  const rows = document.querySelectorAll('#rubric-tbody tr');
  let text = `SBA RUBRIC — ${document.getElementById('rubric-header-title').textContent}\n`;
  text += `${document.getElementById('rubric-header-meta').textContent}\n\n`;
  text += `CRITERIA\t\tEXCELLENT (4)\tGOOD (3)\tFAIR (2)\tNEEDS IMPROVEMENT (1)\n`;
  rows.forEach(r => {
    const cells = r.querySelectorAll('td');
    text += `${cells[0].textContent.trim()}\t${cells[1].textContent.trim()}\t${cells[2].textContent.trim()}\t${cells[3].textContent.trim()}\t${cells[4].textContent.trim()}\n`;
  });
  navigator.clipboard.writeText(text).then(() => alert('Rubric copied to clipboard!'));
}

/* ══════════════════════════════════════════════════
   TASK TRACKING SHEET
══════════════════════════════════════════════════ */
function makeTrackerRow(n) {
  const tr = document.createElement('tr');
  tr.innerHTML = `
    <td style="text-align:center;color:var(--ink3);font-size:.76rem">${n}</td>
    <td><input type="text" placeholder="Learner name"></td>
    <td><input type="number" min="0" max="20" placeholder="—" oninput="updateTrackerRow(this)"></td>
    <td><input type="number" min="0" max="20" placeholder="—" oninput="updateTrackerRow(this)"></td>
    <td><input type="number" min="0" max="20" placeholder="—" oninput="updateTrackerRow(this)"></td>
    <td><input type="number" min="0" max="40" placeholder="—" oninput="updateTrackerRow(this)"></td>
    <td class="total-cell" id="tr-total-${n}">—</td>
  `;
  return tr;
}

function addTrackerRow() {
  const tbody = document.getElementById('tracker-tbody');
  const n = tbody.querySelectorAll('tr').length + 1;
  tbody.appendChild(makeTrackerRow(n));
}

function addTrackerRows(count) {
  for (let i = 0; i < count; i++) addTrackerRow();
}

function clearTrackerRows() {
  if (confirm('Clear all learner rows?')) {
    document.getElementById('tracker-tbody').innerHTML = '';
    document.getElementById('tracker-summary').innerHTML = 'Add learner scores above to see summary.';
  }
}

function updateTrackerRow(input) {
  const tr = input.closest('tr');
  const inputs = tr.querySelectorAll('input[type=number]');
  let total = 0, valid = true;
  const maxes = [20, 20, 20, 40];
  inputs.forEach((inp, i) => {
    const v = parseFloat(inp.value);
    if (!isNaN(v)) {
      if (v > maxes[i]) { inp.style.color = 'var(--red)'; valid = false; }
      else { inp.style.color = ''; total += v; }
    }
  });
  const sn = tr.querySelector('td:first-child').textContent.trim();
  const cell = document.getElementById('tr-total-' + sn);
  if (cell) {
    cell.textContent = total || '—';
    cell.className = 'total-cell ' + (total > 100 ? 'over' : total > 0 ? 'ok' : '');
  }
  updateTrackerSummary();
}

function updateTrackerSummary() {
  const rows = document.querySelectorAll('#tracker-tbody tr');
  let scores = [], count = 0;
  rows.forEach(tr => {
    const cell = tr.querySelector('.total-cell');
    const v = parseFloat(cell?.textContent);
    if (!isNaN(v) && v > 0) { scores.push(v); count++; }
  });
  if (!scores.length) { document.getElementById('tracker-summary').innerHTML = 'Add learner scores above to see summary.'; return; }
  const avg = (scores.reduce((a,b)=>a+b,0)/scores.length).toFixed(1);
  const max = Math.max(...scores);
  const min = Math.min(...scores);
  const term = document.getElementById('tr-term')?.value || '1';
  const weights = {'1':20,'2':30,'3':50};
  document.getElementById('tracker-summary').innerHTML = `
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:.75rem">
      <div style="background:var(--surface);border-radius:6px;padding:.75rem;text-align:center">
        <div style="font-size:.7rem;color:var(--ink3);margin-bottom:.25rem">Learners scored</div>
        <div style="font-size:1.4rem;font-weight:600;color:var(--ink)">${count}</div>
      </div>
      <div style="background:var(--surface);border-radius:6px;padding:.75rem;text-align:center">
        <div style="font-size:.7rem;color:var(--ink3);margin-bottom:.25rem">Class average</div>
        <div style="font-size:1.4rem;font-weight:600;color:var(--green)">${avg}<small style="font-size:.7rem">/100</small></div>
      </div>
      <div style="background:var(--surface);border-radius:6px;padding:.75rem;text-align:center">
        <div style="font-size:.7rem;color:var(--ink3);margin-bottom:.25rem">Highest score</div>
        <div style="font-size:1.4rem;font-weight:600;color:var(--blue)">${max}</div>
      </div>
      <div style="background:var(--surface);border-radius:6px;padding:.75rem;text-align:center">
        <div style="font-size:.7rem;color:var(--ink3);margin-bottom:.25rem">Lowest score</div>
        <div style="font-size:1.4rem;font-weight:600;color:var(--amber)">${min}</div>
      </div>
      <div style="background:var(--green-light);border-radius:6px;padding:.75rem;text-align:center">
        <div style="font-size:.7rem;color:var(--green);margin-bottom:.25rem">Term weight (Term ${term})</div>
        <div style="font-size:1.4rem;font-weight:600;color:var(--green)">${weights[term]}%</div>
      </div>
    </div>
  `;
}

function exportToECZ() {
  const school = document.getElementById('tr-school').value;
  const centre = document.getElementById('tr-centre').value;
  const subject = document.getElementById('tr-subject').value;
  const form = document.getElementById('tr-form').value;
  const year = document.getElementById('tr-year').value;
  document.getElementById('ecz-school').value = school;
  document.getElementById('ecz-centre').value = centre;
  document.getElementById('ecz-subject').value = subject;
  document.getElementById('ecz-form').value = form;
  document.getElementById('ecz-year').value = year;

  const rows = document.querySelectorAll('#tracker-tbody tr');
  const eczBody = document.getElementById('ecz-tbody');
  eczBody.innerHTML = '';
  let n = 1;
  rows.forEach(tr => {
    const name = tr.querySelector('input[type=text]')?.value?.trim();
    const totalCell = tr.querySelector('.total-cell');
    const score = totalCell?.textContent?.trim();
    if (name) {
      const r = document.createElement('tr');
      r.innerHTML = `
        <td style="text-align:center;color:var(--ink3);font-size:.76rem">${n}</td>
        <td><input type="text" value="${name}"></td>
        <td><input type="text" placeholder="e.g. 2025/MNL/001"></td>
        <td style="text-align:center"><input type="number" min="0" max="100" value="${score !== '—' ? score : ''}" oninput="updateECZSummary()"></td>
        <td><input type="text" placeholder="e.g. Absent, Medical"></td>
      `;
      eczBody.appendChild(r);
      n++;
    }
  });

  switchTab('ecz');
  document.querySelectorAll('.tab').forEach((t,i) => { if(i===2) t.classList.add('active'); else t.classList.remove('active'); });
  updateECZSummary();
}

/* ══════════════════════════════════════════════════
   ECZ SUBMISSION SHEET
══════════════════════════════════════════════════ */
function makeECZRow(n) {
  const tr = document.createElement('tr');
  tr.innerHTML = `
    <td style="text-align:center;color:var(--ink3);font-size:.76rem">${n}</td>
    <td><input type="text" placeholder="Learner name"></td>
    <td><input type="text" placeholder="e.g. 2025/MNL/001"></td>
    <td style="text-align:center"><input type="number" min="0" max="100" placeholder="—" oninput="updateECZSummary()"></td>
    <td><input type="text" placeholder="e.g. Medical absence"></td>
  `;
  return tr;
}

function addECZRow() {
  const tbody = document.getElementById('ecz-tbody');
  tbody.appendChild(makeECZRow(tbody.querySelectorAll('tr').length + 1));
}

function addECZRows(count) { for (let i = 0; i < count; i++) addECZRow(); }

function clearECZRows() {
  if (confirm('Clear all rows?')) {
    document.getElementById('ecz-tbody').innerHTML = '';
    document.getElementById('ecz-summary').innerHTML = 'Add scores to see class statistics.';
  }
}

function updateECZSummary() {
  const inputs = document.querySelectorAll('#ecz-tbody input[type=number]');
  let scores = [];
  inputs.forEach(inp => { const v = parseFloat(inp.value); if (!isNaN(v)) scores.push(v); });
  if (!scores.length) { document.getElementById('ecz-summary').innerHTML = 'Add scores to see class statistics.'; return; }
  const avg = (scores.reduce((a,b)=>a+b,0)/scores.length).toFixed(1);
  const pass = scores.filter(s => s >= 40).length;
  const passRate = ((pass/scores.length)*100).toFixed(0);
  document.getElementById('ecz-summary').innerHTML = `
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:.75rem">
      <div style="background:var(--surface);border-radius:6px;padding:.75rem;text-align:center">
        <div style="font-size:.7rem;color:var(--ink3);margin-bottom:.25rem">Learners</div>
        <div style="font-size:1.4rem;font-weight:600">${scores.length}</div>
      </div>
      <div style="background:var(--surface);border-radius:6px;padding:.75rem;text-align:center">
        <div style="font-size:.7rem;color:var(--ink3);margin-bottom:.25rem">Class average</div>
        <div style="font-size:1.4rem;font-weight:600;color:var(--green)">${avg}/100</div>
      </div>
      <div style="background:var(--surface);border-radius:6px;padding:.75rem;text-align:center">
        <div style="font-size:.7rem;color:var(--ink3);margin-bottom:.25rem">Highest</div>
        <div style="font-size:1.4rem;font-weight:600;color:var(--blue)">${Math.max(...scores)}</div>
      </div>
      <div style="background:var(--surface);border-radius:6px;padding:.75rem;text-align:center">
        <div style="font-size:.7rem;color:var(--ink3);margin-bottom:.25rem">Lowest</div>
        <div style="font-size:1.4rem;font-weight:600;color:var(--amber)">${Math.min(...scores)}</div>
      </div>
      <div style="background:var(--green-light);border-radius:6px;padding:.75rem;text-align:center">
        <div style="font-size:.7rem;color:var(--green);margin-bottom:.25rem">Pass rate (≥40)</div>
        <div style="font-size:1.4rem;font-weight:600;color:var(--green)">${passRate}%</div>
      </div>
    </div>
    <div style="margin-top:.75rem;font-size:.75rem;color:var(--ink3)">
      ⚠ Verify all learner numbers match the ECZ registration list before submission. Deadline: <strong>31 January ${new Date().getFullYear()+1}</strong>.
    </div>
  `;
}

/* ── Init: add starter rows ─────────────────────── */
for (let i = 0; i < 5; i++) addTrackerRow();
for (let i = 0; i < 5; i++) addECZRow();
</script>
</body>
</html>
