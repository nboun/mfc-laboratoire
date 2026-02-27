#!/usr/bin/env python3
"""Extract raw text sections from a FDS PDF for debugging."""
import fitz, sys, json, re

def get_section(text, start, end):
    pats = [rf'(?:SECTION|RUBRIQUE)\s*{start}[\s:.\-]+', rf'^{start}[\s:.\-]+\w']
    s = None
    for p in pats:
        m = re.search(p, text, re.MULTILINE | re.IGNORECASE)
        if m: s = m.start(); break
    if s is None: return ""
    epats = [rf'(?:SECTION|RUBRIQUE)\s*{end}[\s:.\-]+', rf'^{end}[\s:.\-]+\w']
    e = len(text)
    for p in epats:
        m = re.search(p, text[s+20:], re.MULTILINE | re.IGNORECASE)
        if m: e = s + 20 + m.start(); break
    return text[s:e][:3000]

if __name__ == '__main__':
    pdf_path = sys.argv[1]
    doc = fitz.open(pdf_path)
    text = ""
    for page in doc:
        text += page.get_text()
    doc.close()
    
    result = {
        "section_1": get_section(text, 1, 2),
        "section_3": get_section(text, 3, 4),
        "section_9": get_section(text, 9, 10),
        "full_text_length": len(text),
        "first_500_chars": text[:500]
    }
    
    sys.stdout.buffer.write(json.dumps(result, ensure_ascii=False).encode('utf-8'))
    sys.stdout.buffer.flush()
