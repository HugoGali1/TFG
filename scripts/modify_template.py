"""Modify Plantilla TFG.docx to improve heading spacing and page breaks.

Adds to heading styles:
- Heading 1: page-break-before + keep-with-next + spacing-before 36pt + spacing-after 18pt
- Heading 2: keep-with-next + spacing-before 24pt + spacing-after 12pt
- Heading 3: keep-with-next + spacing-before 18pt + spacing-after 8pt
"""
from docx import Document
from docx.shared import Pt
from docx.oxml.ns import qn
from docx.oxml import OxmlElement
import sys

SRC = r"C:\Users\Usuario\Downloads\TFG_Documentos_Prueba\Plantilla TFG.docx"
DST = r"C:\Users\Usuario\Documents\TFG\Plantilla TFG modificada.docx"

doc = Document(SRC)

print("=== Heading styles found ===")
for s in doc.styles:
    name = s.name or ""
    if "Heading" in name:
        print(f"  {name}  (type={s.type})")

def add_or_set(pPr, tag, **attrs):
    el = pPr.find(qn(tag))
    if el is None:
        el = OxmlElement(tag)
        pPr.append(el)
    for k, v in attrs.items():
        el.set(qn(k), str(v))
    return el

def configure_heading(style_name, page_break=False, space_before_pt=24, space_after_pt=12):
    try:
        s = doc.styles[style_name]
    except KeyError:
        print(f"  [skip] style '{style_name}' not found")
        return
    pPr = s.element.get_or_add_pPr()
    if page_break:
        add_or_set(pPr, "w:pageBreakBefore")
    add_or_set(pPr, "w:keepNext", **{"w:val": "1"})
    add_or_set(pPr, "w:keepLines", **{"w:val": "1"})
    add_or_set(pPr, "w:spacing",
               **{"w:before": str(space_before_pt * 20),
                  "w:after": str(space_after_pt * 20)})
    print(f"  [done] {style_name}: pageBreak={page_break}, before={space_before_pt}pt, after={space_after_pt}pt")

print("\n=== Modifying styles ===")
for name in ["Heading 1", "Heading 2", "Heading 3", "Título 1", "Título 2", "Título 3"]:
    try:
        s = doc.styles[name]
    except KeyError:
        continue
    if "1" in name:
        configure_heading(name, page_break=True, space_before_pt=36, space_after_pt=18)
    elif "2" in name:
        configure_heading(name, page_break=False, space_before_pt=24, space_after_pt=12)
    elif "3" in name:
        configure_heading(name, page_break=False, space_before_pt=18, space_after_pt=8)

doc.save(DST)
print(f"\n=== Saved: {DST} ===")
