import { phone } from "./contact.js";

// The two offices. Each one feeds its card, its pin on the still relief map,
// and its photo label in the flight.
// pin.left and pin.top are percentages on the relief map image.
// Opening hours live once, in `open`, as [opening hour, closing hour] on a 24 hour clock:
// mt is Monday to Thursday, f is Friday. The office cards, the footer and the booking
// time slots are all generated from it.
const list = [
  {
    key: "hagerstown", // used as data-office on the booking button and as data-k on the flight label
    side: "West of the mountain",
    name: "Hagerstown",
    address: [
      "11110 Medical Campus Road, Suite 148",
      "Robinwood Professional Center, on the Meritus Health campus",
      "Hagerstown, MD 21742",
    ],
    open: { mt: [7, 17], f: [7, 14] },
    phone: phone.tel,
    directions: "https://www.google.com/maps/search/?api=1&query=11110+Medical+Campus+Road+Suite+148+Hagerstown+MD+21742",
    pin: { id: "pin-h", left: "12.85%", top: "45.82%" },
    photo: "assets/pin-hagerstown.jpg",
    photoAlt: "",
  },
  {
    key: "middletown",
    side: "East of the mountain",
    name: "Middletown",
    address: [
      "4310 Old National Pike",
      "Middletown, MD 21769",
    ],
    open: { mt: [8, 17], f: [8, 14] },
    phone: phone.tel,
    directions: "https://www.google.com/maps/search/?api=1&query=4310+Old+National+Pike+Middletown+MD+21769",
    pin: { id: "pin-m", left: "87.11%", top: "44.84%" },
    photo: "assets/pin-middletown.jpg",
    photoAlt: "",
  },
];

// 7 becomes "7:00 am", 17 becomes "5:00 pm".
export function clock(h) { return (h % 12 || 12) + ":00 " + (h >= 12 ? "pm" : "am"); }

export const offices = list.map((o) => ({
  ...o,
  hours: [
    { days: "Monday to Thursday", short: "Mon to Thu", time: `${clock(o.open.mt[0])} to ${clock(o.open.mt[1])}` },
    { days: "Friday", short: "Fri", time: `${clock(o.open.f[0])} to ${clock(o.open.f[1])}` },
  ],
}));

// Stops along the flight, west to east. at is the fraction of the flight (0 to 1)
// where the stop is reached; flight.js reads it from data-at. k is the label key
// (data-k). A stop whose k matches an office key gets that office's photo label.
export const stops = [
  { k: "hagerstown", at: 0, title: "Hagerstown", line: "West of the mountain. Our office in the Robinwood Professional Center." },
  { k: "boonsboro", at: 0.5575, title: "Boonsboro", line: "Dr. Love grew up here, on the road between our two offices." },
  { k: "turners_gap", at: 0.6939, title: "Turner’s Gap", line: "The old National Pike crosses South Mountain here." },
  { k: "middletown", at: 1, title: "Middletown", line: "East of the mountain. Our office on the Old National Pike." },
];
