#!/usr/bin/env python3
"""
MFC Laboratoire — Extracteur FDS Parfums v4
Multi-format : CPL Aromas (FR), Technico-Flor (EN), IFF, Givaudan, generic
Controle de doublons integre.

Usage : python3 fds-parser.py <fichier.pdf | dossier> [--output fichier.json]
"""

import sys, os, json, re, glob

try:
    import fitz
except ImportError:
    print("ERREUR: PyMuPDF requis. pip install pymupdf", file=sys.stderr)
    sys.exit(1)

# ── Utils ─────────────────────────────────────────────

RE_CAS = re.compile(r'(\d{2,7}-\d{2}-\d)')
RE_EINECS = re.compile(r'(\d{3}-\d{3}-\d)')

def validate_cas_checkdigit(cas_str):
    """Vérifier le check digit d'un numéro CAS.
    
    Le dernier chiffre est un check digit calculé ainsi :
    Pour un CAS abc...xyz-ab-C :
    - Retirer les tirets -> séquence de chiffres
    - Le dernier chiffre C est le check
    - Somme = 1*avant-dernier + 2*avant-avant-dernier + 3*... etc.
    - Check = somme % 10
    
    Source: Chemical Abstracts Service (CAS) Registry, ACS
    """
    digits = cas_str.replace('-', '')
    if len(digits) < 4:
        return False
    try:
        check = int(digits[-1])
        total = 0
        for i, d in enumerate(reversed(digits[:-1])):
            total += (i + 1) * int(d)
        return total % 10 == check
    except (ValueError, IndexError):
        return False

def is_valid_cas(cas_str):
    """Vérifier qu'un CAS est valide (format + check digit)."""
    if not RE_CAS.fullmatch(cas_str):
        return False
    # Check digit
    if not validate_cas_checkdigit(cas_str):
        return False
    # Exclure les CAS connus comme faux (dates, codes)
    if re.match(r'^(19|20)\d{2}', cas_str):
        return False
    return True

# Patterns de noms parasites (GHS, headers, réglementaire)
_BAD_NAME_RE = [
    re.compile(r'^CAS\s+\d', re.IGNORECASE),
    re.compile(r'^(FICHE|SAFETY\s+DATA|RUBRIQUE|SECTION)\b', re.IGNORECASE),
    re.compile(r'^(Skin\s|Eye\s|Flam\.|Aquatic|Acute\s|STOT\s|Asp\.\s|Repr\.)', re.IGNORECASE),
    re.compile(r'^(Facteur\s|Information\s|Rapport\s|règlement)', re.IGNORECASE),
    re.compile(r'^(EINECS|Page\s+\d|\[Page|Version\s|Date\s)', re.IGNORECASE),
    re.compile(r'^\?$'),
    re.compile(r'^-ONE\s'),
    re.compile(r'H\d{3}'),  # H-codes = classification GHS
    re.compile(r'^\d+\s*/\s*\d+$'),  # "3 / 7" page numbers
]

def is_valid_component_name(name):
    """Vérifie qu'un nom de composant n'est pas un artefact de parsing."""
    if not name or len(name.strip()) < 3:
        return False
    for pat in _BAD_NAME_RE:
        if pat.search(name):
            return False
    return True


def extract_text(pdf_path):
    doc = fitz.open(pdf_path)
    text = ""
    for page in doc:
        text += page.get_text() + "\n"
    doc.close()
    
    # Detect garbled text (CID fonts, control chars) — fallback to OCR
    printable_ratio = sum(1 for c in text[:500] if c.isprintable() or c in '\n\r\t') / max(len(text[:500]), 1)
    has_cas = bool(RE_CAS.search(text))
    cas_count = len(RE_CAS.findall(text))
    
    need_ocr = False
    if printable_ratio < 0.5 or (len(text) > 200 and not has_cas and text.count('\x00') > 10):
        need_ocr = True
    elif len(text) > 500 and cas_count < 2:
        # Le texte semble OK mais très peu de CAS trouvés — tableaux mal extraits ?
        # Tenter OCR en complément
        need_ocr = True
    
    if need_ocr:
        try:
            from PIL import Image
            import pytesseract
            doc = fitz.open(pdf_path)
            ocr_text = ""
            for page in doc:
                mat = fitz.Matrix(2.5, 2.5)  # 2.5x zoom for better OCR accuracy
                pix = page.get_pixmap(matrix=mat)
                img = Image.frombytes('RGB', [pix.width, pix.height], pix.samples)
                # Use tesseract with French + English, page segmentation mode 6 (block of text)
                page_text = pytesseract.image_to_string(img, lang='fra+eng', config='--psm 6')
                ocr_text += page_text + "\n"
            doc.close()
            ocr_cas_count = len(RE_CAS.findall(ocr_text))
            if ocr_cas_count > cas_count:
                return ocr_text  # OCR found more CAS — use it
            elif ocr_cas_count > 0 and cas_count == 0:
                return ocr_text
        except Exception as e:
            pass  # OCR not available
    
    return text

def get_section(text, start, end):
    """Extract section handling SECTION (EN), RUBRIQUE (FR), and bare number headers (Jean Niel: '3. COMPOSITION')."""
    # Strategy: try bare number headers FIRST (most reliable), then SECTION/RUBRIQUE
    
    # 1. Bare number headers like "3.  COMPOSITION" or "9.  PROPRIETES" (most reliable)
    p1b = rf'^{start}\.\s+[A-Z]{{3,}}'
    p2b = rf'^{end}\.\s+[A-Z]{{3,}}'
    m1b = re.search(p1b, text, re.MULTILINE)
    m2b = re.search(p2b, text, re.MULTILINE)
    if m1b and m2b: return text[m1b.start():m2b.start()]
    if m1b: return text[m1b.start():]
    
    # 2. SECTION/RUBRIQUE headers (exclude "modifiée/modified/mise à jour" mentions)
    p1 = rf'(?:SECTION|RUBRIQUE)\s*0?{start}\s*[:\.\s]'
    p2 = rf'(?:SECTION|RUBRIQUE)\s*0?{end}\s*[:\.\s]'
    matches1 = list(re.finditer(p1, text, re.IGNORECASE))
    matches2 = list(re.finditer(p2, text, re.IGNORECASE))
    # Filter out "Section X modifiée/modified" mentions
    skip_re = re.compile(r'modifi|mise\s*à\s*jour|updated|changed', re.IGNORECASE)
    m1 = None
    for m in matches1:
        context = text[m.start():m.start()+60]
        if not skip_re.search(context):
            m1 = m; break
    m2 = None
    for m in matches2:
        context = text[m.start():m.start()+60]
        if not skip_re.search(context):
            m2 = m; break
    if m1 and m2: return text[m1.start():m2.start()]
    if m1: return text[m1.start():]
    
    # Last fallback: look for section content markers
    # e.g. "Composants dangereux" for section 3, "Propriétés physi" for section 9
    markers_start = {
        3: r'omposants\s+dangereux\s*:',
        9: r'ropri.t.s\s+physi'
    }
    markers_end = {
        3: r'(?:RUBRIQUE|SECTION)\s*0?4|remiers\s+secours',
        9: r'(?:RUBRIQUE|SECTION)\s*0?10|tabilit'
    }
    if start in markers_start:
        m1c = re.search(markers_start[start], text, re.IGNORECASE)
        if m1c:
            line_start = text.rfind('\n', 0, m1c.start()) + 1
            if start in markers_end:
                m2c = re.search(markers_end[start], text[m1c.end():], re.IGNORECASE)
                if m2c: return text[line_start:m1c.end() + m2c.start()]
            return text[line_start:]
    
    return ""


# ── Section 1 : Identification (FR + EN) ─────────────

def is_fds_label(text):
    """Détecte si le texte est un label/titre de section FDS et non une vraie valeur."""
    t = text.strip().upper()
    # Labels exacts connus
    labels = [
        'NOM COMMERCIAL', 'NOM DE LA SUBSTANCE', 'NOM DE LA SUBSTANCE/MÉLANGE',
        'NOM DE LA SUBSTANCE/MELANGE', 'NOM DU PRODUIT', 'NOM DU MÉLANGE',
        'NOM DU MELANGE', 'PRODUCT NAME', 'TRADE NAME', 'SUBSTANCE NAME',
        'IDENTIFICATION DU PRODUIT', 'IDENTIFICATION DE LA SUBSTANCE',
        'IDENTIFICATION DE LA SOCIÉTÉ', 'IDENTIFICATION DE LA SOCIETE',
        'IDENTIFICATION DE LA SOCIÉTÉ/ENTREPRISE', 'IDENTIFICATION DE LA SOCIETE/ENTREPRISE',
        'IDENTIFICATEUR DE PRODUIT', 'DÉNOMINATION COMMERCIALE',
        'DENOMINATION COMMERCIALE', 'RÉFÉRENCE COMMERCIALE', 'REFERENCE COMMERCIALE',
        'COMPANY', 'FOURNISSEUR', 'PRODUCTEUR', 'FABRICANT', 'MANUFACTURER',
        'SUPPLIER', 'RAISON SOCIALE', 'SOCIÉTÉ', 'SOCIETE',
        'SECTION 1', 'SECTION 2', 'SECTION 3',
        'FICHE DE DONNÉES DE SÉCURITÉ', 'FICHE DE DONNEES DE SECURITE',
        'SAFETY DATA SHEET', 'MATERIAL SAFETY DATA SHEET',
        'DÉTAILS DU FOURNISSEUR', 'DETAILS DU FOURNISSEUR',
        'RENSEIGNEMENTS CONCERNANT', 'COORDONNÉES DU FOURNISSEUR',
        'COORDONNEES DU FOURNISSEUR',
        'COULEUR LIQUIDE POUR BOUGIES',
    ]
    if t in labels:
        return True
    # Patterns de labels (contiennent des mots-clés de structure FDS)
    label_patterns = [
        r'^SECTION\s+\d',
        r'^IDENTIFICATION\s+DE\s+(LA|LE|L)',
        r'^RUBRIQUE\s+\d',
        r'^NOM\s+(DE\s+LA|DU|COMMERCIAL)',
        r'^DÉNOMINATION',
        r'^DENOMINATION',
        r'^FICHE\s+DE\s+DONN',
        r'^SAFETY\s+DATA',
        r'^DETAILS?\s+(OF|DU|DE)',
        r'^[ÉE]DIT[ÉE]E?\s+LE',
        r'^DATE\s+D',
        r'^R[ÉE]VISION',
        r'^VERSION\s+\d',
        r'^PAGE\s+\d',
        r'^\d{2}/\d{2}/\d{4}',
        r'^COULEUR\s+LIQUIDE',
    ]
    for pat in label_patterns:
        if re.match(pat, t):
            return True
    return False


