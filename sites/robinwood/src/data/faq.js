import { phone, payUrl } from "./contact.js";

// Questions section. Each answer is an HTML string (some contain links), rendered with set:html.
export const faqs = [
  { q: "Will it hurt?", a: "For oral surgery the practice offers a range of anxiety management options, and patients describe the team as very aware of their pain level. Ask about options when you book." },
  { q: "Can I get in today?", a: `Same-day appointments are often available. Call <a href="tel:${phone.tel}">${phone.display}</a> and ask. If it is a medical emergency, call 911.` },
  { q: "Do you take my insurance?", a: "Most dental plans, and we file the claim for you: Aetna, MetLife, United Concordia, Guardian, CareFirst BlueCross BlueShield, Cigna and Delta Dental are a few. We estimate what your plan will pay before treatment." },
  { q: "What if I need to cancel?", a: "Tell us as soon as you can and we’ll find a better time. Two business days notice is appreciated." },
  { q: "Can you do a crown in one visit?", a: "Yes. CEREC lets us design, mill and fit a permanent crown while you wait." },
  { q: "Am I a candidate for Invisalign?", a: "Probably. A free consultation answers it, including cases other offices have turned down." },
  { q: "How young can my child start?", a: "From age three. Ask about family block appointments so everyone is seen together." },
  { q: "How do I pay?", a: `Visa, Mastercard, American Express and Discover. Financing is available through CareCredit, with flexible and no-interest payment options, and you can <a href="${payUrl}" target="_blank" rel="noopener">pay your balance online</a> any time.` },
];
