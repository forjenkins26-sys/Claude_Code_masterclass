"""Rebuild the cinematic portfolio: real hero with photo + native scrolling.

Two fixes over the first attempt:
  1. The transform-based smooth-scroll wrapper (#scroll, position:fixed) is GONE.
     It mirrored the page height onto <body>, and when that measurement ran
     before webfonts settled the scroll range collapsed and the page looked
     blank below the fold. Native scrolling cannot fail that way.
  2. The hero was type-only. It now carries Anand's cutout under a spotlight,
     which is the whole point of the reference design.
"""
from pathlib import Path

BASE = Path(r"C:\ClaudeCodeMasterclass\QA Portfolio")
photo = Path(r"C:\Users\ANANDS~1\AppData\Local\Temp\claude"
             r"\C--Users-ANAND-SONI-OneDrive-Desktop-Trading-View-Volume-Surge-Indicator"
             r"\9ff268a6-30f8-4867-a84f-6d4af6a8cc4a\scratchpad\photo_b64.txt"
             ).read_text(encoding="utf-8").strip()

src = (BASE / "index_cinematic.html").read_text(encoding="utf-8")

# ---------------------------------------------------------------- 1. scrolling
src = src.replace(
    'html{scroll-behavior:auto;-webkit-text-size-adjust:100%}',
    'html{scroll-behavior:smooth;-webkit-text-size-adjust:100%}')
src = src.replace(
    '/* smooth-scroll wrapper (JS translates this; body height is mirrored) */\n#scroll{will-change:transform}',
    '#scroll{}')

old_scroll = src[src.index("/* ---------- weighted smooth scroll"):src.index("/* anchor links")]
new_scroll = """/* ---------- nav state + progress (native scroll, no transform wrapper) ----------
   The previous build translated a fixed wrapper and mirrored its height onto
   <body>. If that measurement ran before the webfonts settled, the scroll range
   collapsed to ~0 and everything below the hero was unreachable - the page read
   as blank. Native scrolling removes the whole failure mode. */
var nav = document.getElementById("nav"), prog = document.querySelector(".prog");
function onScroll(){
  var y = scrollY;
  var max = document.documentElement.scrollHeight - innerHeight;
  nav.classList.toggle("solid", y > 80);
  prog.style.width = (max > 0 ? (y / max * 100) : 0) + "%";
}
addEventListener("scroll", onScroll, {passive:true});
addEventListener("resize", onScroll);
onScroll();

"""
src = src.replace(old_scroll, new_scroll)

# anchor handler no longer needs the virtual offset
# rindex, not index: "})();" also closes the cursor loop earlier in the file, and
# a backwards slice yields "" -- which str.replace() then splices between every
# single character of the document.
old_anchor = src[src.index("/* anchor links"):src.rindex("})();")]
new_anchor = """/* anchor links */
document.querySelectorAll('a[href^="#"]').forEach(function(a){
  a.addEventListener("click", function(e){
    var el = document.querySelector(a.getAttribute("href"));
    if(!el) return;
    e.preventDefault();
    el.scrollIntoView({behavior: reduce ? "auto" : "smooth", block:"start"});
  });
});
"""
src = src.replace(old_anchor, new_anchor)

# drop the wrapper divs entirely
src = src.replace('<div id="scroll">\n', '').replace('</div><!-- /#scroll -->\n', '')

# ---------------------------------------------------------------- 2. hero
old_hero = src[src.index('<section id="hero">'):src.index('<!-- ================= ABOUT')]
new_hero = '''<section id="hero">
  <div class="beam"></div><div class="gridbg"></div>
  <div class="wrap hero-grid">

    <div class="hero-copy">
      <div class="avail"><span class="dot"></span> Available Immediately &middot; Open to Relocation</div>
      <h1 class="head" id="head"><span class="ln">I BUILD</span><span class="ln gold">BULLETPROOF</span><span class="ln">SOFTWARE</span></h1>
      <p class="kicker rv">QA AUTOMATION ENGINEER &middot; SDET &middot; AI-POWERED TESTING</p>
      <p class="sub rv">I turn fragile releases into zero-defect delivery &mdash; Selenium, Playwright and
        AI-driven QA pipelines for HSBC, Citi Bank, Willis Towers Watson and Barclays.</p>
      <div class="cta rv">
        <a class="btn" href="#experience"><span>Explore My Work &nearr;</span></a>
        <a class="btn ghost" href="#ai"><span>AI Projects</span></a>
      </div>
    </div>

    <div class="hero-photo">
      <div class="spot"></div>
      <img id="portrait" src="__PHOTO__" alt="Anand Soni" width="620" height="820">
      <div class="floor"></div>
      <div class="sig">Code is my craft.<br><b>Quality is my goal.</b><span class="nm">Anand Soni</span></div>
    </div>

  </div>

  <div class="wrap">
    <div class="stats rv">
      <div class="stat"><div class="n" data-count="6">0</div><div class="k">Years in QA</div></div>
      <div class="stat"><div class="n" data-count="3">0</div><div class="k">MNC Companies</div></div>
      <div class="stat"><div class="n" data-count="4">0</div><div class="k">Global Clients</div></div>
      <div class="stat"><div class="n" data-count="6">0</div><div class="k">AI Tools Built</div></div>
      <div class="stat"><div class="n" data-count="200" data-suffix="+">0</div><div class="k">Test Scenarios</div></div>
    </div>
    <div class="marquee rv"><div class="mtrack" id="mtrack"></div></div>
  </div>
</section>

'''.replace("__PHOTO__", photo)
src = src.replace(old_hero, new_hero)

