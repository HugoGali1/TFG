"""Hide bookmark visual markers in a docx by renaming them with `_` prefix.

Word convention: bookmarks whose name starts with `_` are considered "hidden"
and are not shown in the Bookmark dialog. Google Docs respects this convention
and does not render the bookmark icon next to such anchors.

The script:
1. Renames every <w:bookmarkStart w:name="X"> to w:name="_X"
2. Renames every <w:bookmarkEnd> (no name field, kept as-is by id)
3. Renames every <w:hyperlink w:anchor="X"> to w:anchor="_X"

This preserves the clickable TOC while hiding the visible markers.
"""
import sys
import zipfile
import shutil
import re
from pathlib import Path

SRC = Path(r"C:\Users\Usuario\Documents\TFG\MEMORIA.docx")
DST = SRC  # overwrite in place after backup
BACKUP = SRC.with_name("MEMORIA.docx.bak")

shutil.copy(SRC, BACKUP)
print(f"Backup: {BACKUP}")

# Read all entries
with zipfile.ZipFile(SRC, "r") as z:
    entries = {name: z.read(name) for name in z.namelist()}

# Process document.xml
xml = entries["word/document.xml"].decode("utf-8")

# Rename bookmarks: w:name="X"  ->  w:name="_X"  (only if X doesn't start with _)
# w:bookmarkStart context only
def fix_bookmark_names(match):
    full = match.group(0)
    name = match.group(1)
    if name.startswith("_"):
        return full
    return full.replace(f'w:name="{name}"', f'w:name="_{name}"')

before = xml
xml = re.sub(
    r'<w:bookmarkStart[^>]*\bw:name="([^"]+)"[^>]*/>',
    fix_bookmark_names,
    xml,
)
renamed_starts = before.count("<w:bookmarkStart") - xml.replace("_", "").count("<w:bookmarkStart")  # approx

# Rename hyperlink anchors: w:anchor="X"  ->  w:anchor="_X"
def fix_anchor(match):
    full = match.group(0)
    anchor = match.group(1)
    if anchor.startswith("_"):
        return full
    return full.replace(f'w:anchor="{anchor}"', f'w:anchor="_{anchor}"')

xml = re.sub(
    r'<w:hyperlink[^>]*\bw:anchor="([^"]+)"[^>]*>',
    fix_anchor,
    xml,
)

# Count results
bookmark_count = xml.count("<w:bookmarkStart")
hidden_count = len(re.findall(r'<w:bookmarkStart[^>]*\bw:name="_', xml))
anchor_count = len(re.findall(r'<w:hyperlink[^>]*\bw:anchor="', xml))
hidden_anchor_count = len(re.findall(r'<w:hyperlink[^>]*\bw:anchor="_', xml))

print(f"Total bookmarkStart:  {bookmark_count}")
print(f"  with _ prefix:      {hidden_count}")
print(f"Total hyperlinks:     {anchor_count}")
print(f"  with _ anchor:      {hidden_anchor_count}")

entries["word/document.xml"] = xml.encode("utf-8")

# Repack
with zipfile.ZipFile(DST, "w", zipfile.ZIP_DEFLATED) as z:
    for name, data in entries.items():
        z.writestr(name, data)

print(f"\nSaved: {DST}  ({DST.stat().st_size} bytes)")
