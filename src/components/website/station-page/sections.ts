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
  { id: "sides", title: "Sides of the station", icon: "map" },
  { id: "lines", title: "Train lines", icon: "train" },
  { id: "getting", title: "Getting there", icon: "access" },
  { id: "tips", title: "Exits & station tips", icon: "exits" },
  { id: "facilities", title: "Facilities", icon: "facility" },
  { id: "taxi", title: "Buses & taxis", icon: "taxi" },
  { id: "things", title: "Things to do", icon: "star" },
  { id: "food", title: "Restaurants", icon: "food" },
  { id: "hotels", title: "Hotels", icon: "hotel" },
  { id: "trips", title: "Day trips", icon: "walk" },
  { id: "visit", title: "When to visit", icon: "clock" },
  { id: "practical", title: "Practical tips", icon: "info" },
  { id: "faq", title: "FAQ", icon: "faq" },
  { id: "along", title: "Along the line", icon: "pin" },
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
  sides: "M4 5h6v14H4zM14 5h6v14h-6z",
  trips: "M3 19l6-10 4 6 3-4 5 8zM15.5 7.5a1.5 1.5 0 1 0 0 .1",
  calendar: "M5 5h14v15H5zM5 10h14M9 3v4M15 3v4",
  checks: "M4.5 6.5l1.5 1.5L9 5M4.5 13l1.5 1.5L9 11.5M12 6.5h8M12 13h8M4.5 19.5h15",
  route: "M3 12h18M6.5 12a1.8 1.8 0 1 0 0 .1M17.5 12a1.8 1.8 0 1 0 0 .1",
  taxi: "M5 15l1.6-5.2A2 2 0 0 1 8.5 8.4h7a2 2 0 0 1 1.9 1.4L19 15M4 15h16v4H4zM7 19v1.5M17 19v1.5M7.5 17h.1M16.5 17h.1M10.5 8.4V6.5h3v1.9",
  lockers: "M5 3.5h14v17H5zM12 3.5v17M9 10v1.5M15 10v1.5M5 12h14",
  access: "M6 5.5a2.5 2.5 0 1 0 0 .1M18 18.5a2.5 2.5 0 1 0 0 .1M8.5 5.5H15a3 3 0 0 1 0 6H9a3 3 0 0 0 0 6h6.5",
  exits: "M4 4.5h8M4 19.5h8M4 4.5v15M20 12H10M16.5 8.5L20 12l-3.5 3.5",
};

/** The eight buttons under the main photo: label key, target section, icon. */
export const QUICK_LINKS = [
  { key: "exit", target: "exit", icon: "exits", title: "Exits" },
  { key: "lockers", target: "facilities", icon: "lockers", title: "Lockers" },
  { key: "lines", target: "lines", icon: "train", title: "Train lines" },
  { key: "access", target: "getting", icon: "access", title: "Access" },
  { key: "taxi", target: "taxi", icon: "taxi", title: "Taxi & bus" },
  { key: "eat", target: "food", icon: "food", title: "Eat" },
  { key: "hotels", target: "hotels", icon: "hotel", title: "Hotels" },
  { key: "things", target: "things", icon: "pin", title: "Things to do" },
];
