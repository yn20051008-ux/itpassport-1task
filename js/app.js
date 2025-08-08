// Auto-100 mode: if data/questions.json 不在 or 0問なら、
 // 自動で100問のダミーを生成して模試を開始できる

async function loadQuestions() {
  // 1) try to fetch real questions.json
  try {
    const res = await fetch("data/questions.json", {cache:"no-store"});
    if (res.ok) {
      const json = await res.json();
      if (Array.isArray(json) && json.length) return padTo100(json);
    }
  } catch(e) {}

  // 2) fallback: auto-generate 100 dummy questions
  return makeAuto100();
}

function padTo100(arr) {
  if (arr.length >= 100) return arr.slice(0, 100);
  const out = arr.slice();
  const need = 100 - arr.length;
  for (let i=1; i<=need; i++) out.push(makeDummy(arr.length + i));
  return out;
}

function makeAuto100() {
  const arr = [];
  for (let i=1;i<=100;i++) arr.push(makeDummy(i));
  return arr;
}

function makeDummy(n) {
  const kana = ["ア","イ","ウ","エ"][(n-1)%4];
  const y = new Date().getFullYear();
  return {
    id: `auto-${n}`,
    year: y, session: "AUTO", domain: "ダミー",
    stem: `練習用ダミー問題 ${n}（要約未入力）`,
    ア: "選択肢ア", イ: "選択肢イ", ウ: "選択肢ウ", エ: "選択肢エ",
    answer_kana: kana
  };
}

function bindUI() {
  const btnExam = document.getElementById("btnExam");
  const btnImport = document.getElementById("btnImport");
  const examCount = document.getElementById("examCount");
  const examMinutes = document.getElementById("examMinutes");
  const examLockBack = document.getElementById("examLockBack");

  btnExam.addEventListener("click", async () => {
    const q = await loadQuestions();
    __QUIZ__.setConfig({ examCount: examCount.value || 100, examMinutes: examMinutes.value || 120, examLockBack: !!examLockBack.checked });
    __QUIZ__.startExam(q);
    window.scrollTo({top:0, behavior:"smooth"});
  });

  btnImport.addEventListener("click", () => openImporter());
}

// Importer (unchanged from v2)
function openImporter() {
  const div = document.createElement("div");
  div.style.cssText = "position:fixed;inset:0;background:#000a;display:flex;align-items:center;justify-content:center;z-index:9999;";
  div.innerHTML = `
    <div style="background:#0f1730;border:1px solid #243056;border-radius:16px;max-width:700px;width:92%;padding:16px;">
      <h3 style="margin:0 0 8px">CSV/JSON 取込</h3>
      <p class="small muted">CSVヘッダ：year,session,q_no,stem,ア,イ,ウ,エ,answer_kana,answer_abcd</p>
      <textarea id="imp" style="width:100%;height:240px;background:#0b142b;color:#e9eefc;border:1px solid #243056;border-radius:8px;padding:8px;"></textarea>
      <div style="display:flex;gap:8px;margin-top:8px;">
        <button id="parseCsv" class="btn">CSVをJSONに変換</button>
        <button id="useJson" class="btn">JSONを読み込む</button>
        <button id="dl" class="btn ghost">JSONをダウンロード</button>
        <button id="close" class="btn ghost">閉じる</button>
      </div>
      <p class="small muted">※ 変換後は <code>data/questions.json</code> を差し替えて公開してください。</p>
    </div>`;
  document.body.appendChild(div);
  const ta = div.querySelector("#imp");
  const btnCsv = div.querySelector("#parseCsv");
  const btnUse = div.querySelector("#useJson");
  const btnDl = div.querySelector("#dl");
  const btnClose = div.querySelector("#close");

  let currentJson = null;
  btnCsv.onclick = () => { currentJson = csvToJson(ta.value); alert(`変換しました（${currentJson.length}件）`); };
  btnUse.onclick = () => {
    if (!currentJson) { try { currentJson = JSON.parse(ta.value); } catch(e) { alert("JSONの形式が不正です"); return; } }
    __QUIZ__.setConfig({ examCount: 100, examMinutes: 120, examLockBack: true });
    __QUIZ__.startExam(currentJson);
  };
  btnDl.onclick = () => {
    if (!currentJson) { alert("先にCSVを変換してください"); return; }
    const blob = new Blob([JSON.stringify(currentJson,null,2)], {type:"application/json"});
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "questions.json"; a.click();
  };
  btnClose.onclick = () => div.remove();
}

function csvToJson(csv) {
  const lines = csv.trim().split(/\r?\n/);
  if (!lines.length) return [];
  const header = lines[0].split(",");
  const idx = (name) => header.indexOf(name);
  const out = [];
  for (let i=1;i<lines.length;i++){
    const row = safeSplit(lines[i]);
    const obj = {
      id: `${row[idx("year")]}-${row[idx("session")]}-${row[idx("q_no")]}`,
      year: Number(row[idx("year")]) || null,
      session: row[idx("session")] || "",
      domain: row.indexOf("domain")>=0 ? row[idx("domain")] : "",
      stem: row[idx("stem")] || "",
      ア: row[idx("ア")] || "",
      イ: row[idx("イ")] || "",
      ウ: row[idx("ウ")] || "",
      エ: row[idx("エ")] || "",
      answer_kana: row[idx("answer_kana")] || "",
      answer: row[idx("answer_abcd")] || ""
    };
    out.push(obj);
  }
  return out;
}

// naive CSV split (handles simple quotes)
function safeSplit(line) {
  const arr = [];
  let cur = "", inQ = false;
  for (let i=0;i<line.length;i++){
    const c = line[i];
    if (c === '"'){ inQ = !inQ; continue; }
    if (c === "," && !inQ){ arr.push(cur); cur=""; continue; }
    cur += c;
  }
  arr.push(cur);
  return arr;
}

bindUI();
