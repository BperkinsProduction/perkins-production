// Icon inner SVG markup keyed by name. The outer <svg> wrapper is shared and lives in the component.
export const icons = {
  clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  emergency: '<rect x="4" y="4" width="16" height="16" rx="4"/><path d="M12 8.5v7M8.5 12h7"/>',
  languages: '<path d="M5 6.5h10a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2H10l-3.5 3v-3H5a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2z"/><path d="M19 9.5h.5a1.5 1.5 0 0 1 1.5 1.5v4a1.5 1.5 0 0 1-1.5 1.5H19v2l-2.5-2"/>',
  tv: '<rect x="3.5" y="5.5" width="17" height="11" rx="2"/><path d="M9 20h6M12 16.5V20"/>',
  wheelchair: '<circle cx="11" cy="4.8" r="1.6"/><path d="M11 7.5v5.5h5l2 5"/><path d="M11 10h4.5"/><path d="M8.2 11.2a5 5 0 1 0 6.9 6.3"/>',
  parking: '<rect x="4" y="4" width="16" height="16" rx="4"/><path d="M10 16.5v-9h2.8a2.6 2.6 0 0 1 0 5.2H10"/>',
  bus: '<rect x="5" y="3.5" width="14" height="14" rx="3"/><path d="M5 10.5h14M8.5 14.5h.01M15.5 14.5h.01M7.5 17.5v2M16.5 17.5v2"/>',
  insurance: '<path d="M7 3.5h7l4 4v13H7z"/><path d="M14 3.5v4h4M9.5 12.5h5M9.5 16h5"/>',
  card: '<rect x="3" y="6" width="18" height="12.5" rx="2.2"/><path d="M3 10h18M7 15h4"/>',
};

// The "Good to know" list, in display order. icon is a key of icons above.
export const comforts = [
  { icon: "clock", text: "Appointments seen promptly" },
  { icon: "emergency", text: "An emergency dentist available" },
  { icon: "languages", text: "Spanish and Portuguese spoken" },
  { icon: "tv", text: "TVs in the reception area and treatment rooms" },
  { icon: "wheelchair", text: "Wheelchair accessible" },
  { icon: "parking", text: "Ample free parking" },
  { icon: "bus", text: "On a bus route" },
  { icon: "insurance", text: "Dental insurance accepted and filed for you" },
  { icon: "card", text: "CareCredit, with flexible and no-interest payment options" },
];
