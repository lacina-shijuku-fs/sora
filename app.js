/* ============================================================
   探求テーマ発見ワークシート - 共通ロジック
   ============================================================ */

/* ▼▼▼ 先生が設定する部分（Googleスプレッドシートと連携する） ▼▼▼
   1. 集計用のGoogleスプレッドシートを新規作成し、シートを3枚用意する：
      「生徒名簿」（1行目見出し: 名前, パスワード）
      「回答」（1行目見出し: 名前, 学年, 日付, タイムスタンプ, ScoreA, ScoreB, ScoreC,
               ScoreD, ScoreE, ScoreF, キーワード, 深掘りキーワード, どこが気になる,
               自分との接点, もっと知りたいこと, 問い1, 問い2, 問い3, チェックリスト,
               調べ方, 最初の一歩, サマリー）
      「スタッフ設定」（A1に見出し、A2にスタッフ共通パスワードを入力）
   2. 拡張機能 → Apps Script を開き、gas/Code.gs の内容を貼り付けて保存
   3. 「デプロイ」→「新しいデプロイ」→種類「ウェブアプリ」、
      実行ユーザー「自分」、アクセスできるユーザー「全員」で公開する
   4. 発行されたURL（.../exec）を下の GAS_API.webAppUrl に貼り付ける
   詳しい手順は README.md を参照。設定しない場合はログイン・提出が動作しません。
   ================================================================= */
const GAS_API = {
  webAppUrl: "https://script.google.com/macros/s/AKfycbyuAmDJ7XR1ZSswUWyIUKhryPo2_SCiCl4nYyCFFmeZ_4XhZHGVmcGUUWZp-k2j6nGaaQ/exec"
};

async function apiCall(action, payload) {
  if (!GAS_API.webAppUrl) {
    return { ok: false, error: "GAS_API.webAppUrl が未設定です（app.js）" };
  }
  try {
    const res = await fetch(GAS_API.webAppUrl, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ action, payload })
    });
    return await res.json();
  } catch (err) {
    return { ok: false, error: "通信エラー：" + err.message };
  }
}

const AUTH_KEY_STUDENT = "tankyuAuthStudent";
const AUTH_KEY_STAFF = "tankyuAuthStaff";

function getStudentAuth() {
  try { return JSON.parse(sessionStorage.getItem(AUTH_KEY_STUDENT)); } catch (e) { return null; }
}

function getStaffAuth() {
  try { return JSON.parse(sessionStorage.getItem(AUTH_KEY_STAFF)); } catch (e) { return null; }
}

function requireStudentAuth() {
  const auth = getStudentAuth();
  if (!auth) { goTo("login.html"); return null; }
  return auth;
}

function requireStaffAuth() {
  const auth = getStaffAuth();
  if (!auth) { goTo("login.html"); return null; }
  return auth;
}

function logout() {
  sessionStorage.removeItem(AUTH_KEY_STUDENT);
  sessionStorage.removeItem(AUTH_KEY_STAFF);
  goTo("login.html");
}

const STORAGE_KEY = "tankyuThemeWorksheet_v1";

const CATEGORIES = [
  { key: "A", name: "人・社会", color: "#ef4444", desc: "人の考え方、社会、ルール、困りごと",
    keywords: ["友だち","家族","学校","SNS","ジェンダー","ルール","差別","流行","心理","働き方","教育","地域"] },
  { key: "B", name: "自然・生命", color: "#22c55e", desc: "生き物、体、地球、環境、実験",
    keywords: ["動物","植物","人体","睡眠","食事","宇宙","天気","災害","海","森林","気候変動","実験"] },
  { key: "C", name: "技術・しくみ", color: "#3b82f6", desc: "機械、データ、仕組み、ものづくり",
    keywords: ["AI","ゲーム","スマホ","プログラミング","ロボット","交通","建築","データ","発明","安全","便利さ","仕組み"] },
  { key: "D", name: "表現・文化", color: "#a855f7", desc: "作品、言葉、表現、流行、創作",
    keywords: ["音楽","映画","マンガ","アニメ","本","広告","デザイン","言葉","外国語","ファッション","写真","創作"] },
  { key: "E", name: "歴史・地域", color: "#f59e0b", desc: "歴史、地域、文化財、世界の文化",
    keywords: ["歴史","戦争","昔の暮らし","遺跡","文化財","祭り","地元","観光","世界の文化","食文化","伝統","移住"] },
  { key: "F", name: "生活・未来", color: "#06b6d4", desc: "生活、仕事、商品、未来、改善",
    keywords: ["食","服","家","お金","仕事","買い物","健康","学校生活","まちづくり","環境","未来","サービス"] }
];

