#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
MFC Laboratoire — Générateur de Compte-Rendu PDF
Rapport d'analyse de diffusion parfum × cire

Entrée : JSON sur stdin (données du diagnostic)
Sortie : PDF sur le chemin spécifié en argument
"""

import json
import sys
import os
from datetime import datetime

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm, cm
from reportlab.lib.colors import HexColor, white, black
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT, TA_JUSTIFY
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, HRFlowable, KeepTogether
)
from reportlab.pdfgen import canvas

# ═══ COULEURS MFC ═══
MFC_GOLD = HexColor('#B8860B')
MFC_DARK = HexColor('#2C1810')
MFC_WARM = HexColor('#8B6914')
MFC_BG = HexColor('#FAF8F5')
BLUE_COLD = HexColor('#1565C0')
ORANGE_HOT = HexColor('#E65100')
GREEN_OK = HexColor('#2E7D32')
RED_BAD = HexColor('#C62828')
GREY_TEXT = HexColor('#666666')
GREY_LIGHT = HexColor('#F5F5F5')
GREY_MED = HexColor('#E0E0E0')


def build_styles():
    """Créer les styles de paragraphe personnalisés MFC."""
    styles = getSampleStyleSheet()
    
    styles.add(ParagraphStyle(
        'MFC_Title', parent=styles['Title'],
        fontName='Helvetica-Bold', fontSize=20, textColor=MFC_DARK,
        spaceAfter=6, alignment=TA_LEFT
    ))
    styles.add(ParagraphStyle(
        'MFC_Subtitle', parent=styles['Normal'],
        fontName='Helvetica', fontSize=11, textColor=GREY_TEXT,
        spaceAfter=12
    ))
    styles.add(ParagraphStyle(
        'MFC_H2', parent=styles['Heading2'],
        fontName='Helvetica-Bold', fontSize=13, textColor=MFC_GOLD,
        spaceBefore=16, spaceAfter=8, borderWidth=0
    ))
    styles.add(ParagraphStyle(
        'MFC_H3', parent=styles['Heading3'],
        fontName='Helvetica-Bold', fontSize=10, textColor=MFC_DARK,
        spaceBefore=10, spaceAfter=4
    ))
    styles.add(ParagraphStyle(
        'MFC_Body', parent=styles['Normal'],
        fontName='Helvetica', fontSize=9, textColor=MFC_DARK,
        leading=13, spaceAfter=4, alignment=TA_JUSTIFY
    ))
    styles.add(ParagraphStyle(
        'MFC_Small', parent=styles['Normal'],
        fontName='Helvetica', fontSize=7.5, textColor=GREY_TEXT,
        leading=10, spaceAfter=2
    ))
    styles.add(ParagraphStyle(
        'MFC_Score', parent=styles['Normal'],
        fontName='Helvetica-Bold', fontSize=28, textColor=MFC_GOLD,
        alignment=TA_CENTER, spaceAfter=2
    ))
    styles.add(ParagraphStyle(
        'MFC_ScoreLabel', parent=styles['Normal'],
        fontName='Helvetica', fontSize=8, textColor=GREY_TEXT,
        alignment=TA_CENTER, spaceAfter=8
    ))
    return styles


def score_color(score):
    if score >= 7: return GREEN_OK
    if score >= 5: return ORANGE_HOT
    return RED_BAD


def add_header_footer(canvas_obj, doc):
    """En-tête et pied de page MFC."""
    canvas_obj.saveState()
    w, h = A4
    
    # En-tête : ligne dorée
    canvas_obj.setStrokeColor(MFC_GOLD)
    canvas_obj.setLineWidth(2)
    canvas_obj.line(20*mm, h - 15*mm, w - 20*mm, h - 15*mm)
    
    canvas_obj.setFont('Helvetica-Bold', 8)
    canvas_obj.setFillColor(MFC_GOLD)
    canvas_obj.drawString(20*mm, h - 13*mm, 'MFC LABORATOIRE')
    
    canvas_obj.setFont('Helvetica', 7)
    canvas_obj.setFillColor(GREY_TEXT)
    canvas_obj.drawRightString(w - 20*mm, h - 13*mm, 'Maison Francaise des Cires')
    
    # Pied de page
    canvas_obj.setStrokeColor(GREY_MED)
    canvas_obj.setLineWidth(0.5)
    canvas_obj.line(20*mm, 15*mm, w - 20*mm, 15*mm)
    
    canvas_obj.setFont('Helvetica', 6.5)
    canvas_obj.setFillColor(GREY_TEXT)
    canvas_obj.drawString(20*mm, 10*mm, f'Rapport genere le {datetime.now().strftime("%d/%m/%Y a %H:%M")} — MFC Laboratoire')
    canvas_obj.drawRightString(w - 20*mm, 10*mm, f'Page {doc.page}')
    
    # Filigrane discret
    canvas_obj.setFont('Helvetica', 6)
    canvas_obj.setFillColor(HexColor('#CCCCCC'))
    canvas_obj.drawCentredString(w/2, 10*mm, 'Document confidentiel — Propriete MFC')
    
    canvas_obj.restoreState()


def build_report(data, output_path):
    """Construire le PDF complet."""
    styles = build_styles()
    
    doc = SimpleDocTemplate(
        output_path, pagesize=A4,
        topMargin=22*mm, bottomMargin=22*mm,
        leftMargin=20*mm, rightMargin=20*mm
    )
    
    story = []
    
    fragrance = data.get('fragrance', '?')
    wax_name = data.get('wax_name', '?')
    rapport = data.get('rapport', {})
    charge = data.get('charge_max_scientifique', {})
    molecules = data.get('molecules', [])
    diagnostic = data.get('diagnostic', {})
    
    sf = rapport.get('score_froid', '?')
    sc = rapport.get('score_chaud', '?')
    sg = rapport.get('score_global', '?')
    
    # ═══ PAGE 1 : RÉSUMÉ EXÉCUTIF ═══
    story.append(Paragraph('COMPTE-RENDU D\'ANALYSE', styles['MFC_Title']))
    story.append(Paragraph('Diagnostic de diffusion parfum x cire', styles['MFC_Subtitle']))
    story.append(Spacer(1, 4*mm))
    
    # Info box
    info_data = [
        ['Parfum', fragrance],
        ['Cire', wax_name],
        ['Date d\'analyse', datetime.now().strftime('%d/%m/%Y')],
        ['Molecules analysees', str(len(molecules))],
        ['Methode', 'Clausius-Clapeyron x Stokes-Einstein'],
    ]
    info_table = Table(info_data, colWidths=[45*mm, 120*mm])
    info_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTNAME', (1, 0), (1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('TEXTCOLOR', (0, 0), (0, -1), MFC_GOLD),
        ('TEXTCOLOR', (1, 0), (1, -1), MFC_DARK),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('LINEBELOW', (0, 0), (-1, -2), 0.5, GREY_MED),
    ]))
    story.append(info_table)
    story.append(Spacer(1, 8*mm))
    
    # Scores principaux
    story.append(Paragraph('SCORES DE DIFFUSION', styles['MFC_H2']))
    
    score_data = [
        [
            Paragraph(f'<font size="24" color="{BLUE_COLD.hexval()}">{sf}/10</font>', styles['MFC_Score']),
            Paragraph(f'<font size="24" color="{ORANGE_HOT.hexval()}">{sc}/10</font>', styles['MFC_Score']),
            Paragraph(f'<font size="24" color="{score_color(sg if isinstance(sg, (int,float)) else 5).hexval()}">{sg}/10</font>', styles['MFC_Score']),
        ],
        [
            Paragraph('Diffusion a froid', styles['MFC_ScoreLabel']),
            Paragraph('Diffusion a chaud', styles['MFC_ScoreLabel']),
            Paragraph('Score global', styles['MFC_ScoreLabel']),
        ],
        [
            Paragraph(rapport.get('verdict_froid', ''), styles['MFC_Small']),
            Paragraph(rapport.get('verdict_chaud', ''), styles['MFC_Small']),
            Paragraph('', styles['MFC_Small']),
        ]
    ]
    score_table = Table(score_data, colWidths=[55*mm, 55*mm, 55*mm])
    score_table.setStyle(TableStyle([
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('BACKGROUND', (0, 0), (0, -1), HexColor('#E3F2FD')),
        ('BACKGROUND', (1, 0), (1, -1), HexColor('#FFF8E1')),
        ('BACKGROUND', (2, 0), (2, -1), HexColor('#F3E5F5')),
        ('BOX', (0, 0), (-1, -1), 0.5, GREY_MED),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, GREY_MED),
        ('TOPPADDING', (0, 0), (-1, 0), 8),
        ('BOTTOMPADDING', (0, -1), (-1, -1), 6),
    ]))
    story.append(score_table)
    story.append(Spacer(1, 6*mm))
    
    # Conclusion
    conclusion = rapport.get('conclusion', '')
    if conclusion:
        story.append(Paragraph('CONCLUSION', styles['MFC_H3']))
        story.append(Paragraph(conclusion, styles['MFC_Body']))
    
    story.append(Spacer(1, 6*mm))
    
    # ═══ CHARGE MAX SCIENTIFIQUE ═══
    if charge:
        story.append(Paragraph('CHARGE MAXIMALE DE PARFUM', styles['MFC_H2']))
        
        cm_display = charge.get('charge_display', '?')
        formule = charge.get('formule', {})
        params_p = charge.get('parametres_parfum', {})
        params_c = charge.get('parametres_cire', {})
        
        story.append(Paragraph(
            f'<b>Charge recommandee : <font color="{GREEN_OK.hexval()}" size="14">{cm_display}</font></b>',
            styles['MFC_Body']
        ))
        story.append(Spacer(1, 2*mm))
        
        story.append(Paragraph(
            f'<b>Formule :</b> {formule.get("description", "")}', styles['MFC_Body']
        ))
        story.append(Paragraph(
            f'Base {formule.get("base",12)}% x '
            f'Solubilite {formule.get("solubility_factor","?")} x '
            f'Cristaux {formule.get("crystal_factor","?")} x '
            f'Viscosite {formule.get("viscosity_factor","?")} x '
            f'Securite {formule.get("safety_factor","?")} = '
            f'<b>{formule.get("resultat","?")}%</b>',
            styles['MFC_Small']
        ))
        story.append(Spacer(1, 3*mm))
        
        # Paramètres mesurés
        params_data = [
            ['Parametre', 'Parfum', 'Cire'],
            ['Hildebrand (delta)', f'{params_p.get("delta_hildebrand_estime","?")} MPa^0.5', f'{params_c.get("delta_hildebrand","?")} MPa^0.5'],
            ['Flory-Huggins (chi)', str(params_p.get('chi_flory_huggins', '?')), ''],
            ['LogP moyen', str(params_p.get('logP_moyen', '?')), ''],
            ['Masse mol. moyenne', f'{params_p.get("masse_mol_moyenne","?")} g/mol', ''],
            ['Channel factor', '', str(params_c.get('channel_factor', '?'))],
            ['Viscosite', '', f'{params_c.get("viscosity","?")} cSt' if params_c.get('viscosity') else ''],
        ]
        
        params_table = Table(params_data, colWidths=[55*mm, 50*mm, 50*mm])
        params_table.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 0), (-1, -1), 8),
            ('TEXTCOLOR', (0, 0), (-1, 0), white),
            ('BACKGROUND', (0, 0), (-1, 0), MFC_GOLD),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [white, GREY_LIGHT]),
            ('GRID', (0, 0), (-1, -1), 0.5, GREY_MED),
            ('TOPPADDING', (0, 0), (-1, -1), 3),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ]))
        story.append(params_table)
        story.append(Spacer(1, 3*mm))
        
        # Facteurs détaillés
        for f in charge.get('facteurs', []):
            ic = '(+)' if f.get('impact') == 'positif' else '(-)' if f.get('impact') == 'negatif' else '(=)'
            col = GREEN_OK if f.get('impact') == 'positif' else RED_BAD if f.get('impact') == 'negatif' else ORANGE_HOT
            story.append(Paragraph(
                f'<font color="{col.hexval()}"><b>{ic} {f.get("nom","")}</b></font> — {f.get("valeur","")}',
                styles['MFC_Body']
            ))
            story.append(Paragraph(f'{f.get("explication","")}', styles['MFC_Small']))
    
    # ═══ PAGE 2 : ANALYSE DÉTAILLÉE ═══
    story.append(PageBreak())
    
    # Analyse froid
    analyse_froid = rapport.get('analyse_froid', [])
    if analyse_froid:
        story.append(Paragraph('ANALYSE DIFFUSION A FROID (bougie eteinte, 20 deg.C)', styles['MFC_H2']))
        for a in analyse_froid:
            ic = '(+)' if a.get('impact') == 'positif' else '(-)' if a.get('impact') == 'negatif' else '(=)'
            col = GREEN_OK if a.get('impact') == 'positif' else RED_BAD if a.get('impact') == 'negatif' else ORANGE_HOT
            story.append(Paragraph(
                f'<font color="{col.hexval()}"><b>{ic} {a.get("facteur","")}</b></font> : {a.get("valeur","")}',
                styles['MFC_Body']
            ))
            story.append(Paragraph(a.get('explication', ''), styles['MFC_Small']))
            loi = a.get('loi', '')
            if loi:
                story.append(Paragraph(
                    f'<font color="{BLUE_COLD.hexval()}"><i>Base scientifique : {loi}</i></font>',
                    styles['MFC_Small']
                ))
                story.append(Spacer(1, 1.5*mm))
    
    # Analyse chaud
    analyse_chaud = rapport.get('analyse_chaud', [])
    if analyse_chaud:
        story.append(Spacer(1, 4*mm))
        story.append(Paragraph(f'ANALYSE DIFFUSION A CHAUD (bougie allumee, bain de fusion)', styles['MFC_H2']))
        for a in analyse_chaud:
            ic = '(+)' if a.get('impact') == 'positif' else '(-)' if a.get('impact') == 'negatif' else '(=)'
            col = GREEN_OK if a.get('impact') == 'positif' else RED_BAD if a.get('impact') == 'negatif' else ORANGE_HOT
            story.append(Paragraph(
                f'<font color="{col.hexval()}"><b>{ic} {a.get("facteur","")}</b></font> : {a.get("valeur","")}',
                styles['MFC_Body']
            ))
            story.append(Paragraph(a.get('explication', ''), styles['MFC_Small']))
            loi = a.get('loi', '')
            if loi:
                story.append(Paragraph(
                    f'<font color="{BLUE_COLD.hexval()}"><i>Base scientifique : {loi}</i></font>',
                    styles['MFC_Small']
                ))
                story.append(Spacer(1, 1.5*mm))
    
    # Boosters et bloquants
    boosters = rapport.get('boosters', [])
    bloquants = rapport.get('bloquants', [])
    
    if boosters:
        story.append(Spacer(1, 4*mm))
        story.append(Paragraph('MOLECULES MOTRICES (BOOSTERS)', styles['MFC_H2']))
        boost_data = [['Molecule', 'Concentration', 'Masse mol.', 'Roles', 'Froid %', 'Chaud %']]
        for b in boosters[:8]:
            boost_data.append([
                b.get('nom', '?'), f'{b.get("pct","?")}%', str(b.get('mw', '?')),
                ', '.join(b.get('roles', [])),
                f'{b.get("contrib_froid","?")}%', f'{b.get("contrib_chaud","?")}%'
            ])
        boost_table = Table(boost_data, colWidths=[35*mm, 20*mm, 18*mm, 45*mm, 18*mm, 18*mm])
        boost_table.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 7.5),
            ('TEXTCOLOR', (0, 0), (-1, 0), white),
            ('BACKGROUND', (0, 0), (-1, 0), GREEN_OK),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [white, HexColor('#E8F5E9')]),
            ('GRID', (0, 0), (-1, -1), 0.5, GREY_MED),
            ('TOPPADDING', (0, 0), (-1, -1), 2),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
        ]))
        story.append(boost_table)
    
    if bloquants:
        story.append(Spacer(1, 4*mm))
        story.append(Paragraph('BLOQUANTS ET FREINS', styles['MFC_H2']))
        for b in bloquants[:5]:
            impact_txt = 'BLOQUANT' if b.get('impact') == 'bloquant' else 'FREIN'
            story.append(Paragraph(
                f'<font color="{RED_BAD.hexval()}"><b>{impact_txt} : {b.get("nom","?")}</b></font> ({b.get("pct","?")}%, MW {b.get("mw","?")})',
                styles['MFC_Body']
            ))
            for p in b.get('problemes', []):
                story.append(Paragraph(f'  - {p}', styles['MFC_Small']))
    
    # ═══ PAGE 3 : TABLEAU MOLÉCULAIRE ═══
    if molecules:
        story.append(PageBreak())
        story.append(Paragraph(f'DETAIL MOLECULAIRE — {len(molecules)} molecules analysees', styles['MFC_H2']))
        
        mol_data = [['Molecule', 'MW', '%', 'Eb. C', 'LogP', 'Pvap 20C', 'Pvap chaud', 'Comportement']]
        sorted_mols = sorted(molecules, key=lambda m: (m.get('cold_contribution',0) + m.get('hot_contribution',0)), reverse=True)
        
        for m in sorted_mols[:25]:
            name = (m.get('name') or m.get('cas', '?'))[:22]
            pvap_c = m.get('Pvap_cold')
            pvap_h = m.get('Pvap_hot')
            pvap_c_str = f'{pvap_c:.1e}' if pvap_c else '-'
            pvap_h_str = f'{pvap_h:.1e}' if pvap_h else '-'
            behavior = (m.get('behavior', '') or '')[:20]
            
            mol_data.append([
                name,
                str(m.get('mw', '?')),
                f'{m.get("pct", "?")}%',
                str(m.get('bp', m.get('Teb_estimated', '?'))),
                str(m.get('logp', '?')),
                pvap_c_str,
                pvap_h_str,
                behavior
            ])
        
        mol_table = Table(mol_data, colWidths=[32*mm, 14*mm, 12*mm, 14*mm, 12*mm, 20*mm, 20*mm, 32*mm])
        mol_table.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 6.5),
            ('TEXTCOLOR', (0, 0), (-1, 0), white),
            ('BACKGROUND', (0, 0), (-1, 0), MFC_GOLD),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [white, GREY_LIGHT]),
            ('GRID', (0, 0), (-1, -1), 0.3, GREY_MED),
            ('TOPPADDING', (0, 0), (-1, -1), 2),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ]))
        story.append(mol_table)
    
    # ═══ MÉTHODOLOGIE ═══
    story.append(Spacer(1, 8*mm))
    story.append(Paragraph('METHODOLOGIE', styles['MFC_H2']))
    story.append(Paragraph(
        'Ce rapport est genere par le moteur d\'analyse moleculaire MFC Laboratoire. '
        'Les calculs de diffusion utilisent la <b>loi de Clausius-Clapeyron</b> pour estimer '
        'la pression de vapeur des molecules a differentes temperatures, et la <b>loi de Stokes-Einstein</b> '
        'pour modeliser la diffusion des molecules dans la cire fondue en fonction de la viscosite.',
        styles['MFC_Body']
    ))
    story.append(Paragraph(
        'La charge maximale est calculee par le <b>parametre d\'interaction de Flory-Huggins</b> '
        'base sur les parametres de solubilite de Hildebrand du parfum et de la cire, '
        'modules par la structure cristalline (channel factor) et les contraintes de securite (point eclair).',
        styles['MFC_Body']
    ))
    story.append(Paragraph(
        'Les donnees physico-chimiques des molecules proviennent de <b>PubChem</b> (NIH), '
        'de la litterature scientifique (Barton 1991, Hansen 2007) et de mesures empiriques MFC. '
        'Les seuils olfactifs sont issus de la base <b>Leffingwell</b> et de la litterature publiee.',
        styles['MFC_Body']
    ))
    story.append(Spacer(1, 4*mm))
    story.append(Paragraph(
        '<b>Sources :</b> PubChem (pubchem.ncbi.nlm.nih.gov) | Clausius-Clapeyron (thermodynamique classique) | '
        'Stokes-Einstein (physique des fluides) | Flory-Huggins (theorie des solutions polymeres) | '
        'Hildebrand (parametres de solubilite, 1936) | Hansen (parametres etendus, 2007)',
        styles['MFC_Small']
    ))
    
    # Build
    doc.build(story, onFirstPage=add_header_footer, onLaterPages=add_header_footer)
    return output_path


if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Usage: python3 generate-report-pdf.py <output_path>", file=sys.stderr)
        sys.exit(1)
    
    data = json.load(sys.stdin)
    output_path = sys.argv[1]
    build_report(data, output_path)
    print(json.dumps({"success": True, "path": output_path}))
