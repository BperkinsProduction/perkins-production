import { phone } from "./contact.js";

// The four numbers in the steady strip. `value` is shown and is what the counter animates to,
// `from` is an optional start value, `dec` is the number of decimals shown.
export const facts = [
  { value: "4.7", dec: "1", label: "stars across about 712 Google reviews" },
  { value: "3", label: "languages spoken: English, Spanish and Portuguese" },
  { value: "2", label: "offices, 1 phone number" },
  { value: "2003", from: "1990", label: "Here since 2003" },
];

// The same-day emergency line under the facts.
export const emergency = {
  text: "Toothache, a broken tooth, or a crown that came off? Same-day appointments are often available. Call",
  phoneHref: `tel:${phone.tel}`,
  phoneLabel: phone.display,
};