const CAT_ORDER = ["A","B","C","D","E","F"];

// 30問（カテゴリはA,B,C,D,E,F の順で繰り返す）
const QUESTION_TEXTS = [
  "人が「なぜそう考えたり、行動したりするのか」が気になる。",
  "生き物や人の体、健康のしくみを知るのが好きだ。",
  "スマホ、ゲーム、機械、アプリなどが「どう動いているか」気になる。",
  "音楽、映画、マンガ、絵、デザインなどの作品を見る・つくるのが好きだ。",
  "昔の人がどんな暮らしをしていたのか想像するのが好きだ。",
  "身近な「不便」や「もっとこうなればいいのに」に気づくことがある。",
  "学校や社会のルールを見て、「なぜこの決まりがあるんだろう」と思うことがある。",
  "天気、宇宙、地球、災害などの自然現象が気になる。",
  "複雑な問題を、順番に分けて考えるのが好きだ。",
  "作品のセリフ・色・音・構成など、「表現の工夫」に気づくことがある。",
  "自分の住む地域や、ほかの地域の特徴・違いが気になる。",
  "お金、仕事、買い物、商品やサービスのしくみが気になる。",
  "同じ出来事でも、人によって意見が違う理由を知りたい。",
  "動物や植物を観察したり、変化を記録したりするのが好きだ。",
  "数字やデータを比べて、「何か傾向がないか」探すのが好きだ。",
  "言葉、外国語、方言、ことばづかいの違いが気になる。",
  "遺跡、古い建物、文化財、昔の道具を見ると気になる。",
  "食べ物、服、住まいなど、毎日の生活の工夫に興味がある。",
  "ニュースを見ると、人や社会に関わる問題の背景を知りたくなる。",
  "環境問題や気候変動が「なぜ起こるのか」を知りたい。",
  "新しい道具やサービスを見ると、「どういう工夫でできているんだろう」と思う。",
  "自分で文章、絵、動画、音楽、作品などをつくって表現するのが好きだ。",
  "今の暮らしと昔の暮らしを比べるのが面白いと思う。",
  "これからの社会や未来の暮らしがどう変わるのか気になる。",
  "誰かが困っていると、「どうすれば少しよくできるだろう」と考えることがある。",
  "実験や観察をして、自分で確かめてみたいと思うことがある。",
  "ものごとをもっと便利・安全・効率的にする方法を考えるのが好きだ。",
  "流行しているものを見ると、「なぜ人気なんだろう」と考える。",
  "世界の文化や習慣の違いを知るのが好きだ。",
  "学校生活や日常生活を、もっと過ごしやすくするアイデアを考えてみたい。"
];

const QUESTIONS = QUESTION_TEXTS.map((text, i) => ({
  id: i + 1,
  text,
  cat: CAT_ORDER[i % 6]
}));

const QUESTION_TYPES = [
  "なぜ、〜なのだろう？",
  "〜によって、どのような違いがあるのだろう？",
  "〜は、どのように変わってきたのだろう？",
  "〜すると、何が起こるのだろう？",
  "〜は、人や社会にどんな影響を与えているのだろう？",
  "〜をもっとよくするには、どんな方法があるだろう？",
  "〜と〜には、どんな共通点・違いがあるだろう？"
];

const RESEARCH_METHODS = ["本・資料","Web","アンケート","インタビュー","観察","実験","その他"];

const CHECKLIST_ITEMS = [
  "自分が本当に少しでも「知りたい」と思える。",
  "調べれば一言で終わる問いではなく、比べたり考えたりできそうだ。",
  "本・インターネット・アンケート・観察・インタビューなど、確かめる方法がありそうだ。",
  "学校の探究期間の中で、広すぎず取り組めそうだ。"
];

const STEP_LABELS = ["はじめに","STEP1 直感チェック","STEP2 興味の方向","STEP3 キーワード","STEP4 掘り下げ","STEP5 問いづくり","STEP6 仕上げ"];

