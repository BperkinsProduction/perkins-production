# Robinwood concept in Astro: rules for refactoring agents

This Astro project reproduces the hand-written page at
`/Users/josiahperkins/Documents/Claude/robinwood-site/index.html` (the live site at
https://www.perkinsproduction.com/concepts/robinwood/). The scaffold already builds an
identical page: every section is a stub component holding the original markup verbatim.

## Your job

Turn your assigned stub components into real, maintainable Astro components: repeated
hand-written markup becomes data (in `src/data/`) plus `.map()` loops, so a future edit
(a new service, a dentist leaving, a changed hour) is a one-line data change.

**The rendered HTML must stay identical.** That is the whole test.

## Hard rules

1. Work only inside your own project copy (the folder named in your task). Never touch the
   original `robinwood-astro` folder, the `robinwood-site` folder, or the website repository.
2. Edit only the component files assigned to you. Create data files only with the names
   assigned to you, in `src/data/`, as ES modules with named exports
   (`export const services = [...]`).
3. Do not change anything in `src/styles/`, `src/layouts/`, `src/pages/`, or `astro.config.mjs`.
   Do not add `<style>` blocks to components (scoped styles add attributes and break parity).
4. Scripts in `src/scripts/` stay as they are unless your task says otherwise. Keep each
   component's existing `<script>` import block exactly as it is.
5. No em dashes or en dashes anywhere, including code comments. Use commas, colons or periods.
   No marketing filler words in comments.
6. Facts stay exactly as written. Do not reword copy, fix "typos", or add content.

## Astro notes that matter here

- Text like `&rsquo;`, `&#8209;`, `&ldquo;` in data strings: write the real character
  (’ ‑ “) in JavaScript strings, or render with `set:html` when the string contains markup.
  The parity checker decodes entities, so the real character matches the original entity.
- Inline styles from data: `style={`--d:${i % 4}`}`. Attribute order does not matter.
- Raw inline SVG from data: use `<Fragment set:html={svgString} />`.
- Curly braces in markup are expressions. Text that needs a literal brace must be a string.
- Self-closing tags vs explicit closing tags are treated as equal by the checker.

## How to check your work (run after every meaningful change)

```bash
npx astro build --outDir dist
python3 parity.py /Users/josiahperkins/Documents/Claude/robinwood-site/index.html dist/index.html
```

It must print `PARITY OK: 2177 elements and text runs identical`. If it prints a diff, read
the first changed lines; they name the exact element that differs.

## Report back

List: files you changed, data files you created (with a one-line description of each),
the final parity output, and anything you noticed but deliberately did not change.
