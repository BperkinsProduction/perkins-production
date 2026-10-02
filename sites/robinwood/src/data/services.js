// The eight service cards. `slug` is the data-svc key the service reader opens.
// A card has either `photo` and `alt`, or `svg` (raw inline markup) in place of a photo.

const sleepSvg = `<svg viewBox="0 0 600 500" role="img" aria-label="A crescent moon over the mountain" preserveAspectRatio="xMidYMid slice"><defs><linearGradient id="sky2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0F2E3A"/><stop offset="1" stop-color="#1d4e5f"/></linearGradient></defs><rect width="600" height="500" fill="url(#sky2)"/><g fill="#a1dfe0" opacity=".85"><circle cx="90" cy="80" r="2"/><circle cx="170" cy="140" r="1.5"/><circle cx="250" cy="60" r="2"/><circle cx="520" cy="120" r="1.6"/><circle cx="470" cy="50" r="1.2"/><circle cx="330" cy="130" r="1.3"/></g><path d="M430 110a70 70 0 1 0 64 96 56 56 0 1 1-64-96z" fill="#F2F6F7"/><path d="M0 360 C80 330 140 300 210 312 S330 250 400 268 S520 300 600 280 V500 H0Z" fill="#2C5552"/><path d="M0 410 C100 380 190 370 280 384 S460 350 600 372 V500 H0Z" fill="#173F3D"/></svg>`;

const ownPhoto = "Robinwood’s own photo";

export const services = [
  {
    slug: "cosmetic-dentistry",
    title: "Cosmetic Dentistry",
    description: "Whitening, porcelain veneers and tooth-colored fillings.",
    photo: "assets/svc-cosmetic.jpg",
    alt: "A patient smiling in the chair at Robinwood",
    caption: ownPhoto,
  },
  {
    slug: "orthodontics-and-invisalign",
    title: "Orthodontics and Invisalign",
    description: "Clear aligners or traditional braces. A free consultation tells you if Invisalign fits.",
    photo: "assets/svc-ortho.jpg",
    alt: "A Robinwood dentist examining a young patient",
    caption: ownPhoto,
  },
  {
    slug: "oral-surgery",
    title: "Oral Surgery",
    description: "Wisdom teeth and extractions, with ways to manage anxiety and pain.",
    photo: "assets/svc-surgery.jpg",
    alt: "A Robinwood dentist at work, wearing magnifying loupes",
    caption: ownPhoto,
  },
  {
    slug: "dental-implants",
    title: "Dental Implants",
    description: "One tooth, a bridge, or a full arch, on titanium implants.",
    photo: "assets/svc-implants.jpg",
    alt: "A Robinwood dentist explaining a treatment with a model",
    caption: ownPhoto,
  },
  {
    slug: "restorative-proceduresdentures",
    title: "Restorations and Dentures",
    description: "Crowns, bridges, fillings and dentures, matched to your needs and budget.",
    photo: "assets/svc-restore.jpg",
    alt: "An actual Robinwood patient’s restored smile",
    caption: "An actual patient’s result",
  },
  {
    slug: "endodontic-services",
    title: "Root Canals",
    description: "Saving an injured tooth, often no more painful than a filling.",
    photo: "assets/svc-rootcanal.jpg",
    alt: "A Robinwood patient in the chair beside his X-rays",
    caption: ownPhoto,
  },
  {
    slug: "sleep-apnea-snore-guards",
    title: "Sleep Apnea and Snore Guards",
    description: "A custom mouthpiece that can often replace a CPAP machine.",
    svg: sleepSvg,
    caption: "Assessed with an at-home sleep study",
  },
  {
    slug: "advanced-dental-technology",
    title: "Advanced Technology",
    description: "CEREC crowns in one visit, 3‑D scans and digital X-rays.",
    photo: "assets/svc-tech.jpg",
    alt: "A Robinwood team member using the 3-D cone beam scanner",
    caption: "Their 3‑D cone beam scanner",
  },
];