/* ============================================================
   小学生向け（探究テーマ発見ワークシート・小学生版）
   ============================================================ */

const ES_CATEGORIES = [
  { key: "A", name: "人・社会", color: "#ef4444", desc: "人の気もち、ルール、学校",
    keywords: ["友だち","家族","学校","ルール","気もち","なかよくする方法"] },
  { key: "B", name: "自然・生きもの", color: "#22c55e", desc: "生きもの、体、天気、宇宙",
    keywords: ["動物","虫","植物","人の体","ねむり","宇宙","天気","海"] },
  { key: "C", name: "技術・しくみ", color: "#3b82f6", desc: "きかい、ゲーム、ものづくり",
    keywords: ["ゲーム","ロボット","スマホ","AI","電車・車","たてもの","プログラミング"] },
  { key: "D", name: "表現・文化", color: "#a855f7", desc: "絵、マンガ、音楽、ことば",
    keywords: ["絵","マンガ","アニメ","音楽","本","ことば","外国語","ダンス"] },
  { key: "E", name: "歴史・地域", color: "#f59e0b", desc: "むかし、自分の町、世界の国",
    keywords: ["むかしのくらし","お城","おまつり","わたしの町","世界の国"] },
  { key: "F", name: "生活・みらい", color: "#06b6d4", desc: "食べもの、服、お店、お金",
    keywords: ["食べもの","おかし","服","おうち","お金","お店","しごと","みらい"] }
];

// 12問（カテゴリはA,B,C,D,E,F の順で繰り返す）
const ES_QUESTION_TEXTS = [
  "人が「どうしてそうしたのかな？」と気になることがある。",
  "生きものや、人の体のしくみを知るのがすき。",
  "ゲームやきかいが「どうやって動いているのか」気になる。",
  "絵・マンガ・音楽・動画を見たり、つくったりするのがすき。",
  "むかしの人のくらしを想像するのがすき。",
  "「もっとこうなったらべんりなのに」と思うことがある。",
  "学校やみんなのルールを見て「どうしてこの決まりがあるの？」と思う。",
  "天気・宇宙・地球のふしぎが気になる。",
  "ものをつくったり、組み立てたりするのがすき。",
  "ことば・外国語・方言のちがいがおもしろい。",
  "自分の住んでいる町や、ほかの国のことが気になる。",
  "食べもの・服・お店・お金のしくみが気になる。"
];

const ES_QUESTIONS = ES_QUESTION_TEXTS.map((text, i) => ({
  id: i + 1,
  text,
  cat: CAT_ORDER[i % 6]
}));

const ES_STEP_LABELS = ["はじめに","STEP1 気になるチェック","STEP2 グループをかぞえよう","STEP3 ことばをあつめよう","STEP4 じぶんの気になるに"];

const ES_STORAGE_KEY = "tankyuThemeWorksheetES_v1";

function esDefaultState() {
  return {
    profile: { name: "", grade: "", date: "" },
    answers: {},
    scores: null,
    keywords: { A: [], B: [], C: [], D: [], E: [], F: [] },
    customKeywords: { A: "", B: "", C: "", D: "", E: "", F: "" },
    step4: { keyword: "", curious: "", connection: "", wantToKnow: "" }
  };
}

function esLoadState() {
  try {
    const raw = localStorage.getItem(ES_STORAGE_KEY);
    if (!raw) return esDefaultState();
    return Object.assign(esDefaultState(), JSON.parse(raw));
  } catch (e) {
    return esDefaultState();
  }
}

function esSaveState(state) {
  localStorage.setItem(ES_STORAGE_KEY, JSON.stringify(state));
}

function esResetState() {
  localStorage.removeItem(ES_STORAGE_KEY);
}

function esComputeScores(answers) {
  const scores = { A: 0, B: 0, C: 0, D: 0, E: 0, F: 0 };
  ES_QUESTIONS.forEach(q => {
    scores[q.cat] += Number(answers[q.id]) || 0;
  });
  return scores;
}

function esCategoryByKey(key) {
  return ES_CATEGORIES.find(c => c.key === key);
}

function esCatLabel(key) {
  return `${key} ${esCategoryByKey(key).name}`;
}

