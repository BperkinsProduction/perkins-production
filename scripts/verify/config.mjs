// Settings for the verification harness. Tune selectors and thresholds here,
// not in the code that uses them.

export const DEFAULT_REF = 'https://www.perkinsproduction.com';
export const DEFAULT_CAND = 'dist';
export const PRODUCTION_HOST = 'www.perkinsproduction.com';

export const VIEWPORTS = [
    { name: 'desktop', width: 1440, height: 900, mobile: false, reduced: false },
    { name: 'phone', width: 390, height: 844, mobile: true, reduced: false },
    { name: 'desktop-reduced', width: 1440, height: 900, mobile: false, reduced: true },
];

// A pixel counts as different when any colour channel moves more than this (0 to 255).
export const PIXEL_TOLERANCE = 24;
// A shot FAILS above this percentage of differing pixels.
export const FAIL_PERCENT = 0.1;
// Side-by-side and diff images are written for any shot above this percentage.
export const IMAGE_PERCENT = 0.01;
// Section positions (px) may drift by this much before the layout check fails.
export const LAYOUT_TOLERANCE_PX = 4;

// Points through the wheel hero, as a fraction of the .scrub-wrap scroll range.
export const WHEEL_POINTS = [0.1, 0.3, 0.5, 0.7, 0.9];

// Sections captured in order. Missing on both sites is fine; missing on one is a failure.
export const SECTIONS = [
    { name: 'work', selector: '#webdesign' },
    { name: 'stats', selector: '.stat-strip' },
    { name: 'staircase', selector: '.wd-moat' },
    { name: 'process', selector: '.process-section' },
    { name: 'photo-video', selector: '#photo-video' },
    { name: 'about', selector: '#about' },
    { name: 'pricing', selector: '#pricing' },
    { name: 'contact', selector: '#contact' },
    { name: 'footer', selector: 'footer', bottom: true },
];

// Captured after the reveal button has unfolded the hidden photo/video/3D group.
export const REVEALED_SECTIONS = [
    { name: 'weddings', selector: '#weddings' },
    { name: 'films', selector: '#films' },
    { name: 'portraits', selector: '#portraits' },
    { name: 'matterport', selector: '#matterport' },
];

// Elements used to compare section positions between the two sites.
export const LAYOUT_SELECTORS = ['#home', '.scrub-wrap', '#webdesign', '.stat-strip', '.wd-moat', '#photo-video', '#about', '#pricing', '#contact', 'footer'];

// Injected into both sites before any capture so the shots are deterministic.
// Animations jump to their end state, transitions finish instantly, and the
// purely decorative moving layers are frozen or hidden.
export const FREEZE_CSS = `
*, *::before, *::after {
    transition-duration: 0s !important; transition-delay: 0s !important;
    animation-duration: 0s !important; animation-delay: 0s !important;
    animation-iteration-count: 1 !important; caret-color: transparent !important;
}
.bg-glow { animation: none !important; }
.cursor-glow { display: none !important; }
#hero-particles { display: none !important; }
#hero-reel { visibility: hidden !important; }
`;

// Regions painted over in both shots before comparing. They change on their own
// (YouTube thumbnails, third-party embeds such as the Matterport tour, Blob-fed
// photos that only load on Vercel, live countdowns).
export const MASK_SELECTORS = [
    '.film-card img',
    'iframe',
    '[data-slot]',
    '[data-countdown]',
    '.countdown',
    '.jfk-countdown',
];

// Paths that must answer 200 on the candidate.
export const IMPORTANT_PATHS = [
    '/', '/admin', '/concepts/overlooks.html', '/concepts/sports-inn.html',
    '/robots.txt', '/sitemap.xml', '/og-image.png', '/favicon.svg', '/portrait.jpg',
];

// Sample requests for vercel.json redirects. Only Vercel answers these.
export const REDIRECT_SAMPLES = [
    { path: '/sportsinn', to: '/concepts/sports-inn.html' },
    { path: '/Sports-Inn/', to: '/concepts/sports-inn.html' },
    { path: '/sportsinn/proposal', to: '/concepts/sports-inn-proposal.html' },
    { path: '/sunbodies', to: '/concepts/sunbodies/' },
    { path: '/concepts/sunbodies', to: '/concepts/sunbodies/' },
    { path: '/concepts/robinwood', to: '/concepts/robinwood/' },
];

// Same-origin paths that only exist on Vercel (functions, analytics).
export const VERCEL_ONLY = [/^\/api\//, /^\/_vercel\//];
