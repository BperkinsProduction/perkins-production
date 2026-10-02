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
        name: 'Weddings',
        price: '$3,500',
        note: 'starting at',
        groups: 'photo video',
        features: [
            'Full-day photo & video coverage',
            'Cinematic wedding film',
            'Second shooter available',
            '400+ edited digital images',
            'Online gallery & print release',
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
        price: '$200',
        note: 'starting at / per hour',
        groups: 'photo',
        features: [
            'Flexible hourly coverage',
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
            'Full property scan',
            'Interactive 3D walkthrough',
            'Hosted Matterport link',
            'Floor plans available',
            'Embed code for your site',
        ],
        cta: 'Book Now',
    },
    {
        name: 'Starter',
        price: '$1,500',
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
        price: 'Custom',
        note: 'quoted per project',
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
];
