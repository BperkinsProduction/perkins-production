import { offices as officeList } from "./offices.js";

// Booking walkthrough data. Offices render in Book.astro; DOCS and HOURS are read by src/scripts/booking.js.
export const offices = [
  { v: "hagerstown", name: "Hagerstown", note: "West of the mountain. Robinwood Professional Center." },
  { v: "middletown", name: "Middletown", note: "East of the mountain. On the old National Pike." },
];

// Dentist choices: [name, description].
export const DOCS = [["First available", "Soonest time with any dentist"], ["Dr. Horman", "Owner, orthodontics"], ["Dr. Appleton", "General dentistry"], ["Dr. Cho", "General dentistry"], ["Dr. Bandeff", "Extractions, implants, cosmetic"], ["Dr. Saeed Tofigh", "Oral surgeon"], ["Dr. Lizardo", "General dentistry"], ["Dr. Love", "General dentistry"], ["Dr. Lozon", "Dentist"], ["Dr. Mistry", "Dentist"], ["Dr. Mohammed Tofigh", "Dentist"], ["Dr. Vellore", "Dentist"]];

// Office hours as [open, close] on a 24 hour clock, taken from offices.js.
export const HOURS = Object.fromEntries(officeList.map((o) => [o.key, o.open]));
