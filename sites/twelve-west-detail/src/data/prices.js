// Chad's price list. Change a price here and the package cards, the quote builder
// and the appraisal all follow. Package prices are listed Small, Mid, Large, XL.

export const sizes = [
  { name: 'Small', examples: 'Cars and coupes. Civic, Model 3, Corvette' },
  { name: 'Mid', examples: 'Small SUVs and crossovers. RAV4, CR-V, BMW X3' },
  { name: 'Large', examples: 'Full size SUVs and half ton trucks. Tahoe, F-150, Range Rover' },
  { name: 'XL', examples: 'Three row XL, vans and heavy duty. Suburban, Super Duty' },
];

// The size the page opens on.
export const defaultSize = 1;

export const packages = [
  {
    id: 'ceramic-wash', name: 'The Ceramic Wash', prices: [85, 95, 105, 115],
    items: ['Hand wash with ceramic water beading protection', 'Compressed air dried', 'Bug removal', 'Rims and tires cleaned and dressed', 'Exterior windows'],
  },
  {
    id: 'special', name: 'The Twelve West Special', prices: [145, 165, 185, 199],
    items: ['Everything in the Ceramic Wash, minus the ceramic', 'Quick vacuum of carpets and mats', 'Interior plastics wiped down', 'Inside and outside glass', 'Air freshener'],
    note: 'Not for heavily soiled vehicles',
  },
  {
    id: 'silver', name: 'The Silver Detail', prices: [215, 235, 255, 285],
    items: ['Hand wash, air dried, bugs, rims and tires', 'Detailed vacuum of carpets and mats', 'Steam cleaned and disinfected dash, doors and plastics', 'Leather cleaned and conditioned', 'Jambs and seals conditioned'],
  },
  {
    id: 'platinum', name: 'The Platinum Detail', prices: [349, 375, 395, 420], tag: 'Most popular',
    items: ['Everything in the Silver Detail', 'Iron decontamination', 'One step gloss polish instead of wax', 'Seats and carpets shampooed', 'Platinum tire dressing'],
  },
  {
    id: 'platinum-plus', name: 'The Platinum Plus', prices: [525, 570, 610, 645],
    items: ['Everything in the Platinum Detail', 'Ceramic infused gloss polish', 'Engine bay cleaning', 'Graphene ceramic tire dressing', 'Ozone odor and bacteria treatment'],
  },
];

// Services that are not priced by size. "from" is a starting price.
export const otherServices = [
  { group: 'Ceramic coating', id: 'coat-3', name: '2 to 3 year coating', from: 775, deposit: true, blurb: 'Daily drivers, great first coating' },
  { group: 'Ceramic coating', id: 'coat-6', name: '6+ year coating', from: 1195, deposit: true, blurb: 'For the vehicle you plan to keep' },
  { group: 'Ceramic coating', id: 'coat-life', name: 'Lifetime coating', from: 1600, deposit: true, blurb: 'Our top protection' },
  { group: 'Interior only', id: 'int-base', name: 'Baseline Interior', from: 150 },
  { group: 'Interior only', id: 'int-deluxe', name: 'Deluxe Interior', from: 275 },
  { group: 'Something else', id: 'wash-wax', name: 'Wash and wax', from: 175 },
  { group: 'Something else', id: 'specialty', name: 'Specialty vehicle', call: true, sub: 'RV, trailer, bike, classic' },
];

// Coating deposit, as a share of the quote.
export const depositRate = 0.2;

// "included" lists the services that already cover this add on.
// "qty" offers a quantity menu, "unit" is shown after the price.
export const addons = [
  { id: 'pet', name: 'Pet hair or sand removal', price: 99, from: true },
  { id: 'tar', name: 'Tar or road paint removal', price: 199, from: true },
  { id: 'bed', name: 'Truck bed cleaning', price: 50 },
  { id: 'engine', name: 'Engine bay cleaning', price: 60, included: ['platinum-plus'] },
  { id: 'headlight', name: 'Headlight restoration', price: 40, qty: [1, 2], unit: 'each' },
  { id: 'extract', name: 'Carpet and seat extraction', price: 99, from: true, included: ['int-deluxe'] },
  { id: 'shampoo', name: 'Seat shampooing', price: 60, qty: [1, 2, 3], unit: 'per row', included: ['platinum', 'platinum-plus', 'int-deluxe'] },
  { id: 'odor', name: 'Odor removal', price: 100, included: ['platinum-plus', 'int-deluxe'] },
  { id: 'enhance', name: 'Paint enhancement', price: 120, qty: [1, 2, 3, 4], unit: 'per hour', qtyLabel: 'hr' },
  { id: 'polish', name: 'All in one polish and sealant', price: 300, from: true },
  { id: 'decal', name: 'Decal removal', call: true },
];

export const money = (n) => '$' + n.toLocaleString('en-US');
export const coatings = otherServices.filter((s) => s.deposit);
export const service = (id) => otherServices.find((s) => s.id === id);
export const addon = (id) => addons.find((a) => a.id === id);
