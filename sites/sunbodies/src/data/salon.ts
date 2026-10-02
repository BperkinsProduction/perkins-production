// Everything about the salon lives in this one file: prices, hours, locations,
// reviews, and questions. Change a price here and the rate board, the level
// finder, and every "about X a day" line follow.

export const money = (n: number) => '$' + (Number.isInteger(n) ? String(n) : n.toFixed(2));

// Monthly price spread over 30 days. Under a dollar reads as cents.
export function perDay(monthly: number, style: 'short' | 'words' = 'short') {
  const d = monthly / 30;
  if (d >= 1) return '$' + d.toFixed(2);
  const c = Math.round(d * 100);
  return style === 'short' ? c + '¢' : c + ' cents';
}

export const site = {
  title: 'Sunbodies Tanning Salon | Greencastle and Chambersburg, PA',
  description: 'Golden hour, any hour. Four levels of UV tanning, Mystic spray tans, and red light at two salons in Greencastle and Chambersburg, PA. Unlimited tanning from $29 a month with Sports Inn Fitness included.',
  ogTitle: 'Sunbodies Tanning Salon',
  ogDescription: 'Golden hour, any hour. Unlimited tanning from $29 a month, with Sports Inn Fitness included.',
};

// The monthly offer shown in the hero, the spotlight card, and the signup form.
export const special = { price: 29, level: 'Level 1' };

export type Plan = { id: string; name: string; price: number; swatch: string; desc: string; hot?: boolean };

export const plans: Plan[] = [
  { id: 'wellness', name: 'Wellness', price: 14.99, swatch: '#E6D3AE', desc: 'Easygoing tanning 1 to 2 times a week, the sauna, red light, and a spray tan before big events.' },
  { id: 'level1', name: 'Level 1', price: 29, swatch: '#EBCB92', desc: 'Similar to outdoor sun. 20 minutes max.' },
  { id: 'level2', name: 'Level 2', price: 59, swatch: '#E0A052', desc: '30% hotter, with a high-pressure facial tanner. 20 minutes max.' },
  { id: 'level3', name: 'Level 3', price: 89, swatch: '#BE6A2C', desc: 'Fast, intense bronzing in beds and booths. 10 to 12 minutes.' },
  { id: 'level4', name: 'Level 4', price: 109, swatch: '#A64A25', desc: 'The superbed. Fastest, most intense bronzing. 7 to 10 minutes.', hot: true },
  { id: 'mystic', name: 'Mystic spray', price: 19.99, swatch: '#3B2230', desc: 'UV-free spray tan membership, Super Saver discount included.' },
];

export const planById: Record<string, Plan> = Object.fromEntries(plans.map((p) => [p.id, p]));

// The level finder's stops, in sun order. ang is the sun's position on the dial in degrees.
export type Level = { plan: string; lv: string; label: string; name: string; badge?: string; specs: string[]; best: string; ang: number };

export const levels: Level[] = [
  { plan: 'level1', lv: 'Level 1', label: 'Level 1', name: 'Similar to outdoor sun.', badge: 'Most people start here', specs: ['32 lamps', '20 minutes max', 'Lay-down bed'], best: 'Best for first-timers and building a base.', ang: 90 },
  { plan: 'level2', lv: 'Level 2', label: 'Level 2', name: '30% hotter.', specs: ['32 stronger lamps', 'High-pressure facial tanner', '20 minutes max'], best: 'Best for a faster base and more color on your face.', ang: 62 },
  { plan: 'level3', lv: 'Level 3', label: 'Level 3', name: 'Fast, intense bronzing.', specs: ['Beds or 48-lamp stand-up booths', 'Facial tanner in the beds', '10 to 12 minutes'], best: 'Best for going darker and for stubborn tans.', ang: 36 },
  { plan: 'level4', lv: 'Level 4', label: 'Level 4', name: 'Fastest, most intense bronzing.', specs: ['The superbed', '46 bronzing lamps', '4 facial tanners', '7 to 10 minutes'], best: 'Best for the deepest color in the least time.', ang: 13 },
  { plan: 'mystic', lv: 'Mystic spray', label: 'Mystic', name: 'No sun needed.', specs: ['UV-free spray', 'Color in 4 to 6 hours', 'Lasts up to 7 days'], best: 'Best for fair skin, prom, and events this weekend.', ang: -14 },
];

// Opening and closing hour (24-hour clock) for each weekday, Sunday = 0. Both salons share these hours.
export const HOURS: Record<number, [number, number]> = { 0: [12, 16], 1: [10, 19], 2: [10, 19], 3: [10, 19], 4: [10, 19], 5: [10, 19], 6: [10, 16] };
export const hoursRows: [string, string][] = [['Mon to Fri', '10 am to 7 pm'], ['Saturday', '10 am to 4 pm'], ['Sunday', 'noon to 4 pm']];
export const hoursLine = 'Mon to Fri 10 am to 7 pm, Sat 10 am to 4 pm, Sun noon to 4 pm.';