def parse_identification(text):
    s1 = get_section(text, 1, 2)
    info = {}

    # Product name (EN: "Product name :", "Trade name :", FR: "Dénomination commerciale" or "Nom du produit")
    # Givaudan: name appears after "Sales No. : DR-xxxx\nPRODUCT NAME"
    # Robertet: "Nom du produit:\n• PRODUCT NAME" or "Nom du produit:\nPRODUCT NAME"
    for pat in [
        r'Product\s+name\s*:\s*(.+)',
        r'Trade\s+name\s*:\s*(.+)',
        r'Nom\s+du\s+produit\s*:?\s*\n\s*•?\s*(.+)',      # Robertet: nom sur ligne suivante
        r'Nom\s+du\s+produit\s*:\s*(.+)',                    # Standard: nom sur même ligne
        r'[Dd][ée]nomination\s+commerciale\s*[:\s]*\n?\s*(.+)',
        r'R[ée]f[ée]rence\s+commerciale\s*\n\s*:\s*\S+\s*\n\s*(.+)',  # Givaudan Standard: name on 2nd line after ref
        r'commerciale\s*[:\s]*\n?\s*([A-Z][A-Z\s\-\'&]+)',
        r'Sales\s+No\.\s*:\s*\S+\s*\n\s*(.+)',              # Givaudan
        r'DESIGNATION\s*:\s*\n?\s*(.+)',                      # Robertet page continuation
        r'[Ii]dentification\s+de\s+produit\s*\n\s*(.+)',     # Jean Niel: name after "Identification de produit"
        r'[Ii]dentificateur\s+de\s+produit\s*\n\s*(.+)',    # APA: "Identificateur de produit\nCONCENTRE VIOLETTE..."
        r'[Nn]om\s+[Cc]ommercial\s*:\s*\n?\s*(.+)',           # PCW: "Nom Commercial :\nPOUDRE DE RIZ RW"
    ]:
        m = re.search(pat, s1)
        if m:
            nom = m.group(1).strip().split('\n')[0].strip()
            if nom and len(nom) > 1 and not is_fds_label(nom): info['nom'] = nom; break
    
    # Fallback: extract product name from page header (appears on every page)
    # Many FDS put the product name prominently in the header
    if 'nom' not in info:
        # Look in full text for header pattern: "Éditée le : DATE    PRODUCT NAME    Révision :"
        m = re.search(r'[ÉE]dit[ée]e?\s+le\s*:.*?\n\s*(.+?)\s*\n', text[:500])
        if m:
            candidate = m.group(1).strip()
            if candidate and len(candidate) > 2 and not candidate.startswith(('Fiche', 'Revision', '*')) and not re.match(r'^\d{2}/\d{2}/\d{4}', candidate) and not is_fds_label(candidate):
                info['nom'] = candidate
        # Also try: line after "Fiche de données de securité" 
        if 'nom' not in info:
            m = re.search(r'[Ff]iche\s+de\s+donn[ée]es\s+de\s+s[ée]curit[ée]\s*\n\s*(.+)', text[:500])
            if m:
                candidate = m.group(1).strip()
                if candidate and len(candidate) > 2 and not re.match(r'^\d', candidate) and not is_fds_label(candidate):
                    info['nom'] = candidate

    # Product code (EN: "Product code :", "Trade code :", FR: "Code du produit" or "Code commercial")
    for pat in [
        r'Product\s+code\s*:\s*(\S+)',
        r'Trade\s+code\s*:\s*(\S+)',
        r'Code\s+du\s+produit\s*:\s*(\S+)',
        r'Code\s+commercial\s*[:\s]*([A-Z0-9\-]+)',
        r'R[ée]f[ée]rence\s+commerciale\s*\n\s*:\s*(\S+)',  # Givaudan Standard: code on line after "Référence commerciale"
        r'Sales\s+No\.\s*:\s*(\S+)',  # Givaudan
    ]:
        m = re.search(pat, s1, re.IGNORECASE)
        if m: info['code'] = m.group(1).strip().rstrip('.'); break
    
    # Robertet: extract code from product name if pattern matches "NAME G NNN NNNNN"
    if 'code' not in info and 'nom' in info:
        m = re.search(r'(G\s*\d{3}\s+\d{4,6})', info['nom'])
        if m: info['code'] = m.group(1).replace('  ', ' ')

    # UFI
    m = re.search(r'UFI\s*:?\s*([A-Z0-9\-]{19,})', s1, re.IGNORECASE)
    if m: info['ufi'] = m.group(1).strip()

    # Supplier (EN: "Registered company name", FR: "fournisseur" or "Raison Sociale", Givaudan: "Company :", Robertet: "Producteur/fournisseur:\nNOM SA")
    for pat in [
        r'Registered\s+company\s+name\s*:\s*(.+)',
        r'supplier\s+of\s+the\s+safety\s+data\s+sheet\s*\n\s*(.+)',  # CPL EN: "Details of the supplier...\nCompany Name"
        r'Raison\s+[Ss]ociale\s*:\s*(.+)',
        r'Company\s*:\s*\n?\s*(.+)',
        r'[Pp]roducteur/fournisseur\s*:\s*\n?\s*(.+)',      # Robertet
        r'Soci[ée]t[ée]\s*\n\s*:\s*\n?\s*(.+)',              # Givaudan Standard: Société\n:\nCompany Name
        r'[Ff]ournisseur\s*:\s+(\S.+)',                       # Same-line: "Fournisseur : SAS PCW"
        r'(\S.+?)\s*\n\s*[Ff]ournisseur\s*:',                # PCW: name BEFORE "Fournisseur :"
        r'fournisseur.*?\n\s*(.+)',
    ]:
        m = re.search(pat, s1, re.IGNORECASE)
        if m: 
            supplier = m.group(1).strip().rstrip('.')
            # Skip false positives: pagination (1/10), phone numbers, blank, FDS labels
            if re.match(r'^\d+/\d+$', supplier) or re.match(r'^\+?\d[\d\s()-]+$', supplier) or len(supplier) < 3:
                continue
            if is_fds_label(supplier):
                continue
            # Clean: keep only company name (cut at comma, number, BP, Tel)
            supplier = re.split(r',\s*\d|,\s*BP|,\s*Tel|\s+\d{1,3}\s+(avenue|rue|boulevard)', supplier, flags=re.IGNORECASE)[0].strip()
            supplier = supplier.rstrip(',').strip()
            info['fournisseur'] = supplier
            break

    # Revision date
    m = re.search(r'[Vv]ersion\s+[\d.]+\s*\((\d{2}/\d{2}/\d{4})\)', text)
    if not m:
        m = re.search(r'[Dd]ate\s+de\s+r[ée]vision\s*[:\s]*(\d{2}/\d{2}/\d{4})', text)
    if not m:
        m = re.search(r'[Rr]evision\s+[Dd]ate\s+(\d{1,2}\s+[A-Z]{3}\s+\d{4})', text)  # Givaudan: "25 JUN 2024"
    if not m:
        m = re.search(r'[Rr][ée]vision\s*:\s*(\d{2}/\d{2}/\d{4})', text)  # Robertet: "Révision : 16/01/2019"
    if not m:
        m = re.search(r'[Rr][ée]vision\s*:.*?du\s+(\d{2}/\d{2}/\d{4})', text)  # Jean Niel: "Revision : 001NEW-3-CLP du 11/04/2024"
    if not m:
        m = re.search(r'[ÉE]dit[ée]\s+le\s*:\s*(\d{2}/\d{2}/\d{4})', text)  # Jean Niel: "Édité le : 11/04/2024"
    if m: info['date_revision'] = m.group(1)

    return info


# ── Section 2 : Classification (FR + EN) ─────────────

def parse_classification(text):
    s2 = get_section(text, 2, 3)
    dangers, seen = [], set()
    
    # H-phrases with descriptions (both languages)
    for m in re.finditer(r'(H\d{3})\s+(.{5,80}?)(?:\.|$)', s2, re.MULTILINE):
        code = m.group(1)
        if code not in seen:
            seen.add(code)
            dangers.append({'code': code, 'description': m.group(2).strip()})

    signal = ''
    m = re.search(r'(?:Signal\s+[Ww]ord|[Mm]ot\s+de\s+signal|[Mm]ention\s+d.avertissement)\s*:?\s*\n?\s*(WARNING|DANGER|Attention|Danger)', s2, re.IGNORECASE)
    if m: signal = m.group(1).strip()

    return {'mot_signal': signal, 'phrases_H': dangers}


# ── Section 3 : Composition — Multi-format ───────────

def detect_format(s3_text):
    """Detect FDS format based on Section 3 content."""
    if re.search(r'CAS:\s*\d', s3_text):
        return 'labeled'  # Technico-Flor / InfoDyne style (CAS: xxxxx)
    elif re.search(r'>=\s*\d+[\.,]?\d*\s*-\s*<\s*\d+', s3_text):
        return 'givaudan'  # Givaudan style (>= 5 - < 10)
    elif re.search(r'CAS#\s*\d', s3_text):
        return 'jeanniel'  # Jean Niel style (CAS# xxxxx ... [ MIN-MAX ])
    elif re.search(r'Pourcentage\s*%', s3_text) and re.search(r'\[\s*\d+\s*;\s*\d+\s*\]', s3_text):
        return 'pcw'  # PCW / Expressions Parfumées columnar format [ min;max ]
    elif re.search(r'No\s+CAS\s+D[ée]signation', s3_text):
        return 'charabot'  # Charabot tabular: No CAS | Designation | %
    elif re.search(r'Nom IUPAC', s3_text) and re.search(r'\[\s*[\d.]+\s*-\s*[\d.]+\s*\]', s3_text):
        return 'pcw'  # APA / CreaSens columnar format with [min-max]
    elif re.search(r'No CAS\n%', s3_text) or re.search(r'Numéro CE:', s3_text):
        return 'robertet'  # Robertet style (CAS\nNOM\nMIN- MAX\nNuméro CE:)
    elif re.search(r'N°\s*CAS\s*[:#]|CAS\s*N°|No\s*CAS\s*:', s3_text, re.IGNORECASE):
        return 'universal'  # Standard French FDS (N° CAS: xxxxx)
    elif re.search(r'^\d+\.?\d*\s*-\s*\d+', s3_text, re.MULTILINE):
        return 'tabular'  # CPL Aromas style (concentration first)
    else:
        return 'generic'


