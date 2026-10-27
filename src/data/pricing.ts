import type { ImageMetadata } from 'astro';
import cinematicShot from '../assets/mockups/cinematic.png';

// Pricing tiers, in page order. "groups" are the tabs a card shows under
// (web, photo, video); a card can sit under more than one.
export interface PricingTier {
    name: string;
    price: string;
    note: string;
    groups: string;
    features: string[];
    cta: string;
    featured?: boolean;
    /** The Cinematic tier: wide card with a screenshot (an image in src/assets/) */
    shot?: ImageMetadata;
}

export const pricingTiers: PricingTier[] = [
    {
        name: 'Portraits',
        price: '$350',
        note: 'starting at',
        groups: 'photo',
        features: [
            '1-hour session',
            'One location',
            '25 edited digital images',
            'Online gallery',
            'Print release included',
        ],
        cta: 'Book Now',
    },
    {
        name: 'Wedding Photo',
        price: '$3,000',
        note: 'starting at',
        groups: 'photo',
        features: [
            'Full-day photo coverage',
            '400+ edited digital images',
            'Second shooter available',
            'Online gallery',
            'Print release included',
        ],
        cta: 'Book Now',
    },
    {
        name: 'Photo + Film',
        price: '$4,800',
        note: 'starting at',
        groups: 'photo video',
        features: [
            'Full-day photo & video coverage',
            'Cinematic wedding film',
            '400+ edited digital images',
            'Online gallery & print release',
            '$400 less than booking both separately',
        ],
        cta: 'Book Now',
    },
    {
        name: 'Wedding Film',
        price: '$2,200',
        note: 'starting at',
        groups: 'video',
        features: [
            'Full-day video coverage',
            'Cinematic wedding film',
            'Ceremony and toasts captured',
            'Delivered online, ready to share',
        ],
        cta: 'Book Now',
    },
    {
        name: 'Headshots',
        price: '$250',
        note: 'starting at',
        groups: 'photo',
        features: [
            '30-minute session',
            'Studio or on-location',
            '5 retouched images',
            'LinkedIn & web optimized',
            'Quick turnaround',
        ],
        cta: 'Book Now',
    },
    {
        name: 'Events',
        price: '$225',
        note: 'per hour / 2-hour minimum',
        groups: 'photo',
        features: [
            'Two hours minimum, then hourly',
            'Corporate & private events',
            'All edited images delivered',
            'Online gallery',
            'Fast delivery',
        ],
        cta: 'Book Now',
    },
    {
        name: 'Engagements',
        price: '$450',
        note: 'starting at',
        groups: 'photo',
        features: [
            '1-hour session',
            'One or two locations',
            '30 edited digital images',
            'Save-the-date ready',
            'Print release included',
        ],
        cta: 'Book Now',
    },
    {
        name: 'Matterport 3D/VR',
        price: '$350',
        note: 'starting at',
        groups: 'video',
        features: [
            'Spaces up to 3,000 sq ft, larger quoted by size',
            'Interactive 3D walkthrough',
            '6 months of hosting included',
            'Floor plans available',
            'Embed code for your site',
        ],
        cta: 'Book Now',
    },
    {
        name: 'Brand Film',
        price: '$1,500',
        note: 'starting at',
        groups: 'video',
        features: [
            'Half-day shoot at your business',
            'A 60 to 90 second film for your website',
            'Short vertical cuts for social',
            'Licensed music',
        ],
        cta: 'Book Now',
    },
    {
        name: 'Starter',
        price: '$2,000',
        note: 'starting at',
        groups: 'web',
        features: [
            'Up to 5 pages',
            'Mobile-responsive design',
            'Contact form',
            'Basic SEO setup',
            'Hosting & domain setup',
        ],
        cta: 'Get Started',
    },
    {
        name: 'Business',
        price: '$3,000',
        note: 'starting at',
        groups: 'web',
        featured: true,
        features: [
            'Up to 10 pages',
            'Custom design & branding',
            'CMS integration',
            'Advanced SEO & analytics',
            '30 days post-launch support',
        ],
        cta: 'Get Started',
    },
    {
        name: 'Premium',
        price: '$5,000+',
        note: 'starting at',
        groups: 'web',
        features: [
            'Unlimited pages',
            'E-commerce / booking system',
            'Custom features & integrations',
            'Logo & brand identity package',
            '60 days support & training',
        ],
        cta: 'Get Started',
    },
    {
        name: 'Cinematic',
        price: '$7,500',
        note: 'starting at / photo & film included',
        groups: 'web',
        shot: cinematicShot,
        features: [
            'A scroll-driven opening sequence, like this homepage',
            'Photography and film shot on your property',
            'Everything in Premium',
            'For venues, restaurants, and brands that need to be felt',
            'Built and shot by one person',
        ],
        cta: 'Start a Conversation',
    },
    // Monthly care for a site the client already has, or one Brice built.
    // Keep It Fresh matches the offer page at /keep-it-fresh.html.
    {
        name: 'Keep It Fresh',
        price: '$49',
        note: 'per month / no contract',
        groups: 'care',
        features: [
            'What\'s broken on your site, fixed in week one',
            'Up to 1 hour of changes a month',
            'Holiday hours and seasonal updates on time',
            'Your Google listing kept matching your site',
            'A monthly check and a short note from me',
        ],
        cta: 'Start Fresh',
    },
    {
        name: 'Keep It Growing',
        price: '$99',
        note: 'per month / no contract',
        groups: 'care',
        features: [
            'Everything in Keep It Fresh',
            'Up to 3 hours of changes a month',
            'Changes live the next business day',
            'A new post on your Google listing every month',
            'A monthly report: who found you, and how',
        ],
        cta: 'Start Growing',
    },
    {
        name: 'Keep It Rolling',
        price: '$399',
        note: 'per month / no contract',
        groups: 'care',
        features: [
            'Everything in Keep It Growing',
            'A photo and video visit every season',
            'New photos on your site and Google after each visit',
            'One short video a month for social',
            'First in line on my calendar',
        ],
        cta: 'Start Rolling',
    },
];
