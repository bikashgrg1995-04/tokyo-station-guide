// Admin panel: texts that contain numbers or other changing parts.
// Each rule returns the Japanese text, or null when it does not apply.

import { ADMIN_JA } from "./dictionary";

const look = (text: string): string | null => ADMIN_JA[text] ?? null;

/** "Stations" → "駅", "Top Picks" → "おすすめスポット" … (for counters) */
const NOUN: Record<string, string> = {
  Stations: "駅",
  Lines: "路線",
  Operators: "運営会社",
  Facilities: "設備",
  "Top Picks": "おすすめ",
  "Featured Stations": "注目の駅",
  Floors: "フロア",
  Exits: "出口",
  Platforms: "ホーム",
  Suggestions: "ご提案",
  "Line Stations": "路線の駅",
};

/** "Japanese description" → 説明（日本語） etc., used by "X must be N characters or less." */
function subject(text: string): string | null {
  const direct =
    look(text) ?? look(text.charAt(0).toUpperCase() + text.slice(1));
  if (direct) return direct;

  const jp = /^japanese (.+)$/i.exec(text);
  if (jp) {
    const base = subject(jp[1]);
    return base ? `${base}（日本語）` : null;
  }

  return null;
}

type Rule = (text: string) => string | null;

export const ADMIN_PATTERNS: Rule[] = [
  // "50 • Total Stations"
  (t) => {
    const m = /^([\d,]+)\s*[•·]\s*Total (.+)$/.exec(t);
    return m && NOUN[m[2]] ? `${m[1]}件 • ${NOUN[m[2]]}の合計` : null;
  },
  // "Page 2 of 5"
  (t) => {
    const m = /^Page (\d+) of (\d+)$/.exec(t);
    return m ? `${m[1]} / ${m[2]} ページ` : null;
  },
  // "Showing 1–10 of 50"
  (t) => {
    const m = /^Showing ([\d–-]+) of (\d+)$/.exec(t);
    return m ? `${m[2]}件中 ${m[1]}件を表示` : null;
  },
  // "3 exits selected" / "2 facilities selected"
  (t) => {
    const m = /^(\d+) (exits?|facilit(?:y|ies)|stations?|floors?) selected$/.exec(t);
    if (!m) return null;
    const noun = m[2].startsWith("exit")
      ? "出口"
      : m[2].startsWith("facilit")
        ? "設備"
        : m[2].startsWith("station")
          ? "駅"
          : "フロア";
    return `${noun}を${m[1]}件選択中`;
  },
  // "5 new"
  (t) => {
    const m = /^(\d+) new$/.exec(t);
    return m ? `新着 ${m[1]}件` : null;
  },
  // "View all suggestions (12) →"
  (t) => {
    const m = /^View all suggestions \((\d+)\) →$/.exec(t);
    return m ? `すべてのご提案を見る（${m[1]}件）→` : null;
  },
  // "View resolved ones"
  (t) => {
    const m = /^View (resolved|approved|dismissed|new) ones$/i.exec(t);
    const map: Record<string, string> = {
      resolved: "対応済み",
      approved: "対応済み",
      dismissed: "却下済み",
      new: "新着",
    };
    return m ? `${map[m[1].toLowerCase()]}のご提案を見る` : null;
  },
  // "Name must be 150 characters or less."
  (t) => {
    const m = /^(.+) must be (\d+) characters or less\.$/.exec(t);
    if (!m) return null;
    const subj = subject(m[1]);
    return subj ? `${subj}は${m[2]}文字以内にしてください。` : null;
  },
  // "Name is required."
  (t) => {
    const m = /^(.+) is required\.$/.exec(t);
    const subj = m && subject(m[1]);
    return subj ? `${subj}は必須です。` : null;
  },
  // lone full stop after a bold name: "…for <b>Tokyo</b>."
  (t) => (t === "." ? "。" : null),
  (t) => (t === ")" || t === "(" ? null : null),
];
