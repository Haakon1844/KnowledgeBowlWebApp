// Knowledge Bowl Practice Quiz
// Questions live in questions.json. The first option in each question is the correct one;
// options are shuffled every time a question is shown.

const app = document.getElementById('app');
const L = ['A', 'B', 'C', 'D'];
const SECONDS = 30;

const esc = s => String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

// localStorage can be unavailable (private mode, blocked), so every access is guarded.
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* ignore */ } },
};

let QUESTIONS = [], quiz = [], idx = 0, timed = false, timer = null, timeLeft = 0;

async function init() {
  try {
    const res = await fetch('questions.json');
    if (!res.ok) throw new Error(res.status);
    QUESTIONS = await res.json();
  } catch (e) {
    app.innerHTML = '<div class="card"><p>Couldn’t load <code>questions.json</code>. If you opened this file directly, run <code>python launch.py</code> instead, or use the hosted version.</p></div>';
    return;
  }
  showStart();
}

// ---------- stats ----------
const stats = () => store.get('kb_stats', {});          // { id: {c, t} }
const flags = () => store.get('kb_flags', []);          // [id]
function weakness(q, st) { const s = st[q.id]; return s && s.t ? 1 - s.c / s.t : 0.5; }

// ---------- start screen ----------
function showStart() {
  clearInterval(timer);
  const st = stats(), groups = [...new Set(QUESTIONS.map(q => q.group))];
  const acc = g => {
    let c = 0, t = 0;
    QUESTIONS.filter(q => q.group === g).forEach(q => { const s = st[q.id]; if (s) { c += s.c; t += s.t; } });
    return t ? Math.round(c / t * 100) + '% over ' + t + ' answered' : 'not attempted yet';
  };
  const nFlag = flags().length;
  app.innerHTML = `<div class="card"><h2>Choose your question sets</h2>
    ${groups.map(g => `<label class="chk"><input type="checkbox" class="grp" value="${esc(g)}" checked> ${esc(g)}
      <span class="meta">${QUESTIONS.filter(q => q.group === g).length} questions · ${acc(g)}</span></label>`).join('')}
    <h2 style="margin-top:18px">Options</h2>
    <label class="chk">Questions per quiz
      <select id="count"><option value="10">10</option><option value="20">20</option><option value="40">40</option><option value="0">All</option></select></label>
    <label class="chk"><input type="checkbox" id="weak"> Drill my weak spots (missed and unseen questions first)</label>
    <label class="chk"><input type="checkbox" id="timed"> Timed mode (${SECONDS} seconds per question)</label>
    <p class="meta" id="avail"></p>
    <button class="primary" id="start">Start Quiz</button></div>
    <div class="row">
      <button class="ghost" id="copyFlags" ${nFlag ? '' : 'disabled'}>Copy ${nFlag} flagged question${nFlag === 1 ? '' : 's'}</button>
      <button class="ghost" id="reset">Reset my stats</button></div>`;
  const selected = () => [...document.querySelectorAll('.grp:checked')].map(x => x.value);
  const upd = () => {
    const n = QUESTIONS.filter(q => selected().includes(q.group)).length;
    document.getElementById('avail').textContent = n + ' question' + (n === 1 ? '' : 's') + ' available';
    document.getElementById('start').disabled = n === 0;
  };
  document.querySelectorAll('.grp').forEach(x => x.onchange = upd); upd();
  document.getElementById('start').onclick = () => {
    let pool = QUESTIONS.filter(q => selected().includes(q.group));
    pool = document.getElementById('weak').checked
      ? pool.map(q => [weakness(q, st) + Math.random() * 0.25, q]).sort((a, b) => b[0] - a[0]).map(x => x[1])
      : shuffle(pool);
    const n = +document.getElementById('count').value;
    startQuiz(n ? pool.slice(0, n) : pool, document.getElementById('timed').checked);
  };
  document.getElementById('copyFlags').onclick = e => {
    const ids = new Set(flags());
    const text = QUESTIONS.filter(q => ids.has(q.id)).map(q => `${q.id}: ${q.question} (answer: ${q.options[0]})`).join('\n');
    try { navigator.clipboard.writeText(text); e.target.textContent = 'Copied'; } catch (err) { e.target.textContent = 'Copy failed'; }
  };
  document.getElementById('reset').onclick = () => {
    if (confirm('Clear your saved stats and flags on this device?')) { store.set('kb_stats', {}); store.set('kb_flags', []); showStart(); }
  };
}

// ---------- quiz ----------
function startQuiz(pool, isTimed) {
  timed = isTimed;
  quiz = pool.map(q => ({ q, opts: shuffle(q.options), pick: null }));
  idx = 0; renderQ();
}

function advance() {
  clearInterval(timer);
  if (idx === quiz.length - 1) showResults(); else { idx++; renderQ(); }
}