def parse_composition_pcw(s3):
    """Parse format PCW / Expressions Parfumées / colonnes empilées.
    
    Ce format a les données en colonnes verticales séparées (pas tabulaires) :
      Colonne 1: Noms des molécules (après 'Symbole danger' ou 'Matière')
      Colonne 2: Pourcentages [ min;max ] (après 'Pourcentage %')
      Colonne 3: CAS (numéros CAS empilés)
      Colonne 4: EINECS (ignoré)
      Colonne 5: Classification GHS (ignoré)
    
    Les colonnes sont empilées verticalement dans le texte extrait par PyMuPDF.
    On les ré-assemble par position (index 0→0, 1→1, etc.).
    """
    lines = s3.split('\n')
    
    # ── Trouver les marqueurs de début de chaque bloc ──
    name_start = None
    pct_start = None
    cas_start = None
    
    for i, L in enumerate(lines):
        stripped = L.strip()
        if stripped in ('Symbole danger', 'Symbole\ndanger') and name_start is None:
            name_start = i + 1
        if re.match(r'^Pourcentage\s*%?$', stripped) or (stripped == '%' and pct_start is None):
            pct_start = i + 1
        if re.match(r'^\d{2,7}-\d{2}-\d$', stripped) and cas_start is None:
            cas_start = i
    
    # APA variant: names → N° CAS → N° EINECS → REACH → Classification → %
    # In this case, pct_start > cas_start (% comes after CAS block)
    # We need to find the CAS block between "N° CAS" header and "N° EINECS" header
    cas_header = None
    for i, L in enumerate(lines):
        stripped = L.strip()
        if re.match(r'^N[°o]\s*CAS\s*$', stripped):
            cas_header = i + 1  # CAS block starts right after header
    
    # Fallback: si pas de 'Symbole danger', chercher après les lignes R/classification
    if name_start is None:
        for i, L in enumerate(lines):
            stripped = L.strip()
            # APA: names start after "Nom IUPAC"
            if stripped == 'Nom IUPAC':
                name_start = i + 1
                break
            if stripped in ('Composition :', 'Description :', 'Solvant :'):
                for j in range(i+1, min(i+5, len(lines))):
                    if lines[j].strip() and not lines[j].strip().startswith(('Composition', 'Description', 'Solvant', 'Mélange', 'Base parfumante', 'Isopropyl')):
                        name_start = j
                        break
                if name_start:
                    break
    
    if not name_start or not pct_start or not cas_start:
        # For APA format: if cas_header found, use it for CAS extraction
        if cas_header and not cas_start:
            cas_start = cas_header
        if not name_start or not pct_start or not cas_start:
            return []
    
    # Determine block boundaries based on column order
    # PCW: names → pcts → CAS  (pct_start < cas_start)
    # APA: names → CAS → ... → pcts  (cas_start < pct_start)
    apa_mode = cas_start < pct_start  # APA layout
    
    # ── Extraire les noms ──
    # Names end at the start of whichever block comes next
    if apa_mode:
        # APA: names between name_start and cas_header (or cas_start)
        name_end = (cas_header or cas_start) - 1
    else:
        # PCW: names between name_start and pct_start
        name_end = pct_start - 1
    
    raw_names = []
    skip_prefixes = ('Composition', 'Description', 'Solvant', 'Mélange', 'Base parfumante', 'Isopropyl Myristate',
                     'N°', 'Ne s', 'Version', 'Page', 'FICHE', 'Date', 'selon', 'CONCENTRE', '3.1', '3.2')
    for i in range(name_start, name_end):
        L = lines[i].strip()
        if not L or L.startswith(skip_prefixes):
            continue
        # Skip "N° CAS" header line
        if re.match(r'^N[°o]\s*CAS', L):
            continue
        # Nom coupé sur 2 lignes
        if raw_names and len(L) <= 8 and not re.match(r'^\d', L) and not re.match(r'^[A-Z][a-z]{3,}', L):
            prev = raw_names[-1]
            if prev.endswith('-') or prev.endswith('(') or len(L) <= 4:
                raw_names[-1] = prev + L
            else:
                raw_names.append(L)
        elif raw_names and lines[i-1].strip().endswith('-') and not re.match(r'^[A-Z][a-z]{4,}', L):
            raw_names[-1] += L
        else:
            raw_names.append(L)
    
    # ── Extraire les pourcentages [ min;max ] ou [min-max] ──
    pcts = []
    # Scan from pct_start to end (or to cas_start if PCW order)
    pct_scan_end = cas_start if not apa_mode else len(lines)
    for i in range(pct_start, pct_scan_end):
        L = lines[i].strip()
        # Format PCW: [ 22;24 ]
        m = re.match(r'\[\s*([\d.,]+)\s*;\s*([\d.,]+)\s*\]', L)
        if m:
            pcts.append((float(m.group(1).replace(',', '.')), float(m.group(2).replace(',', '.'))))
            continue
        # Format APA: [5-10] or [0.1-5]
        m = re.match(r'\[\s*([\d.,]+)\s*-\s*([\d.,]+)\s*\]', L)
        if m:
            pcts.append((float(m.group(1).replace(',', '.')), float(m.group(2).replace(',', '.'))))
            continue
    
    # ── Extraire les CAS ──
    RE_CAS_LINE = re.compile(r'^(\d{2,7}-\d{2}-\d)$')
    cas_list = []
    # For APA: CAS between cas_start and the EINECS/classification blocks
    # For PCW: CAS after pct block to end
    cas_scan_start = cas_start
    cas_scan_end = pct_start if apa_mode else len(lines)
    for i in range(cas_scan_start, cas_scan_end):
        L = lines[i].strip()
        if RE_CAS_LINE.match(L):
            cas_list.append(L)
        elif re.match(r'^\d{3}-\d{3}-\d', L):
            continue  # EINECS — skip
        elif re.match(r'^(ATO|EHC|CAR|SCI|EHA|AH|EDI|FL|SS|REP|STO|ATD|ATI|EUH)', L):
            continue  # Classification — skip
        elif re.search(r'H\d{3}', L):
            continue  # H-codes — skip
        elif L.startswith(';') or L == '':
            continue
    
    # ── Assembler ──
    n = min(len(raw_names), len(pcts), len(cas_list))
    molecules = []
    for i in range(n):
        cas = cas_list[i]
        if not validate_cas_checkdigit(cas):
            corrected = _try_correct_cas_ocr(cas)
            if corrected:
                cas = corrected
        
        molecules.append({
            'cas': cas,
            'nom_chimique': raw_names[i],
            'concentration': f'{pcts[i][0]}-{pcts[i][1]}',
            'pourcentage_min': pcts[i][0],
            'pourcentage_max': pcts[i][1],
            'einecs': '',
            'classification': ''
        })
    
    return molecules


def parse_composition_charabot(s3):
    """Parse Charabot FDS format.
    
    Format: 'No CAS    Désignation Ident. phrases R    %'
    Each component has:
      CAS  Name  percentage  (on same line or spread)
      Numéro CE: xxx-xxx-x
      * Classification lines (GHS codes)
    """
    molecules = []
    lines = s3.split('\n')
    
    RE_COMP = re.compile(r'^\*?\s*(\d{2,7}-\d{2}-\d)\s+(.+?)\s+([\d]+[,.\d]+)\s*$')
    
    i = 0
    while i < len(lines):
        L = lines[i].strip()
        if L.startswith('*'):
            L = L[1:].strip()
        
        m = RE_COMP.match(L)
        if m:
            cas = m.group(1)
            nom = m.group(2).strip()
            pct = float(m.group(3).replace(',', '.'))
            
            # Check next lines for name continuation (multi-line names like "LILIAL (p-tert-Butyl-alpha-\n methylhydrocinnamic aldehyde)")
            j = i + 1
            while j < len(lines):
                nextL = lines[j].strip()
                if nextL.startswith('*'):
                    nextL = nextL[1:].strip()
                # Name continuation: doesn't start with known non-name patterns
                if nextL and not nextL.startswith('Numéro') and not nextL.startswith('Num') and \
                   not re.match(r'^(Acute|Skin|Eye|Aquatic|Repr|Flam|Asp|ATO|EHC|SCI|SS|CAR|EDI|AH|FL|STO|REP)', nextL) and \
                   not re.match(r'^H\d{3}', nextL) and not re.match(r'^\*?\s*\d{2,7}-\d{2}-\d', nextL) and \
                   not re.search(r'\d+[,.]\d{4}$', nextL) and \
                   not nextL.startswith('(Suite') and not nextL.startswith('Chronic') and \
                   nom.rstrip().endswith('-'):
                    nom = nom.rstrip() + nextL
                    j += 1
                else:
                    break
            
            if validate_cas_checkdigit(cas):
                molecules.append({
                    'cas': cas,
                    'nom_chimique': nom,
                    'concentration': str(pct),
                    'pourcentage_min': pct,
                    'pourcentage_max': pct,
                    'einecs': '',
                    'classification': ''
                })
            i = j
            continue
        i += 1
    
    return molecules


def parse_composition_jeanniel(s3):
    """Parse Jean Niel format: CAS# on line, EINECS#, substance name with GHS codes, [ MIN-MAX ]."""
    molecules = []
    lines = s3.split('\n')
    
    i = 0
    while i < len(lines):
        line = lines[i].strip()
        
        cas_m = re.match(r'^CAS#\s*(\d{2,7}-\d{2}-\d)', line)
        if cas_m:
            cas = cas_m.group(1)
            einecs = ''
            nom = ''
            conc = 0
            classif = ''
            
            j = i + 1
            while j < min(i + 20, len(lines)):
                nline = lines[j].strip()
                
                # EINECS
                ec_m = re.match(r'^EINECS#\s*([\d\-]+)', nline)
                if ec_m:
                    einecs = ec_m.group(1)
                    j += 1; continue
                
                # Skip INDEX#, REACH#, registration lines
                if re.match(r'^(INDEX#|REACH#|01-|xx|\(<?\d)', nline):
                    j += 1; continue
                
                # Skip Exempt lines
                if nline.startswith('Exempt') or nline.startswith('(<'):
                    j += 1; continue
                
                # Concentration bracket [ MIN-MAX ]
                conc_m = re.search(r'\[\s*([\d.]+)\s*-\s*([\d.]+)\s*\]', nline)
                if conc_m:
                    conc = round((float(conc_m.group(1)) + float(conc_m.group(2))) / 2, 2)
                    j += 1; break
                
                # H-phrases line
                if re.match(r'^H\d{3}', nline):
                    classif = (classif + ' ' + ' '.join(re.findall(r'H\d{3}', nline))).strip()
                    j += 1; continue
                
                # ATE line
                if nline.startswith('ATE'):
                    j += 1; continue
                
                # Page headers/footers
                if any(x in nline for x in ['JEAN NIEL', 'Fiche de Donn', '/15', 'Édité']):
                    j += 1; continue
                
                # Next CAS# or next section = done
                if re.match(r'^CAS#', nline) or re.match(r'^[34]\.\s+[A-Z]', nline):
                    break
                
                # Substance name (possibly with GHS codes after)
                if not nom and len(nline) > 2:
                    name_parts = re.split(r'\s+(?:AH|ATI|ATO|EDI|EHA|EHC|FL|REP|SCI|SS)\d', nline)
                    nom = name_parts[0].strip()
                    h_in_line = re.findall(r'H\d{3}', nline)
                    if h_in_line:
                        classif = (classif + ' ' + ' '.join(h_in_line)).strip()
                
                j += 1
            
            if cas and (nom or conc > 0):
                molecules.append({
                    'cas': cas, 'concentration': conc,
                    'nom_chimique': nom or f'CAS {cas}',
                    'einecs': einecs, 'classification': classif
                })
            i = j
        else:
            i += 1
    
    seen = set()
    return [m for m in molecules if m['cas'] not in seen and not seen.add(m['cas'])]


def parse_composition_robertet(s3):
    """Parse Robertet format: CAS on one line, name on next, concentration on next.
    Pattern:
        CAS_NUMBER
        CHEMICAL_NAME (possibly multiline)
        MIN,DD-  MAX,DD  (concentration range)
        Numéro CE: ...
        Classification H phrases
    """
    molecules = []
    lines = s3.split('\n')
    i = 0
    
    while i < len(lines):
        line = lines[i].strip()
        
        # Look for a CAS number on its own line
        cas_m = RE_CAS.match(line)
        if cas_m and len(line) < 20:  # CAS alone on line, not part of a longer text
            cas = cas_m.group(1)
            
            # Next line(s) = chemical name (may span multiple lines until concentration or Numéro CE)
            nom_parts = []
            j = i + 1
            conc_str = ''
            
            while j < len(lines):
                nline = lines[j].strip()
                
                # Check if this line is a concentration range (e.g. "10,00- 20,00" or "0,10-  1,00")
                conc_m = re.match(r'^([\d,\.]+)\s*-\s*([\d,\.]+)$', nline)
                if conc_m:
                    conc_str = nline
                    j += 1
                    break
                
                # Check if concentration is embedded in the name line (multiline name wrapping)
                conc_m2 = re.search(r'([\d,]+[\s,]*-\s*[\d,]+)\s*$', nline)
                if conc_m2 and not nline.startswith('Numéro') and not nline.startswith('N°'):
                    # Concentration at end of line — rest is name
                    conc_str = conc_m2.group(1)
                    name_part = nline[:conc_m2.start()].strip()
                    if name_part:
                        nom_parts.append(name_part)
                    j += 1
                    break
                    
                # If we hit Numéro CE or another CAS or H-phrase, stop collecting name
                if nline.startswith('Numéro CE') or nline.startswith('N° d') or RE_CAS.match(nline):
                    break
                # Skip page headers / footers
                if 'FICHE DE DONNEES' in nline or 'DESIGNATION' in nline or '(Suite' in nline or nline.startswith('Page:'):
                    j += 1
                    continue
                    
                nom_parts.append(nline)
                j += 1
            
            nom = ' '.join(nom_parts).strip()
            # Clean up name: remove trailing parentheses artifacts
            nom = re.sub(r'\s+', ' ', nom).strip()
            
            # Parse concentration range
            conc = 0
            if conc_str:
                conc_str = conc_str.replace(',', '.')
                cm = re.search(r'([\d.]+)\s*-\s*([\d.]+)', conc_str)
                if cm:
                    conc = round((float(cm.group(1)) + float(cm.group(2))) / 2, 2)
            
            # Look for Numéro CE and classification in subsequent lines
            einecs = ''
            classif = ''
            k = j
            while k < min(j + 6, len(lines)):
                kline = lines[k].strip()
                if RE_CAS.match(kline) and len(kline) < 20:
                    break  # Next component
                ec_m = re.search(r'Numéro CE:\s*([\d\-]+)', kline)
                if ec_m:
                    einecs = ec_m.group(1)
                h_m = re.findall(r'H\d{3}', kline)
                if h_m:
                    classif = (classif + ' ' + ' '.join(h_m)).strip()
                k += 1
            
            if cas and (nom or conc > 0):
                molecules.append({
                    'cas': cas,
                    'concentration': conc,
                    'nom_chimique': nom,
                    'einecs': einecs,
                    'classification': classif
                })
            
            i = j
        else:
            i += 1
    
    # Deduplicate by CAS
    seen = set()
    return [m for m in molecules if m['cas'] not in seen and not seen.add(m['cas'])]


