// JSON data embedded in the page by index.astro.

import { $ } from "./utils.js";

export const data = JSON.parse($("#transit-data").textContent);

export const searchable = JSON.parse($("#search-data").textContent);

export const featuredStations = JSON.parse(
  $("#featured-stations-data").textContent,
);
