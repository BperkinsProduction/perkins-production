import { getCollection } from 'astro:content';

// Sites on the hero wheel, in wheel order
export async function getWheelSites() {
    const all = await getCollection('work');
    return all
        .filter((site) => site.data.wheel)
        .sort((a, b) => a.data.wheel!.order - b.data.wheel!.order)
        .map((site) => ({ ...site.data, wheel: site.data.wheel! }));
}

// Sites in the Work grid, in grid order
export async function getWorkCards() {
    const all = await getCollection('work');
    return all
        .filter((site) => site.data.card)
        .sort((a, b) => a.data.card!.order - b.data.card!.order)
        .map((site) => ({ ...site.data, card: site.data.card! }));
}