function buildSummaryTextES(state) {
  const s = state;
  const scoreLines = CAT_ORDER
    .map(k => `  ${esCategoryByKey(k).name}：${s.scores ? s.scores[k] : "-"} / 10`)
    .join("\n");
  const kwLines = CAT_ORDER
    .map(k => {
      const list = (s.keywords[k] || []).concat(s.customKeywords[k] ? [s.customKeywords[k]] : []);
      return list.length ? `  ${esCategoryByKey(k).name}：${list.join("、")}` : null;
    })
    .filter(Boolean)
    .join("\n");

  return [
    `探究テーマ発見ワークシート（小学生版） 結果`,
    `名前：${s.profile.name || "(未記入)"}　学年：${s.profile.grade || "-"}　日付：${s.profile.date || "-"}`,
    ``,
    `【グループごとの「はい」の数】`,
    scoreLines,
    ``,
    `【気になったことば】`,
    kwLines || "  （未選択）",
    ``,
    `【えらんだことば】${s.step4.keyword || "(未記入)"}`,
    `  どこが気になる？：${s.step4.curious || "-"}`,
    `  自分とのつながりは？：${s.step4.connection || "-"}`,
    `  もっと知りたいこと：${s.step4.wantToKnow || "-"}`
  ].join("\n");
}

function buildRecordES(state) {
  const s = state;
  const kwAll = CAT_ORDER
    .flatMap(k => (s.keywords[k] || []).concat(s.customKeywords[k] ? [s.customKeywords[k]] : []))
    .join("、");

  return {
    "名前": s.profile.name,
    "学年": s.profile.grade,
    "日付": s.profile.date,
    "タイムスタンプ": new Date().toISOString(),
    "トラック": "小学生",
    "ScoreA": s.scores ? s.scores.A : "",
    "ScoreB": s.scores ? s.scores.B : "",
    "ScoreC": s.scores ? s.scores.C : "",
    "ScoreD": s.scores ? s.scores.D : "",
    "ScoreE": s.scores ? s.scores.E : "",
    "ScoreF": s.scores ? s.scores.F : "",
    "キーワード": kwAll,
    "深掘りキーワード": s.step4.keyword,
    "どこが気になる": s.step4.curious,
    "自分との接点": s.step4.connection,
    "もっと知りたいこと": s.step4.wantToKnow,
    "問い1": "", "問い2": "", "問い3": "",
    "チェックリスト": "",
    "調べ方": "",
    "最初の一歩": "",
    "サマリー": buildSummaryTextES(s)
  };
}

async function submitAnswerES(auth, state) {
  return apiCall("submit_answer", {
    name: auth.name,
    password: auth.password,
    record: buildRecordES(state)
  });
}

/* ---------------- state ---------------- */

function defaultState() {
  return {
    profile: { name: "", grade: "", date: "" },
    answers: {},        // { "1": 1-5, ... }
    scores: null,        // { A: n, ... }
    reflections: { sure: "", surprising: "", combo: "" },
    keywords: { A: [], B: [], C: [], D: [], E: [], F: [] },
    customKeywords: { A: "", B: "", C: "", D: "", E: "", F: "" },
    step4: { keyword: "", curious: "", connection: "", wantToKnow: "" },
    step5: { questions: ["", "", ""] },
    step6: { checklist: [false, false, false, false], methods: [], firstAction: "" }
  };
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw);
    return Object.assign(defaultState(), parsed);
  } catch (e) {
    return defaultState();
  }
}

function saveState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function resetState() {
  localStorage.removeItem(STORAGE_KEY);
}

function computeScores(answers) {
  const scores = { A: 0, B: 0, C: 0, D: 0, E: 0, F: 0 };
  QUESTIONS.forEach(q => {
    const v = Number(answers[q.id]) || 0;
    scores[q.cat] += v;
  });
  return scores;
}

function categoryByKey(key) {
  return CATEGORIES.find(c => c.key === key);
}

function catLabel(key) {
  return `${key} ${categoryByKey(key).name}`;
}

function topCategories(scores, n) {
  return CAT_ORDER
    .map(k => ({ key: k, score: scores[k] }))
    .sort((a, b) => b.score - a.score)
    .slice(0, n);
}

/* ---------------- shared UI: header / nav ---------------- */

