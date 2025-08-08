const DEFAULT_SAMPLE = [
  {
    "id":"sample-001","year":2025,"session":"R07","domain":"ストラテジ",
    "stem":"企業のSWOT分析における『機会』の例として最も適切なのはどれか。",
    "ア":"競合の強いブランド力","イ":"自社の高い技術力","ウ":"市場拡大の追い風となる法改正","エ":"自社の生産性の低さ",
    "answer_kana":"ウ","explanation":"外部のプラス要因＝機会。市場拡大などの外部環境が該当。"
  },
  {
    "id":"sample-002","year":2024,"session":"R06","domain":"テクノロジ",
    "stem":"データベース正規化の主目的はどれか。",
    "ア":"冗長性の排除と更新異常の防止","イ":"処理性能の最大化","ウ":"セキュリティ強化","エ":"バックアップの削減",
    "answer_kana":"ア","explanation":"正規化はデータの整合性維持と更新異常の防止が目的。"
  },
  {
    "id":"sample-003","year":2024,"session":"R06","domain":"マネジメント",
    "stem":"ガントチャートの説明として適切なのはどれか。",
    "ア":"リスクの発生確率を示す図","イ":"作業の計画・進捗を横棒で示す図","ウ":"要因間の因果を示す図","エ":"品質特性の分布を示す図",
    "answer_kana":"イ","explanation":"ガントチャートは工程の時間軸表示。"
  }
];

async function loadQuestions() {
  try {
    const res = await fetch("data/questions.json", {cache:"no-store"});
    if (res.ok) {
      const json = await res.json();
      if (Array.isArray(json) && json.length) return json;
    }
  } catch(e) {}
  return DEFAULT_SAMPLE;
}

function bindUI() {
  const btnStart = document.getElementById("btnStart");
  const btnImport = document.getElementById("btnImport");
  const auto = document.getElementById("autoAdvance");
  const delay = document.getElementById("delay");
  const limit = document.getElementById("limit");
  const exportBtn = document.getElementById("exportBtn");
  const restartBtn = document.getElementById("restartBtn");

  btnStart.addEventListener("click", async () => {
    const q = await loadQuestions();
    setConfig({auto:auto.checked, delay:delay.value, limit:limit.value});
    startQuiz(q);
  });

  btnImport.addEventListener("click", () => openImporter());
  exportBtn.addEventListener("click", exportProgress);
  restartBtn.addEventListener("click", async () => {
    const q = await loadQuestions();
    startQuiz(q);
  });
}

// Simple importer (CSV or JSON)
function openImporter() {
  const div = document.createElement("div");
  div.style.cssText = "position:fixed;inset:0;background:#000a;display:flex;align-items:center;justify-content:center;z-index:9999;";
  div.innerHTML = `
    <div style="background:#161b22;border-radius:16px;max-width:700px;width:92%;padding:16px;">
      <h3 style="margin:0 0 8px">CSV/JSON 取込</h3>
      <p class="small muted">CSVヘッダ：year,session,q_no,stem,ア,イ,ウ,エ,answer_kana,answer_abcd</p>
      <textarea id="imp" style="width:100%;height:240px;background:#0f141a;color:#e6edf3;border:1px solid #2e3742;border-radius:8px;padding:8px;"></textarea>
      <div style="display:flex;gap:8px;margin-top:8px;">
        <button id="parseCsv" class="nav">CSVをJSONに変換</button>
        <button id="useJson" class="nav">JSONを読み込む</button>
        <button id="dl" class="ghost">JSONをダウンロード</button>
        <button id="close" class="ghost">閉じる</button>
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

  btnCsv.onclick = () => {
    currentJson = csvToJson(ta.value);
    alert(`変換しました（${currentJson.length}件）`);
  };
  btnUse.onclick = () => {
    if (!currentJson) {
      try { currentJson = JSON.parse(ta.value); } catch(e) { alert("JSONの形式が不正です"); return; }
    }
    setConfig({auto:true, delay:600, limit:0});
    startQuiz(currentJson);
  };
  btnDl.onclick = () => {
    if (!currentJson) { alert("先にCSVを変換してください"); return; }
    const blob = new Blob([JSON.stringify(currentJson,null,2)], {type:"application/json"});
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "questions.json";
    a.click();
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
      answer: row[idx("answer_abcd")] || "",
      explanation: row.indexOf("explanation")>=0 ? row[idx("explanation")] : ""
    };
    out.push(obj);
  }
  return out;
}

// naive CSV split (no quotes support). For safety, try to handle simple quotes.
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