# hero styles
hero_css = """
/* ---------- hero: type + portrait ---------- */
#hero{min-height:100svh;display:flex;flex-direction:column;justify-content:center;
  padding-top:104px;padding-bottom:48px;overflow:hidden}
.hero-grid{display:grid;grid-template-columns:1.05fr .95fr;gap:40px;align-items:center}
@media(max-width:960px){.hero-grid{grid-template-columns:1fr;gap:8px}}
.head{font-family:Inter,sans-serif;font-weight:800;letter-spacing:-.03em;line-height:.9;
  font-size:clamp(2.6rem,7.4vw,6.2rem);text-transform:uppercase}
.head .ln{display:block;opacity:0;transform:translateY(40px);filter:blur(12px)}
.head .gold{background:linear-gradient(100deg,#F4D77A,var(--gold) 45%,#8a6d1f);
  -webkit-background-clip:text;background-clip:text;color:transparent}
.kicker{margin-top:22px;font-family:"JetBrains Mono",monospace;font-size:.68rem;
  letter-spacing:.24em;color:var(--gold-soft)}
.sub{margin-top:16px;font-size:1rem;color:var(--ink-dim);max-width:52ch}

.hero-photo{position:relative;display:flex;align-items:flex-end;justify-content:center;
  min-height:min(76vh,720px)}
.hero-photo img{position:relative;z-index:2;max-height:min(76vh,720px);width:auto;
  filter:contrast(1.06) saturate(.92) drop-shadow(0 30px 60px rgba(0,0,0,.85));
  -webkit-mask-image:linear-gradient(180deg,#000 78%,transparent 99%);
  mask-image:linear-gradient(180deg,#000 78%,transparent 99%);
  opacity:0;transform:translateY(24px) scale(1.02);
  transition:opacity 1.6s var(--ease) .5s,transform 1.6s var(--ease) .5s}
.hero-photo img.in{opacity:1;transform:none}
/* spotlight cone from above */
.spot{position:absolute;top:-8%;left:50%;transform:translateX(-50%);
  width:118%;height:104%;z-index:1;pointer-events:none;
  background:conic-gradient(from 180deg at 50% 0%,
     transparent 0deg,rgba(212,175,55,.16) 12deg,rgba(232,223,216,.10) 22deg,transparent 34deg);
  filter:blur(8px)}
/* pooled light on the floor */
.floor{position:absolute;bottom:2%;left:50%;transform:translateX(-50%);z-index:1;
  width:76%;height:90px;border-radius:50%;
  background:radial-gradient(ellipse at center,rgba(212,175,55,.20),transparent 70%);
  filter:blur(14px)}
.sig{position:absolute;right:2%;top:34%;z-index:3;text-align:right;
  font-size:.62rem;letter-spacing:.16em;color:var(--ink-dim);text-transform:uppercase;line-height:1.9}
.sig b{color:var(--ink);font-weight:500}
.sig .nm{display:block;margin-top:10px;font-family:"Cormorant Garamond",serif;
  font-size:1.5rem;letter-spacing:.02em;color:var(--gold);text-transform:none}
@media(max-width:960px){
  .hero-photo{min-height:44vh;margin-top:24px}
  .hero-photo img{max-height:44vh}
  .sig{display:none}
}
"""
src = src.replace("/* ---------- hero ---------- */", hero_css + "\n/* ---------- hero (legacy) ---------- */")

# animate the headline lines + reveal the portrait
old_js = src[src.index("/* ---------- hero letters ---------- */"):src.index("/* ---------- reveal on scroll")]
new_js = """/* ---------- hero headline + portrait entrance ---------- */
requestAnimationFrame(function(){
  document.querySelectorAll(".head .ln").forEach(function(l,i){
    l.style.transition = "opacity 1.2s cubic-bezier(.16,1,.3,1) "+(0.15+i*0.14)+"s,"+
                         "transform 1.2s cubic-bezier(.16,1,.3,1) "+(0.15+i*0.14)+"s,"+
                         "filter 1.2s cubic-bezier(.16,1,.3,1) "+(0.15+i*0.14)+"s";
    l.style.opacity = 1; l.style.transform = "none"; l.style.filter = "blur(0)";
  });
  var p = document.getElementById("portrait");
  if (p) p.classList.add("in");
});

"""
src = src.replace(old_js, new_js)

(BASE / "index_cinematic.html").write_text(src, encoding="utf-8")
print("rebuilt:", len(src.encode()), "bytes")
print("photo embedded:", "data:image/webp" in src)
print("scroll wrapper removed:", "position=\"fixed\"" not in src and "scroller.style.position" not in src)