function renderHeader(activeIndex, opts) {
  opts = opts || {};
  const labels = opts.labels || STEP_LABELS;
  const total = opts.total !== undefined ? opts.total : labels.length - 1;
  const el = document.getElementById("app-header");
  if (!el) return;
  const pct = Math.round((activeIndex / total) * 100);
  el.innerHTML = `
    <div class="header-inner">
      <h1 class="app-title">探求テーマ発見ワークシート</h1>
      <div class="progress-track">
        <div class="progress-fill" style="width:${pct}%"></div>
      </div>
      <div class="progress-label">${labels[activeIndex]}（${activeIndex}/${total}）</div>
    </div>`;
}

function navButtons(containerId, opts) {
  const el = document.getElementById(containerId);
  if (!el) return;
  let html = '<div class="nav-row">';
  if (opts.prevHref) {
    html += `<a class="btn btn-ghost" href="${opts.prevHref}">← もどる</a>`;
  } else {
    html += `<span></span>`;
  }
  if (opts.nextLabel) {
    html += `<button type="button" id="nav-next-btn" class="btn btn-primary">${opts.nextLabel}</button>`;
  }
  html += "</div>";
  el.innerHTML = html;
  if (opts.onNext) {
    document.getElementById("nav-next-btn").addEventListener("click", opts.onNext);
  }
}

function goTo(href) {
  window.location.href = href;
}

/* ---------------- hexagon (radar) chart ---------------- */

function renderHexagon(containerEl, scores, opts) {
  opts = opts || {};
  const categories = opts.categories || CATEGORIES;
  const catByKey = key => categories.find(c => c.key === key);
  const size = opts.size || 320;
  const cx = size / 2, cy = size / 2;
  const maxVal = opts.maxVal || 25;
  const radius = size * 0.36;
  const labelRadius = radius + 34;
  const rings = 5;

  const angleFor = i => (Math.PI * 2 * i) / 6 - Math.PI / 2;

  function pt(i, value) {
    const r = (value / maxVal) * radius;
    const a = angleFor(i);
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  }

  const pad = 68;
  let svg = `<svg viewBox="${-pad} ${-pad} ${size + pad * 2} ${size + pad * 2}" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">`;

  // grid rings
  for (let ring = 1; ring <= rings; ring++) {
    const ringVal = (maxVal / rings) * ring;
    const pts = CAT_ORDER.map((_, i) => pt(i, ringVal).join(",")).join(" ");
    svg += `<polygon points="${pts}" fill="none" stroke="#e2e8f0" stroke-width="1"/>`;
  }
  // axes
  CAT_ORDER.forEach((_, i) => {
    const [x, y] = pt(i, maxVal);
    svg += `<line x1="${cx}" y1="${cy}" x2="${x}" y2="${y}" stroke="#e2e8f0" stroke-width="1"/>`;
  });
  // data polygon
  const dataPts = CAT_ORDER.map((k, i) => pt(i, scores[k]).join(",")).join(" ");
  svg += `<polygon points="${dataPts}" fill="rgba(185,166,247,0.4)" stroke="#8874d6" stroke-width="2.5"/>`;
  // data points
  CAT_ORDER.forEach((k, i) => {
    const [x, y] = pt(i, scores[k]);
    const cat = catByKey(k);
    svg += `<circle cx="${x}" cy="${y}" r="4.5" fill="${cat.color}" stroke="#fff" stroke-width="1.5"/>`;
  });
  // labels
  CAT_ORDER.forEach((k, i) => {
    const a = angleFor(i);
    const x = cx + labelRadius * Math.cos(a);
    const y = cy + labelRadius * Math.sin(a);
    const cat = catByKey(k);
    const anchor = Math.cos(a) > 0.3 ? "start" : Math.cos(a) < -0.3 ? "end" : "middle";
    svg += `<text x="${x}" y="${y - 6}" text-anchor="${anchor}" font-size="13" font-weight="700" fill="${cat.color}">${k} ${cat.name}</text>`;
    svg += `<text x="${x}" y="${y + 10}" text-anchor="${anchor}" font-size="12" fill="#475569">${scores[k]} / ${maxVal}</text>`;
  });

  svg += "</svg>";
  containerEl.innerHTML = svg;
}

/* ---------------- final submit ---------------- */