export const locations = [
  { name: 'Greencastle', street: '13963 Molly Pitcher Hwy', city: 'Greencastle, PA 17225', phone: '717-597-5586', tel: '+17175975586', maps: 'https://www.google.com/maps/search/?api=1&query=Sunbodies+Tanning+Salon+13963+Molly+Pitcher+Hwy+Greencastle+PA+17225' },
  { name: 'Chambersburg', street: '700 Lincoln Way West', city: 'Chambersburg, PA 17201', phone: '717-264-5558', tel: '+17172645558', maps: 'https://www.google.com/maps/search/?api=1&query=Sunbodies+Tanning+Salon+700+Lincoln+Way+West+Chambersburg+PA+17201' },
];

export const rating = { score: 4.3, count: 94 };

export const facts = ['True unlimited', '$0 down or no commitment', 'Sports Inn Fitness included', '16 private rooms', 'Open 7 days', `${rating.score} stars from ${rating.count} reviews`];

// image is a file name in src/assets/photos/
export const services = [
  { image: 'glow-uv.jpg', alt: 'A tanning bed with its canopy open, glowing warm gold in a dim private room', tag: 'UV tanning', title: 'Beds and booths', body: 'Four levels of lay-down beds and stand-up booths, plus a Legacy leg tanner for legs that lag behind.' },
  { image: 'glow-mist.jpg', alt: 'A fine golden mist glowing in warm backlight', tag: 'Mystic spray tan', title: 'No sun needed', body: 'A fine, even mist in a private booth. Color shows in 4 to 6 hours and lasts up to 7 days, on any skin type.' },
  { image: 'glow-red.jpg', alt: 'A red light panel washing a quiet room in deep red', tag: 'Red light', title: 'No UV at all', body: "A warm, quiet light session that won't tan you. Members add it for how their skin looks and feels." },
];

export const reviews = [
  { quote: 'Really clean rooms, clean beds, outstanding service!', source: 'Facebook review', wide: true },
  { quote: 'Staff is VERY friendly & welcoming every single visit. I would not want to go anywhere else.', source: 'Facebook review' },
  { quote: "All the ladies I've met who work there are very courteous and take time to explain things clearly.", source: 'Facebook review' },
  { quote: 'I have been a loyal client of Sunbodies for years. Very clean and everyone is very polite.', source: 'Facebook review' },
  { quote: 'Great tanning results. Extremely clean.', source: 'Facebook review' },
];

export const cocktail = [
  { image: 'cocktail-bronze.jpg', alt: 'A superbed dome glowing gold in a private room', num: 'Step 1', title: 'Bronze.', body: 'A Level 3 or Level 4 session, 7 to 12 minutes.' },
  { image: 'cocktail-mist.jpg', alt: 'A fine tanning mist across a bronzed shoulder in warm light', num: 'Step 2', title: 'Mist.', body: 'Slide straight into the Mystic booth.' },
  { image: 'cocktail-glow.jpg', alt: 'A smiling woman glowing in golden evening light at a celebration', num: 'Step 3', title: 'Glow.', body: 'Golden, even color in about 30 minutes.' },
];

export const redLightFacts = ['UV-free', 'Included with Wellness', 'Pairs with any tanning plan'];

export const firstVisit = [
  { title: 'Walk in.', body: 'Stop by either salon. Bring a photo ID.' },
  { title: 'Tell us how you burn.', body: "We'll match you to a level, or to a spray tan if you'd rather skip UV." },
  { title: 'Short and private.', body: "Your own room, goggles on, and a short first session. Wear whatever you're comfortable in." },
  { title: 'Build your color.', body: 'Color builds over a few visits. Give your skin a day between sessions.' },
];

export const faq = [
  { q: 'I burn easy. Can I still tan?', a: "Tell us at the desk. We'll start you low and short, or put you in the Mystic booth, which uses no UV at all." },
  { q: 'Which bed should I pick?', a: 'Higher levels are stronger, so they need fewer minutes. Most people start at Level 1 or 2. Try the level finder above, or just ask us.' },
  { q: 'Will a spray tan make me look orange?', a: 'Not if we match your shade. Exfoliate and shave the day before, come in without lotion, deodorant, or makeup, and follow the poses in the booth. Color shows in 4 to 6 hours and lasts up to 7 days.' },
  { q: 'Am I locked into a contract?', a: "You don't have to be. Every plan gives you the choice: $0 down, or no commitment at all." },
  { q: 'Do I have to buy lotion?', a: "No. Lotion helps your color and keeps skin from drying out, and we're glad to point you to a good one. It's your call." },
  { q: 'How often should I tan?', a: 'Give your skin at least a day between UV sessions, and never tan to the point of burning. Unlimited means you set the schedule, not that more is better.' },
  { q: 'What do I wear?', a: "The rooms are private, so wear whatever you're comfortable in. Goggles go on every time." },
  { q: 'Does red light tan me?', a: 'No. Red light uses no UV and won\'t change your color.' },
  { q: 'Is the gym really included?', a: 'Yes. Every Sunbodies plan comes with a Sports Inn Fitness membership.' },
];
