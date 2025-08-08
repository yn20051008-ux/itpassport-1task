// Data and state
const LABELS = ["ア","イ","ウ","エ"];
let QUESTIONS = [];
let MODE = "practice"; // "practice" | "exam"

let idx = 0;
let correct = 0;      // practice only; exam is calculated at finish
const answers = {};   // id -> one of アイウエ

// Elements
const quizCard = document.getElementById("quizCard");
const stemEl = document.getElementById("stem");
const choicesEl = document.getElementById("choices");
const exEl = document.getElementById("ex");
const counterEl = document.getElementById("counter");
const scoreEl = document.getElementById("score");
const metaEl = document.getElementById("meta");
const finishEl = document.getElementById("finish");
const summaryEl = document.getElementById("summary");
const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");
const finishBtn = document.getElementById("finishBtn");
const timerEl = document.getElementById("timer");
const reviewEl = document.getElementById("review");
const retryWrongBtn = document.getElementById("retryWrongBtn");

// Config
let AUTO = true;
let DELAY = 600;
let LIMIT = 0;
let EXAM_COUNT = 100;
let EXAM_MIN = 120;
let EXAM_LOCK_BACK = true;

// Timer
let remainSec = 0;
let timerId = null;

function setConfig({auto, delay, limit, examCount, examMinutes, examLockBack}) {
  AUTO = !!auto;
  DELAY = Math.max(0, Number(delay)||0);
  LIMIT = Math.max(0, Number(limit)||0);
  EXAM_COUNT = Math.max(1, Number(examCount)||100);
  EXAM_MIN = Math.max(1, Number(examMinutes)||120);
  EXAM_LOCK_BACK = !!examLockBack;
}

// ====== Public API called by app.js ======
function startPractice(all) {
  MODE = "practice";
  stopTimer();
  timerEl.style.display = "none";
  QUESTIONS = all.map(q => ({...q}));
  if (LIMIT > 0) QUESTIONS = QUESTIONS.slice(0, LIMIT);
  idx = 0; correct = 0;
  for (const k in answers) delete answers[k];
  finishEl.style.display = "none";
  quizCard.style.display = "block";
  render();
}

function startExam(all) {
  MODE = "exam";
  for (const k in answers) delete answers[k];
  correct = 0; idx = 0;
  finishEl.style.display = "none";
  QUESTIONS = all.map(q => ({...q})).slice(0, EXAM_COUNT);
  quizCard.style.display = "block";
  timerEl.style.display = "inline-flex";
  remainSec = EXAM_MIN * 60;
  updateTimer();
  timerId = setInterval(() => {
    remainSec--;
    updateTimer();
    if (remainSec <= 0) {
      finishExam(); // time up
    }
  }, 1000);
  render();
}

function stopTimer() {
  if (timerId) clearInterval(timerId);
  timerId = null;
}

