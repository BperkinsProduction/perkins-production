// Shop details, written once and used everywhere they appear.
export const shop = {
  name: 'Twelve West Detail',
  owner: 'Chad',
  phone: '(301) 304-5510',
  phoneHref: 'tel:3013045510',
  street: '12 West Frederick Street, Unit B',
  town: 'Walkersville, MD 21793',
  mapUrl: 'https://maps.google.com/?q=12+West+Frederick+Street+Unit+B,+Walkersville,+MD+21793',
  facebook: 'https://www.facebook.com/TwelveWestDetail',
  instagram: 'https://www.instagram.com/twelve_west_detail',
  followers: '3.5K',
  reviews: { count: 30, recommend: '100%', url: 'https://www.facebook.com/TwelveWestDetail/reviews' },
  email: '12westdetail@gmail.com',
  award: { title: 'Voted Best Detailing Service', detail: 'Frederick News-Post Best of the Best, 2020 winner' },
  hours: [
    { days: 'Monday to Saturday', time: 'By appointment' },
    { days: 'Sunday', time: 'Closed' },
  ],
  // Day numbers the booking form refuses (0 is Sunday).
  closedDays: [0],
};

// Perkins Production credit and contact, for the concept footer and the appraisal.
export const studio = {
  name: 'Perkins Production',
  url: 'https://www.perkinsproduction.com',
  person: 'Brice Perkins',
  phone: '(240) 818-1955',
  phoneHref: 'tel:+12408181955',
  email: 'brice@perkinsproduction.com',
  shortLink: 'perkinsproduction.com/twelvewest',
};