def parse_composition_labeled(s3):
    """Parse format 'labeled' : CAS: xxx / EC: xxx / name / GHS / concentration."""
    molecules = []
    lines = [l.strip() for l in s3.split('\n') if l.strip()]
    
    i = 0
    while i < len(lines):
        line = lines[i]
        
        # Look for CAS: line
        cas_m = re.match(r'^CAS:\s*(\d{2,7}-\d{2}-\d)', line)
        if not cas_m:
            # Check for component WITHOUT CAS (e.g. "HYDROCARBONS")
            # These have a name followed by GHS/concentration but no CAS: line
            # Skip them for now — they'll be handled as "sans CAS"
            i += 1
            continue
        
        cas = cas_m.group(1)
        einecs = ''
        nom_parts = []
        h_codes = []
        concentration = ''
        
        j = i + 1
        while j < len(lines):
            L = lines[j]
            
            # New CAS = new block
            if re.match(r'^CAS:\s*\d', L):
                break
            
            # Stop markers
            if re.match(r'^(Specific\s+concentration|Limites\s+de\s+concentration)', L, re.IGNORECASE):
                break
            if re.match(r'^(Information\s+on\s+ingredients|Informations\s+sur\s+les\s+composants)', L, re.IGNORECASE):
                break
            
            # EC/EINECS
            ec_m = re.match(r'^EC:\s*(\d{3}-\d{3}-\d)', L)
            if ec_m:
                einecs = ec_m.group(1)
                j += 1; continue
            
            # REACH / INDEX — skip
            if re.match(r'^(REACH|INDEX):', L):
                j += 1; continue
            
            # Concentration: "10 <= x % < 25" or "0 <= x % < 2.5" or "[1] 2.5 <= x % < 10"
            conc_line = re.sub(r'^\[\d+\]\s*', '', L)  # Strip [1], [2] annotations
            conc_m = re.match(r'^([\d]+[,.]?\d*)\s*<=\s*x\s*%?\s*<\s*([\d]+[,.]?\d*)', conc_line)
            if conc_m:
                concentration = f"{conc_m.group(1)}-{conc_m.group(2)}"
                # This is the END of the block — everything after is next component
                j += 1
                break
            
            # GHS pictograms — skip
            if re.match(r'^GHS\d', L):
                j += 1; continue
            
            # Signal words — skip
            if L in ('Wng', 'Dgr', 'Warning', 'Danger'):
                j += 1; continue
            
            # M factor — skip
            if re.match(r'^M\s+(Acute|Chronic)\s*=', L):
                j += 1; continue
            
            # H-code lines (e.g. "Skin Irrit. 2, H315")
            h_m = re.findall(r'H\d{3}', L)
            if h_m and re.search(r'(Skin|Aquatic|Acute|Flam|Asp|Eye)', L):
                h_codes.extend(h_m)
                j += 1; continue
            
            # Page headers / footers — skip
            if re.match(r'^(SAFETY DATA|FICHE DE DONN|GROUPE|Made under|Version|\d+/\d+|Page\s)', L, re.IGNORECASE):
                j += 1; continue
            if 'InfoDyne' in L or 'infodyne' in L:
                j += 1; continue
            # Skip product name in page headers
            if re.match(r'^(KOBENHAVN|EGLANTINE|BLUE\s+AWAY|SLEEPLESS|KABINETT|KINA|MUSEET|AR\d{6})', L):
                j += 1; continue
            # Skip generic header patterns: "PRODUCT_NAME - CODE"
            if re.search(r'\b\d{5}\b', L) and re.search(r'(RT\d{5}|MKT\d{3})', L):
                j += 1; continue
            
            # Chemical name (what remains)
            if len(L) > 1 and not re.match(r'^\d', L):
                # Skip known header lines from all FDS formats
                if not re.match(r'^(SAFETY|GROUPE|Made under|Version|KOBENHAVN|EGLANTINE|AR\d)', L):
                    # Check if line is a continuation (ends with hyphen or starts lowercase)
                    if nom_parts and (nom_parts[-1].endswith('-') or L[0].islower()):
                        # Join with previous without space if hyphen
                        if nom_parts[-1].endswith('-'):
                            nom_parts[-1] = nom_parts[-1] + L
                        else:
                            nom_parts.append(L)
                    else:
                        nom_parts.append(L)
            
            j += 1
        
        if cas:
            nom = ' '.join(nom_parts).strip()
            nom = re.sub(r'\s+', ' ', nom)
            molecules.append({
                'cas': cas,
                'concentration': concentration,
                'nom_chimique': nom,
                'einecs': einecs,
                'classification': ','.join(sorted(set(h_codes)))
            })
        
        i = j
    
    # Deduplicate by CAS
    seen = set()
    unique = []
    for mol in molecules:
        if mol['cas'] not in seen:
            seen.add(mol['cas'])
            unique.append(mol)
    return unique


def parse_composition_givaudan(s3):
    """Parse format 'givaudan' : Chemical name / CAS-No. / EC-No. / Reg / Classification / Concentration."""
    molecules = []
    lines = [l.strip() for l in s3.split('\n') if l.strip()]
    
    # Regex for Givaudan concentration: ">= 5 - < 10" or ">= 0,1 - < 1" or ">= 0,025 - < 0,1" or ">= 0 - < 0,01"
    RE_CONC_GIV = re.compile(r'^>=\s*([\d,\.]+)\s*-\s*<\s*([\d,\.]+)\s*$')
    
    # Build blocks: split on concentration lines (which end each component)
    i = 0
    # Skip header lines
    while i < len(lines):
        if re.match(r'^(Hazardous components|Chemical name|CAS-No|EC-No|Registration|Classification|Concentration|\(REGULATION|3\.2|\d+\.\d+)', lines[i], re.IGNORECASE):
            i += 1; continue
        if 'Percent by' in lines[i] or 'weight]' in lines[i]:
            i += 1; continue
        break
    
    # Now parse blocks: accumulate lines until we hit a concentration
    current_lines = []
    while i < len(lines):
        L = lines[i]
        
        # Page headers/footers — skip
        if re.match(r'^(SAFETY DATA SHEET|according to|Administrative|Report Information|Sales &|Shipping Order|\d+/\d+$)', L, re.IGNORECASE):
            i += 1; continue
        if re.match(r'^Version\s+\d', L):
            i += 1; continue
        if re.match(r'^(Print Date|Revision Date)', L):
            i += 1; continue
        # Product name repeated in headers
        if re.match(r'^[A-Z][A-Z\s]+\d*$', L) and len(L) < 30 and not RE_CAS.search(L):
            # Could be product name header — check if it's NOT a chemical name
            # Chemical names usually have lowercase or special chars
            if L.isupper() or re.match(r'^[A-Z\s\d]+$', L):
                i += 1; continue
        
        # Stop at Section 4 / "For the full text"
        if re.match(r'^(SECTION\s*4|For the full text)', L, re.IGNORECASE):
            break
        
        conc_m = RE_CONC_GIV.match(L)
        if conc_m:
            # End of block — parse accumulated lines
            lo = conc_m.group(1).replace(',', '.')
            hi = conc_m.group(2).replace(',', '.')
            concentration = f"{lo}-{hi}"
            
            # Extract CAS, EINECS, name, H-codes from current_lines
            cas = ''
            einecs = ''
            nom_parts = []
            h_codes = []
            
            for cl in current_lines:
                # CAS number (standalone or first on line)
                cas_m = RE_CAS.search(cl)
                einecs_m = RE_EINECS.search(cl)
                
                # Skip acute toxicity lines
                if re.match(r'^(Acute\s+toxicity|Acute\s+oral|Acute\s+dermal|Acute\s+inhalation|M-Factor|specific\s+conc|mg/kg|>)', cl, re.IGNORECASE):
                    continue
                if 'toxicity' in cl.lower() or 'estimate' in cl.lower():
                    continue
                if re.match(r'^[\d\s,\.]+mg/kg', cl):
                    continue
                
                # Registration number — skip
                if re.match(r'^01-\d', cl):
                    continue
                
                # H-codes in classification lines
                h_found = re.findall(r'H\d{3}', cl)
                if h_found and re.search(r'(Skin|Aquatic|Acute|Flam|Asp|Eye|Repr|STOT|Dam|Sens|Irrit|Tox|Chronic)', cl):
                    h_codes.extend(h_found)
                    continue
                
                # Standalone H-code line (e.g. "H317" alone)
                if re.match(r'^H\d{3}$', cl):
                    h_codes.append(cl)
                    continue
                
                # Classification fragment without H-code (e.g. "Skin Sens. 1B;")
                if re.match(r'^(Skin|Eye|Aquatic|Acute|Flam|Asp|Repr|STOT|Dam)', cl) and ';' in cl:
                    h_found2 = re.findall(r'H\d{3}', cl)
                    h_codes.extend(h_found2)
                    continue
                
                # CAS number line (standalone number like 8000-66-6)
                if cas_m and not einecs_m and re.match(r'^\d{2,7}-\d{2}-\d$', cl.strip()):
                    if not cas:
                        cas = cas_m.group(1)
                    continue
                
                # EC/EINECS number line (xxx-xxx-x)
                if einecs_m and re.match(r'^\d{3}-\d{3}-\d$', cl.strip()):
                    if not einecs:
                        einecs = einecs_m.group(1)
                    continue
                
                # Secondary CAS (some have 2 CAS like 85940-32-5)
                if cas_m and cas and re.match(r'^\d+-\d+-\d$', cl.strip()):
                    continue
                
                # Number-only lines (EC or secondary CAS) — skip
                if re.match(r'^\d{3,}-\d+-\d+$', cl):
                    continue
                
                # Otherwise it's probably a name part
                # Skip: pure numbers, very short fragments, M-Factor lines
                if re.match(r'^(M-Factor|\d+$|>=|>|<)', cl):
                    continue
                if cl and len(cl) > 1 and not re.match(r'^\d+[\s,\.]+\d+$', cl):
                    nom_parts.append(cl)
            
            if cas or nom_parts:
                nom = ' '.join(nom_parts).strip()
                # Clean up: remove classification fragments leaked into name
                # Remove "Skin Sens. 1B;" type fragments
                nom = re.sub(r'\s*(?:Skin|Eye|Aquatic|Acute|Flam|Asp|Repr|STOT|Dam)\s+\w+[\.\s]*\d*\w*;?\s*H?\d*\s*', ' ', nom)
                # Remove "(= synonym)" only from start — keep actual parenthetical names
                nom = re.sub(r'^\s*\(=\s*', '', nom)
                # Remove leading "= " or "(" artifacts
                nom = re.sub(r'^[=\(\)\s]+', '', nom)
                # Remove trailing ")' artifacts
                nom = nom.strip().rstrip(')')
                # Remove SECTION header that leaked in
                nom = re.sub(r'SECTION\s+\d+\..*', '', nom, flags=re.IGNORECASE).strip()
                
                molecules.append({
                    'cas': cas,
                    'concentration': concentration,
                    'nom_chimique': nom,
                    'einecs': einecs,
                    'classification': ','.join(sorted(set(h_codes)))
                })
            
            current_lines = []
            i += 1
            continue
        
        current_lines.append(L)
        i += 1
    
    # Deduplicate by CAS
    seen = set()
    unique = []
    for mol in molecules:
        key = mol['cas'] if mol['cas'] else mol['nom_chimique']
        if key and key not in seen:
            seen.add(key)
            unique.append(mol)
    return unique


