// SESSION 21 — FICHES DE DONNÉES DE SÉCURITÉ KAISER COLORANTS
// 15 colorants analysés — Février 2026
// Sources : FDS REACH officielles Kaiser Lacke GmbH

async function seedSession21(db) {
    const check = await db.get("SELECT COUNT(*) as c FROM knowledge_base WHERE tags LIKE '%kaiser%fds%'");
    if (check.c > 0) { console.log('  ✓ Session 21 : fiches FDS Kaiser déjà présentes'); return; }

    const entries = [

        // ═══════════ KWC DYE BASE COLOR (granulés catalogue) ═══════════

        ['fournisseur', 'colorant', 'FDS — KWC DYE 240 orange (Réf 2803240)',
         "KWC DYE 240 orange — FICHE DE DONNÉES DE SÉCURITÉ\n" +
         "Réf : 2803240 | FDS v6.0.6 du 22.01.2020\n" +
         "Série : KWC base color (coloration dans la masse)\n\n" +
         "IDENTIFICATION :\n" +
         "Forme : Granulé | Couleur : Orange | Odeur : caractéristique\n\n" +
         "PROPRIÉTÉS PHYSIQUES :\n" +
         "État : Solide | Flash : >150°C | Densité : 0,96 g/cm³\n" +
         "Pression vapeur (<50°C) : <10 hPa\n\n" +
         "CLASSIFICATION CLP : Aucune\n" +
         "Composants dangereux : Aucun\n" +
         "Phrases H : Aucune\n\n" +
         "ENVIRONNEMENT :\n" +
         "WGK : 1 (faible danger pour l'eau) | TRGS 510 : classe 11\n" +
         "Non PBT, non vPvB, non perturbateur endocrinien\n\n" +
         "STOCKAGE : 20°C, à l'écart de la chaleur et des comburants\n" +
         "Incompatible : H₂O₂, comburants\n" +
         "Combustion : NOx + CO\n\n" +
         "STATUT MFC : ✅ Produit sûr — Alternative clean au DYE 390 orange (irritant)\n" +
         "EPI : Gants NR/butyle (EN ISO 374) + lunettes latérales",
         'Kaiser Lacke GmbH — FDS REACH 2803240', 1,
         'colorant,Kaiser,fds,KWC,DYE,240,orange,granulé,sécurité,WGK1,clean'],

        ['fournisseur', 'colorant', 'FDS — KWC DYE 250 red (Réf 2803250)',
         "KWC DYE 250 red — FICHE DE DONNÉES DE SÉCURITÉ\n" +
         "Réf : 2803250 | FDS v7.0.3 du 27.12.2019\n" +
         "Série : KWC base color (coloration dans la masse)\n\n" +
         "IDENTIFICATION :\n" +
         "Forme : Granulé | Couleur : Rouge | Odeur : caractéristique\n\n" +
         "PROPRIÉTÉS PHYSIQUES :\n" +
         "État : Solide | Flash : >150°C | Densité : 0,95 g/cm³\n" +
         "Pression vapeur (<50°C) : <10 hPa\n\n" +
         "CLASSIFICATION CLP : Aucune\n" +
         "Composants dangereux : Aucun\n" +
         "Phrases H : Aucune\n\n" +
         "ENVIRONNEMENT :\n" +
         "WGK : 1 (faible danger pour l'eau) | TRGS 510 : classe 11\n\n" +
         "STOCKAGE : 20°C, à l'écart de la chaleur et des comburants\n" +
         "Incompatible : H₂O₂, comburants\n" +
         "Combustion : NOx + CO\n\n" +
         "STATUT MFC : ✅ Produit sûr — Seul rouge primaire de la gamme KWC\n" +
         "EPI : Gants NR/butyle (EN ISO 374) + lunettes latérales",
         'Kaiser Lacke GmbH — FDS REACH 2803250', 1,
         'colorant,Kaiser,fds,KWC,DYE,250,red,rouge,granulé,sécurité,WGK1,clean'],

        ['fournisseur', 'colorant', 'FDS — KWC DYE 330 green (Réf 2803330)',
         "KWC DYE 330 green — FICHE DE DONNÉES DE SÉCURITÉ\n" +
         "Réf : 2803330 | FDS v6.0.6 du 22.01.2020\n" +
         "Série : KWC base color (coloration dans la masse)\n\n" +
         "IDENTIFICATION :\n" +
         "Forme : Granulé | Couleur : Vert foncé | Odeur : caractéristique\n\n" +
         "PROPRIÉTÉS PHYSIQUES :\n" +
         "État : Solide | Flash : >150°C | Densité : 0,95 g/cm³\n" +
         "Pression vapeur (<50°C) : <10 hPa\n\n" +
         "CLASSIFICATION CLP : Aucune\n" +
         "Composants dangereux : Aucun\n" +
         "Phrases H : Aucune\n\n" +
         "ENVIRONNEMENT :\n" +
         "WGK : nwg (sans danger pour l'eau — nicht wassergefährdend) | TRGS 510 : classe 11\n" +
         "Non PBT, non vPvB\n\n" +
         "STOCKAGE : 20°C, à l'écart de la chaleur et des comburants\n" +
         "Incompatible : H₂O₂, comburants\n" +
         "Combustion : NOx + CO\n\n" +
         "STATUT MFC : ✅ MEILLEUR PROFIL SÉCURITÉ de toute la gamme Kaiser\n" +
         "Seul colorant WGK nwg — à privilégier pour projets à exigences environnementales\n" +
         "EPI : Gants NR/butyle (EN ISO 374) + lunettes latérales",
         'Kaiser Lacke GmbH — FDS REACH 2803330', 1,
         'colorant,Kaiser,fds,KWC,DYE,330,green,vert,granulé,sécurité,WGK,nwg,clean'],

        ['fournisseur', 'colorant', 'FDS — KWC DYE 350 black (Réf 2803350)',
         "KWC DYE 350 black — FICHE DE DONNÉES DE SÉCURITÉ\n" +
         "Réf : 2803350 | FDS v6.0.6 du 22.01.2020\n" +
         "Série : KWC base color (coloration dans la masse)\n\n" +
         "IDENTIFICATION :\n" +
         "Forme : Granulé | Couleur : Noir | Odeur : caractéristique\n\n" +
         "PROPRIÉTÉS PHYSIQUES :\n" +
         "État : Solide | Flash : >140°C | Densité : 0,94 g/cm³\n" +
         "Pression vapeur (<50°C) : <10 hPa\n\n" +
         "CLASSIFICATION CLP : Aucune\n" +
         "Composants dangereux : Aucun\n" +
         "Phrases H : Aucune\n\n" +
         "ENVIRONNEMENT :\n" +
         "WGK : 2 (danger important pour l'eau) | TRGS 510 : classe 11\n\n" +
         "STOCKAGE : 20°C, à l'écart de la chaleur et des comburants\n" +
         "Incompatible : H₂O₂, comburants\n" +
         "Combustion : NOx + CO\n\n" +
         "STATUT MFC : ⚠️ Pas de composant dangereux mais WGK 2\n" +
         "Préférer le liquiDYE 340 black (WGK 1) quand possible\n" +
         "EPI : Gants NR/butyle (EN ISO 374) + lunettes latérales",
         'Kaiser Lacke GmbH — FDS REACH 2803350', 1,
         'colorant,Kaiser,fds,KWC,DYE,350,black,noir,granulé,sécurité,WGK2'],

        ['fournisseur', 'colorant', 'FDS — KWC DYE 366 black (Réf 2803366)',
         "KWC DYE 366 black — FICHE DE DONNÉES DE SÉCURITÉ\n" +
         "Réf : 2803366 | FDS v6.0.6 du 22.01.2020\n" +
         "Série : KWC base color (coloration dans la masse)\n\n" +
         "IDENTIFICATION :\n" +
         "Forme : Granulé | Couleur : Noir | Odeur : caractéristique\n\n" +
         "PROPRIÉTÉS PHYSIQUES :\n" +
         "État : Solide | Flash : >140°C | Densité : 0,99 g/cm³\n" +
         "Pression vapeur (<50°C) : <10 hPa\n\n" +
         "CLASSIFICATION CLP : EUH210 (FDS sur demande)\n" +
         "⚠️ COMPOSANT DANGEREUX :\n" +
         "Sudan Red B — CAS 85-83-6 — Concentration : 2,5 à 10%\n" +
         "Classification : Skin Irrit. 2 (H315), Eye Irrit. 2 (H319)\n\n" +
         "ENVIRONNEMENT :\n" +
         "WGK : 3 (très grave danger pour l'eau) | TRGS 510 : classe 11\n\n" +
         "STOCKAGE : 20°C, à l'écart de la chaleur et des comburants\n" +
         "Incompatible : H₂O₂, comburants\n" +
         "Combustion : NOx + CO\n\n" +
         "STATUT MFC : 🔴 PRODUIT LE PLUS DANGEREUX DE LA GAMME\n" +
         "WGK 3 + Sudan Red B irritant — ÉVITER si possible\n" +
         "Préférer DYE 350 ou liquiDYE 340 pour le noir\n" +
         "EPI OBLIGATOIRES : Gants NR/butyle + lunettes latérales + crème barrière",
         'Kaiser Lacke GmbH — FDS REACH 2803366', 1,
         'colorant,Kaiser,fds,KWC,DYE,366,black,noir,granulé,sécurité,WGK3,SudanRedB,CAS85-83-6,irritant,H315,H319'],

        ['fournisseur', 'colorant', 'FDS — KWC DYE 380 yellow (Réf 2803380)',
         "KWC DYE 380 yellow — FICHE DE DONNÉES DE SÉCURITÉ\n" +
         "Réf : 2803380 | FDS v6.0.6 du 22.01.2020\n" +
         "Série : KWC base color (coloration dans la masse)\n\n" +
         "IDENTIFICATION :\n" +
         "Forme : Granulé | Couleur : Jaune | Odeur : caractéristique\n\n" +
         "PROPRIÉTÉS PHYSIQUES :\n" +
         "État : Solide | Flash : >150°C | Densité : 0,95 g/cm³\n" +
         "Pression vapeur (<50°C) : <10 hPa\n\n" +
         "CLASSIFICATION CLP : Aucune\n" +
         "Composants dangereux : Aucun\n" +
         "Phrases H : Aucune\n\n" +
         "ENVIRONNEMENT :\n" +
         "WGK : 1 (faible danger pour l'eau) | TRGS 510 : classe 11\n\n" +
         "STOCKAGE : 20°C, à l'écart de la chaleur et des comburants\n" +
         "Incompatible : H₂O₂, comburants\n" +
         "Combustion : NOx + CO\n\n" +
         "STATUT MFC : ✅ Produit sûr\n" +
         "EPI : Gants NR/butyle (EN ISO 374) + lunettes latérales",
         'Kaiser Lacke GmbH — FDS REACH 2803380', 1,
         'colorant,Kaiser,fds,KWC,DYE,380,yellow,jaune,granulé,sécurité,WGK1,clean'],

        ['fournisseur', 'colorant', 'FDS — KWC DYE 390 orange (Réf 2803390)',
         "KWC DYE 390 orange — FICHE DE DONNÉES DE SÉCURITÉ\n" +
         "Réf : 2803390 | FDS v6.0.7 du 22.01.2020\n" +
         "Série : KWC base color (coloration dans la masse)\n\n" +
         "IDENTIFICATION :\n" +
         "Forme : Granulé | Couleur : Orange foncé | Odeur : caractéristique\n\n" +
         "PROPRIÉTÉS PHYSIQUES :\n" +
         "État : Solide | Flash : >150°C | Densité : 0,95 g/cm³\n" +
         "Pression vapeur (<50°C) : <10 hPa\n\n" +
         "CLASSIFICATION CLP : Skin Irrit. 2, Eye Irrit. 2\n" +
         "⚠️ COMPOSANT DANGEREUX :\n" +
         "Solvent Orange 60 (Sudan Orange G) — CAS 3118-97-6 — Concentration : 2,5 à 10%\n" +
         "Classification : Skin Irrit. 2 (H315), Eye Irrit. 2 (H319)\n\n" +
         "ENVIRONNEMENT :\n" +
         "WGK : 1 (faible danger pour l'eau) | TRGS 510 : classe 11\n\n" +
         "STOCKAGE : 20°C, à l'écart de la chaleur et des comburants\n" +
         "Incompatible : H₂O₂, comburants\n" +
         "Combustion : NOx + CO\n\n" +
         "STATUT MFC : ⚠️ Irritant peau/yeux\n" +
         "Alternative clean disponible : DYE 240 orange (même couleur, sans irritant)\n" +
         "EPI OBLIGATOIRES : Gants NR/butyle + lunettes latérales",
         'Kaiser Lacke GmbH — FDS REACH 2803390', 1,
         'colorant,Kaiser,fds,KWC,DYE,390,orange,granulé,sécurité,WGK1,SolventOrange60,CAS3118-97-6,irritant,H315,H319'],

        ['fournisseur', 'colorant', 'FDS — KWC DYE 410 bordeaux (Réf 2804100)',
         "KWC DYE 410 bordeaux — FICHE DE DONNÉES DE SÉCURITÉ\n" +
         "Réf : 2804100 | FDS v6.0.6 du 22.01.2020\n" +
         "Série : KWC base color (coloration dans la masse)\n\n" +
         "IDENTIFICATION :\n" +
         "Forme : Granulé | Couleur : Bordeaux (rouge foncé) | Odeur : caractéristique\n\n" +
         "PROPRIÉTÉS PHYSIQUES :\n" +
         "État : Solide | Flash : >150°C | Densité : 0,95 g/cm³\n" +
         "Pression vapeur (<50°C) : <10 hPa\n\n" +
         "CLASSIFICATION CLP : Aucune\n" +
         "Composants dangereux : Aucun\n" +
         "Phrases H : Aucune\n\n" +
         "ENVIRONNEMENT :\n" +
         "WGK : 1 (faible danger pour l'eau) | TRGS 510 : classe 11\n\n" +
         "STOCKAGE : 20°C, à l'écart de la chaleur et des comburants\n" +
         "Incompatible : H₂O₂, comburants\n" +
         "Combustion : NOx + CO\n\n" +
         "STATUT MFC : ✅ Produit sûr\n" +
         "Version liquide disponible : liquiDYE 410 bordeaux (même profil clean)\n" +
         "EPI : Gants NR/butyle (EN ISO 374) + lunettes latérales",
         'Kaiser Lacke GmbH — FDS REACH 2804100', 1,
         'colorant,Kaiser,fds,KWC,DYE,410,bordeaux,rouge,granulé,sécurité,WGK1,clean'],

        // ═══════════ KWC DYE MIXED COLOR (granulés sur mesure) ═══════════

        ['fournisseur', 'colorant', 'FDS — KWC DYE mahogany (Réf 280415450)',
         "KWC DYE mahogany — FICHE DE DONNÉES DE SÉCURITÉ\n" +
         "Réf : 280415450 | FDS v7.0.1 du 18.11.2020\n" +
         "Série : KWC mixed color (sur mesure — clients Amoln, Costes)\n\n" +
         "IDENTIFICATION :\n" +
         "Forme : Granulé | Couleur : Rouge brun (acajou) | Odeur : caractéristique\n\n" +
         "PROPRIÉTÉS PHYSIQUES :\n" +
         "État : Solide | Flash : >140°C | Densité : 0,93 g/cm³\n" +
         "Pression vapeur (<50°C) : <10 hPa\n\n" +
         "CLASSIFICATION CLP : EUH210 (FDS sur demande)\n" +
         "⚠️ COMPOSANT DANGEREUX :\n" +
         "Sudan Red B — CAS 85-83-6 — Concentration : 2,5 à 10%\n" +
         "Classification : Skin Irrit. 2 (H315), Eye Irrit. 2 (H319)\n\n" +
         "ENVIRONNEMENT :\n" +
         "WGK : 2 (danger important pour l'eau) | TRGS 510 : classe 11\n\n" +
         "STOCKAGE : 20°C, à l'écart de la chaleur et des comburants\n" +
         "Incompatible : H₂O₂, comburants\n" +
         "Combustion : NOx + CO\n\n" +
         "STATUT MFC : 🔴 PRODUIT OBSOLÈTE — REMPLACER par liquiDYE mahagoni\n" +
         "Le liquiDYE mahagoni (262418923K) élimine le Sudan Red B et passe WGK 2→1\n" +
         "EPI OBLIGATOIRES : Gants NR/butyle + lunettes latérales",
         'Kaiser Lacke GmbH — FDS REACH 280415450', 1,
         'colorant,Kaiser,fds,KWC,DYE,mahogany,acajou,granulé,sécurité,WGK2,SudanRedB,CAS85-83-6,irritant,obsolète'],

        ['fournisseur', 'colorant', 'FDS — KWC DYE black custom (Réf 2705365)',
         "KWC DYE black — FICHE DE DONNÉES DE SÉCURITÉ\n" +
         "Réf : 2705365 | FDS v8.0.2 du 10.10.2022\n" +
         "Série : KWC mixed color (sur mesure)\n" +
         "UFI : 4TD0-K0M6-Y005-D8Y3\n\n" +
         "IDENTIFICATION :\n" +
         "Forme : Granulé | Couleur : Noir | Odeur : caractéristique\n\n" +
         "PROPRIÉTÉS PHYSIQUES :\n" +
         "État : Solide | Flash : >140°C | Point de congélation : ~62°C\n" +
         "Densité : 1,02 g/cm³ (la plus élevée de la gamme Kaiser)\n" +
         "Pression vapeur (<50°C) : <10 hPa | Insoluble dans l'eau\n\n" +
         "CLASSIFICATION CLP : Skin Sens. 1 (H317) — GHS07\n" +
         "⚠️ COMPOSANT DANGEREUX :\n" +
         "Sudan Red B — CAS 85-83-6 — Concentration : 2,5 à 10%\n" +
         "Classification : Skin Sens. 1 (H317) — Sensibilisant cutané = RISQUE ALLERGIE\n" +
         "C'est la classification la plus sévère du Sudan Red B dans la gamme\n\n" +
         "ENVIRONNEMENT :\n" +
         "WGK : 1 (faible danger pour l'eau) | TRGS 510 : classe 11\n" +
         "REACH Annexe XVII : Restriction n°3\n\n" +
         "STOCKAGE : 20°C, à l'écart de la chaleur et des comburants\n" +
         "Incompatible : H₂O₂, comburants\n" +
         "Combustion : NOx + CO\n\n" +
         "STATUT MFC : 🔴 SENSIBILISANT — Risque d'allergie cutanée\n" +
         "Seul produit classé H317 de la gamme. Port de gants OBLIGATOIRE.\n" +
         "Vêtements contaminés ne doivent PAS sortir du lieu de travail (P272)\n" +
         "EPI OBLIGATOIRES : Gants NR/butyle + lunettes + vêtements dédiés",
         'Kaiser Lacke GmbH — FDS REACH 2705365', 1,
         'colorant,Kaiser,fds,KWC,DYE,black,noir,granulé,custom,sécurité,WGK1,SudanRedB,CAS85-83-6,sensibilisant,H317,allergie'],

        // ═══════════ LIQUIDYE BASE COLOR (liquides catalogue) ═══════════

        ['fournisseur', 'colorant', 'FDS — liquiDYE 340 black (Réf 2620340)',
         "liquiDYE 340 black — FICHE DE DONNÉES DE SÉCURITÉ\n" +
         "Réf : 2620340 | FDS v3.1.8 du 09.02.2024\n" +
         "Série : liquiDYE base color (coloration dans la masse)\n\n" +
         "IDENTIFICATION :\n" +
         "Forme : Liquide | Couleur : Noir | Odeur : caractéristique\n\n" +
         "PROPRIÉTÉS PHYSIQUES :\n" +
         "État : Liquide | Flash : ~88°C | Auto-inflammation : ~330°C\n" +
         "Ébullition : ~210°C | Densité : 0,96 g/cm³\n" +
         "Pression vapeur (<50°C) : <100 hPa | Solubilité eau : <0,02%\n\n" +
         "CLASSIFICATION CLP : Aucune\n" +
         "Composants dangereux : Aucun\n" +
         "Phrases H : Aucune\n\n" +
         "ENVIRONNEMENT :\n" +
         "WGK : 1 (faible danger pour l'eau) | TRGS 510 : classe 10\n" +
         "Non PBT, non vPvB, non perturbateur endocrinien\n\n" +
         "STOCKAGE : 20°C, à l'écart de la chaleur et des comburants\n" +
         "Incompatible : H₂O₂, comburants\n" +
         "Combustion : NOx + CO\n\n" +
         "STATUT MFC : ✅ Produit sûr — Remplace avantageusement le KWC DYE 350 (WGK 2→1)\n" +
         "Le meilleur noir de la gamme en profil sécurité\n" +
         "EPI : Gants NR/butyle (EN ISO 374) + lunettes latérales",
         'Kaiser Lacke GmbH — FDS REACH 2620340', 1,
         'colorant,Kaiser,fds,liquiDYE,340,black,noir,liquide,sécurité,WGK1,clean'],

        ['fournisseur', 'colorant', 'FDS — liquiDYE 390 orange (Réf 2620390)',
         "liquiDYE 390 orange — FICHE DE DONNÉES DE SÉCURITÉ\n" +
         "Réf : 2620390 | FDS v4.0.0 du 05.06.2023\n" +
         "Série : liquiDYE base color (coloration dans la masse)\n" +
         "UFI : NDD0-2057-E00P-3K1S\n\n" +
         "IDENTIFICATION :\n" +
         "Forme : Liquide | Couleur : Orange | Odeur : caractéristique\n\n" +
         "PROPRIÉTÉS PHYSIQUES :\n" +
         "État : Liquide | Flash : ~88°C | Auto-inflammation : ~330°C\n" +
         "Ébullition : ~210°C | Densité : 0,97 g/cm³\n" +
         "Viscosité : ~1000 mPa·s | Temps écoulement : ~46s (DIN 4mm)\n" +
         "Pression vapeur (<50°C) : <100 hPa | Solubilité eau : <0,02%\n\n" +
         "CLASSIFICATION CLP : Skin Irrit. 2, Eye Irrit. 2 — GHS07\n" +
         "⚠️ COMPOSANT DANGEREUX :\n" +
         "Sudan Orange G — CAS 3118-97-6 — Concentration : 10 à 20%\n" +
         "REACH enregistrement : 01-2120118894-50-0000\n" +
         "Classification : Skin Irrit. 2 (H315), Eye Irrit. 2 (H319), STOT SE 3 (H335)\n\n" +
         "⚠️ CONCENTRATION LA PLUS ÉLEVÉE de la gamme (10-20% vs 2,5-10% en KWC)\n\n" +
         "ENVIRONNEMENT :\n" +
         "WGK : 1 (faible danger pour l'eau) | TRGS 510 : classe 10\n" +
         "REACH Annexe XVII : Restriction n°3\n\n" +
         "STOCKAGE : 20°C, à l'écart de la chaleur et des comburants\n" +
         "Incompatible : H₂O₂, comburants\n" +
         "Combustion : NOx + CO\n\n" +
         "STATUT MFC : ⚠️ Irritant peau/yeux/voies respiratoires\n" +
         "Le plus chargé en azoïque de toute la gamme. Port d'EPI strict.\n" +
         "Conseils prudence : P264, P280, P332+P313, P337+P313, P305+P351+P338\n" +
         "EPI OBLIGATOIRES : Gants NR/butyle + lunettes latérales",
         'Kaiser Lacke GmbH — FDS REACH 2620390', 1,
         'colorant,Kaiser,fds,liquiDYE,390,orange,liquide,sécurité,WGK1,SudanOrangeG,CAS3118-97-6,irritant,H315,H319,H335'],

        ['fournisseur', 'colorant', 'FDS — liquiDYE 410 bordeaux (Réf 2620410)',
         "liquiDYE 410 bordeaux — FICHE DE DONNÉES DE SÉCURITÉ\n" +
         "Réf : 2620410 | FDS v2.1.4 du 09.11.2022\n" +
         "Série : liquiDYE base color (coloration dans la masse)\n\n" +
         "IDENTIFICATION :\n" +
         "Forme : Liquide | Couleur : Rouge foncé (bordeaux) | Odeur : caractéristique\n\n" +
         "PROPRIÉTÉS PHYSIQUES :\n" +
         "État : Liquide | Flash : ~88°C | Auto-inflammation : ~330°C\n" +
         "Ébullition : ~210°C | Densité : 0,93 g/cm³\n" +
         "Viscosité : ~300 mPa·s | Temps écoulement : ~36s (DIN 4mm)\n" +
         "Pression vapeur (<50°C) : <100 hPa | Solubilité eau : <0,02%\n\n" +
         "CLASSIFICATION CLP : Aucune\n" +
         "Composants dangereux : Aucun\n" +
         "Phrases H : Aucune\n\n" +
         "ENVIRONNEMENT :\n" +
         "WGK : 1 (faible danger pour l'eau) | TRGS 510 : classe 10\n\n" +
         "STOCKAGE : 20°C, à l'écart de la chaleur et des comburants\n" +
         "Incompatible : H₂O₂, comburants\n" +
         "Combustion : NOx + CO\n\n" +
         "STATUT MFC : ✅ Produit sûr — Le plus fluide des liquiDYE base (300 mPa·s)\n" +
         "Facile à doser, version liquide du KWC DYE 410 (même profil clean)\n" +
         "EPI : Gants NR/butyle (EN ISO 374) + lunettes latérales",
         'Kaiser Lacke GmbH — FDS REACH 2620410', 1,
         'colorant,Kaiser,fds,liquiDYE,410,bordeaux,rouge,liquide,sécurité,WGK1,clean'],

        // ═══════════ LIQUIDYE MIXED COLOR (liquides sur mesure) ═══════════

        ['fournisseur', 'colorant', 'FDS — liquiDYE mahagoni custom (Réf 262418923K)',
         "liquiDYE mahagoni — FICHE DE DONNÉES DE SÉCURITÉ\n" +
         "Réf : 262418923K | FDS v1.0.0 du 09.02.2024\n" +
         "Série : liquiDYE mixed color (sur mesure — clients Amoln, Costes)\n\n" +
         "IDENTIFICATION :\n" +
         "Forme : Liquide | Couleur : Rouge brun (acajou/mahogany) | Odeur : caractéristique\n\n" +
         "PROPRIÉTÉS PHYSIQUES :\n" +
         "État : Liquide | Flash : ~62°C ⚠️ (bas — éloigner sources chaleur)\n" +
         "Auto-inflammation : ~330°C | Ébullition : ~180°C\n" +
         "Densité : 0,95 g/cm³ | Pression vapeur (<50°C) : <100 hPa\n" +
         "Solubilité eau : <0,02%\n\n" +
         "CLASSIFICATION CLP : Aucune\n" +
         "Composants dangereux : Aucun\n" +
         "Phrases H : Aucune\n\n" +
         "ENVIRONNEMENT :\n" +
         "WGK : 1 (faible danger pour l'eau) | TRGS 510 : classe 10\n" +
         "Non PBT, non vPvB, non perturbateur endocrinien\n\n" +
         "STOCKAGE : 20°C, À L'ÉCART DE LA CHALEUR (flash 62°C !)\n" +
         "Incompatible : H₂O₂, comburants\n" +
         "Combustion : NOx + CO\n\n" +
         "STATUT MFC : ✅ REMPLACEMENT RECOMMANDÉ du KWC DYE mahogany\n" +
         "Élimine le Sudan Red B (CAS 85-83-6) — WGK amélioré 2→1\n" +
         "Formulation 2024 reformulée, la plus propre en acajou\n" +
         "⚠️ Flash point bas (62°C) : manipuler loin des flammes/sources de chaleur\n" +
         "EPI : Gants NR/butyle (EN ISO 374) + lunettes latérales",
         'Kaiser Lacke GmbH — FDS REACH 262418923K', 1,
         'colorant,Kaiser,fds,liquiDYE,mahagoni,acajou,mahogany,liquide,custom,sécurité,WGK1,clean,Amoln,Costes'],

        ['fournisseur', 'colorant', 'FDS — liquiDYE light blue custom (Réf 262418931K)',
         "liquiDYE light blue — FICHE DE DONNÉES DE SÉCURITÉ\n" +
         "Réf : 262418931K | FDS v1.0.0 du 09.02.2024\n" +
         "Série : liquiDYE mixed color (sur mesure — clients Amoln, Costes)\n\n" +
         "IDENTIFICATION :\n" +
         "Forme : Liquide | Couleur : Bleu clair | Odeur : caractéristique\n\n" +
         "PROPRIÉTÉS PHYSIQUES :\n" +
         "État : Liquide | Flash : ~62°C ⚠️ (bas — éloigner sources chaleur)\n" +
         "Auto-inflammation : ~330°C | Ébullition : ~180°C\n" +
         "Densité : 0,95 g/cm³ | Pression vapeur (<50°C) : <100 hPa\n" +
         "Solubilité eau : <0,02%\n\n" +
         "CLASSIFICATION CLP : Aucune\n" +
         "Composants dangereux : Aucun\n" +
         "Phrases H : Aucune\n\n" +
         "ENVIRONNEMENT :\n" +
         "WGK : 1 (faible danger pour l'eau) | TRGS 510 : classe 10\n" +
         "Non PBT, non vPvB, non perturbateur endocrinien\n\n" +
         "STOCKAGE : 20°C, À L'ÉCART DE LA CHALEUR (flash 62°C !)\n" +
         "Incompatible : H₂O₂, comburants\n" +
         "Combustion : NOx + CO\n\n" +
         "STATUT MFC : ✅ Produit sûr — Couleur exclusive liquiDYE (pas de KWC équivalent)\n" +
         "Propriétés physiques identiques au liquiDYE mahagoni (même véhicule)\n" +
         "⚠️ Flash point bas (62°C) : manipuler loin des flammes/sources de chaleur\n" +
         "EPI : Gants NR/butyle (EN ISO 374) + lunettes latérales",
         'Kaiser Lacke GmbH — FDS REACH 262418931K', 1,
         'colorant,Kaiser,fds,liquiDYE,lightblue,bleu,liquide,custom,sécurité,WGK1,clean,Amoln,Costes'],

        // ═══════════ SYNTHÈSE SÉCURITÉ ═══════════

        ['technique', 'colorant', 'Kaiser — Synthèse sécurité et recommandations MFC',
         "SYNTHÈSE SÉCURITÉ COLORANTS KAISER — 15 PRODUITS ANALYSÉS\n" +
         "Février 2026 — Analyse complète des FDS REACH\n\n" +
         "═══ PRODUITS SÛRS (aucun danger CLP) ═══\n" +
         "DYE 240 orange (WGK 1) | DYE 250 red (WGK 1)\n" +
         "DYE 330 green (WGK nwg ✭) | DYE 380 yellow (WGK 1)\n" +
         "DYE 410 bordeaux (WGK 1) | DYE 350 black (WGK 2 ⚠️)\n" +
         "liquiDYE 340 black (WGK 1) | liquiDYE 410 bordeaux (WGK 1)\n" +
         "liquiDYE mahagoni (WGK 1) | liquiDYE light blue (WGK 1)\n\n" +
         "═══ PRODUITS IRRITANTS (H315/H319) ═══\n" +
         "DYE 366 black — Sudan Red B — WGK 3 🔴\n" +
         "DYE 390 orange — Solvent Orange 60 — WGK 1\n" +
         "KWC DYE mahogany — Sudan Red B — WGK 2\n" +
         "liquiDYE 390 orange — Solvent Orange 60 10-20% — WGK 1\n\n" +
         "═══ PRODUIT SENSIBILISANT (H317) ═══\n" +
         "KWC DYE black 2705365 — Sudan Red B — H317 allergie cutanée\n\n" +
         "═══ SUBSTANCES DANGEREUSES IDENTIFIÉES ═══\n" +
         "1. Sudan Red B (CAS 85-83-6) — azo naphtol bisazoïque\n" +
         "   → H315/H319 (irritant) ou H317 (sensibilisant selon FDS récente)\n" +
         "   → Présent dans : DYE 366, KWC mahogany, KWC DYE black 2705365\n\n" +
         "2. Solvent Orange 60 (CAS 3118-97-6) — azo naphtol monoazoïque\n" +
         "   → H315/H319/H335 (irritant peau/yeux/voies respiratoires)\n" +
         "   → REACH STOT SE 3 + Annexe XVII restriction n°3\n" +
         "   → Présent dans : DYE 390, liquiDYE 390\n\n" +
         "═══ RECOMMANDATIONS MFC ═══\n" +
         "1. 🔴 Remplacer KWC DYE mahogany → liquiDYE mahagoni (élimine Sudan Red B)\n" +
         "2. 🔴 EPI obligatoires pour DYE 366, 390, KWC black, liquiDYE 390\n" +
         "3. 🟠 Préférer liquiDYE 340 au KWC DYE 350 (WGK 2→1)\n" +
         "4. 🟠 Éviter DYE 366 (WGK 3) — utiliser DYE 350 ou liquiDYE 340\n" +
         "5. 🟠 Stocker liquiDYE custom loin de la chaleur (flash 62°C)\n" +
         "6. 🟢 DYE 330 green = meilleur profil sécurité global (WGK nwg)\n" +
         "7. 🟢 DYE 240 orange = alternative clean au DYE 390\n\n" +
         "═══ DEUX SOUS-GAMMES LIQUIDYE ═══\n" +
         "Base color (réf 2620xxx) : Flash ~88°C, ébullition ~210°C — solvant standard\n" +
         "Mixed color (réf 2624xxx) : Flash ~62°C, ébullition ~180°C — solvant plus léger\n" +
         "Les mixed color nécessitent plus de précautions thermiques au stockage.",
         'Analyse MFC Laboratoire — 15 FDS Kaiser REACH — Février 2026', 1,
         'colorant,Kaiser,fds,sécurité,synthèse,recommandation,WGK,CLP,SudanRedB,SolventOrange60,liquiDYE,KWC']
    ];

    for (const [cat, sub, title, content, source, prio, tags] of entries) {
        await db.run('INSERT OR IGNORE INTO knowledge_base (category,subcategory,title,content,source,priority,tags) VALUES (?,?,?,?,?,?,?)',
            [cat, sub, title, content, source, prio, tags]);
    }
    console.log('  ✓ Session 21 : ' + entries.length + ' fiches (FDS Kaiser colorants — 15 produits + synthèse)');
}

module.exports.seedSession21 = seedSession21;