function renderQ() {
  clearInterval(timer);
  const it = quiz[idx], last = idx === quiz.length - 1, flagged = flags().includes(it.q.id);
  app.innerHTML = `<div class="row spread" style="margin-top:18px"><span class="meta">Question ${idx + 1} of ${quiz.length}</span>
      ${timed ? '<span class="timer" id="clock"></span>' : ''}</div>
    <div class="bar"><i style="width:${(idx / quiz.length) * 100}%"></i></div>
    <div class="card" style="margin-top:0"><div class="row spread"><div class="cat">${esc(it.q.category)}</div>
      <button class="ghost" id="flag">${flagged ? '⚑ Flagged' : '⚐ Flag'}</button></div>
    <p class="q">${esc(it.q.question)}</p>
    ${it.opts.map((o, i) => `<button class="opt ${it.pick === o ? 'sel' : ''}" data-i="${i}"><b>${L[i]}</b><span>${esc(o)}</span></button>`).join('')}</div>
    <div class="row spread">
      <button class="ghost" id="prev" ${idx === 0 || timed ? 'disabled' : ''}>← Back</button>
      <button class="primary" id="next" ${it.pick === null && !timed ? 'disabled' : ''}>${last ? 'Finish & Grade' : 'Next →'}</button></div>`;
  app.querySelectorAll('.opt').forEach(b => b.onclick = () => { it.pick = it.opts[+b.dataset.i]; renderQ(); });
  document.getElementById('prev').onclick = () => { if (idx > 0) { idx--; renderQ(); } };
  document.getElementById('next').onclick = advance;
  document.getElementById('flag').onclick = () => {
    const f = flags(), i = f.indexOf(it.q.id);
    if (i >= 0) f.splice(i, 1); else f.push(it.q.id);
    store.set('kb_flags', f); renderQ();
  };
  if (timed) {
    timeLeft = SECONDS;
    const clock = document.getElementById('clock');
    const tick = () => { clock.textContent = '⏱ ' + timeLeft + 's'; clock.classList.toggle('low', timeLeft <= 10); };
    tick();
    timer = setInterval(() => { timeLeft--; tick(); if (timeLeft <= 0) advance(); }, 1000);
  }
}

// ---------- results ----------
function showResults() {
  clearInterval(timer);
  const right = x => x.pick === x.q.options[0];
  const correct = quiz.filter(right).length, total = quiz.length;
  const st = stats();
  quiz.forEach(x => { const s = st[x.q.id] = st[x.q.id] || { c: 0, t: 0 }; s.t++; if (right(x)) s.c++; });
  store.set('kb_stats', st);

  const by = {};
  quiz.forEach(x => { const b = by[x.q.group] = by[x.q.group] || { c: 0, t: 0 }; b.t++; if (right(x)) b.c++; });
  const missed = quiz.filter(x => !right(x));
  app.innerHTML = `<div class="card"><div class="big">${Math.round(correct / total * 100)}%</div>
    <div class="ui" style="text-align:center;margin-top:8px">${correct} of ${total} correct</div></div>
    <div class="card"><h2>By question set</h2>
    ${Object.entries(by).map(([g, b]) => `<div class="brow"><span>${esc(g)}</span><span>${b.c} / ${b.t}</span></div>`).join('')}</div>
    <div class="row"><button class="primary" id="again">New Quiz</button>
      <button class="ghost" id="redo" ${missed.length ? '' : 'disabled'}>Retake ${missed.length} missed</button>
      <button class="ghost" id="toggle">Show only missed</button></div>
    <div class="card">${quiz.map((x, i) => `<div class="rev ${right(x) ? 'right' : 'wrong'}">
      <div class="rq">${i + 1}. ${esc(x.q.question)}</div>
      <div class="${right(x) ? 'ok' : 'no'}">${right(x) ? '✓ Correct' : '✗ Incorrect'}</div>
      <div>Your answer: ${x.pick === null ? '<i>no answer (time ran out)</i>' : esc(x.pick)}</div>
      ${right(x) ? '' : `<div>Correct answer: <b>${esc(x.q.options[0])}</b></div>`}</div>`).join('')}</div>`;
  document.getElementById('again').onclick = showStart;
  document.getElementById('redo').onclick = () => startQuiz(shuffle(missed.map(x => x.q)), timed);
  let only = false;
  document.getElementById('toggle').onclick = e => {
    only = !only; e.target.textContent = only ? 'Show all' : 'Show only missed';
    document.querySelectorAll('.rev.right').forEach(r => r.classList.toggle('hide', only));
  };
  window.scrollTo(0, 0);
}

// ---------- keyboard: A-D or 1-4 to answer, Enter for next ----------
document.addEventListener('keydown', e => {
  if (!quiz.length || !document.getElementById('clock') && !document.getElementById('next')) return;
  const it = quiz[idx], k = e.key.toLowerCase();
  const i = 'abcd'.includes(k) && k.length === 1 ? 'abcd'.indexOf(k) : '1234'.indexOf(k);
  if (i >= 0 && i < it.opts.length) { it.pick = it.opts[i]; renderQ(); }
  else if (e.key === 'Enter') { const n = document.getElementById('next'); if (n && !n.disabled) n.click(); }
});

init();