def parse_composition_tabular(s3):
    """Parse format 'tabular' : CPL Aromas style (concentration -> CAS -> EINECS -> H -> name)."""
    RE_CONC_TAB = re.compile(r'^([<>≤≥]\s*\d+\.?\d*|\d+\.?\d*\s*-\s*\d+\.?\d*)$')
    RE_CAS_STRICT = re.compile(r'^(\d{2,7}-\d{2}-\d)$')
    RE_EINECS_STRICT = re.compile(r'^(\d{3}-\d{3}-\d)$')
    RE_HLINE = re.compile(r'^H\d{3}')
    
    NOISE = [
        r'^Conc\s*%', r'^CAS$', r'^EINECS$', r'^Facteur', r'^Classification',
        r'^Description$', r'^DEC$', r'^REACH', r'^Page\s+\d+',
        r'^EU\s+20', r'^Non applicable', r'^Un mélange', r'^3\.\d',
        r'^SECTION', r'Fiche de donn', r'^M$', r'^CPL\s+Aromas',
    ]
    
    def is_noise(line):
        for p in NOISE:
            if re.match(p, line, re.IGNORECASE): return True
        return False
    
    lines = [l.strip() for l in s3.split('\n') if l.strip() and not is_noise(l)]
    molecules = []
    i = 0
    
    while i < len(lines):
        line = lines[i]
        if not RE_CONC_TAB.match(line):
            i += 1; continue
        
        conc = line
        cas = einecs = classif = ''
        nom_parts = []
        
        j = i + 1
        state = 'SEEK_CAS'
        
        while j < len(lines) and state != 'DONE':
            L = lines[j]
            if is_noise(L): j += 1; continue
            
            if state == 'SEEK_CAS':
                if RE_CAS_STRICT.match(L): cas = L; state = 'SEEK_EINECS'
                else: state = 'DONE'; continue
            elif state == 'SEEK_EINECS':
                if RE_EINECS_STRICT.match(L): einecs = L; state = 'COLLECT_H'
                else: state = 'COLLECT_H'; continue
            elif state == 'COLLECT_H':
                if RE_HLINE.match(L):
                    codes = re.findall(r'H\d{3}[a-z]?', L)
                    classif = ','.join(set(classif.split(',') + codes) - {''}) if classif else ','.join(codes)
                elif L.isdigit() and len(L) <= 2: state = 'SEEK_NAME'
                else: state = 'SEEK_NAME'; continue
            elif state == 'SEEK_NAME':
                if L.isdigit() and len(L) <= 2: pass
                elif re.match(r'^0[0-9]-\d{9}', L): pass  # REACH
                elif re.match(r'^\d-\d{2}-XXXX', L): pass  # DEC
                elif RE_CONC_TAB.match(L) or RE_CAS_STRICT.match(L): state = 'DONE'; continue
                else: nom_parts.append(L); state = 'COLLECT_NAME'
            elif state == 'COLLECT_NAME':
                if RE_CONC_TAB.match(L) or RE_CAS_STRICT.match(L) or is_noise(L):
                    state = 'DONE'; continue
                elif re.match(r'^0[0-9]-\d{9}', L) or re.match(r'^\d-\d{2}-XXXX', L): pass
                elif L.isdigit() and len(L) <= 2: pass
                else:
                    nom_parts.append(L)
                    if len(nom_parts) >= 3: state = 'DONE'; j += 1; continue
            j += 1
        
        if cas:
            nom = re.sub(r'\s+', ' ', ' '.join(nom_parts).strip())
            molecules.append({
                'cas': cas, 'concentration': conc,
                'nom_chimique': nom, 'einecs': einecs,
                'classification': classif
            })
        i = j if j > i + 1 else i + 1
    
    seen = set()
    return [m for m in molecules if m['cas'] not in seen and not seen.add(m['cas'])]


def parse_composition_generic(s3):
    """Generic parser: scan for CAS numbers and extract name + concentration from same/nearby lines.
    Works well with OCR output where CAS, name, and % appear on the same line."""
    molecules = []
    lines = s3.split('\n')
    
    for i, line in enumerate(lines):
        cas_m = RE_CAS.search(line)
        if not cas_m: continue
        cas = cas_m.group(1)
        
        # Skip EINECS-like patterns (3 digits - 3 digits - 1 digit)
        if re.match(r'^\d{3}-\d{3}-\d$', cas): continue
        
        # Extract name: text after CAS, before concentration
        after_cas = line[cas_m.end():].strip()
        
        # Look for concentration (number with comma or dot, possibly at end of line)
        conc_m = re.search(r'(\d+[.,]\d+|\d+)\s*$', after_cas)
        conc = 0
        name = after_cas
        if conc_m:
            try:
                conc = float(conc_m.group(1).replace(',', '.'))
                name = after_cas[:conc_m.start()].strip()
            except: pass
        
        # If no concentration on same line, check if it's on a separate column
        if conc == 0:
            # Try to find concentration at end of line (full line)
            conc_m2 = re.search(r'(\d+[.,]\d+)\s*$', line)
            if conc_m2:
                try: conc = float(conc_m2.group(1).replace(',', '.'))
                except: pass
        
        # Clean name: remove leading dots, asterisks, whitespace
        name = re.sub(r'^[\.\*\s]+', '', name).strip()
        # Remove trailing classification codes
        name = re.split(r'\s+(?:Skin|Eye|Flam|Asp|Acute|Aquatic|H\d{3})', name)[0].strip()
        
        if not name:
            # Try next line for name
            if i + 1 < len(lines):
                next_line = re.sub(r'^[\.\*\s]+', '', lines[i+1]).strip()
                if next_line and not next_line.startswith('Numéro') and not RE_CAS.search(next_line):
                    name = next_line
        
        # Look for EINECS in nearby lines
        einecs = ''
        for j in range(i+1, min(i+5, len(lines))):
            einecs_m = re.search(r'(?:Numéro\s*CE|EINECS)[:\s]*(\d{3}-\d{3}-\d)', lines[j])
            if einecs_m:
                einecs = einecs_m.group(1)
                break
            if RE_CAS.search(lines[j]): break  # Next molecule
        
        if cas and name and conc > 0:
            molecules.append({
                'cas': cas,
                'nom_chimique': name,
                'concentration': conc,
                'einecs': einecs,
                'classification': ''
            })
    
    # Dedup
    seen = set()
    return [m for m in molecules if m['cas'] not in seen and not seen.add(m['cas'])]


