// Footer content: contact block, social and payment links, office columns and page links.
import { phone, email, fax, payUrl } from "./contact.js";
import { offices as officeList } from "./offices.js";

export const contact = {
  phone: { label: phone.display, href: `tel:${phone.tel}` },
  email,
  fax,
};

// External links in the first column, separated by spaces in the markup.
export const social = [
  { label: "Instagram", href: "https://www.instagram.com/robinwooddental/" },
  { label: "Facebook", href: "https://www.facebook.com/robinwooddental/" },
  { label: "Pay online", href: payUrl },
];

// Each office column: street and town lines, then the short form of its hours. Middletown first.
const byKey = Object.fromEntries(officeList.map((o) => [o.key, o]));
export const offices = ["middletown", "hagerstown"].map((k) => {
  const o = byKey[k];
  return { name: o.name, address: [o.address[0], o.address[o.address.length - 1]], hours: o.hours.map((h) => `${h.short} ${h.time}`) };
});

// The "Visit" column: links to sections on this page.
export const visitLinks = [
  { label: "Your first visit", href: "#first-visit" },
  { label: "Dentists", href: "#dentists" },
  { label: "Services", href: "#services" },
  { label: "Questions", href: "#questions" },
  { label: "Book a visit", href: "#book" },
];
