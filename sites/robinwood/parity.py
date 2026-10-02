# Compares the built Astro page with the original hand-written page, element by element.
# Ignores whitespace, attribute order, and the style/script plumbing Astro rewrites.
import sys, re
from html.parser import HTMLParser
class P(HTMLParser):
    def __init__(s): super().__init__(convert_charrefs=True); s.out=[]; s.skip=0
    def handle_starttag(s, t, a):
        a = dict(a)
        if t in ("script","style") or (t=="link" and a.get("rel")=="stylesheet" and "_astro" in (a.get("href") or "")) or (t=="meta" and a.get("name")=="generator"):
            if t in ("script","style") and not (t=="script" and a.get("type")=="application/ld+json"): s.skip+=1
            return
        a = {k:('' if v is None else v) for k,v in a.items() if not k.startswith("data-astro")}
        s.out.append(("<"+t, tuple(sorted(a.items()))))
    def handle_endtag(s, t):
        if t in ("script","style"):
            if s.skip: s.skip-=1
            return
        s.out.append(("</"+t,))
    def handle_startendtag(s, t, a):
        s.handle_starttag(t, a)
        if t not in ('script','style'): s.out.append(('</'+t,))
    def handle_data(s, d):
        if s.skip: return
        d = re.sub(r"\s+"," ",d).strip()
        if d: s.out.append(("#", d))
def toks(path):
    p=P(); p.feed(open(path,encoding="utf-8").read()); return p.out
a=toks(sys.argv[1]); b=toks(sys.argv[2])
if a==b: print(f"PARITY OK: {len(a)} elements and text runs identical"); sys.exit(0)
import difflib
d=list(difflib.unified_diff([repr(x) for x in a],[repr(x) for x in b],lineterm="",n=1))
print(f"PARITY DIFF: {sum(1 for l in d if l.startswith(('+','-')) and not l.startswith(('+++','---')))} changed lines"); print("\n".join(d[:80])); sys.exit(1)
