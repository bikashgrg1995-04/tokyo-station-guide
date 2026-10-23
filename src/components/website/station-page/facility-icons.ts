/** Outline icons for facilities that use a built-in icon name instead of an uploaded file. */
export const FACILITY_LINE_ICONS: Record<string, string> = {
  lockers: "M5 3.5h14v17H5zM12 3.5v17M9 10v1.5M15 10v1.5M5 12h14",
  storage: "M7 7h10a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2zM9.5 7V5h5v2M9 11v6M15 11v6",
  forwarding: "M4 6h11v11H4zM15 11.5h5M17.5 9l2.5 2.5-2.5 2.5",
  tickets: "M4 8a2 2 0 0 1 0 4 2 2 0 0 1 0 4v1h16v-1a2 2 0 0 1 0-4 2 2 0 0 1 0-4V7H4zM13 7v10",
  railpass: "M3 6h18v12H3zM3 10h18M6 15h4",
  info: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 11v5.5M12 7.8v.1",
  elevator: "M6 3h12v18H6zM12 7l-2.2 2.5h4.4zM12 17l-2.2-2.5h4.4z",
  escalator: "M3 19h4l9-12h5M13 19h8",
  accessible: "M12 4.5a1.5 1.5 0 1 0 0 .1M12 8v5h4l2 5M9 11.5A5 5 0 1 0 15.5 18",
  toilets: "M8 4.5a1.5 1.5 0 1 0 0 .1M5.5 9h5l.5 6H9.5L9 20H7l-.5-5H5zM16 4.5a1.5 1.5 0 1 0 0 .1M16 9v11M13.5 9h5",
  baby: "M12 21a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM9 11v.1M15 11v.1M9.5 15c.7.8 1.5 1.2 2.5 1.2s1.8-.4 2.5-1.2",
  atm: "M4 5h16v14H4zM9.5 9l2.5 3 2.5-3M12 12v4M10 14h4",
  exchange: "M5 8h13M14 4l4 4-4 4M19 16H6M10 12l-4 4 4 4",
  wifi: "M2.5 9a14 14 0 0 1 19 0M5.5 12.5a9.5 9.5 0 0 1 13 0M8.5 16a5 5 0 0 1 7 0M12 19.5v.1",
  store: "M4 9l1.5-5h13L20 9M4 9v11h16V9M4 9a2.5 2.5 0 0 0 5 0 2.5 2.5 0 0 0 5 0 2.5 2.5 0 0 0 5 0M10 20v-6h4v6",
  police: "M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6zM12 8v5M12 15.5v.1",
  taxi: "M5 15l1.6-5.2A2 2 0 0 1 8.5 8.4h7a2 2 0 0 1 1.9 1.4L19 15M4 15h16v4H4zM7 19v1.5M17 19v1.5M7.5 17h.1M16.5 17h.1M10.5 8.4V6.5h3v1.9",
  bus: "M6 4h12a2 2 0 0 1 2 2v10H4V6a2 2 0 0 1 2-2zM4 11h16M7 16v3M17 16v3M7.5 13.5h.1M16.5 13.5h.1",
  shinkansen: "M3 16c0-4 4-7 9-7h8l1 3v4zM3 16h18M9 19l-1 2M16 19l1 2",
  airport: "M21 15l-8-5V4.5a1.5 1.5 0 0 0-3 0V10l-8 5v2l8-2v4l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-4l8 2z",
  pin: "M12 21s-6-5.6-6-10.5A6 6 0 0 1 18 10.5C18 15.4 12 21 12 21zM12 12.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4z",
};

const RULES: [RegExp, string][] = [
  [/locker/, "lockers"],
  [/forward/, "forwarding"],
  [/storage|luggage|baggage/, "storage"],
  [/rail.?pass|jr.?pass/, "railpass"],
  [/ticket/, "tickets"],
  [/info|tourist/, "info"],
  [/elevator|lift/, "elevator"],
  [/escalator/, "escalator"],
  [/accessible|wheelchair|barrier/, "accessible"],
  [/toilet|restroom|washroom/, "toilets"],
  [/baby|nursing/, "baby"],
  [/atm/, "atm"],
  [/exchange/, "exchange"],
  [/wi.?fi/, "wifi"],
  [/store|shop|conveni/, "store"],
  [/police/, "police"],
  [/taxi/, "taxi"],
  [/bus/, "bus"],
  [/shinkansen/, "shinkansen"],
  [/airport/, "airport"],
];

/** Pick an outline icon from the icon name, slug or facility name. */
export function lineIconFor(icon: string | null, slug: string, name: string): string {
  const direct = (icon ?? "").trim().toLowerCase();
  if (FACILITY_LINE_ICONS[direct]) return direct;

  const hay = [direct, slug, name].join(" ").toLowerCase();
  return RULES.find(([re]) => re.test(hay))?.[1] ?? "pin";
}

/** Section a facility chip jumps to: taxi/bus, Shinkansen, airport, otherwise Facilities. */
export function facilityTarget(icon: string | null, slug: string, name: string): string {
  switch (lineIconFor(icon, slug, name)) {
    case "taxi":
    case "bus":
      return "taxi";
    case "shinkansen":
      return "lines";
    case "airport":
      return "getting";
    default:
      return "facilities";
  }
}
