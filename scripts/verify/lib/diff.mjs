// Pixel comparison with sharp: mask volatile regions, count differing pixels,
// and draw side-by-side and diff images for a human to look at.
import sharp from 'sharp';

async function raw(png) {
    const { data, info } = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    return { data, width: info.width, height: info.height };
}

// Copies an image onto a canvas of the given size; the extra area is filled magenta.
function pad(img, width, height) {
    if (img.width === width && img.height === height) return Buffer.from(img.data);
    const out = Buffer.alloc(width * height * 4);
    for (let i = 0; i < out.length; i += 4) { out[i] = 255; out[i + 1] = 0; out[i + 2] = 255; out[i + 3] = 255; }
    for (let y = 0; y < img.height; y++) img.data.copy(out, y * width * 4, y * img.width * 4, (y + 1) * img.width * 4);
    return out;
}

// Returns true when every pixel in the image is (nearly) the same colour, i.e. a blank capture.
export async function isBlank(png) {
    const { channels } = await sharp(png).stats();
    return channels.slice(0, 3).every(c => c.stdev < 1.5);
}

export async function compare(refPng, candPng, masks, { tolerance }) {
    const a = await raw(refPng), b = await raw(candPng);
    const width = Math.max(a.width, b.width), height = Math.max(a.height, b.height);
    const A = pad(a, width, height), B = pad(b, width, height);

    const masked = new Uint8Array(width * height);
    for (const [x, y, w, h] of masks) {
        for (let yy = Math.max(0, y); yy < Math.min(height, y + h); yy++) masked.fill(1, yy * width + Math.max(0, x), yy * width + Math.min(width, x + w));
    }

    const diffMap = new Uint8Array(width * height);
    let diff = 0, maskedCount = 0;
    for (let p = 0, i = 0; p < width * height; p++, i += 4) {
        if (masked[p]) { maskedCount++; continue; }
        const d = Math.max(Math.abs(A[i] - B[i]), Math.abs(A[i + 1] - B[i + 1]), Math.abs(A[i + 2] - B[i + 2]));
        if (d > tolerance) { diff++; diffMap[p] = 1; }
    }
    const compared = width * height - maskedCount;
    return {
        percent: compared ? (diff / compared) * 100 : 0,
        maskedPercent: (maskedCount / (width * height)) * 100,
        sizeMismatch: a.width !== b.width || a.height !== b.height,
        render: () => render(A, B, masked, diffMap, width, height),
    };
}

// Builds the diff image (dimmed reference, differences in red, masks in purple)
// and a reference | candidate | diff strip.
async function render(A, B, masked, diffMap, width, height) {
    const D = Buffer.alloc(width * height * 4);
    for (let p = 0, i = 0; p < width * height; p++, i += 4) {
        const g = Math.round((A[i] * 0.3 + A[i + 1] * 0.59 + A[i + 2] * 0.11) * 0.35);
        let r = g, gg = g, bb = g;
        if (masked[p]) { r = Math.min(255, g + 70); gg = g; bb = Math.min(255, g + 110); }
        if (diffMap[p]) { r = 255; gg = 30; bb = 30; }
        D[i] = r; D[i + 1] = gg; D[i + 2] = bb; D[i + 3] = 255;
    }
    const opts = { raw: { width, height, channels: 4 } };
    const diffPng = await sharp(D, opts).png().toBuffer();
    const gap = 12;
    const strip = await sharp({ create: { width: width * 3 + gap * 2, height, channels: 4, background: '#ffffff' } })
        .composite([
            { input: await sharp(A, opts).png().toBuffer(), left: 0, top: 0 },
            { input: await sharp(B, opts).png().toBuffer(), left: width + gap, top: 0 },
            { input: diffPng, left: (width + gap) * 2, top: 0 },
        ])
        .png().toBuffer();
    const sideBySide = await sharp(strip).resize({ width: Math.min(width * 3 + gap * 2, 2400) }).jpeg({ quality: 82 }).toBuffer();
    return { diffPng, sideBySide };
}
