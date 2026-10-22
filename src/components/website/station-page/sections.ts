/** The sections of every station page, in order. The table of contents is built from this list. */
export interface StationSectionDef {
  id: string;
  title: string;
  icon: string; // key of ICONS below
}

export const SECTIONS: StationSectionDef[] = [
  { id: "map", title: "Platform map", icon: "map" },
  { id: "exit", title: "Which exit?", icon: "exit" },
  { id: "overview", title: "Overview", icon: "info" },
  { id: "lines", title: "Lines & platforms", icon: "train" },
  { id: "hours", title: "Opening hours", icon: "clock" },
  { id: "access", title: "Getting around", icon: "walk" },
  { id: "facilities", title: "Facilities", icon: "facility" },
  { id: "picks", title: "Top picks", icon: "star" },
  { id: "food", title: "Restaurants", icon: "food" },
  { id: "hotels", title: "Hotels", icon: "hotel" },
  { id: "nearby", title: "Nearby stations", icon: "pin" },
  { id: "faq", title: "FAQ", icon: "faq" },
];

/** Simple outline icons (24x24, stroke). */
export const ICONS: Record<string, string> = {
  map: "M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2zM9 4v14M15 6v14",
  exit: "M10 4H5v16h5M15 8l4 4-4 4M19 12H9",
  info: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 11v5.5M12 7.8v.1",
  train: "M7 3h10a2 2 0 0 1 2 2v10a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3V5a2 2 0 0 1 2-2zM5 11h14M8 18l-2 3M16 18l2 3M9 14.5v.1M15 14.5v.1",
  clock: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2",
  walk: "M13 4.5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0zM9 21l2-6-2-2 1-5 3 2 3 1M11 15l3 2v4",
  facility: "M4 5h16v14H4zM4 10h16M10 5v14",
  star: "M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z",
  food: "M7 3v8a2 2 0 0 0 2 2v8M11 3v8a2 2 0 0 1-2 2M17 3c-2 2-2.5 5-2.5 8h2.5v10",
  hotel: "M3 20V8M3 14h18v6M21 14v-2a3 3 0 0 0-3-3h-7v5M7 11.5a1.5 1.5 0 1 0 0 .1",
  pin: "M12 21s-6-5.6-6-10.5A6 6 0 0 1 18 10.5C18 15.4 12 21 12 21zM12 12.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4z",
  faq: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM9.7 9.5a2.4 2.4 0 1 1 3.4 2.2c-.7.4-1.1.8-1.1 1.6M12 16.5v.1",
  back: "M15 5l-7 7 7 7",
};