function buildSummaryText(state) {
  const s = state;
  const scoreLines = CAT_ORDER
    .map(k => `  ${categoryByKey(k).name}：${s.scores ? s.scores[k] : "-"} / 25`)
    .join("\n");
  const kwLines = CAT_ORDER
    .map(k => {
      const list = (s.keywords[k] || []).concat(s.customKeywords[k] ? [s.customKeywords[k]] : []);
      return list.length ? `  ${categoryByKey(k).name}：${list.join("、")}` : null;
    })
    .filter(Boolean)
    .join("\n");
  const questions = s.step5.questions.filter(q => q.trim()).map((q, i) => `  ${i + 1}. ${q}`).join("\n");

  return [
    `探求テーマ発見ワークシート 結果`,
    `名前：${s.profile.name || "(未記入)"}　学年：${s.profile.grade || "-"}　日付：${s.profile.date || "-"}`,
    ``,
    `【興味の方向スコア】`,
    scoreLines,
    ``,
    `【気になったキーワード】`,
    kwLines || "  （未選択）",
    ``,
    `【掘り下げたキーワード】${s.step4.keyword || "(未記入)"}`,
    `  どこが気になる？：${s.step4.curious || "-"}`,
    `  自分との接点は？：${s.step4.connection || "-"}`,
    `  もっと知りたいこと：${s.step4.wantToKnow || "-"}`,
    ``,
    `【探究の問い候補】`,
    questions || "  （未記入）",
    ``,
    `【最初の一歩】`,
    `  ${s.step6.firstAction || "(未記入)"}`
  ].join("\n");
}

async function elementToPdf(element, filename) {
  const canvas = await html2canvas(element, { scale: 2, backgroundColor: "#ffffff" });
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF("p", "pt", "a4");
  const margin = 24;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const imgWidth = pageWidth - margin * 2;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;
  const imgData = canvas.toDataURL("image/png");
  const usableHeight = pageHeight - margin * 2;

  let heightLeft = imgHeight;
  let position = margin;
  doc.addImage(imgData, "PNG", margin, position, imgWidth, imgHeight);
  heightLeft -= usableHeight;

  while (heightLeft > 0) {
    position = margin - (imgHeight - heightLeft);
    doc.addPage();
    doc.addImage(imgData, "PNG", margin, position, imgWidth, imgHeight);
    heightLeft -= usableHeight;
  }

  doc.save(filename);
}

function buildRecord(state) {
  const s = state;
  const kwAll = CAT_ORDER
    .flatMap(k => (s.keywords[k] || []).concat(s.customKeywords[k] ? [s.customKeywords[k]] : []))
    .join("、");
  const checklistDone = s.step6.checklist
    .map((checked, i) => (checked ? CHECKLIST_ITEMS[i] : null))
    .filter(Boolean)
    .join("、");

  return {
    "名前": s.profile.name,
    "学年": s.profile.grade,
    "日付": s.profile.date,
    "タイムスタンプ": new Date().toISOString(),
    "トラック": "中高生",
    "ScoreA": s.scores ? s.scores.A : "",
    "ScoreB": s.scores ? s.scores.B : "",
    "ScoreC": s.scores ? s.scores.C : "",
    "ScoreD": s.scores ? s.scores.D : "",
    "ScoreE": s.scores ? s.scores.E : "",
    "ScoreF": s.scores ? s.scores.F : "",
    "キーワード": kwAll,
    "深掘りキーワード": s.step4.keyword,
    "どこが気になる": s.step4.curious,
    "自分との接点": s.step4.connection,
    "もっと知りたいこと": s.step4.wantToKnow,
    "問い1": s.step5.questions[0] || "",
    "問い2": s.step5.questions[1] || "",
    "問い3": s.step5.questions[2] || "",
    "チェックリスト": checklistDone,
    "調べ方": s.step6.methods.join("、"),
    "最初の一歩": s.step6.firstAction,
    "サマリー": buildSummaryText(s)
  };
}

async function submitAnswer(auth, state) {
  return apiCall("submit_answer", {
    name: auth.name,
    password: auth.password,
    record: buildRecord(state)
  });
}

function scoresFromRecord(record) {
  return {
    A: Number(record.ScoreA) || 0,
    B: Number(record.ScoreB) || 0,
    C: Number(record.ScoreC) || 0,
    D: Number(record.ScoreD) || 0,
    E: Number(record.ScoreE) || 0,
    F: Number(record.ScoreF) || 0
  };
}
