// Which size a vehicle is, for the "type your car" finder. Sizes are 0 Small, 1 Mid,
// 2 Large, 3 XL, the same order as sizes in prices.js. These are our guesses for Chad
// to confirm. Match words are lowercase; the longest match wins, so "grand cherokee l"
// beats "grand cherokee" and "f-250" beats "f".
export const vehicles = [
  // Small: cars and coupes
  [0, ['civic', 'corolla', 'camry', 'accord', 'altima', 'sentra', 'elantra', 'sonata', 'malibu', 'impala', 'fusion', 'focus', 'jetta', 'passat', 'golf', 'mazda3', 'mazda 3', 'mazda6', 'mazda 6', 'miata', 'mx-5', 'model 3', 'model s', 'corvette', 'camaro', 'mustang', 'challenger', 'charger', '300', 'wrx', 'impreza', 'legacy', 'prius', 'optima', 'k5', 'forte', 'soul', 'versa', 'maxima', 'avalon', 'gti', 'brz', 'gr86', 'supra', '3 series', '330i', 'm3', '5 series', 'm5', 'c-class', 'c300', 'e-class', 'a4', 'a6', 's4', 'is 350', 'es 350', 'tlx', 'g70', 'stinger', 'cooper', 'beetle', '911', 'cayman', 'scion', 'tc', 'spark', 'fit', 'yaris']],
  // Mid: small SUVs and crossovers, small trucks
  [1, ['rav4', 'cr-v', 'crv', 'hr-v', 'cx-5', 'cx5', 'cx-30', 'cx-50', 'rogue', 'murano', 'equinox', 'trax', 'blazer', 'escape', 'bronco sport', 'edge', 'tucson', 'santa fe', 'kona', 'sportage', 'sorento', 'seltos', 'forester', 'outback', 'crosstrek', 'tiguan', 'atlas cross sport', 'compass', 'cherokee', 'grand cherokee', 'wrangler', 'renegade', 'x1', 'x3', 'x4', 'glc', 'gla', 'q3', 'q5', 'nx', 'rx', 'rdx', 'macan', 'model y', 'mach-e', 'bronco', '4runner', 'tacoma', 'ranger', 'colorado', 'canyon', 'frontier', 'ridgeline', 'maverick', 'santa cruz', 'venza', 'terrain', 'encore', 'envision', 'xc60', 'xc40', 'ioniq 5', 'ev6']],
  // Large: full size SUVs, half ton trucks, minivans
  [2, ['tahoe', 'yukon', 'escalade', 'expedition', 'navigator', 'f-150', 'f150', 'silverado 1500', 'silverado', 'sierra 1500', 'sierra', 'ram 1500', '1500', 'tundra', 'titan', 'sequoia', 'land cruiser', 'lx', 'range rover', 'defender', 'grand cherokee l', 'wagoneer', 'durango', 'explorer', 'pilot', 'highlander', 'grand highlander', 'pathfinder', 'traverse', 'acadia', 'atlas', 'telluride', 'palisade', 'ascent', 'x5', 'x7', 'gle', 'gls', 'g-wagon', 'g wagon', 'g-class', 'q7', 'q8', 'xc90', 'model x', 'cybertruck', 'rivian', 'r1s', 'r1t', 'lightning', 'odyssey', 'sienna', 'pacifica', 'carnival', 'gladiator', 'aviator', 'mdx', 'qx80', 'armada']],
  // XL: three row XL, heavy duty trucks, vans
  [3, ['suburban', 'yukon xl', 'yukon denali xl', 'escalade esv', 'expedition max', 'navigator l', 'f-250', 'f250', 'f-350', 'f350', 'f-450', 'super duty', 'silverado 2500', 'silverado 3500', '2500', '3500', 'sierra 2500', 'sierra 3500', 'ram 2500', 'ram 3500', 'hd', 'transit', 'sprinter', 'promaster', 'express', 'savana', 'e-350', 'excursion', 'hummer']],
];

// Common makes, so "chevy" alone does not count as a match and a make with no model can ask for one.
const makes = ['chevy', 'chevrolet', 'ford', 'gmc', 'ram', 'dodge', 'jeep', 'toyota', 'honda', 'nissan', 'hyundai', 'kia', 'subaru', 'mazda', 'volkswagen', 'vw', 'bmw', 'mercedes', 'benz', 'audi', 'lexus', 'acura', 'infiniti', 'cadillac', 'lincoln', 'buick', 'tesla', 'volvo', 'porsche', 'land rover', 'genesis', 'mini', 'chrysler', 'mitsubishi', 'rivian'];

// Returns { size, model } for the best match, or null.
export function findSize(text) {
  const t = ' ' + text.toLowerCase().replace(/[^a-z0-9\- ]/g, ' ').replace(/\s+/g, ' ') + ' ';
  let best = null;
  for (const [size, words] of vehicles) {
    for (const w of words) {
      if (t.includes(' ' + w + ' ') && (!best || w.length > best.model.length)) best = { size, model: w };
    }
  }
  return best;
}
export const onlyMake = (text) => makes.some((m) => (' ' + text.toLowerCase() + ' ').includes(' ' + m + ' '));
