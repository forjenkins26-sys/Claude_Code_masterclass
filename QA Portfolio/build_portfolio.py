"""Build the Netlify-ready single-file portfolio.

Netlify drag-drop of ONE file has no assets/ folder, so the CV is embedded as
base64 and handed over as a Blob on click. Re-run this after editing index.html
or replacing the resume; it always picks up whatever RESUME points at, so the
portfolio download can never drift from what the Naukri bot uploads.

    python build_portfolio.py
"""
import base64
from pathlib import Path

BASE   = Path(__file__).resolve().parent
SRC    = BASE / "index.html"
OUT    = BASE / "netlify_upload" / "index.html"
RESUME = Path(r"D:\My AI Automation Building\NaukriBot\Anand_Soni_SDET_QA_Automation_AI_Engineer.pdf")
FNAME  = "Anand_Soni_SDET_QA_Automation_AI_Engineer.pdf"

src = SRC.read_text(encoding="utf-8")
pdf = RESUME.read_bytes()
assert pdf[:4] == b"%PDF", f"not a PDF: {RESUME}"
b64 = base64.b64encode(pdf).decode()

btn = ('      <a href="#" id="dl-cv" class="btn btn-green"\n'
       '         aria-label="Download Anand Soni resume as PDF">&#11015; Download CV</a>')
anchor = '      <a href="#ai-tools" class="btn btn-outline">AI Projects</a>'
assert src.count(anchor) == 1, "hero CTA anchor not found"
src = src.replace(anchor, anchor + "\n" + btn)

script = f"""
<script id="cv-embed" type="application/octet-stream">{b64}</script>
<script>
(function () {{
  var link = document.getElementById('dl-cv');
  if (!link) return;
  link.addEventListener('click', function (e) {{
    e.preventDefault();
    var b64 = document.getElementById('cv-embed').textContent.trim();
    var bin = atob(b64), bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    var url = URL.createObjectURL(new Blob([bytes], {{ type: 'application/pdf' }}));
    var a = document.createElement('a');
    a.href = url; a.download = '{FNAME}';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () {{ URL.revokeObjectURL(url); }}, 4000);
  }});
}})();
</script>
</body>"""
assert src.count("</body>") == 1
src = src.replace("</body>", script)

OUT.parent.mkdir(exist_ok=True)
OUT.write_text(src, encoding="utf-8")
print(f"embedded : {RESUME.name}  ({len(pdf):,} bytes)")
print(f"built    : {OUT}  ({OUT.stat().st_size:,} bytes)")
