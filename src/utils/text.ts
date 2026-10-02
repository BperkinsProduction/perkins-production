// Escape plain text for use with set:html. Astro's own escaping also turns
// apostrophes into &#39;; this keeps them as typed so the output matches the copy.
export function text(value: string): string {
    return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
