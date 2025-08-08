// Data and state
const LABELS = ["ア","イ","ウ","エ"];
let QUESTIONS = [];
let idx = 0;
let correct = 0;
const answers = {}; // id -> one of アイウエ

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

// Config
let AUTO = true;
let DELAY = 600;
let LIMIT = 0;

function setConfig({auto, delay, limit}) {
  AUTO = !!auto;
  DELAY = Math.max(0, Number(delay)||0);
  LIMIT = Math.max(0, Number(limit)||0);
}

function startQuiz(all) {
  // Clone to avoid mutation; apply limit if set
  QUESTIONS = all.map(q => ({...q}));
  if (LIMIT > 0) QUESTIONS = QUESTIONS.slice(0, LIMIT);

  idx = 0; correct = 0;
  for (const k in answers) delete answers[k];
  document.getElementById("finish").style.display = "none";
  quizCard.style.display = "block";
  render();
}

function render() {
  if (idx >= QUESTIONS.length) return showSummary();
  const q = QUESTIONS[idx];
  counterEl.textContent = `${idx+1} / ${QUESTIONS.length}`;
  scoreEl.textContent = `正答 ${correct}`;
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

  if (answers[q.id]) showJudge(answers[q.id], false);
}

function handleAnswer(choice) {
  const q = QUESTIONS[idx];
  if (!q || answers[q.id]) return; // ignore duplicate
  answers[q.id] = choice;

  const correctKana = q.answer_kana || kanaFromABCD(q.answer);
  const isCorrect = (choice === correctKana);
  if (isCorrect) correct++;

  showJudge(choice, true);

  if (AUTO) setTimeout(() => next(), DELAY);
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
    showSummary();
  }
}

function prev() {
  if (idx > 0) {
    // rewind scoring if needed
    const cur = QUESTIONS[idx];
    const kana = cur.answer_kana || kanaFromABCD(cur.answer);
    if (answers[cur.id] === kana) correct--;
    delete answers[cur.id];
    idx--; render();
  }
}

function showSummary() {
  quizCard.style.display = "none";
  finishEl.style.display = "block";
  const total = QUESTIONS.length;
  const rate = total ? Math.round((correct/total)*100) : 0;
  summaryEl.textContent = `お疲れさま！ 正答 ${correct} / ${total}（正答率 ${rate}%）`;
}

// Keyboard (1..4, arrows)
window.addEventListener("keydown", (e) => {
  const k = e.key;
  const map = { "1":"ア", "2":"イ", "3":"ウ", "4":"エ", "ArrowRight":"NEXT", "ArrowLeft":"PREV" };
  if (!(k in map)) return;
  e.preventDefault();
  const act = map[k];
  if (act === "NEXT") return next();
  if (act === "PREV") return prev();
  handleAnswer(act);
});

prevBtn.addEventListener("click", prev);
nextBtn.addEventListener("click", next);

// Export/import of progress (simple)
function exportProgress() {
  const data = { answers, correct, total: QUESTIONS.length, timestamp: Date.now() };
  const blob = new Blob([JSON.stringify(data, null, 2)], {type:"application/json"});
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "progress.json";
  a.click();
}