function updateTimer() {
  const m = Math.floor(remainSec / 60);
  const s = remainSec % 60;
  timerEl.textContent = `${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
}

// ====== Render & Interaction ======
function render() {
  if (idx >= QUESTIONS.length) return (MODE === "exam" ? finishExam() : showSummary());
  const q = QUESTIONS[idx];
  counterEl.textContent = `${idx+1} / ${QUESTIONS.length}`;
  scoreEl.textContent = (MODE === "practice") ? `正答 ${correct}` : `回答 ${Object.keys(answers).length}`;
  metaEl.textContent = `${q.year ?? "-"} ${q.session ?? ""}｜${q.domain ?? (q.category ?? "-")}`;

  stemEl.textContent = q.stem || "（問題文の要約をここに表示）";
  exEl.classList.remove("show"); exEl.textContent = "";

  // Choices
  choicesEl.innerHTML = "";
  const options = [q.ア, q.イ, q.ウ, q.エ];
  options.forEach((text, i) => {
    const label = LABELS[i];
    const btn = document.createElement("button");
    btn.className = "btn";
    btn.innerHTML = `<b>${label}.</b> ${text || ""}`;
    btn.onclick = () => handleAnswer(label);
    choicesEl.appendChild(btn);
  });

  if (MODE === "practice" && answers[q.id]) showJudge(answers[q.id], false);

  // Controls visibility
  prevBtn.disabled = (MODE === "exam" && EXAM_LOCK_BACK);
}

function handleAnswer(choice) {
  const q = QUESTIONS[idx];
  if (!q) return;
  if (answers[q.id]) return; // ignore duplicate
  answers[q.id] = choice;

  if (MODE === "practice") {
    const isCorrect = (choice === (q.answer_kana || kanaFromABCD(q.answer)));
    if (isCorrect) correct++;
    showJudge(choice, true);
    if (AUTO) setTimeout(() => next(), DELAY);
  } else {
    // exam: no judge, auto next immediately (no delay)
    next();
  }
}

function kanaFromABCD(ch) {
  const m = {A:"ア",B:"イ",C:"ウ",D:"エ"};
  return m[ch] || "";
}

function showJudge(choice, showExplain) {
  const q = QUESTIONS[idx];
  const btns = [...choicesEl.querySelectorAll(".btn")];
  const correctKana = q.answer_kana || kanaFromABCD(q.answer);

  btns.forEach((b, i) => {
    const label = LABELS[i];
    if (label === correctKana) b.classList.add("correct");
    if (label === choice && label !== correctKana) b.classList.add("wrong");
    b.disabled = true;
  });

  if (showExplain && q.explanation) {
    exEl.textContent = `解説：${q.explanation}`;
    exEl.classList.add("show");
  }
  scoreEl.textContent = `正答 ${correct}`;
}

function next() {
  if (idx < QUESTIONS.length - 1) {
    idx++; render();
  } else {
    if (MODE === "exam") finishExam();
    else showSummary();
  }
}

function prev() {
  if (MODE === "exam" && EXAM_LOCK_BACK) return; // disabled in exam
  if (idx > 0) {
    const cur = QUESTIONS[idx];
    if (MODE === "practice") {
      const kana = cur.answer_kana || kanaFromABCD(cur.answer);
      if (answers[cur.id] === kana) correct--;
    }
    delete answers[cur.id];
    idx--; render();
  }
}

function calculateScore() {
  let ok = 0, wrong = 0, blank = 0;
  const wrongList = [];
  for (const q of QUESTIONS) {
    const a = answers[q.id];
    const correctKana = q.answer_kana || kanaFromABCD(q.answer);
    if (!a) { blank++; wrongList.push({q, a:"未回答", correct:correctKana}); continue; }
    if (a === correctKana) ok++;
    else { wrong++; wrongList.push({q, a, correct:correctKana}); }
  }
  return {ok, wrong, blank, total: QUESTIONS.length, wrongList};
}

function finishExam() {
  stopTimer();
  quizCard.style.display = "none";
  finishEl.style.display = "block";
  const {ok, wrong, blank, total, wrongList} = calculateScore();
  const rate = total ? Math.round((ok/total)*100) : 0;
  summaryEl.textContent = `模試終了：正答 ${ok} / ${total}（正答率 ${rate}%） 未回答 ${blank}`;

  // Build simple review list
  reviewEl.innerHTML = "";
  if (wrongList.length) {
    const ul = document.createElement("ul");
    ul.style.margin = "8px 0 0"; ul.style.paddingLeft = "18px";
    wrongList.slice(0, 20).forEach((w, i) => {
      const li = document.createElement("li");
      li.textContent = `Q${i+1}: あなた=${w.a} / 正解=${w.correct} ｜ ${w.q.stem?.slice(0, 40) || ""}`;
      ul.appendChild(li);
    });
    if (wrongList.length > 20) {
      const more = document.createElement("div");
      more.className = "small muted";
      more.textContent = `… 他 ${wrongList.length - 20}問`;
      reviewEl.appendChild(more);
    }
    reviewEl.appendChild(ul);
  } else {
    const p = document.createElement("p");
    p.className = "small";
    p.textContent = "全問正解！";
    reviewEl.appendChild(p);
  }
}

function showSummary() {
  quizCard.style.display = "none";
  finishEl.style.display = "block";
  const total = QUESTIONS.length;
  const rate = total ? Math.round((correct/total)*100) : 0;
  summaryEl.textContent = `お疲れさま！ 正答 ${correct} / ${total}（正答率 ${rate}%）`;
  reviewEl.innerHTML = "";
}

// Keyboard (1..4, arrows, Enter for next)
window.addEventListener("keydown", (e) => {
  const k = e.key;
  const map = { "1":"ア", "2":"イ", "3":"ウ", "4":"エ", "ArrowRight":"NEXT", "ArrowLeft":"PREV", "Enter":"NEXT" };
  if (!(k in map)) return;
  e.preventDefault();
  const act = map[k];
  if (act === "NEXT") return next();
  if (act === "PREV") return prev();
  handleAnswer(act);
});

prevBtn.addEventListener("click", prev);
nextBtn.addEventListener("click", next);
finishBtn.addEventListener("click", () => {
  if (MODE === "exam") finishExam(); else showSummary();
});

// Export/import of progress (simple)
function exportProgress() {
  const data = { mode: MODE, answers, total: QUESTIONS.length, timestamp: Date.now() };
  const blob = new Blob([JSON.stringify(data, null, 2)], {type:"application/json"});
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "progress.json";
  a.click();
}

retryWrongBtn.addEventListener("click", () => {
  // Build a set with wrong or blank
  const list = [];
  for (const q of QUESTIONS) {
    const a = answers[q.id];
    const correctKana = q.answer_kana || kanaFromABCD(q.answer);
    if (!a || a !== correctKana) list.push(q);
  }
  if (!list.length) { alert("誤答はありません"); return; }
  MODE = "practice";
  stopTimer();
  idx = 0; correct = 0;
  for (const k in answers) delete answers[k];
  QUESTIONS = list;
  finishEl.style.display = "none";
  quizCard.style.display = "block";
  timerEl.style.display = "none";
  render();
});

// Expose for app.js
window.__QUIZ__ = { startPractice, startExam, setConfig };