def parse_composition_universal(s3):
    """Parseur universel FDS — couvre les formats européens standard.
    
    Détecte les composants par blocs en cherchant les numéros CAS
    et en collectant le nom et la concentration dans les lignes voisines.
    
    Formats gérés :
      - 'N° CAS: 78-70-6' ou 'CAS N°: 78-70-6' ou 'CAS: 78-70-6' ou 'No CAS: 78-70-6'
      - 'Nom chimique: Linalol' ou 'Identification chimique: ...'
      - 'Concentration: 20 - 30 %' ou '20-30%' ou '>= 20 - < 30' ou '10 <= x % < 25'
      - CAS seul sur une ligne avec nom/concentration dans les 5 lignes suivantes
      - Format tabulaire avec CAS + nom + % sur la même ligne
    """
    molecules = []
    lines = s3.split('\n')
    used_lines = set()
    
    # ── PHASE 1 : Trouver tous les CAS dans le texte ──
    cas_positions = []
    cas_rejected = []  # Pour debug
    for i, line in enumerate(lines):
        for m in RE_CAS.finditer(line):
            cas = m.group(1)
            # Filtrer EINECS (format 2xx-xxx-x ou 3xx-xxx-x)
            if re.match(r'^[23]\d{2}-\d{3}-\d$', cas):
                continue
            # Filtrer les faux positifs (dates, codes produit)
            if re.match(r'^(19|20)\d{2}', cas):
                continue
            # Validation check digit CAS (Chemical Abstracts Service)
            if not validate_cas_checkdigit(cas):
                cas_rejected.append({'cas': cas, 'line': i, 'reason': 'check digit invalide'})
                continue
            cas_positions.append({'cas': cas, 'line': i, 'col': m.start()})
    
    if not cas_positions:
        return []
    
    # ── PHASE 2 : Pour chaque CAS, extraire nom + concentration ──
    for idx, cp in enumerate(cas_positions):
        cas = cp['cas']
        line_idx = cp['line']
        
        nom = ''
        concentration = ''
        pct_min = None
        pct_max = None
        einecs = ''
        classification = ''
        
        # Fenêtre de recherche : 3 lignes avant + 5 lignes après le CAS
        search_start = max(0, line_idx - 3)
        search_end = min(len(lines), line_idx + 6)
        
        # Limiter au prochain CAS si c'est plus proche
        if idx + 1 < len(cas_positions):
            next_cas_line = cas_positions[idx + 1]['line']
            search_end = min(search_end, next_cas_line)
        
        context_lines = [(j, lines[j].strip()) for j in range(search_start, search_end)]
        
        for j, L in context_lines:
            if j in used_lines:
                continue
            
            # Nom chimique — label explicite
            nom_m = re.match(r'^(?:Nom\s*chimique|Identification\s*chimique|Substance|Nom\s*du\s*composant|Chemical\s*name|Nom\s*IUPAC)\s*[:]\s*(.+)', L, re.IGNORECASE)
            if nom_m and not nom:
                nom = nom_m.group(1).strip()
                used_lines.add(j)
                continue
            
            # EINECS / EC
            ec_m = re.search(r'(?:EC|EINECS|Numéro\s*CE|CE)\s*[:#]?\s*(\d{3}-\d{3}-\d)', L, re.IGNORECASE)
            if ec_m:
                einecs = ec_m.group(1)
                used_lines.add(j)
                continue
            
            # Concentration — fourchette explicite
            # Format: 'Concentration: 20 - 30 %' ou '20 - 30' ou '>= 20 - < 30'
            conc_m = re.search(r'(?:Concentration|Teneur|%\s*en\s*poids)?\s*[:]?\s*(?:>=?\s*)?(\d+[.,]?\d*)\s*[-–]\s*(?:<\s*)?(\d+[.,]?\d*)\s*%?', L, re.IGNORECASE)
            if conc_m:
                # Make sure we're not matching the CAS number itself as a concentration
                match_text = conc_m.group(0)
                if cas not in match_text:
                    c1 = conc_m.group(1).replace(',', '.')
                    c2 = conc_m.group(2).replace(',', '.')
                    try:
                        v1, v2 = float(c1), float(c2)
                        if 0 < v1 <= 100 and 0 < v2 <= 100 and v2 >= v1:
                            pct_min, pct_max = v1, v2
                            concentration = f'{v1}-{v2}'
                            used_lines.add(j)
                            continue
                    except: pass
            
            # Concentration — format 'x <= x % < y' (Argeville/Robertet)
            conc_m2 = re.search(r'(\d+\.?\d*)\s*<=\s*x\s*%?\s*<\s*(\d+\.?\d*)', L)
            if conc_m2:
                try:
                    v1, v2 = float(conc_m2.group(1)), float(conc_m2.group(2))
                    if 0 <= v1 <= 100 and 0 < v2 <= 100:
                        pct_min, pct_max = v1, v2
                        concentration = f'{v1}-{v2}'
                        used_lines.add(j)
                        continue
                except: pass
            
            # Concentration — valeur unique '< 2.5%' ou '> 50%'
            conc_m3 = re.search(r'(?:Concentration\s*[:])?\s*[<>]=?\s*(\d+[.,]?\d*)\s*%', L, re.IGNORECASE)
            if conc_m3 and not pct_min:
                try:
                    v = float(conc_m3.group(1).replace(',', '.'))
                    if 0 < v <= 100:
                        if '<' in L:
                            pct_min, pct_max = 0, v
                        else:
                            pct_min, pct_max = v, 100
                        concentration = conc_m3.group(0).strip()
                        used_lines.add(j)
                        continue
                except: pass
            
            # Classification H-codes
            h_codes = re.findall(r'H\d{3}', L)
            if h_codes:
                classification = ','.join(sorted(set(h_codes)))
        
        # Si pas de nom trouvé par label, chercher un texte alphabétique proche du CAS
        if not nom:
            for j, L in context_lines:
                # Ligne avec surtout des lettres, pas de CAS, pas un header
                if (j != line_idx and j not in used_lines and 
                    len(L) > 3 and not RE_CAS.search(L) and
                    not re.match(r'^(RUBRIQUE|SECTION|SAFETY|Version|Page|\d)', L, re.IGNORECASE) and
                    not re.match(r'^(N°|No|CAS|EC|EINECS|REACH|INDEX|GHS|Skin|Eye|Flam|Wng|Dgr)', L, re.IGNORECASE) and
                    re.search(r'[a-zA-ZÀ-ÿ]{3,}', L)):
                    # Check it's not a concentration line
                    if not re.match(r'^\d+[.,]?\d*\s*[-–<>]', L):
                        nom = L.strip()
                        used_lines.add(j)
                        break
        
        # Aussi essayer d'extraire le nom et la concentration depuis la ligne du CAS
        cas_line = lines[line_idx].strip()
        before_cas = cas_line[:cas_line.find(cas)].strip()
        after_cas = cas_line[cas_line.find(cas) + len(cas):].strip()
        # Remove labels
        before_cas = re.sub(r'^(N°\s*CAS|CAS\s*N°|CAS|No\s*CAS)\s*[:#]?\s*', '', before_cas, flags=re.IGNORECASE).strip()
        after_cas = re.sub(r'^\s*[:#]?\s*', '', after_cas).strip()
        
        # Extract concentration from the line (after CAS) if not already found
        if not pct_min:
            inline_conc = re.search(r'(\d+[.,]?\d*)\s*[-–]\s*(\d+[.,]?\d*)\s*%', after_cas)
            if not inline_conc:
                inline_conc = re.search(r'(\d+[.,]?\d*)\s*[-–]\s*(\d+[.,]?\d*)\s*%', before_cas)
            if inline_conc:
                try:
                    v1 = float(inline_conc.group(1).replace(',', '.'))
                    v2 = float(inline_conc.group(2).replace(',', '.'))
                    if 0 < v1 <= 100 and 0 < v2 <= 100 and v2 >= v1:
                        pct_min, pct_max = v1, v2
                        concentration = f'{v1}-{v2}'
                        # Remove concentration from after_cas for name extraction
                        after_cas = after_cas[:inline_conc.start()].strip() + after_cas[inline_conc.end():].strip()
                except: pass
        
        # Remove trailing numbers (leftover concentration) for name extraction
        after_cas_clean = re.sub(r'\s*\d+[.,]?\d*\s*[-–]?\s*\d*[.,]?\d*\s*%?\s*$', '', after_cas).strip()
        
        if not nom:
            candidate = after_cas_clean if len(after_cas_clean) > len(before_cas) else before_cas
            if candidate and len(candidate) > 2 and re.search(r'[a-zA-ZÀ-ÿ]', candidate):
                nom = candidate
        
        if cas:
            molecules.append({
                'cas': cas,
                'nom_chimique': nom or f'CAS {cas}',
                'concentration': concentration,
                'pourcentage_min': pct_min,
                'pourcentage_max': pct_max,
                'einecs': einecs,
                'classification': classification
            })
    
    # Dedup by CAS
    seen = set()
    unique = []
    for mol in molecules:
        if mol['cas'] not in seen:
            seen.add(mol['cas'])
            unique.append(mol)
    return unique


# ── XY-based universal composition parser ─────────────

# Compiled regexes for XY parser
_XY_RE_CAS = re.compile(r'^(\d{2,7}-\d{2}-\d)$')
_XY_RE_PCT_BRACKET = re.compile(r'^\[\s*([\d.,]+)\s*[;-]\s*([\d.,]+)\s*\]$')
_XY_RE_PCT_GIVAUDAN = re.compile(r'^(>=?\s*)?([\d.,]+)\s*-\s*(<?\s*)?([\d.,]+)$')
_XY_RE_PCT_LT = re.compile(r'^<\s*([\d.,]+)$')
_XY_RE_PCT_PLAIN = re.compile(r'^(\d+[.,]\d{2,})$')
_XY_RE_EINECS = re.compile(r'^\d{3}-\d{3}-\d')
_XY_RE_REACH = re.compile(r'^01-\d{7}')

_XY_SKIP_PATTERNS = [
    re.compile(r'^(Xn|Xi|N|F|T\+|C|O|E)\b.*R\d'),
    re.compile(r'^R\d'),
    re.compile(r'^(ATO|EHC|CAR|SCI|EHA|AH|EDI|FL|SS|REP|STO|ATD|ATI|EUH)'),
    re.compile(r'^[;,]?\s*H\d{3}'),
    re.compile(r'^(Mélange|Révision|Éditée|Version|Page|Date|\d+/\d+|FICHE|selon|Suite|DESIGNATION)'),
    re.compile(r'^01-\d'),
    re.compile(r'^\d+-\d{2}-[A-Z]{4}'),
    re.compile(r'^Numéro'),
    re.compile(r'^\*\s*(Acute|Skin|Eye|Aquatic|Repr|Flam|Chronic)'),
]
_XY_SKIP_EXACT = {
    'Matière', 'Symbole danger', 'Pourcentage %', 'C.A.S', 'EINECS',
    'Classification GHS', 'Classification', '%', 'CAS', 'N° CAS',
    'N° EINECS', 'Nom IUPAC', 'Composition :', 'Description :',
    'Solvant :', 'Base parfumante', 'Isopropyl Myristate',
    'Désignation', 'No CAS', 'Ident. phrases R', 'Nom chimique',
    'Caractérisation chimique', 'Composants dangereux:', 'M',
    'Règlement n°1272/2008', 'N°', 'enregistrement', 'REACH',
}

def _xy_parse_pct(text):
    """Parse percentage value from various formats."""
    text = text.strip()
    if _XY_RE_REACH.match(text):
        return None
    m = _XY_RE_PCT_BRACKET.match(text)
    if m:
        return float(m.group(1).replace(',', '.')), float(m.group(2).replace(',', '.'))
    m = _XY_RE_PCT_GIVAUDAN.match(text)
    if m:
        vmin = float(m.group(2).replace(',', '.'))
        vmax = float(m.group(4).replace(',', '.'))
        if vmax <= 100:
            return vmin, vmax
        return None
    m = _XY_RE_PCT_LT.match(text)
    if m:
        return 0, float(m.group(1).replace(',', '.'))
    m = _XY_RE_PCT_PLAIN.match(text)
    if m and not _XY_RE_EINECS.match(text):
        val = float(m.group(1).replace(',', '.'))
        if val <= 100:
            return val, val
    return None

def _xy_is_skip(text):
    """Check if text is a non-name element (classification, header, etc.)."""
    if text in _XY_SKIP_EXACT:
        return True
    for pat in _XY_SKIP_PATTERNS:
        if pat.match(text):
            return True
    return False

