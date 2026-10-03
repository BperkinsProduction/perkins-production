// The six scroll-story beats of the hero. a and b are the scroll range (0 to 1)
// where each band is shown. Cards are the floating photos; x, y, r and s become
// the --x, --y, --r and --s variables; size "big" adds the big class, and side
// plus label add a caption. line sits above big, lineAfter sits below it.
// The final beat (b6) has its own markup in HeroScrub.astro.
export const beats = [
  {
    id: "b1",
    entrance: "e-blur",
    a: "0",
    b: "0.12",
    logo: true,
    eyebrow: "Middletown and Hagerstown, Maryland",
    line: "Nervous about the dentist?",
    big: "You’re not the only one.",
    sunrise: true,
  },
  {
    id: "b2",
    entrance: "e-drift",
    a: "0.16",
    b: "0.29",
    eyebrow: "Since November 2003",
    big: "Many of our patients have been with us since the day we opened.",
    cards: [
      { img: "assets/svc-cosmetic.jpg", x: "8%", y: "6%", r: "-2deg", s: 0, size: "big" },
    ],
  },
  {
    id: "b3",
    entrance: "e-quote",
    a: "0.33",
    b: "0.46",
    quote: "“Everything was explained to me step‑by‑step.”",
    who: "Diana M., Robinwood patient",
    cards: [
      { img: "assets/svc-implants.jpg", x: "12%", y: "4%", r: "2deg", s: 0, size: "big" },
    ],
  },
  {
    id: "b4",
    entrance: "e-drift",
    a: "0.50",
    b: "0.63",
    eyebrow: "Everything under one roof",
    big: "Braces, implants and surgery, without being sent across town.",
    lineAfter: "An oral surgeon and orthodontics in the same practice, so we rarely have to send anyone elsewhere.",
    cards: [
      { img: "assets/svc-ortho.jpg", x: "0%", y: "0%", r: "-4deg", s: 0 },
      { img: "assets/svc-surgery.jpg", x: "34%", y: "20%", r: "3deg", s: 1 },
      { img: "assets/svc-tech.jpg", x: "8%", y: "46%", r: "-1deg", s: 2 },
    ],
  },
  {
    id: "b5",
    entrance: "e-part",
    a: "0.67",
    b: "0.81",
    bigParts: ["Two offices,", "one mountain apart."],
    lineAfter: "Middletown and Hagerstown, joined by the old National Pike.",
    cards: [
      { img: "assets/bldg-hagerstown.jpg", x: "0%", y: "6%", r: "-3deg", s: 0, side: "West of the mountain", label: "Hagerstown" },
      { img: "assets/ppl-middletown.jpg", x: "40%", y: "30%", r: "3deg", s: 1, side: "East of the mountain", label: "Middletown" },
    ],
  },
  {
    id: "b6",
    entrance: "e-words",
    a: "0.85",
    b: "1",
  },
];
