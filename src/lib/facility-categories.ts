/** Groups of facilities on the station page ("At this station"), each with its own colour. */
export const FACILITY_CATEGORIES = [
  { id: "storage", label: "Storage & lockers", labelJapanese: "荷物・ロッカー" },
  { id: "tickets", label: "Tickets & info", labelJapanese: "きっぷ・案内" },
  { id: "access", label: "Accessibility", labelJapanese: "バリアフリー" },
  { id: "shops", label: "Money & shops", labelJapanese: "両替・ショップ" },
  { id: "transport", label: "Transport", labelJapanese: "交通" },
  { id: "other", label: "Other", labelJapanese: "その他" },
] as const;

export type FacilityCategory = (typeof FACILITY_CATEGORIES)[number]["id"];

export const FACILITY_CATEGORY_IDS: string[] = FACILITY_CATEGORIES.map((c) => c.id);

export function isFacilityCategory(value: string): value is FacilityCategory {
  return FACILITY_CATEGORY_IDS.includes(value);
}