def extract_composition_xy(pdf_path):
    """Universal composition extractor using XY coordinates from PyMuPDF.
    
    CAS-anchored strategy:
    1. Extract all text items with (x,y) positions from PDF
    2. Find CAS numbers → define table zone and CAS column
    3. Group items into rows by Y-coordinate
    4. For each row with a CAS: pick up name (left of CAS) and % 
    5. Handle multi-line names via continuation rows
    
    Works with ALL FDS formats regardless of column ordering.
    """
    import fitz
    doc = fitz.open(pdf_path)
    
    all_items = []
    page_height = doc[0].rect.height
    
    # ── Find Section 3 pages (between SECTION 3 and SECTION 4) ──
    s3_start = None
    s3_end = len(doc)
    for pnum in range(len(doc)):
        page_text = doc[pnum].get_text()
        if s3_start is None and re.search(r'(?:SECTION|RUBRIQUE)\s*0?3\b', page_text, re.IGNORECASE):
            s3_start = pnum
        elif s3_start is not None and re.search(r'(?:SECTION|RUBRIQUE)\s*0?4\b', page_text, re.IGNORECASE):
            s3_end = pnum
            break
    
    if s3_start is None:
        doc.close()
        return []
    
    for pnum in range(s3_start, s3_end):
        page = doc[pnum]
        for b in page.get_text('dict')['blocks']:
            if 'lines' not in b:
                continue
            for line in b['lines']:
                text = ' '.join([s['text'] for s in line['spans']]).strip()
                if text:
                    all_items.append((
                        round(line['bbox'][0]),
                        round(pnum * page_height + line['bbox'][1]),
                        text
                    ))
    
    # Find CAS numbers
    cas_items = [(x, y, t) for x, y, t in all_items if _XY_RE_CAS.match(t)]
    if not cas_items:
        doc.close()
        return []
    
    # CAS column median X and table Y range
    cas_x_median = sorted([i[0] for i in cas_items])[len(cas_items) // 2]
    table_y_min = min(i[1] for i in cas_items) - 30
    table_y_max = max(i[1] for i in cas_items) + 15
    
    # Filter to table zone and group into rows
    table_items = sorted(
        [(x, y, t) for x, y, t in all_items if table_y_min <= y <= table_y_max],
        key=lambda i: (i[1], i[0])
    )
    
    Y_TOL = 7
    rows = []
    cur_row, cur_y = [], None
    for x, y, t in table_items:
        if cur_y is None or abs(y - cur_y) > Y_TOL:
            if cur_row:
                rows.append(cur_row)
            cur_row = [(x, y, t)]
            cur_y = y
        else:
            cur_row.append((x, y, t))
    if cur_row:
        rows.append(cur_row)
    
    # Extract molecules from rows
    CAS_TOL = 25
    molecules = []
    
    for row in rows:
        row.sort(key=lambda i: i[0])
        cas, name_parts, pct, einecs = None, [], None, None
        
        for x, y, text in row:
            # CAS column
            if abs(x - cas_x_median) <= CAS_TOL and _XY_RE_CAS.match(text):
                cas = text
                continue
            # EINECS
            if _XY_RE_EINECS.match(text):
                einecs = text
                continue
            # Percentage
            p = _xy_parse_pct(text)
            if p:
                pct = p
                continue
            # Skip non-names
            if _xy_is_skip(text):
                continue
            # Name: items to the LEFT of CAS column
            if x < cas_x_median - CAS_TOL:
                name_parts.append(text.lstrip('* ¢').strip())
        
        if cas:
            # Validate CAS checkdigit
            valid_cas = cas
            if not validate_cas_checkdigit(cas):
                corrected = _try_correct_cas_ocr(cas)
                if corrected:
                    valid_cas = corrected
            
            molecules.append({
                'cas': valid_cas,
                'nom_chimique': ' '.join(name_parts).strip() or f'CAS {valid_cas}',
                'pourcentage_min': pct[0] if pct else None,
                'pourcentage_max': pct[1] if pct else None,
                'einecs': einecs or '',
                'concentration': f'{pct[0]}-{pct[1]}' if pct else '',
                'classification': ''
            })
        elif molecules and name_parts:
            # No CAS = name continuation of previous molecule
            cont = ' '.join(name_parts).strip()
            prev = molecules[-1]
            if prev['nom_chimique'].endswith('-') or prev['nom_chimique'].endswith('('):
                prev['nom_chimique'] += cont
            else:
                prev['nom_chimique'] += ' ' + cont
    
    doc.close()
    return molecules


def parse_composition(text):
    """Auto-detect format and parse Section 3."""
    s3 = get_section(text, 3, 4)
    
    # Nettoyage OCR : corriger les erreurs courantes
    # - 'l' ou 'I' dans les chiffres CAS → '1'
    # - 'O' dans les chiffres CAS → '0'  
    # - 'S' → '5', 'B' → '8' dans un contexte numérique CAS
    # Appliqué seulement dans le contexte d'un motif CAS-like
    def clean_ocr_cas(text_block):
        """Nettoyer les erreurs OCR dans les numéros CAS potentiels."""
        # Pattern: quelque chose qui ressemble à un CAS mais avec des lettres OCR
        # Ex: "78-7O-6" (O au lieu de 0), "l21-33-5" (l au lieu de 1)
        def fix_cas_like(match):
            s = match.group(0)
            s = s.replace('O', '0').replace('o', '0')
            s = s.replace('l', '1').replace('I', '1')
            s = s.replace('S', '5').replace('B', '8')
            return s
        # Match CAS-like patterns that may contain OCR errors
        return re.sub(r'[0-9OoIlSB]{2,7}-[0-9OoIlSB]{2}-[0-9OoIlSB]', fix_cas_like, text_block)
    
    s3 = clean_ocr_cas(s3)
    
    fmt = detect_format(s3)
    
    if fmt == 'labeled':
        result = parse_composition_labeled(s3)
    elif fmt == 'givaudan':
        result = parse_composition_givaudan(s3)
    elif fmt == 'jeanniel':
        result = parse_composition_jeanniel(s3)
    elif fmt == 'robertet':
        result = parse_composition_robertet(s3)
    elif fmt == 'pcw':
        result = parse_composition_pcw(s3)
    elif fmt == 'charabot':
        result = parse_composition_charabot(s3)
    elif fmt == 'universal':
        result = parse_composition_universal(s3)
    elif fmt == 'tabular':
        result = parse_composition_tabular(s3)
    else:
        result = []
    
    # Fallback: if detected parser returned nothing, try universal then generic then all
    if not result:
        result = parse_composition_universal(s3)
    if not result:
        result = parse_composition_generic(s3)
    if not result:
        r1 = parse_composition_labeled(s3)
        r2 = parse_composition_tabular(s3)
        r3 = parse_composition_givaudan(s3)
        r4 = parse_composition_robertet(s3)
        r5 = parse_composition_jeanniel(s3)
        r6 = parse_composition_generic(s3)
        r7 = parse_composition_universal(s3)
        r8 = parse_composition_pcw(s3)
        r9 = parse_composition_charabot(s3)
        result = max([r1, r2, r3, r4, r5, r6, r7, r8, r9], key=len)
    
    # ── Post-traitement : convertir concentration string → pourcentage_min/max numériques ──
    result = _normalize_concentrations(result)
    
    # ── Post-traitement : valider les CAS avec check digit ──
    result = _validate_cas_numbers(result)
    
    return result


def _parse_number(s):
    """Parse un nombre avec virgule ou point décimal."""
    s = s.strip().replace(',', '.')
    try:
        return float(s)
    except ValueError:
        return None


def _validate_cas_numbers(components):
    """Valider et corriger les numéros CAS des composants.
    
    - Vérifie le check digit CAS (algorithme Chemical Abstracts Service)
    - Tente de corriger les CAS avec un chiffre OCR erroné (1 seule erreur)
    - Marque les CAS non valides
    
    Source: Chemical Abstracts Service Registry Number check digit algorithm
    """
    validated = []
    for comp in components:
        cas = comp.get('cas', '')
        if not cas:
            validated.append(comp)
            continue
        
        if validate_cas_checkdigit(cas):
            # CAS valide
            validated.append(comp)
        else:
            # Tenter de corriger un chiffre OCR erroné
            corrected = _try_correct_cas_ocr(cas)
            if corrected:
                comp_copy = dict(comp)
                comp_copy['cas'] = corrected
                comp_copy['cas_original'] = cas
                comp_copy['cas_corrige'] = True
                validated.append(comp_copy)
            else:
                # CAS invalide et non corrigeable — on le marque
                comp_copy = dict(comp)
                comp_copy['cas_invalide'] = True
                comp_copy['nom_chimique'] = comp.get('nom_chimique', '') + ' (CAS invalide)'
                validated.append(comp_copy)
    
    return validated


def _try_correct_cas_ocr(cas_str):
    """Tenter de corriger un CAS avec une erreur OCR (1 seul chiffre faux).
    
    Erreurs OCR courantes sur les FDS scannées :
    - 0 ↔ 8 (forme similaire)
    - 1 ↔ 7 (forme similaire)
    - 5 ↔ 6 (forme similaire)
    - 3 ↔ 8 (forme similaire)
    - 9 ↔ 0 (forme similaire)
    
    On teste toutes les substitutions possibles d'un seul chiffre
    et on vérifie si le résultat a un check digit valide.
    """
    digits_only = cas_str.replace('-', '')
    if len(digits_only) < 4:
        return None
    
    # Reconstruire le format CAS à partir des positions de tirets
    parts = cas_str.split('-')
    if len(parts) != 3:
        return None
    
    candidates = []
    flat = list(digits_only)
    
    for pos in range(len(flat)):
        original = flat[pos]
        for replacement in '0123456789':
            if replacement == original:
                continue
            test = flat.copy()
            test[pos] = replacement
            test_str = ''.join(test)
            # Reconstruire avec tirets
            p1_len = len(parts[0])
            p2_len = len(parts[1])
            cas_test = f"{test_str[:p1_len]}-{test_str[p1_len:p1_len+p2_len]}-{test_str[p1_len+p2_len:]}"
            if validate_cas_checkdigit(cas_test):
                candidates.append(cas_test)
    
    if len(candidates) == 1:
        # Une seule correction possible — très probable
        return candidates[0]
    elif len(candidates) > 1:
        # Plusieurs corrections possibles — croiser avec la base de molécules connues
        # Charger les CAS connus de molecule-engine
        try:
            import subprocess, json as _json
            result = subprocess.run(
                ['node', '-e', 'const m=require("./modules/molecule-engine");process.stdout.write(JSON.stringify(Object.keys(m.MOLECULE_DB)))'],
                capture_output=True, text=True, timeout=5
            )
            known_cas = set(_json.loads(result.stdout))
            matching = [c for c in candidates if c in known_cas]
            if len(matching) == 1:
                return matching[0]
        except:
            pass
        return None
    
    return None


def _normalize_concentrations(components):
    """Convertir 'concentration' string en pourcentage_min/pourcentage_max numériques.
    Gère les formats :
      - '30-50' ou '30.0-50.0' (standard)
      - '>= 30 - < 50' (IFF/Givaudan)
      - '10 <= x % < 25' (Argeville/Robertet)
      - '2,5-10' (virgule décimale)
      - '< 2.5' (plage haute uniquement)
      - '> 50' (plage basse uniquement)
    """
    RE_RANGE = re.compile(r'([\d]+[,.]?\d*)\s*-\s*([\d]+[,.]?\d*)')
    RE_IFF = re.compile(r'>=?\s*([\d]+[,.]?\d*)\s*-\s*<\s*([\d]+[,.]?\d*)')
    RE_ARGEVILLE = re.compile(r'([\d]+\.?\d*)\s*<=\s*x\s*%?\s*<\s*([\d]+\.?\d*)')
    RE_LESS_THAN = re.compile(r'<\s*([\d]+[,.]?\d*)')
    RE_GREATER_THAN = re.compile(r'>\s*([\d]+[,.]?\d*)')
    
    for comp in components:
        conc = comp.get('concentration', '')
        if not conc:
            continue
        
        # Si c'est déjà un nombre (certains parsers retournent un float)
        if isinstance(conc, (int, float)):
            if conc > 0:
                comp['pourcentage_min'] = 0
                comp['pourcentage_max'] = conc
            continue
        
        conc = str(conc).strip()
        pmin, pmax = None, None
        
        # Format IFF : ">= 30 - < 50"
        m = RE_IFF.search(conc)
        if m:
            pmin = _parse_number(m.group(1))
            pmax = _parse_number(m.group(2))
        
        # Format Argeville : "10 <= x % < 25"
        if pmin is None:
            m = RE_ARGEVILLE.search(conc)
            if m:
                pmin = _parse_number(m.group(1))
                pmax = _parse_number(m.group(2))
        
        # Format standard : "30-50" ou "2.5-10"
        if pmin is None:
            m = RE_RANGE.search(conc)
            if m:
                pmin = _parse_number(m.group(1))
                pmax = _parse_number(m.group(2))
        
        # Format "< 2.5"
        if pmin is None:
            m = RE_LESS_THAN.search(conc)
            if m:
                pmin = 0
                pmax = _parse_number(m.group(1))
        
        # Format "> 50"
        if pmin is None:
            m = RE_GREATER_THAN.search(conc)
            if m:
                pmin = _parse_number(m.group(1))
                pmax = 100
        
        # Assigner si trouvé
        if pmin is not None and pmax is not None:
            # S'assurer que min < max
            if pmin > pmax:
                pmin, pmax = pmax, pmin
            comp['pourcentage_min'] = pmin
            comp['pourcentage_max'] = pmax
    
    return components


# ── Section 9 : Properties (FR + EN) ─────────────────

def parse_properties(text):
    s9 = get_section(text, 9, 10)
    p = {}

    # Flash point (FR: "Point éclair" / "Point d'éclair", EN: "Flash point")
    # Robertet: "Point d'éclair:\n82 °C" or ">=    100 °C"
    # IFF: "Flash point : 273 °F (134 °C)" or "Flash point\n: 174.20 °F (79.00 °C)"
    # IFF section 5: "Flash point : 174.20 °F (79.00 °C)" in firefighting section
    
    # Search in section 9 + section 5 + full text as fallback
    search_zones = [s9]
    s5 = get_section(text, 5, 6)
    if s5:
        search_zones.append(s5)
    search_zones.append(text)  # full text as last resort
    
    for zone in search_zones:
        if 'flash_point_c' in p:
            break
            
        # IFF-specific: extract °C from "X °F (Y °C)" format FIRST
        for pat in [
            r'[Ff]lash\s*[Pp]oint\s*[:\s·]*\n?\s*:?\s*[\d.]+\s*°?\s*F\s*\(\s*(\d+\.?\d*)\s*°?\s*C\s*\)',   # IFF: "Flash point : 273 °F (134 °C)"
            r'[Ff]lash\s*[Pp]oint\s*[:\s·]*\n?\s*:?\s*[<>]=?\s*[\d.]+\s*°?\s*F\s*\(\s*[<>]=?\s*(\d+\.?\d*)\s*°?\s*C\s*\)',   # IFF: ">= 200 °F (>= 93 °C)"
            r'[Pp]oint.*?[ée]clair\s*[:\s]*\n?\s*:?\s*[\d.]+\s*°?\s*F\s*\(\s*(\d+\.?\d*)\s*°?\s*C\s*\)',   # FR+IFF: "Point éclair : 174 °F (79 °C)"
            r'(\d+\.?\d*)\s*°\s*F\s*\(\s*(\d+\.?\d*)\s*°\s*C\s*\)',  # Generic: any "XX °F (YY °C)" near flash context
        ]:
            m = re.search(pat, zone)
            if m:
                # Last pattern has 2 groups (F and C)
                if m.lastindex and m.lastindex >= 2:
                    p['flash_point_c'] = m.group(2).strip()
                else:
                    p['flash_point_c'] = m.group(1).strip()
                p['flash_point_source'] = 'IFF_F_C'
                break
        
        if 'flash_point_c' in p:
            break
        
        # Standard FR/EN patterns
        for pat in [
            r"clair\s*:?\s*\n\s*(?:[<>]=?\s*)?(\d+\.?\d*)\s*°",          # FR next line (Robertet)
            r"[Ee]clair\s*[^:]*\n\s*:\s*(?:[<>]=?\s*)?(\d+\.?\d*)\s*°",  # Jean Niel: "Point Eclair (...)\n: >60 °C"
            r"clair\s*[:\s]+(?:[<>]=?\s*)?(\d+\.?\d*)\s*°",               # FR same line
            r"[Pp]oint\s+[ée]clair\s*(?:\(°C\))?\s*[:\s]*(?:[<>]=?\s*)?(\d+\.?\d*)",
            r"[Ff]lash\s*[Pp]oint\s*\(?°?\s*C\)?\s*[:\s]*(?:[<>]=?\s*)?(\d+\.?\d*)",  # CPL EN: "Flash Point (°C) >70"
            r"[Ff]lash\s*[Pp]oint\s*[:\s·]*\n?\s*:?\s*(?:FP\s*)?(?:[<>]=?\s*)?(\d+\.?\d*)\s*°?\s*C",  # EN: "Flash point : 79 °C"
            r"[Ff]lash\s*[Pp]oint\s*[:\s·]*\n?\s*:?\s*(?:[<>]=?\s*)?(\d+\.?\d*)\s*°?\s*F",            # EN Fahrenheit only (convert)
        ]:
            m = re.search(pat, zone)
            if m: 
                val = m.group(1).strip()
                # Check if this is Fahrenheit (last pattern)
                if '°F' in m.group(0) or '° F' in m.group(0) or pat.endswith("F"):
                    try:
                        celsius = round((float(val) - 32) * 5 / 9, 1)
                        p['flash_point_c'] = str(celsius)
                        p['flash_point_f'] = val
                        p['flash_point_source'] = 'converted_F'
                    except:
                        p['flash_point_c'] = val
                else:
                    p['flash_point_c'] = val
                # Check if original text had >= or > prefix
                full = m.group(0)
                if '>=' in full:
                    p['flash_point_note'] = '>= ' + p['flash_point_c'] + '°C'
                elif '>' in full and 'Point' not in full[:10]:
                    p['flash_point_note'] = '> ' + p['flash_point_c'] + '°C'
                break

    # Density (FR: "Densité", EN: "Density")
    # Robertet: "Densité relative :\n0,9540 -     0,9740  (20°C)"
    for pat in [
        r'[Dd]ensit[ée]\s+relative\s*:?\s*\n?\s*([\d,\.]+)\s*(?:-\s*[\d,\.]+)?',  # Robertet range
        r'[Dd]ensit[ée]\s*[^[]*\[\s*([\d,\.]+)\s*;\s*([\d,\.]+)\s*\]',            # Jean Niel: [0.9170;0.9370] (flexible)
        r'[Dd]ensit[ée]\s*[:\s]*([\d,\.]+)',
        r'[Dd]ensity\s*[:\s]*(\d+\.?\d*)',
    ]:
        m = re.search(pat, s9)
        if m: 
            if m.lastindex and m.lastindex >= 2:
                # Range — average
                v1 = float(m.group(1).replace(',', '.'))
                v2 = float(m.group(2).replace(',', '.'))
                p['densite'] = str(round((v1 + v2) / 2, 4))
            else:
                p['densite'] = m.group(1).strip().replace(',', '.')
            break

    # Boiling point
    for pat in [
        r"[ée]bullition\s*[:\s]*([<>]?\s*\d+\.?\d*)",
        r"[Bb]oiling\s+point.*?[:\s]*([<>]?\s*\d+\.?\d*)",
    ]:
        m = re.search(pat, s9, re.IGNORECASE)
        if m: p['ebullition_c'] = m.group(1).strip(); break

    # Viscosity
    for pat in [
        r'[Vv]iscosit[ée]\s*[:\s]*(\d+\.?\d*)',
        r'[Vv]iscosity.*?[:\s]*(?:v\s*[<>]\s*)?(\d+\.?\d*)\s*mm',
    ]:
        m = re.search(pat, s9)
        if m: p['viscosite'] = m.group(1).strip(); break

    # Physical state
    for pat in [r'[ÉEé]tat\s+[Pp]hysique\s*:\s*(.+?)\.', r'[ÉEé]tat\s*[:\s]*(\w+)', r'Physical\s+state\s*:\s*\n?\s*(.+?)\.']:
        m = re.search(pat, s9)
        if m:
            val = m.group(1).strip()
            if val.lower() not in ('non', 'not'):
                p['etat'] = val; break

    # Colour
    for pat in [r'[Cc]ouleur\s*[:\s]*(.+?)(?:\n|$)', r'[Cc]olou?r\s*\n\s*(.+?)(?:\n|$)']:
        m = re.search(pat, s9)
        if m:
            val = m.group(1).strip()
            if val.lower() not in ('unspecified', 'not stated', 'not specified'):
                p['couleur'] = val
            break

    # Water solubility
    for pat in [r'[Hh]ydrosolub.*?[:\s]*(Non|Oui)', r'[Ww]ater\s+solub.*?[:\s]*(Insoluble|Soluble)']:
        m = re.search(pat, s9, re.IGNORECASE)
        if m: p['hydrosolubilite'] = m.group(1).strip(); break

    return p


# ── Assemblage ───────────────────────────────────────

def parse_fds(pdf_path):
    text = extract_text(pdf_path)
    
    # ── Primary: XY-based universal parser (works with all formats) ──
    comp = extract_composition_xy(pdf_path)
    if comp:
        comp = _normalize_concentrations(comp)
        comp = _validate_cas_numbers(comp)
    
    # ── Fallback: text-based parsers (for scanned PDFs or edge cases) ──
    if not comp:
        comp = parse_composition(text)  # includes its own normalize + validate
    
    ident = parse_identification(text)
    
    # ── Nettoyage central des noms composants ──
    # Remplace les noms parasites (GHS, headers, réglementaire) par CAS {num}
    for c in comp:
        nom = c.get('nom_chimique', '')
        if not is_valid_component_name(nom):
            cas = c.get('cas', '')
            c['nom_chimique'] = f'CAS {cas}' if cas else '?'

    return {
        'fichier': os.path.basename(pdf_path),
        'identification': ident,
        'classification_globale': parse_classification(text),
        'composition': comp,
        'proprietes_physiques': parse_properties(text),
        'nb_composants': len(comp),
        '_meta': {
            'parseur': 'MFC fds-parser v5 (XY)' if comp else 'MFC fds-parser v5 (text fallback)',
            'statut': 'brut',
        }
    }


# ── Duplicate Control ────────────────────────────────

def deduplicate_results(results):
    """Remove duplicate FDS based on product name + code."""
    seen = set()
    unique = []
    dupes = []
    for r in results:
        ident = r.get('identification', {})
        key = (ident.get('nom', '').upper().strip(), ident.get('code', '').strip())
        # Also dedupe by filename (without timestamp prefix)
        fname = re.sub(r'^\d+-', '', r.get('fichier', ''))
        if key in seen or fname in seen:
            dupes.append(r.get('fichier', ''))
            continue
        seen.add(key)
        seen.add(fname)
        unique.append(r)
    return unique, dupes


# ── CLI ──────────────────────────────────────────────

def main():
    if len(sys.argv) < 2:
        print("Usage: python3 fds-parser.py <fichier.pdf | dossier> [--output f.json]")
        sys.exit(1)
    path = sys.argv[1]
    output = None
    if '--output' in sys.argv:
        idx = sys.argv.index('--output')
        output = sys.argv[idx + 1] if idx + 1 < len(sys.argv) else 'fds-resultats.json'
    
    results = []
    if os.path.isfile(path) and (path.lower().endswith('.pdf') or not os.path.splitext(path)[1]):
        # Accept .pdf files and files without extension (multer temp uploads)
        results.append(parse_fds(path))
    elif os.path.isdir(path):
        pdfs = sorted(glob.glob(os.path.join(path, '*.pdf')) + glob.glob(os.path.join(path, '*.PDF')))
        total = len(pdfs)
        print(json.dumps({'event': 'start', 'total': total}), flush=True)
        for idx, pdf in enumerate(pdfs):
            print(json.dumps({'event': 'progress', 'current': idx+1, 'total': total, 'fichier': os.path.basename(pdf)}), flush=True)
            try:
                results.append(parse_fds(pdf))
            except Exception as e:
                print(json.dumps({'event': 'error', 'fichier': os.path.basename(pdf), 'erreur': str(e)}), flush=True)
        # Deduplicate
        results, dupes = deduplicate_results(results)
        if dupes:
            print(json.dumps({'event': 'doublons', 'fichiers': dupes, 'count': len(dupes)}), flush=True)
        print(json.dumps({'event': 'done', 'count': len(results), 'doublons_retires': len(dupes)}), flush=True)
    else:
        print(json.dumps({'event': 'error', 'erreur': f'{path} non reconnu'}), flush=True)
        sys.exit(1)
    
    out = json.dumps(results, ensure_ascii=False, indent=2)
    if output:
        with open(output, 'w', encoding='utf-8') as f: f.write(out)
        print(json.dumps({'event': 'saved', 'path': output, 'count': len(results)}), flush=True)
    else:
        # Force UTF-8 on Windows — all output via buffer to avoid cp1252 mixing
        sys.stdout.flush()  # flush any pending print() output first
        sys.stdout.buffer.write(b'---JSON_START---\n')
        sys.stdout.buffer.write(out.encode('utf-8'))
        sys.stdout.buffer.write(b'\n')
        sys.stdout.buffer.flush()

if __name__ == '__main__':
    main()
