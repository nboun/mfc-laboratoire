// ═══════════════════════════════════════════════════
// BASE DE CONNAISSANCES MFC — SAVOIR-FAIRE NUMÉRISÉ
// ═══════════════════════════════════════════════════

async function seedKnowledge(db) {
    // Check if already enriched
    const count = await db.get('SELECT COUNT(*) as c FROM knowledge_base');
    if (count.c > 15) { console.log('  ✓ Base de connaissances déjà enrichie'); return; }

    const entries = [
        // ══════════ FONDAMENTAUX CIRES ══════════
        ['technique', 'cire', 'Point de congélation et dureté', 
         'Le point de congélation détermine la dureté de la bougie :\n• 48-52°C : cires molles → containers uniquement\n• 52-56°C : cires moyennes → containers et piliers bas\n• 56-60°C : cires semi-dures → piliers, chandelles courtes\n• 60-65°C : cires dures → chandelles, bougies décoratives\nPlus le point est élevé, plus la cire est dure et plus elle restitue lentement le parfum.', 'MFC Expertise', 1, 'cire,point congélation,dureté,paraffine'],
        
        ['technique', 'cire', 'Pénétration (needle penetration)',
         'La pénétration mesure la dureté réelle de la cire en 1/10mm (ASTM D1321) :\n• 10-15 : très dure, risque de fissures → éviter pour containers\n• 15-20 : dure → piliers, chandelles\n• 20-25 : moyenne → usage polyvalent\n• 25-35 : souple → containers, bonne adhérence verre\nUne pénétration élevée = cire plus souple = meilleure rétention parfum mais surface moins lisse.', 'MFC Expertise', 1, 'cire,pénétration,dureté,needle'],
        
        ['technique', 'cire', 'Teneur en huile et rétention parfum',
         'La teneur en huile de la paraffine influence directement la rétention du parfum :\n• 0-0.5% : paraffine raffinée → excellente blancheur, tient moins le parfum\n• 0.5-2% : semi-raffinée → bon compromis blancheur/parfum\n• 2-5% : haute teneur → excellente rétention parfum mais surface mate\nPour les bougies parfumées haut de gamme, viser 0.5-2% d\'huile.\nLa teneur en huile affecte aussi la couleur Saybolt : plus d\'huile = couleur plus basse.', 'MFC Expertise', 1, 'cire,huile,parfum,rétention'],
        
        ['technique', 'cire', 'Couleur Saybolt',
         'L\'échelle Saybolt mesure la blancheur de la cire :\n• 25-27 : légèrement jaune → suffisant pour bougies colorées\n• 28-29 : blanc → usage général\n• 30+ : blanc pur → bougies blanches, haute qualité\nPour les bougies blanches ou pastel sans colorant, exiger un Saybolt ≥ 29.\nLes cires microcristallines ont naturellement un Saybolt plus bas.', 'MFC Expertise', 2, 'cire,saybolt,couleur,blancheur'],
        
        ['technique', 'cire', 'Mélange de cires (blending)',
         'Les bougies professionnelles utilisent rarement une seule cire :\n• Base (60-70%) : paraffine à point moyen (52-56°C) pour la structure\n• Durcisseur (15-25%) : paraffine dure ou micro pour la tenue\n• Additif (5-15%) : stéarine, vybar ou micro pour l\'adhérence parfum\nRègle MFC : toujours tester un blend sur au moins 3 cycles avant validation.\nLa microcristalline améliore l\'adhérence au verre mais ralentit la combustion.', 'MFC Expertise', 1, 'cire,blend,mélange,micro,stéarine'],
        
        // ══════════ MÈCHES ══════════
        ['technique', 'mèche', 'Choix de mèche par diamètre — Règle MFC',
         'Guide de sélection MFC validé par l\'expérience :\n• Ø 35-45mm : LX 8-10 ou CL 1-2 (petites bougies chauffe-plat)\n• Ø 45-55mm : LX 10-14 ou CL 2-3 (petits containers)\n• Ø 55-65mm : LX 14-18 ou HTP 62-73 (containers moyens)\n• Ø 65-80mm : LX 18-22 ou HTP 83-104 (grands containers)\n• Ø 80-100mm : LX 22-26 ou HTP 104-126 (très grands containers)\n• Ø 100+mm : mèches multiples recommandées\nATTENTION : ce guide est un point de départ. Toujours tester 2-3 tailles autour de la recommandation.\nLe type de cire, le % parfum et la couleur influencent le choix final.', 'MFC Expertise', 1, 'mèche,diamètre,sélection,LX,HTP,CL'],
        
        ['technique', 'mèche', 'Séries de mèches et leurs usages',
         'Caractéristiques des principales séries :\n• LX : coton tressé sans âme → flamme stable, peu de suie, idéal paraffine en container verre\n• HTP : coton tressé avec traitement papier → auto-coupure, bonne combustion, polyvalent\n• CL : coton tressé rond → flamme plus large, bon pour grandes bougies et piliers\n• CD : coton tressé avec cœur coton → rigide, facile à centrer, bon pour soja\n• ECO : coton et papier → pour cires végétales, combustion propre\nRègle MFC : pour la paraffine container, privilégier LX puis HTP. Pour les piliers, CL ou CD.', 'MFC Expertise', 1, 'mèche,série,LX,HTP,CL,CD,ECO'],
        
        ['technique', 'mèche', 'Symptômes de mèche inadaptée',
         'Comment interpréter les défauts de combustion :\nMèche TROP PETITE :\n• Tunnel (la cire ne fond pas jusqu\'aux bords)\n• Flamme petite, vacillante\n• Le bassin de fusion n\'atteint pas les parois\n→ Solution : monter de 1-2 tailles\n\nMèche TROP GRANDE :\n• Flamme trop haute (>3cm), fumée noire\n• Champignonnage excessif\n• Cire coule sur les côtés (piliers)\n• Verre trop chaud (dangereux en container)\n→ Solution : descendre de 1-2 tailles\n\nMèche CORRECTE :\n• Bassin de fusion = 90-100% du diamètre au cycle 3-4\n• Flamme 2-2.5cm, stable\n• Peu ou pas de champignonnage\n• Consommation régulière', 'MFC Expertise', 1, 'mèche,symptôme,tunnel,champignonnage,flamme,diagnostic'],
        
        // ══════════ PARFUMS ══════════
        ['technique', 'parfum', 'Dosage parfum — Règles MFC',
         'Recommandations de dosage selon le type :\n• Container paraffine : 6-10% (optimum 8%)\n• Container soja : 8-12% (le soja retient moins)\n• Pilier : 3-6% (risque de suintement au-delà)\n• Chandelle : 1-3% (la cire dure retient peu)\n\nRègles impératives :\n• Ne JAMAIS dépasser 12% → risque inflammation, suintement\n• Respecter les limites IFRA du parfum\n• Parfums lourds (ambre, musc) : réduire de 1-2%\n• Parfums légers (agrumes, frais) : augmenter de 1-2%\n• La température d\'ajout du parfum : 60-65°C max (jamais au-dessus du flash point)', 'MFC Expertise', 1, 'parfum,dosage,pourcentage,IFRA,container,pilier'],
        
        ['technique', 'parfum', 'Diffusion à chaud vs à froid (throw)',
         'Diffusion à chaud : diffusion du parfum quand la bougie brûle\nDiffusion à froid : diffusion du parfum bougie éteinte\n\nFacteurs influençant le diffusion à chaud :\n• % parfum (plus = plus de diffusion, mais plafond à 10-12%)\n• Taille de la mèche (plus grande = plus de chaleur = plus de diffusion)\n• Type de cire (paraffine > soja pour le diffusion à chaud)\n• Teneur en huile de la cire (plus d\'huile = meilleur throw)\n\nFacteurs influençant le diffusion à froid :\n• Type de parfum (certaines molécules diffusent mieux à froid)\n• Temps de cure (48-72h minimum, idéal 2 semaines)\n• % parfum\n\nSi le client se plaint de manque de diffusion :\n1. Vérifier le % parfum\n2. Vérifier la taille de mèche (bassin de fusion complet ?)\n3. Vérifier le temps de cure\n4. Envisager une cire à plus haute teneur en huile', 'MFC Expertise', 1, 'parfum,throw,diffusion,diffusion à chaud,diffusion à froid,cure'],
        
        ['technique', 'parfum', 'Familles olfactives et compatibilité',
         'Familles principales et leurs caractéristiques en bougie :\n• Floraux (rose, jasmin, lavande) : bonne diffusion, dosage standard 8%\n• Boisés (cèdre, santal, vétiver) : diffusion lente, augmenter à 9-10%\n• Frais (agrumes, menthe) : très volatils, augmenter à 9-10%, cure courte\n• Orientaux (vanille, ambre, musc) : tenaces, réduire à 6-8%\n• Gourmands (caramel, chocolat) : bonne rétention, 7-9%\n• Marins (sel, algue) : volatils, 9-10%\n\nATTENTION aux parfums contenant des composés qui attaquent le plastique (certains agrumes). Toujours tester la compatibilité contenant.', 'MFC Expertise', 2, 'parfum,famille,floral,boisé,oriental,agrume,dosage'],
        
        // ══════════ COLORANTS ══════════
        ['technique', 'colorant', 'Dosage colorant — Règle MFC',
         'Le colorant est dosé en pourcentage de la masse de CIRE (pas de la masse totale) :\n• Dosage standard MFC : 0.20% de la masse de cire\n• Maximum absolu : 0.25%\n• Au-delà de 0.25% : risque de colmatage de la mèche, mauvaise combustion\n\nExemple : pour 180g de cire → 0.36g de colorant (0.20%)\n\nTypes de colorants :\n• Colorants liquides : faciles à doser, dispersion uniforme\n• Colorants en bloc/chips : à fondre avec la cire, couleurs plus intenses\n• Pigments : pour effets opaques, risque de colmatage plus élevé\n\nCouleurs foncées (noir, bleu foncé, rouge foncé) : attention, elles peuvent affecter la combustion même à 0.20%. Tester systématiquement.', 'MFC Expertise', 1, 'colorant,dosage,cire,combustion,pigment'],
        
        ['technique', 'colorant', 'Couleur et température de chauffe',
         'La couleur finale dépend de la température à laquelle le colorant est ajouté :\n• Ajout à haute température (>80°C) : couleur plus claire, risque de dégradation\n• Ajout à basse température (60-65°C) : couleur plus fidèle, dispersion parfois inégale\n• Température optimale : 70-75°C pour une bonne dispersion sans dégradation\n\nLa couleur refroidie est toujours plus claire que la cire liquide. Prévoir 1-2 tons plus foncé dans le bain.\nLes cires à haute teneur en huile jaunissent les couleurs pastel.', 'MFC Expertise', 2, 'colorant,température,chauffe,couleur,dispersion'],
        
        // ══════════ COMBUSTION & TESTS ══════════
        ['technique', 'combustion', 'Protocole de test MFC — 4 cycles',
         'Le protocole standard MFC pour les tests de combustion :\n\n1. PRÉPARATION : peser la bougie au 0.1g, noter diamètre/hauteur, vérifier centrage mèche\n2. CYCLE : allumer, brûler 4 heures continues, éteindre\n3. MESURES à chaque cycle :\n   • Masse avant et après (consommation)\n   • Hauteur de flamme (à 30min et 3h)\n   • Diamètre du bassin de fusion (à 1h, 2h, 4h)\n   • Observation mèche (champignonnage, courbure)\n   • Tunneling (oui/non, profondeur)\n   • Suie (cotation 0-3)\n   • Diffusion parfum (cotation 1-5)\n4. ENTRE CYCLES : laisser refroidir complètement (min 4h, idéal 12h)\n5. VALIDATION : minimum 4 cycles complets\n\nUne bougie container doit avoir un bassin de fusion atteignant les parois au cycle 3 maximum.', 'MFC Expertise', 1, 'test,protocole,cycle,combustion,bassin,mesure'],
        
        ['technique', 'combustion', 'Consommation normale par cycle',
         'Consommation de cire attendue pour 4h de combustion :\n• Ø 50mm : 8-12g/cycle\n• Ø 60mm : 12-16g/cycle\n• Ø 65mm : 14-18g/cycle\n• Ø 70mm : 16-22g/cycle\n• Ø 80mm : 20-28g/cycle\n• Ø 90mm : 25-35g/cycle\n• Ø 100mm : 30-40g/cycle\n\nUne consommation trop faible = mèche trop petite.\nUne consommation trop élevée = mèche trop grande ou cire trop molle.\nLa consommation doit être relativement constante entre les cycles (variation <15%).', 'MFC Expertise', 1, 'consommation,cycle,gramme,diamètre,référence'],
        
        ['technique', 'combustion', 'Durée de vie estimée',
         'Estimation de la durée de combustion totale :\nFormule approximative : masse de cire (g) ÷ consommation par heure (g/h)\n\nRepères MFC :\n• Container 180g cire, Ø70mm : ~35-45h de combustion\n• Container 250g cire, Ø80mm : ~40-55h\n• Container 350g cire, Ø90mm : ~50-70h\n• Pilier 400g, Ø70mm : ~50-65h\n\nCes valeurs supposent une mèche correctement calibrée et des cycles de 3-4h.\nDes cycles courts (<2h) réduisent la durée totale à cause du tunnel.', 'MFC Expertise', 2, 'durée,combustion,vie,heures,estimation'],
        
        // ══════════ DÉFAUTS ET SOLUTIONS ══════════
        ['technique', 'défauts', 'Champignonnage (mushrooming)',
         'Cause : accumulation de carbone au bout de la mèche.\nFacteurs aggravants :\n• Mèche trop grande pour le diamètre\n• Parfum à haute teneur en composés lourds\n• Courant d\'air (combustion irrégulière)\n• Colorant en excès\n\nSolutions :\n1. Réduire la taille de mèche de 1 taille\n2. Passer à une mèche auto-coupante (série HTP)\n3. Réduire le % de parfum de 1%\n4. Vérifier le dosage colorant (<0.25%)\n5. Couper la mèche à 5mm avant chaque allumage (instruction client)', 'MFC Expertise', 1, 'champignonnage,mushrooming,mèche,carbone,défaut'],
        
        ['technique', 'défauts', 'Effet tunnel (tunneling)',
         'Cause : le bassin de fusion ne rejoint pas les parois.\nFacteurs :\n• Mèche trop petite = cause n°1\n• Premier allumage trop court (mémoire de la cire)\n• Cire trop dure pour le diamètre\n• Diamètre trop grand pour une seule mèche\n\nSolutions :\n1. Augmenter la taille de mèche de 1-2 tailles\n2. Instruire le client : premier allumage = 1h par pouce de diamètre\n3. Utiliser une cire plus souple (pénétration plus haute)\n4. Pour Ø>100mm : envisager 2-3 mèches\n\nRègle de la mémoire de cire : la cire ne fond jamais plus large que son premier cycle. Le premier allumage doit TOUJOURS atteindre les parois.', 'MFC Expertise', 1, 'tunnel,tunneling,bassin,mèche,mémoire,défaut'],
        
        ['technique', 'défauts', 'Suie et fumée noire',
         'Causes possibles de suie excessive :\n1. Mèche trop longue (>8mm) → couper à 5mm\n2. Mèche trop grande pour le diamètre\n3. Courant d\'air → éloigner des fenêtres/ventilation\n4. Parfum en excès (>10%)\n5. Colorant en excès (>0.25%)\n6. Mèche décentrée\n\nSi la suie persiste malgré une mèche correcte :\n• Changer de série de mèche (passer de CL à LX par exemple)\n• Réduire le parfum de 1%\n• Vérifier la qualité du parfum (certains fragrance oils produisent plus de suie)', 'MFC Expertise', 2, 'suie,fumée,noir,mèche,défaut,combustion'],
        
        ['technique', 'défauts', 'Fissures et retrait (sinkholes)',
         'Les fissures/trous apparaissent au refroidissement :\nCauses :\n• Refroidissement trop rapide\n• Cire trop dure (point de congélation élevé)\n• Absence de deuxième coulée\n\nSolutions :\n1. Refroidir lentement (température ambiante, pas de frigo)\n2. Faire une deuxième coulée à 65-70°C quand la surface se solidifie\n3. Utiliser un mélange de cires (ajouter 5-10% de cire souple)\n4. Préchauffer le contenant à 40°C avant coulée\n5. Couler à température plus basse (70-75°C au lieu de 85°C)', 'MFC Expertise', 2, 'fissure,retrait,sinkhole,refroidissement,défaut'],
        
        ['technique', 'défauts', 'Décollement (wet spots)',
         'Zones où la cire se décolle du verre (taches) :\nCause : différence de rétraction entre la cire et le verre.\n\nSolutions :\n1. Préchauffer les verres à 40-50°C\n2. Couler à température plus élevée (80-85°C)\n3. Refroidir très lentement\n4. Ajouter 3-5% de cire microcristalline (meilleure adhérence)\n5. Utiliser du Vybar 260 (1-2%)\n\nNote : les wet spots n\'affectent pas la combustion, c\'est un défaut esthétique. Certains clients les acceptent.', 'MFC Expertise', 3, 'décollement,wet spots,verre,adhérence,esthétique'],
        
        ['technique', 'défauts', 'Suintement de parfum (sweating)',
         'Gouttelettes d\'huile parfumée en surface :\nCauses :\n• Parfum en excès (>10%)\n• Cire inadaptée (pénétration trop basse)\n• Cure insuffisante\n• Variation de température pendant le stockage\n\nSolutions :\n1. Réduire le % de parfum\n2. Utiliser une cire à plus haute pénétration\n3. Ajouter 1-2% de Vybar pour fixer le parfum\n4. Laisser curer 72h minimum\n5. Stocker à température constante (18-22°C)', 'MFC Expertise', 2, 'suintement,sweating,parfum,huile,excès'],
        
        // ══════════ PROCÉDURES ══════════
        ['procédure', 'fabrication', 'Température de coulée par type',
         'Températures de coulée recommandées MFC :\n• Container paraffine : 70-75°C\n• Container soja : 55-60°C\n• Pilier paraffine : 85-90°C (plus chaud pour meilleur démoulage)\n• Chandelle : 90-95°C\n• Deuxième coulée : 65-70°C\n\nToujours verser en un mouvement continu et régulier.\nÉviter les bulles d\'air : verser lentement le long de la paroi.', 'MFC Expertise', 2, 'température,coulée,fabrication,procédure'],
        
        ['procédure', 'fabrication', 'Temps de cure minimum',
         'Le cure time est le temps de repos entre la fabrication et le premier allumage :\n• Paraffine : minimum 48h, recommandé 72h\n• Soja : minimum 1 semaine, idéal 2 semaines\n• Mélange para/soja : minimum 72h, recommandé 1 semaine\n\nPendant la cure, le parfum se lie à la cire. Une bougie non curée :\n• Aura moins de diffusion\n• Pourra avoir une surface irrégulière\n• Risque de suintement\n\nNe JAMAIS tester une bougie sans cure complète. Les résultats seront faussés.', 'MFC Expertise', 1, 'cure,repos,temps,fabrication,parfum'],
        
        // ══════════ SÉCURITÉ ══════════
        ['sécurité', 'général', 'Limites IFRA et flash point',
         'Le flash point est la température à laquelle le parfum émet des vapeurs inflammables :\n• Ne JAMAIS ajouter le parfum au-dessus de son flash point\n• Marge de sécurité : ajouter à flash point - 10°C minimum\n• La majorité des parfums bougies ont un flash point entre 60-80°C\n• Toujours vérifier la FDS (Fiche de Données de Sécurité) du parfum\n\nLimites IFRA :\n• Chaque parfum a une limite IFRA en % pour les bougies (catégorie 12)\n• Ne JAMAIS dépasser la limite IFRA\n• Vérifier auprès du fournisseur la conformité IFRA de chaque lot', 'MFC Expertise', 1, 'IFRA,flash point,sécurité,parfum,inflammable'],
        
        ['sécurité', 'général', 'Instructions de sécurité client',
         'Instructions à fournir obligatoirement avec chaque bougie :\n1. Ne jamais laisser une bougie sans surveillance\n2. Couper la mèche à 5mm avant chaque allumage\n3. Brûler sur une surface stable et résistante à la chaleur\n4. Éloigner des courants d\'air, rideaux, matériaux inflammables\n5. Brûler maximum 4h d\'affilée\n6. Arrêter quand il reste 1cm de cire (containers)\n7. Garder hors de portée des enfants et animaux\n8. Ne pas déplacer une bougie allumée\n9. Laisser refroidir complètement avant de toucher le contenant', 'MFC Expertise', 1, 'sécurité,client,instruction,étiquette'],
        
        // ══════════ ASTUCES LABO ══════════
        ['astuce', 'labo', 'Centrage parfait de la mèche',
         'Techniques pour un centrage parfait :\n1. Utiliser un support de centrage (wick centering device) adapté au diamètre\n2. Pour les containers : coller la patte avec un point de colle chaude au centre exact\n3. Vérifier le centrage quand la cire est encore liquide\n4. Un léger décentrage (<2mm) est acceptable\n5. Un décentrage >3mm affecte la combustion et doit être rejeté en contrôle qualité\n\nPour les tests : utiliser le même type de centrage que la production pour des résultats représentatifs.', 'MFC Expertise', 3, 'mèche,centrage,technique,labo'],
        
        ['astuce', 'labo', 'Conservation des échantillons client',
         'Les échantillons client doivent être conservés :\n• Dans un endroit frais (18-22°C), sec, à l\'abri de la lumière\n• Étiquetés avec : numéro échantillon, date, client, formulation\n• Minimum 6 mois après validation client\n• 1 an pour les clients récurrents\n• Photographier chaque échantillon avant envoi\n\nLes contre-échantillons (doubles) sont obligatoires pour tout essai client.', 'MFC Expertise', 2, 'échantillon,conservation,stockage,client'],
        
        ['astuce', 'labo', 'Test rapide d\'adéquation mèche',
         'Méthode MFC de pré-sélection rapide (avant le test 4 cycles complet) :\n1. Allumer la bougie, observer pendant 30 minutes\n2. Mesurer la hauteur de flamme : doit être 2-2.5cm\n3. Observer le champignonnage : absent ou léger = OK\n4. Vérifier que le bassin commence à se former\n5. Si la flamme est >3cm ou <1.5cm → changer de mèche immédiatement\n\nCe test rapide permet d\'éliminer les mèches clairement inadaptées sans faire un cycle complet de 4h.', 'MFC Expertise', 2, 'test,rapide,mèche,pré-sélection,flamme']
    ];
    
    for (const [category, subcategory, title, content, source, priority, tags] of entries) {
        await db.run(
            'INSERT OR IGNORE INTO knowledge_base (category, subcategory, title, content, source, priority, tags) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [category, subcategory, title, content, source, priority, tags]
        );
    }
    console.log('  ✓ Base de connaissances enrichie : ' + entries.length + ' fiches métier');
}

module.exports = { seedKnowledge };

// Called separately for empirical knowledge from terrain interviews
async function seedEmpiricalKnowledge(db) {
    const existing = await db.get("SELECT COUNT(*) as c FROM knowledge_base WHERE source LIKE '%Entretien%'");
    if (existing.c > 0) return;

    const entries = [
        ['technique', 'cire', 'Principe des cailloux — Comprendre les mélanges MFC',
         "Analogie fondamentale MFC :\n• 5203 (paraffine) = GROS CAILLOUX — structure avec espaces où le parfum se loge. Plus de 5203 = plus d'espace = meilleure combustion mais moins de dureté.\n• 6213 (cire dure) = CAILLOUX MOYENS — dureté + combustion. Riche en huile = bonne diffusion. MAIS rend translucide et peut bloquer certains parfums.\n• 2528/7837 (micro) = PETITS CAILLOUX — adhérence verre et finition.\n\nQuand un parfum ne brûle pas → \"ouvrir\" la formule = plus de 5203.",
         'Savoir-faire MFC — Entretien terrain', 1, 'cire,5203,6213,2528,cailloux,combustion,principe'],
        ['technique', 'cire', 'Arbre de décision — Choix de recette MFC',
         "1. COMMENCER par Tripartite MFC-A (47/36/5) → 90% des parfums\n2. Parfum LOURD → MFC-C (47/38/5, parfum 10%), 6213 aide à diffuser\n3. Ne BRÛLE PAS → MFC-E Haute 5203 (70/10/8) puis MFC-B (80/10, zéro 6213)\n4. Besoin OPACITÉ + DIFFUSION + combustion difficile → MFC-D Cétylique\n5. MÈCHE : LX18-22 containers, LX24 avec cétylique. Choix = verre × % parfum × masse",
         'Savoir-faire MFC — Entretien terrain', 1, 'recette,choix,décision,guide'],
        ['technique', 'cire', 'La 6213 — Avantages et inconvénients',
         "Paraffine dure riche en huile.\nAVANTAGES : dureté, bonne combustion, diffusion parfums lourds.\nINCONVÉNIENTS : translucide, bloque 1-2 parfums rares.\nSOLUTIONS : translucidité → MFC-D cétylique. Combustion bloquée → MFC-E ou MFC-B.",
         'Savoir-faire MFC — Entretien terrain', 1, '6213,translucide,combustion,huile'],
        ['technique', 'additif', 'Alcool cétylique — Triple fonction',
         "Utilisé à 10% dans MFC-D. Triple action :\n1. Combustion parfums difficiles\n2. Opacité (compense translucidité 6213)\n3. Diffusion améliorée\nMicro 7837 remplace 2528. Mèche +1-2 tailles (LX24 validé).",
         'Savoir-faire MFC — Entretien terrain', 1, 'cétylique,opacité,combustion,diffusion,MFC-D']
    ];
    for (const [cat, sub, title, content, source, prio, tags] of entries) {
        await db.run('INSERT OR IGNORE INTO knowledge_base (category,subcategory,title,content,source,priority,tags) VALUES (?,?,?,?,?,?,?)',
            [cat, sub, title, content, source, prio, tags]);
    }
    console.log('  ✓ Savoir empirique terrain : ' + entries.length + ' fiches');
}

module.exports.seedEmpiricalKnowledge = seedEmpiricalKnowledge;

// Additional empirical insight - olfactive perception
async function seedOlfactiveInsight(db) {
    const exists = await db.get("SELECT id FROM knowledge_base WHERE title LIKE '%perception olfactive%'");
    if (exists) return;

    await db.run(`INSERT INTO knowledge_base (category,subcategory,title,content,source,priority,tags) VALUES (?,?,?,?,?,?,?)`,
        ['technique', 'cire', 'Perception olfactive selon la cire — 5203 vs 6213',
         "La structure moléculaire de la cire (pénétration, teneur en huile) change la PERCEPTION du parfum, pas juste sa diffusion.\n\nMême parfum, même %, deux résultats différents :\n\n• 5203 seule → odeur de parfum CHAUD, plus CIREUX\n  La paraffine pure \"colore\" l'odeur, on sent la cire derrière le parfum.\n  Pénétration 16-20, faible teneur en huile → le parfum est \"retenu\" et restitué avec une note cireuse.\n\n• 6213 seule → diffusion plus NEUTRE, parfum plus FIDÈLE\n  La teneur en huile élevée de la 6213 permet au parfum de s'exprimer plus librement.\n  Mais les notes sont moins nuancées, plus \"plates\" (puissantes mais sans relief).\n\nC'est pourquoi le MÉLANGE est essentiel :\n→ La 5203 apporte la structure et les espaces (gros cailloux)\n→ La 6213 apporte la neutralité olfactive et la diffusion\n→ Le ratio 5203/6213 dose l'équilibre entre fidélité et structure\n\nRègle MFC :\n• Parfum délicat/subtil → plus de 5203 (mais attention au côté cireux)\n• Parfum puissant/simple → plus de 6213 (diffusion max)\n• Parfum qui sent \"trop la cire\" → augmenter le ratio 6213\n• Parfum qui perd ses nuances → augmenter le ratio 5203",
         'Savoir-faire MFC — Entretien terrain', 1,
         'perception,olfactive,5203,6213,cireux,chaud,neutre,fidèle,huile,pénétration']);

    console.log('  ✓ Insight perception olfactive 5203 vs 6213');
}

module.exports.seedOlfactiveInsight = seedOlfactiveInsight;

// Végétale knowledge from terrain interview
async function seedVegetaleKnowledge(db) {
    const exists = await db.get("SELECT id FROM knowledge_base WHERE title LIKE '%végétale%MFC%'");
    if (exists) return;

    const entries = [
        ['technique', 'cire végétale', 'Cires végétales MFC — Vue d\'ensemble',
         "MFC utilise 4 types de cires végétales :\n\n• Cire de SOJA : la plus répandue sur le marché. Frosting fréquent.\n• Cire de COLZA : base Dub Rapeseed 1618 (Stéarinerie Dubois) — tournesol/colza. Base végétale principale MFC.\n• Cire de COCO : ajoutée en complément — améliore diffusion + combustion + aspect crémeux.\n• Mélanges pré-formulés : EcoSoya, NatureWax, GV 60/40.\n\nPart de l'activité : croissante (20-40%), en progression constante.\n\nParfum : 10-12% (autant ou plus qu'en paraffine).\nTempérature de coulée : 65-75°C (similaire paraffine).\nMèches : séries LX fonctionnent aussi en végétale, mais d'autres séries peuvent être utilisées.",
         'Savoir-faire MFC — Entretien terrain', 1,
         'végétale,soja,colza,coco,Dub,Rapeseed,EcoSoya,NatureWax'],

        ['technique', 'cire végétale', 'Défis du végétal — Les 3 problèmes majeurs',
         "1. FROSTING / Surface irrégulière :\n   Défaut n°1 que les clients n'acceptent pas.\n   Fréquent mais la plupart des clients comprennent quand on explique.\n   Les additifs (alcool céto-stéarylique, Nafol) aident à contrôler mais n'éliminent pas complètement.\n   Plus marqué avec le soja qu'avec le colza.\n\n2. DIFFUSION PARFUM plus faible :\n   Les cires végétales retiennent moins bien le parfum que la paraffine.\n   Le diffusion à chaud est généralement inférieur.\n   Solution : monter le % parfum (10-12%) et allonger le temps de cure.\n\n3. COMBUSTION moins régulière :\n   Le bassin de fusion est moins prévisible.\n   La flamme peut être plus instable.\n   Les additifs (alcool, Nafol) aident à régulariser.",
         'Savoir-faire MFC — Entretien terrain', 1,
         'végétale,frosting,diffusion,combustion,défaut,problème'],

        ['technique', 'cire végétale', 'Variabilité des lots végétaux — Le problème caché',
         "PROBLÈME FONDAMENTAL du végétal que la paraffine n'a pas :\n\nLes points de congélation des cires végétales ont des spectres LARGES.\nD'une production à l'autre, le fournisseur livre des lots qui varient significativement.\n\nConséquence : la MÊME recette peut donner un résultat DIFFÉRENT d'un lot à l'autre.\n→ Frosting sur un lot, pas sur le suivant\n→ Combustion correcte puis irrégulière\n→ Aspect de surface qui change\n\nRéalité MFC : on subit ce problème, c'est inhérent au végétal.\nLa paraffine (Hywax) est beaucoup plus constante lot après lot.\n\nCe que ça implique pour le labo :\n• Toujours tester sur le lot réel avant production\n• Les recettes végétales doivent avoir des marges plus larges\n• Documenter le lot fournisseur dans chaque formulation\n• Prévenir le client que des variations mineures sont possibles",
         'Savoir-faire MFC — Entretien terrain', 1,
         'végétale,variabilité,lot,fournisseur,spectre,congélation'],

        ['technique', 'additif', 'Alcool céto-stéarylique — Anti-défauts végétal',
         "L'alcool céto-stéarylique est un additif clé des bases végétales MFC.\n\nDosage : 10-15% de la masse totale (hors parfum).\n\nActions :\n1. ANTI-TROUS : empêche la formation de trous/cavités au refroidissement\n2. ANTI-POCHES D'AIR : réduit les bulles emprisonnées\n3. ANTI-CRISTALLISATION : limite le frosting et la cristallisation de surface\n4. AIDE À LA COMBUSTION : régularise le brûlage\n\nC'est un alcool gras qui modifie la structure cristalline de la cire végétale au refroidissement.\n\nNote : on retrouve le même principe que l'alcool cétylique en paraffine (base MFC-D), mais ici c'est quasi obligatoire en végétal alors qu'en paraffine c'est optionnel.",
         'Savoir-faire MFC — Entretien terrain', 1,
         'céto-stéarylique,alcool,végétale,trous,cristallisation,frosting,additif'],

        ['technique', 'additif', 'Nafol 1822 — Alcool gras + durcisseur',
         "Le Nafol 1822 est un alcool gras comme le céto-stéarylique, mais avec un double rôle :\n\n1. Alcool gras : mêmes propriétés anti-défauts (trous, poches d'air, cristallisation)\n2. Durcisseur + opacifiant : donne de la tenue et un aspect plus opaque\n\nDosage : dans la même plage que le céto-stéarylique (10-15%).\n\nChoix entre les deux :\n• Céto-stéarylique : quand on veut principalement l'effet anti-défauts\n• Nafol 1822 : quand on veut en plus de la dureté et de l'opacité\n\nLes deux peuvent être combinés dans certaines formulations.",
         'Savoir-faire MFC — Entretien terrain', 1,
         'Nafol,1822,alcool,durcisseur,opacifiant,végétale'],

        ['technique', 'cire végétale', 'Dub Rapeseed 1618 — Base colza Stéarinerie Dubois',
         "Le Dub Rapeseed 1618 est un produit de la Stéarinerie Dubois à base de tournesol/colza.\n\nC'est la BASE VÉGÉTALE PRINCIPALE MFC.\n\nUtilisation : base de la formulation végétale, combinée avec :\n• Alcool céto-stéarylique (10-15%) pour les anti-défauts\n• Ou Nafol 1822 pour anti-défauts + dureté\n• Parfois cire de coco en complément (diffusion + aspect)\n\nAvantage vs soja pur : moins de frosting.\nInconvénient : variabilité des lots fournisseur (spectre large de point de congélation).",
         'Savoir-faire MFC — Entretien terrain', 1,
         'Dub,Rapeseed,1618,colza,tournesol,Dubois,végétale,base'],

        ['technique', 'cire végétale', 'Cire de coco — Triple action en complément',
         "La cire de coco est utilisée en COMPLÉMENT (jamais seule) dans les bases végétales.\n\nTriple action :\n1. DIFFUSION : améliore le diffusion à chaud du parfum\n2. COMBUSTION : aide à un brûlage plus régulier\n3. ASPECT : donne un rendu plus lisse et crémeux\n\nGénéralement ajoutée à hauteur de 5-15% dans les mélanges soja ou colza.\nLa coco fond à basse température → ne pas surdoser sinon la bougie sera trop molle.",
         'Savoir-faire MFC — Entretien terrain', 2,
         'coco,végétale,diffusion,combustion,aspect,complément']
    ];

    for (const [cat, sub, title, content, source, prio, tags] of entries) {
        await db.run('INSERT OR IGNORE INTO knowledge_base (category,subcategory,title,content,source,priority,tags) VALUES (?,?,?,?,?,?,?)',
            [cat, sub, title, content, source, prio, tags]);
    }
    console.log('  ✓ Savoir végétal : ' + entries.length + ' fiches');
}

module.exports.seedVegetaleKnowledge = seedVegetaleKnowledge;

// Vegetable wax knowledge from terrain interviews
async function seedVegetableKnowledge(db) {
    const exists = await db.get("SELECT id FROM knowledge_base WHERE title LIKE '%végétales — Vue%'");
    if (exists) return;

    const entries = [
        ['technique', 'cire végétale', 'Cires végétales — Vue d\'ensemble MFC',
         "MFC utilise 4 types de cires végétales :\n\n• Cire de SOJA : la plus courante, bonne rétention parfum mais frosting fréquent\n• Cire de COLZA : base Dub Rapeseed 1618 (Stéarinerie Dubois) — base tournesol/colza\n• Cire de COCO : ajoutée en mélange — améliore diffusion + combustion + aspect crémeux\n• Mélanges pré-formulés : EcoSoya, NatureWax, GV 60 40\n\nLe végétal représente une part croissante de l'activité (entre minoritaire et 20-40%).\nParfum dosé à 10-12% (autant ou plus qu'en paraffine).\nTempérature de coulée : 65-75°C (similaire paraffine).",
         'Savoir-faire MFC — Entretien terrain', 1,
         'végétale,soja,colza,coco,Dub,EcoSoya,NatureWax'],

        ['technique', 'cire végétale', 'Problème fondamental du végétal — Variabilité des lots',
         "Le PROBLÈME MAJEUR des cires végétales : les points de congélation sont soit très hauts soit très bas, et les fournisseurs ont des spectres larges.\n\nConséquence : d'une production à l'autre, la même recette peut donner un résultat différent.\n\nContrairement à la paraffine (très constante, points de congélation précis comme HYWAX 5203 à 52-54°C), les cires végétales varient significativement entre lots.\n\nGestion MFC : on subit — c'est le problème intrinsèque du végétal. Les recettes doivent être plus flexibles avec des marges d'ajustement.\n\nC'est pour ça que les additifs (alcool céto-stéarylique, Nafol 1822) sont essentiels : ils stabilisent le comportement malgré la variabilité des lots.",
         'Savoir-faire MFC — Entretien terrain', 1,
         'végétale,variabilité,lot,point congélation,spectre,fournisseur,problème'],

        ['technique', 'cire végétale', 'Défis des cires végétales vs paraffine',
         "3 défis principaux des cires végétales :\n\n1. FROSTING (surface irrégulière/cristallisation blanche)\n   → Problème n°1 commercial : certains clients n'acceptent pas\n   → Fréquent mais la plupart des clients comprennent que c'est naturel\n   → Contrôlable avec les additifs (alcool céto-stéarylique, Nafol)\n   → Plus fréquent avec le soja qu'avec le colza\n\n2. DIFFUSION PARFUM plus faible\n   → Le végétal retient moins bien le parfum que la paraffine\n   → Compenser : doser à 10-12%, utiliser la coco pour améliorer le throw\n   → Temps de cure plus long recommandé (1-2 semaines vs 72h en paraffine)\n\n3. COMBUSTION moins régulière\n   → Liée à la variabilité des lots (points de congélation instables)\n   → L'alcool céto-stéarylique aide au brûlage\n   → Les mèches LX fonctionnent mais d'autres séries peuvent être plus adaptées",
         'Savoir-faire MFC — Entretien terrain', 1,
         'végétale,frosting,diffusion,combustion,défi,problème'],

        ['technique', 'additif', 'Alcool céto-stéarylique — Rôle en végétale',
         "L'alcool céto-stéarylique est un additif ESSENTIEL dans les bases végétales MFC.\n\nDosage : 10-15% de la composition totale (hors parfum).\n\nTriple action :\n1. ANTI-DÉFAUTS : empêche les trous, poches d'air et cristallisation\n2. AIDE AU BRÛLAGE : régularise la combustion (compense la variabilité du végétal)\n3. TEXTURE : améliore l'aspect de surface\n\nSans alcool céto-stéarylique, les bougies végétales présentent des défauts visuels (trous, surface irrégulière) et une combustion aléatoire.",
         'Savoir-faire MFC — Entretien terrain', 1,
         'céto-stéarylique,alcool,végétale,trous,cristallisation,brûlage,additif'],

        ['technique', 'additif', 'Nafol 1822 — Double fonction',
         "Le Nafol 1822 est un alcool gras utilisé dans les bases végétales.\n\nDouble rôle :\n1. Comme l'alcool céto-stéarylique : anti-défauts (trous, poches d'air, cristallisation) + aide au brûlage\n2. EN PLUS : durcisseur et opacifiant — donne de la tenue et un rendu plus opaque à la cire végétale\n\nUtilisé quand on a besoin à la fois de stabiliser la base ET de durcir/opacifier.\nAlternative ou complément à l'alcool céto-stéarylique selon le résultat souhaité.",
         'Savoir-faire MFC — Entretien terrain', 1,
         'Nafol,1822,alcool,durcisseur,opacifiant,végétale'],

        ['technique', 'cire végétale', 'Dub Rapeseed 1618 — Base colza Stéarinerie Dubois',
         "Le Dub Rapeseed 1618 est une cire de colza/tournesol produite par la Stéarinerie Dubois.\n\nC'est la BASE PRINCIPALE pour les formulations végétales MFC.\n\nUtilisée en combinaison avec :\n• Alcool céto-stéarylique (10-15%) pour éviter défauts et améliorer combustion\n• Nafol 1822 si besoin de dureté supplémentaire\n• Cire de coco pour améliorer diffusion/combustion/aspect\n\nAutres produits Dubois utilisés : gamme GV 60 40 (à documenter).",
         'Savoir-faire MFC — Entretien terrain', 1,
         'Dub,Rapeseed,1618,colza,tournesol,Dubois,végétale,base'],

        ['technique', 'cire végétale', 'Cire de coco — Triple avantage en mélange',
         "La cire de coco est ajoutée en mélange (jamais seule) aux bases soja ou colza.\n\nTriple avantage :\n1. Améliore la DIFFUSION du parfum (meilleur diffusion à chaud)\n2. Améliore la COMBUSTION (brûlage plus régulier)\n3. Donne un aspect plus LISSE et CRÉMEUX (réduit le frosting)\n\nC'est l'équivalent de la micro (2528) en paraffine : un \"petit caillou\" qui comble les espaces et améliore la finition.",
         'Savoir-faire MFC — Entretien terrain', 2,
         'coco,diffusion,combustion,crémeux,frosting,mélange,végétale']
    ];

    for (const [cat, sub, title, content, source, prio, tags] of entries) {
        await db.run('INSERT OR IGNORE INTO knowledge_base (category,subcategory,title,content,source,priority,tags) VALUES (?,?,?,?,?,?,?)',
            [cat, sub, title, content, source, prio, tags]);
    }
    console.log('  ✓ Savoir végétal : ' + entries.length + ' fiches');
}

module.exports.seedVegetableKnowledge = seedVegetableKnowledge;

// Science-backed soy wax knowledge
async function seedSojaScience(db) {
    const exists = await db.get("SELECT id FROM knowledge_base WHERE title LIKE '%Science du soja%'");
    if (exists) return;

    const entries = [
        ['technique', 'cire végétale', 'Science du soja — Hydrogénation et polymorphisme',
         "La cire de soja est fabriquée par HYDROGÉNATION de l'huile de soja (ajout d'atomes d'hydrogène pour transformer le liquide en solide).\n\nProblèmes scientifiques :\n\n1. POLYMORPHISME : les cristaux du soja se forment de manière incohérente. La cire continue de \"durcir\" toute sa vie — les structures cristallines ne cessent jamais de se former (source: Armatage Candle Co, Crystallization Behavior of Waxes).\n\nLe soja cristallise sous forme β' (beta prime). Des facteurs comme la formulation, la vitesse de refroidissement et l'agitation affectent le nombre et le type de cristaux (source: IntechOpen, Advances in Lipids Crystallization).\n\n2. SURCHAUFFE = DESTRUCTION : La cire de soja se déstabilise au-dessus de 82°C (180°F). La consistance est altérée, texture inégale, frosting et mauvaise adhérence. Au-dessus de 93°C les composants naturels se décomposent → séparation de la cire (source: Alphawax, Highland Candle Co).\n\n3. FENÊTRE ÉTROITE : Il faut chauffer entre 85-93°C pour décomposer les micro-cristaux sans détruire la chimie. Si on ne chauffe pas assez, les cristaux refroidissent irrégulièrement. Si on chauffe trop, la structure est détruite.\n\nComparaison avec la paraffine : la paraffine tolère une plage de température beaucoup plus large, ce qui la rend plus prévisible et plus facile à travailler.\n\nC'est pourquoi les additifs (alcool céto-stéarylique, Nafol) sont essentiels en soja : ils stabilisent la cristallisation malgré le polymorphisme naturel.",
         'Savoir-faire MFC + sources scientifiques', 1,
         'soja,hydrogénation,polymorphisme,cristallisation,surchauffe,température,science'],

        ['technique', 'cire végétale', 'Soja — Gonflement, cristallisation et cure',
         "Le soja a tendance à GONFLER et CRISTALLISER après coulée.\n\nExplication :\n• Le gonflement est lié à l'hydrogénation de l'huile : les molécules hydrogénées occupent plus de volume en se réorganisant\n• La cristallisation (frosting) est un phénomène de polymorphisme : les cristaux se forment continuellement, même des mois après la coulée\n• La surchauffe DÉTRUIT cette structure cristalline — les cristaux ne se reforment plus correctement après\n\nSolutions MFC :\n• Alcool céto-stéarylique (10-15%) : stabilise la cristallisation\n• Nafol 1822 : stabilise + durcit + opacifie\n• Température de coulée précise : 65-75°C (pas plus !)\n• Cure longue : minimum 1-2 semaines pour que les cristaux se stabilisent\n• Préchauffer les contenants pour un refroidissement uniforme\n\nLe frosting est quasi INÉVITABLE en soja pur. Même les fabricants (EcoSoya, NatureWax) ajoutent des additifs stabilisants dans leurs formulations.",
         'Savoir-faire MFC + sources scientifiques', 1,
         'soja,gonflement,cristallisation,frosting,cure,polymorphisme,température']
    ];

    for (const [cat, sub, title, content, source, prio, tags] of entries) {
        await db.run('INSERT OR IGNORE INTO knowledge_base (category,subcategory,title,content,source,priority,tags) VALUES (?,?,?,?,?,?,?)',
            [cat, sub, title, content, source, prio, tags]);
    }
    console.log('  ✓ Science du soja : ' + entries.length + ' fiches');
}

module.exports.seedSojaScience = seedSojaScience;

// Patent-backed knowledge on fatty alcohols
async function seedAlcoolScience(db) {
    const exists = await db.get("SELECT id FROM knowledge_base WHERE title LIKE '%Science des alcools gras%'");
    if (exists) return;

    await db.run('INSERT OR IGNORE INTO knowledge_base (category,subcategory,title,content,source,priority,tags) VALUES (?,?,?,?,?,?,?)',
        ['technique', 'additif', 'Science des alcools gras — Inhibition du polymorphisme (breveté)',
         "Les alcools gras (céto-stéarylique, Nafol 1822) LIMITENT ou SUPPRIMENT le polymorphisme des cires végétales.\n\nMécanisme scientifique (brevets CA2655367A1 / US20100212214A1) :\n\n1. INHIBITION DE LA CRISTALLISATION\nL'alcool gras inhibe la cristallisation des triglycérides et acides gras. Il empêche le changement de phase brutal (liquide→solide) pendant le refroidissement.\n→ Moins de polymorphisme = moins de frosting, blooming, craquement.\n\n2. RÉDUCTION DES TENSIONS INTERNES\nMoins de cristallisation = moins de tensions dans la cire = moins de trous, poches d'air et fissures.\n\n3. RÉDUCTION DE LA VISCOSITÉ LIQUIDE\nL'alcool gras réduit la viscosité de la cire fondue → meilleure alimentation en combustible vers la mèche → combustion plus propre, moins de suie, mèches plus petites suffisent.\n\n4. NATURE AMPHIPATHIQUE\nL'alcool gras aide les parfums à se disperser dans la cire → moins de saignement/suintement du parfum.\n\n5. RÉGULATION THERMIQUE\nQuand la flamme atteint 180-210°C, les alcools gras s'évaporent et absorbent la chaleur excédentaire → régulation thermique naturelle.\n\nIMPORTANT : Un MÉLANGE de plusieurs alcools gras (ex: Nafol 1822 = C18+C22) forme une substance plus AMORPHE qu'un alcool seul. Un alcool gras seul cristallise plus facilement. Les mélanges sont préférés car ils créent une structure amorphe plus solide.\n\nC'est pour ça que le Nafol 1822 et l'alcool céto-stéarylique (mélange C16+C18) sont plus efficaces qu'un alcool pur.",
         'Brevets CA2655367A1 / US20100212214A1 + Savoir-faire MFC', 1,
         'alcool,gras,polymorphisme,cristallisation,inhibition,brevet,science,Nafol,céto-stéarylique,amorphe']);

    console.log('  ✓ Science alcools gras (brevets) : 1 fiche');
}

module.exports.seedAlcoolScience = seedAlcoolScience;

// Comprehensive material properties - verified
async function seedMateriauxVerifies(db) {
    const exists = await db.get("SELECT id FROM knowledge_base WHERE title LIKE '%Fiche technique vérifiée%Nafol%'");
    if (exists) return;

    const entries = [
        ['technique', 'matière première', 'Fiche technique vérifiée — Nafol 1822 (Sasol)',
         "NAFOL 1822 — Fabricant : Sasol\nComposition : Mélange d'alcools gras linéaires C18-C22\n- 1-Docosanol (C22) : 70-85%\n- 1-Eicosanol (C20) : 15-30%\nINCI : Behenyl Alcohol\nForme : Solide incolore\nPoint de fusion : ~65°C\n\nFonctions vérifiées :\n1. INHIBITEUR DE POLYMORPHISME — S'insère entre les molécules de cire végétale, force une cristallisation uniforme → supprime frosting/blooming\n2. DURCISSEUR — Les chaînes longues (C22 dominant) donnent de la rigidité à la cire végétale\n3. OPACIFIANT — Rend la cire plus opaque\n4. RÉDUCTEUR DE VISCOSITÉ (en phase liquide) — Améliore l'alimentation de la mèche\n5. DISPERSANT DE PARFUM — Nature amphipathique aide les huiles parfumées à se répartir uniformément\n\nAvantage du MÉLANGE C18+C22 vs alcool pur :\nUn mélange de longueurs de chaîne différentes forme une substance plus AMORPHE qu'un alcool seul → meilleure inhibition du polymorphisme.\n\nDosage MFC : 10-15%",
         'Fiche technique Sasol + Brevets', 1,
         'Nafol,1822,Sasol,C22,C20,behenyl,alcool,durcisseur,polymorphisme'],

        ['technique', 'matière première', 'Fiche technique vérifiée — Alcool céto-stéarylique',
         "ALCOOL CÉTO-STÉARYLIQUE (Cetearyl Alcohol / Cetostearyl Alcohol)\nComposition : Mélange d'alcools gras\n- Alcool cétylique (C16, hexadecanol) : 30-70%\n- Alcool stéarylique (C18, octadecanol) : 30-70%\n\nPoints de fusion :\n- Alcool cétylique : 49°C (ébullition 180°C)\n- Alcool stéarylique : 61°C (ébullition 210°C)\n- Mélange : ~50°C\n\nFonctions vérifiées (brevet CA2655367A1) :\n1. INHIBE LA CRISTALLISATION des triglycérides → empêche le changement de phase brutal → moins de polymorphisme\n2. RÉDUIT LES TENSIONS INTERNES → moins de craquement, trous, poches d'air\n3. RÉDUIT LA VISCOSITÉ liquide → meilleure alimentation mèche → combustion plus propre\n4. NATURE AMPHIPATHIQUE → disperse les parfums dans la cire → moins de saignement\n5. RÉGULATION THERMIQUE → s'évapore à 180-210°C → absorbe la chaleur excédentaire à la flamme\n\nMélange C16+C18 préféré à un alcool seul (moins de cristallisation)\nDosage MFC : 10-15% en végétale\nPeut aller jusqu'à 25% dans les cas extrêmes de frosting",
         'Brevet CA2655367A1 / US20100212214A1', 1,
         'céto-stéarylique,cetearyl,cétylique,stéarylique,C16,C18,polymorphisme,brevet'],

        ['technique', 'matière première', 'Fiche technique vérifiée — DUB AL 1618 50/50 (Stéarinerie Dubois)',
         "DUB AL 1618 50/50 — Fabricant : Stéarinerie Dubois\nINCI : Cetearyl Alcohol\nComposition : Mélange 50/50 d'alcool cétylique (C16) et stéarylique (C18)\n\nC'est en fait un alcool céto-stéarylique de la Stéarinerie Dubois.\nMêmes fonctions : émollient, opacifiant, épaississant, stabilisateur d'émulsion.\n\nNe pas confondre avec le DUB RAPESEED 1618 qui est la cire de colza/tournesol.\n\nNote : Le \"1618\" dans les deux produits réfère aux chaînes C16-C18.",
         'SpecialChem / Stéarinerie Dubois', 2,
         'DUB,AL,1618,Dubois,cetearyl,alcool'],

        ['technique', 'matière première', 'Fiche technique vérifiée — Cire de coco',
         "CIRE DE COCO (Coconut Wax)\nOrigine : Huile de coco hydrogénée (chair de noix de coco)\nPoint de fusion : 24-53°C selon le grade (très variable)\n\nCaractéristiques :\n- Couleur blanc crème, texture onctueuse\n- TRÈS BAS point de fusion → trop molle seule → toujours utilisée en mélange\n- Excellent diffusion à chaud (diffusion parfum à chaud)\n- Combustion propre, peu de suie\n- Bonne rétention de parfum\n\nUsage MFC : en COMPLÉMENT (5-15%) des bases soja ou colza\nTriple action : diffusion + combustion + aspect crémeux\n\nLimite : trop molle seule, surtout en climat chaud. Nécessite un durcisseur (Nafol) ou mélange avec cire plus dure.",
         'Sources multiples vérifiées', 2,
         'coco,coconut,fusion,diffusion,crémeux,complément'],

        ['technique', 'matière première', 'Fiche technique vérifiée — Cire de colza (Rapeseed)',
         "CIRE DE COLZA (Rapeseed Wax)\nOrigine : Huile de colza hydrogénée (Europe — France 1er producteur)\nPoint de fusion : 42-50°C\n\nCaractéristiques :\n- Propriétés très similaires au soja\n- Moins de frosting que le soja pur\n- Bonne rétention de parfum et colorant\n- Adapté aux bougies container\n- Végan, sans OGM, sans palme\n- La France est le 1er producteur européen de colza\n\nProduit MFC principal : Dub Rapeseed 1618 (Stéarinerie Dubois) — base tournesol/colza\n\nAvantage vs soja : moins sujet au polymorphisme, meilleure constance des lots (mais variabilité reste un problème)",
         'Sources multiples vérifiées', 2,
         'colza,rapeseed,tournesol,fusion,Europe,France,soja,alternative'],

        ['technique', 'matière première', 'Fiche technique vérifiée — Cire de soja',
         "CIRE DE SOJA (Soy Wax)\nOrigine : Huile de soja hydrogénée (principalement USA)\nPoint de fusion : 44,7-82°C selon le grade (container: 49-57°C)\nCristallisation : 44,7-47°C\nDensité : ~0,91 g/cm³\n\nCaractéristiques positives :\n- Combustion lente et propre (peu de suie)\n- Bonne durée de brûlage\n- Biodégradable, renouvelable\n- Se nettoie à l'eau et au savon\n\nProblèmes MAJEURS :\n1. POLYMORPHISME — Cristallise sous forme β' (beta prime), cristaux se forment continuellement toute la vie de la bougie\n2. FROSTING quasi inévitable en soja pur\n3. GONFLEMENT après coulée (réorganisation moléculaire post-hydrogénation)\n4. SURCHAUFFE DESTRUCTRICE — Se déstabilise >82°C, structure détruite >93°C. Fenêtre de travail étroite (85-93°C)\n5. VARIABILITÉ DES LOTS — Spectres larges de point de congélation d'un lot à l'autre\n6. CURE LONGUE — 1-2 semaines minimum pour stabilisation cristalline\n\nSolutions MFC : alcool céto-stéarylique ou Nafol 1822 (10-15%) = inhibe le polymorphisme",
         'Sources scientifiques multiples', 1,
         'soja,soy,polymorphisme,cristallisation,frosting,gonflement,hydrogénation,surchauffe'],

        ['technique', 'matière première', 'Tableau comparatif — Matières végétales MFC',
         "COMPARATIF DES MATIÈRES VÉGÉTALES MFC\n\n| Matière | Point fusion | Polymorphisme | Diffusion | Frosting | Seule ? |\n|---------|-------------|---------------|-----------|----------|---------|\n| Soja | 49-57°C | FORT (β') | Moyenne | Fort | Oui (container) |\n| Colza (Dub Rapeseed) | 42-50°C | Modéré | Bonne | Modéré | Oui (base MFC) |\n| Coco | 24-53°C | Faible | Excellente | Faible | NON (trop molle) |\n| Nafol 1822 | ~65°C | INHIBE | — | RÉDUIT | NON (additif) |\n| Céto-stéarylique | ~50°C | INHIBE | — | RÉDUIT | NON (additif) |\n\nRègle MFC :\n- BASE : Colza (Dub Rapeseed) ou Soja\n- ADDITIF OBLIGATOIRE : Céto-stéarylique ou Nafol (10-15%) pour inhiber polymorphisme\n- COMPLÉMENT optionnel : Coco (5-15%) pour diffusion + combustion + aspect\n- DURCISSEUR si besoin : Nafol 1822 (double action)",
         'Synthèse MFC — Sources vérifiées', 1,
         'comparatif,soja,colza,coco,Nafol,céto-stéarylique,polymorphisme,tableau']
    ];

    for (const [cat, sub, title, content, source, prio, tags] of entries) {
        await db.run('INSERT OR IGNORE INTO knowledge_base (category,subcategory,title,content,source,priority,tags) VALUES (?,?,?,?,?,?,?)',
            [cat, sub, title, content, source, prio, tags]);
    }
    console.log('  ✓ Fiches matières vérifiées : ' + entries.length + ' fiches');
}

module.exports.seedMateriauxVerifies = seedMateriauxVerifies;

// Session 17 — Pillar, Vegetable base, new materials
async function seedSession17(db) {
    const exists = await db.get("SELECT id FROM knowledge_base WHERE title LIKE '%Cire Végétale S — Apiculture Remuaux%'");
    if (exists) return;

    const entries = [
        // === CIRE VÉGÉTALE S (G 60/40) ===
        ['technique', 'matière première', 'Fiche technique vérifiée — Cire Végétale S (G 60/40) — Apiculture Remuaux',
         "CIRE VÉGÉTALE S — Fournisseur : Apiculture Remuaux (Barbentane, 13570)\nAppellation MFC : \"G 60/40\" ou \"soja G 60 40\"\n\nIDENTIFICATION CHIMIQUE :\n- Nom commercial : Cire végétale S\n- Description : Huile végétale raffinée PARTIELLEMENT hydrogénée\n- Description chimique : Triglycérides\n- CAS : 8016-70-4\n- EINECS : 232-410-2\n- INCI : HYDROGENATED SOYBEAN OIL\n- 100% d'origine végétale\n\nCARACTÉRISTIQUES TECHNIQUES :\n- Couleur : Blanc / ivoire\n- Point de solidification : 32-42°C (ASTM D 938) — BAS !\n- Viscosité cinématique à 100°C : 7-12 cSt (ASTM D 445)\n- Pénétration à 25°C : 45-65 (1/10 mm, ASTM D 1321) — MOLLE\n- Présentation : Plaques ou pastilles, caisses de 20 kg\n- Point d'éclair : >200°C (coupelle ouverte)\n\nPROPRIÉTÉS ANNONCÉES :\n- Bougies bien blanches, facilement colorables\n- Surface lisse et brillante\n- Bonne adhésion verre (améliorable avec beurres/corps gras)\n- Pas de rétractation ni cristallisation au refroidissement\n- Pas de mauvaise odeur en brûlant ou à l'extinction\n- Flamme douce, longue durée de brûlage\n- Odeur neutre\n\nSTOCKAGE : Protéger du soleil, poussière, températures excessives. Endroits frais et secs.\n\nREMARQUE MFC : Malgré les propriétés annoncées (\"pas de cristallisation\"), en pratique MFC ajoute 30% d'alcools gras (Nafol 20% + AL 1618 10%) pour garantir l'absence de polymorphisme. Le produit seul ne suffit PAS pour un résultat professionnel constant.",
         'FT Apiculture Remuaux + FDS', 1,
         'végétale,S,soja,G6040,Remuaux,triglycérides,hydrogénée,8016-70-4'],

        // === FOURNISSEUR REMUAUX ===
        ['technique', 'fournisseur', 'Fournisseur — Apiculture Remuaux',
         "APICULTURE REMUAUX\nAdresse : 543 Route d'Avignon, CD35, 13570 Barbentane\nTél : 04.90.95.29.11\nFax : 04.90.95.38.14\nWeb : www.apiculture-remuaux.fr\nEmail : contact13@apiculture-remuaux.fr\n\nFournisseur de la Cire Végétale S (soja hydrogéné) utilisée par MFC.\nCertifié ISO 9001 (AENOR ER-1279/2008).\nProduit conforme REACH (exonéré d'enregistrement).",
         'FDS Apiculture Remuaux', 2,
         'Remuaux,Barbentane,fournisseur,soja,végétale'],

        // === VYBAR 260 ===
        ['technique', 'matière première', 'Fiche technique vérifiée — Vybar 260 (polymère bougie)',
         "VYBAR 260 — Fabricant : Nucera Solutions (anciennement Chase Corp)\nType : Polyalphaoléfine hyper-branchée\nPoint de fusion : ~54°C\nForme : Granulés\n\nFONCTIONS VÉRIFIÉES :\n1. RÉTENTION DE PARFUM — Fonction principale. Lie le parfum à la cire, empêche la migration\n2. ANTI-MOTTLING — Élimine les taches blanches (migration d'huile)\n3. OPACIFIANT — Augmente l'opacité de la cire\n4. DURCISSEUR — Renforce la structure, prévient déformations/fractures\n5. DISPERSION COLORANT — Distribution uniforme des teintures\n6. BRILLANCE SURFACE — Améliore le fini de surface\n7. ANTI-BULLES — Réduit les bulles d'air\n\nGAMME VYBAR :\n- Vybar 103/108 : Paraffines point de fusion ≥58°C → PILIERS, tapers\n- Vybar 260 : Paraffines point de fusion <58°C → CONTAINERS, votives\n- Vybar 343 : Effet marbré (mottled)\n- Vybar 825 : Liquide, effet marbré\n\nDOSAGE :\n- Standard : 0,25% (sans parfum) à 2% (charge parfum élevée)\n- MFC Cylindrique : 3% → au-dessus du standard, justifié par le format massif (8 kg) et 10% parfum\n\nATTENTION : Trop de Vybar PIÈGE le parfum dans la cire → réduit le diffusion à chaud. Ne pas surdoser.\nNe fonctionne PAS avec soja ou palme — PARAFFINE UNIQUEMENT.",
         'Nucera Solutions + Bulk Apothecary + CerasMarti', 1,
         'Vybar,260,polymère,polyalphaoléfine,rétention,parfum,pilier,mottling'],

        // === BEKRO COLORANTS ===
        ['technique', 'matière première', 'Fiche technique — Colorants Bekro (Allemagne)',
         "BEKRO CHEMIE — Fabricant allemand de colorants pour bougies\n\nTypes disponibles :\n- Colorants solubles dans l'huile (oil soluble dyes) : complètement solubles, cire reste transparente\n- Pigments : pour overdipping, nécessitent mixeur\n- Colorants solides (grains) : faciles à doser, stables au stockage\n- Colorants liquides : dissolution rapide à basse température\n- Système RAINBOW : logiciel cloud de formulation couleur\n\nDOSAGE RECOMMANDÉ :\n- Standard : 0,1% à 0,2% (1-2g par kg de cire)\n- À 0,2% → 10g colore environ 5 kg de cire\n- Impact minimal sur la combustion à ces dosages\n\nMISE EN ŒUVRE :\n- Ajouter dans la cire fondue à ~70°C\n- Bien mélanger pour distribution uniforme\n- Ne pas surchauffer (jaunissement de la cire)\n\nRéférence MFC : Bekro 15081 utilisé dans formule pilier Cylindrique à 0,20%.\nConstance lot-à-lot excellente (avantage vs autres fournisseurs).",
         'Bekro Chemie + distributeurs', 2,
         'Bekro,colorant,teinture,grain,dosage,15081,Allemagne'],

        // === RECETTE MFC-H : PILIER CYLINDRIQUE ===
        ['recette', 'pilier', 'Recette MFC-H — Pilier paraffine (Cylindrique / Louboutin)',
         "RECETTE MFC-H — PILIER PARAFFINE\n\nType : Pilier (bougie autoportante, coulée en moule)\nValidée sur : Cylindrique Louboutin\nDate : 03/02/2026\n\nCOMPOSITION :\n- Paraffine 6670 : 77%\n- DUB AL 1618 (céto-stéarylique) : 10%\n- Vybar 260 : 3%\n- Parfum : 10%\n\nCOLORANT : Bekro 15081 à 0,20%\n\nMÈCHE : 3 × LX22 (format 8 kg, triple mèche)\n\nNOTES EMPIRIQUES :\n- PREMIÈRE RECETTE PILIER MFC documentée\n- La 6670 est une paraffine spécifique pilier (probablement haute fusion ≥58°C)\n- Le DUB 1618 est utilisé ici EN PARAFFINE (pas seulement végétal) → arme universelle anti-défauts\n- Vybar 260 à 3% = au-dessus du dosage standard (max 2%) → format massif le justifie\n- Triple mèche nécessaire pour le diamètre large d'un pilier 8 kg\n- Pas de 5203, pas de 6213 → paraffine pilier = monde différent du container\n\nDIFFÉRENCES CLÉ PILIER vs CONTAINER :\n- Pilier doit tenir sa forme → cire plus dure\n- Vybar remplace la micro-cristalline pour la rigidité\n- Triple mèche pour couvrir le diamètre\n- Pas besoin d'adhérence verre",
         'Excel Cylindrique.xlsx — MFC', 1,
         'pilier,cylindrique,Louboutin,6670,Vybar,260,triple,mèche,Bekro'],

        // === RECETTE MFC-I : BASE VÉGÉTALE UNIVERSELLE ===
        ['recette', 'container végétal', 'Recette MFC-I — Base végétale universelle (La Bruket)',
         "RECETTE MFC-I — BASE VÉGÉTALE UNIVERSELLE\n\nType : Container végétal\nValidée sur : La Bruket (marque suédoise premium)\nBase universelle MFC pour toutes bougies végétales\nDate : 12/03/2025\n\nCOMPOSITION :\n- Cire Végétale S (soja G 60/40, Remuaux) : 60%\n- Nafol 1822 (Sasol) : 20%\n- DUB AL 1618 (céto-stéarylique Dubois) : 10%\n- Parfum : 10%\n\nCOLORANT : Aucun (rendu naturel blanc crémeux)\n\nMÈCHE (3 options selon diamètre) :\n- Petit modèle : LX18\n- Moyen modèle : LX22\n- Grand modèle : 3 × LX20\n\nNOTES EMPIRIQUES :\n- 30% D'ALCOOLS GRAS = dosage massif mais nécessaire\n- Double système anti-polymorphisme : Nafol (C18-C22) + AL 1618 (C16-C18)\n- Les deux alcools ont des longueurs de chaîne DIFFÉRENTES → structure plus amorphe → meilleure inhibition\n- Le pré-formulé G 60/40 seul NE SUFFIT PAS malgré ses propriétés annoncées\n- Recette UNIVERSELLE : s'adapte à tous les containers via le choix de mèche\n- Zéro colorant = argument commercial \"naturel\" pour clients premium\n- Cure recommandée : 1-2 semaines minimum\n\nPOINT CRITIQUE : Le soja a un point de solidification BAS (32-42°C) et une pénétration ÉLEVÉE (45-65) → il est MOU. Les 30% d'alcools gras compensent en durcissant ET en stabilisant.",
         'Excel bougie_la_bruket.xlsx — MFC', 1,
         'végétale,universelle,Bruket,soja,G6040,Nafol,1618,alcools,gras,30%'],

        // === RECETTE BOIS BLOND ===
        ['recette', 'container', 'Formulation Bois Blond — Paraffine 6243 pure',
         "FORMULATION BOIS BLOND\n\nType : Container paraffine simple\nDate : 09/12/2025\nArticle : ART4428 / Lot GP4491\nVerre : Stockholm 27 — 200g × 45 pièces\n\nCOMPOSITION :\n- Paraffine 6243 : 90%\n- Parfum Bois Blond : 10%\n\nCOLORANT : Aucun\nMÈCHE : LX18\n\nNOTES :\n- La 6243 est une NOUVELLE référence paraffine (pas 6213, pas 5203)\n- Même philosophie que Rothschild (MFC-F) : une seule cire + parfum\n- Zéro additif, zéro colorant = simplicité maximale\n- Production série (45 unités)\n- À clarifier : relation entre 6243 et 6213 (variante ? remplacement ?)",
         'Excel verre_bois_blond_.xlsx — MFC', 2,
         'Bois,Blond,6243,paraffine,Stockholm,simple,ART4428'],

        // === PARAFFINE 6670 ===
        ['technique', 'matière première', 'Paraffine 6670 — Référence pilier',
         "PARAFFINE 6670\nUtilisée dans : Recette pilier Cylindrique (MFC-H)\nDosage : 77%\n\nPas de fiche technique disponible pour le moment.\nProbablement une paraffine haute fusion (≥58°C) adaptée aux piliers.\nNe fait pas partie du catalogue Hywax standard connu.\nPeut être un grade spécifique fournisseur ou une référence interne.\n\nComparaison avec paraffines container MFC :\n- 5203 (Hywax) : macrocristalline container\n- 6213 (Hywax) : semi-raffinée container, huileuse\n- 2528 (Hywax) : microcristalline\n- 6243 : nouvelle référence container (relation avec 6213 ?)\n- 6670 : PILIER — monde différent",
         'Déduit de formulation Cylindrique', 3,
         '6670,paraffine,pilier,haute,fusion'],

        // === PARAFFINE 6243 ===
        ['technique', 'matière première', 'Paraffine 6243 — Nouvelle référence container',
         "PARAFFINE 6243\nUtilisée dans : Formulation Bois Blond\nDosage : 90% (+ 10% parfum)\n\nPas de fiche technique disponible pour le moment.\nUtilisée exactement comme la 6213 dans la recette Rothschild (90/10).\nNom proche de 6213 → probablement même famille/fournisseur.\nÀ clarifier : est-ce un remplacement de la 6213 ou un grade différent ?",
         'Déduit de formulation Bois Blond', 3,
         '6243,paraffine,container,6213,variante'],

        // === INSIGHT : PILIER vs CONTAINER ===
        ['technique', 'formulation', 'Pilier vs Container — Différences fondamentales',
         "PILIER vs CONTAINER — CE QUI CHANGE TOUT\n\nCONTAINER (dans un verre) :\n- La cire peut être molle → le verre la contient\n- Adhérence au verre = important\n- Une seule mèche en général\n- Paraffines basses à moyennes : 5203, 6213, 2528, 6243\n- Pas besoin de Vybar (la cire n'a pas à tenir sa forme)\n\nPILIER (autoportant) :\n- La cire DOIT tenir sa forme → dure obligatoirement\n- Pas de contenant → rigidité structurelle critique\n- Multiple mèches pour les grands formats\n- Paraffine haute fusion : 6670\n- Vybar 260 nécessaire pour rigidité + rétention parfum\n- DUB 1618 toujours présent (anti-défauts universel)\n- Colorant Bekro au lieu de Kaiser Lacke\n\nPOINT COMMUN :\n- DUB AL 1618 (céto-stéarylique) à 10% dans les DEUX cas\n- Parfum à 10%\n- Le céto-stéarylique est l'ADDITIF UNIVERSEL MFC, toutes recettes confondues",
         'Synthèse formulations MFC', 1,
         'pilier,container,différences,Vybar,rigidité,mèche,6670,5203'],

        // === INSIGHT : ALCOOL CÉTO-STÉARYLIQUE UNIVERSEL ===
        ['astuce', 'formulation', 'DUB AL 1618 — Additif universel MFC (toutes recettes)',
         "DUB AL 1618 = L'ADDITIF QUI REVIENT PARTOUT\n\nPrésent dans :\n- Recettes végétales : 10% (La Bruket MFC-I)\n- Recettes pilier paraffine : 10% (Cylindrique MFC-H)\n- Recettes container paraffine : via alcool céto-stéarylique\n\nPourquoi ? Parce que ses 5 fonctions (brevet) servent PARTOUT :\n1. Anti-polymorphisme → utile en végétal ET en paraffine\n2. Anti-défauts (trous, fissures) → utile partout\n3. Réduction viscosité → meilleure combustion partout\n4. Dispersion parfum → utile partout\n5. Régulation thermique → utile partout\n\nDosage MFC constant : 10% quelle que soit la base (végétale ou paraffine)\nC'est LE secret MFC : un seul additif, toutes les recettes."
         , 'Synthèse toutes formulations', 1,
         'DUB,1618,universel,partout,végétal,paraffine,pilier,container']
    ];

    for (const [cat, sub, title, content, source, prio, tags] of entries) {
        await db.run('INSERT OR IGNORE INTO knowledge_base (category,subcategory,title,content,source,priority,tags) VALUES (?,?,?,?,?,?,?)',
            [cat, sub, title, content, source, prio, tags]);
    }
    console.log('  ✓ Session 17 : ' + entries.length + ' fiches (pilier + végétale + matières)');
}

module.exports.seedSession17 = seedSession17;

// ═══════════════════════════════════════════════════
// SESSION 18 — FICHES DUBOIS + SER/AWAX + CORRECTIONS
// DUB AL 18, DUB GREEN WAX RAPESEED, Groupe AWAX,
// Paraffine 6243 corrigée, 6670 confirmée SER
// ═══════════════════════════════════════════════════

async function seedSession18(db) {
    // Ajouter les fournisseurs manquants
    const newSuppliers = [
        ['SER SpA', 'Italie', 'Paraffines pilier, blends sur mesure (Groupe AWAX)', 'https://www.serwax.com'],
        ['Apiculture Remuaux', 'France', 'Cires végétales (soja)', 'https://www.apiculture-remuaux.fr'],
        ['Nucera Solutions', 'États-Unis', 'Additifs polymères (Vybar)', null],
        ['Bekro', 'Allemagne', 'Colorants bougies', null]
    ];
    for (const [name, country, specialty, website] of newSuppliers) {
        const exists = await db.get('SELECT id FROM suppliers WHERE name = ?', [name]);
        if (!exists) {
            await db.run('INSERT INTO suppliers (name, country, specialty, website) VALUES (?,?,?,?)', [name, country, specialty, website]);
        }
    }

    // Corriger Hywax : pays = Allemagne (pas Pays-Bas), ajouter note groupe AWAX
    await db.run("UPDATE suppliers SET country = 'Allemagne', specialty = 'Paraffines container, microcristallines, Fischer-Tropsch (Groupe AWAX)' WHERE name = 'Hywax'");

    const entries = [
        // === FOURNISSEUR : STÉARINERIE DUBOIS ===
        ['fournisseur', 'fournisseur', 'Stéarinerie Dubois Fils — Fournisseur stratégique MFC',
         "STÉARINERIE DUBOIS FILS\n\nAdresse : 696 rue Yves Kermen, 92100 Boulogne-Billancourt, France\nTél : +33 1 46 10 07 30 / Fax : +33 1 49 10 99 48\nEmail : info@duboisexpert.com\nWeb : duboisexpert.com\n\nFournisseur STRATÉGIQUE de MFC — fournit à la fois :\n- Les alcools gras (DUB AL 1618, DUB AL 18)\n- Les cires végétales (DUB GREEN WAX RAPESEED)\n→ Un seul fournisseur pour les deux familles clés = logistique simplifiée + compatibilité garantie\n\nProduits MFC identifiés :\n• DUB AL 1618 : mélange céto-stéarylique C16+C18, additif universel MFC à 10%\n• DUB AL 18 - 98% : alcool stéarylique pur C18 (référence technique)\n• DUB GREEN WAX RAPESEED : cire de colza hydrogénée\n\nSpécialiste historique des corps gras et alcools gras pour cosmétique, pharma et industrie.\nFiches SDS volontaires (non obligatoires selon REACH Art.31 car produits non classés).",
         'SDS Dubois + analyse MFC', 1,
         'Dubois,fournisseur,Boulogne,alcool gras,cire végétale,DUB,stratégique'],

        // === DUB AL 18 - 98% ===
        ['technique', 'matière première', 'DUB AL 18 - 98% — Alcool stéarylique pur (Dubois)',
         "DUB AL 18 - 98% — ALCOOL STÉARYLIQUE PUR\nFournisseur : Stéarinerie Dubois Fils\n\nIdentification :\n- Nom chimique : Stearyl alcohol (1-octadecanol)\n- Formule : C₁₈H₃₈O (CH₃(CH₂)₁₆CH₂OH)\n- Masse molaire : 270,49 g/mol\n- CAS : 112-92-5 / CE : 204-017-6\n- REACH : 01-2119485907-20 (enregistré)\n- Pureté : 98% minimum C18\n\nPropriétés physiques (SDS Dubois) :\n- État : solide, pastilles blanches\n- Odeur : inodore\n- Point de fusion : 55-59°C\n- Point d'ébullition : 320-340°C\n- Viscosité cinématique : 4 mm²/s (100°C)\n- Densité : ~0,9 g/cm³ (20°C)\n- Pression vapeur : 0,001 mbar (38°C)\n- Log Pow : 7,6\n- Solubilité : insoluble eau / soluble alcool, acétone, éther\n\nDonnées analytiques (littérature) :\n- Indice d'acide : ≤0,5 mg KOH/g\n- Indice de saponification : ≤1,0 mg KOH/g\n- Indice d'iode : ≤2,0 gI₂/100g\n- Indice d'hydroxyle : 195-220 mg KOH/g\n\nSécurité :\n- Classification CLP : Non classé (aucun pictogramme)\n- DL50 orale rat : >2000 mg/kg (non toxique)\n- Non irritant cutané, non sensibilisant\n- Facilement biodégradable (>60%)\n- Stockage : 5-30°C\n\nDIFFÉRENCE CRITIQUE avec DUB AL 1618 :\n- AL 18 = C18 PUR → réseau cristallin plus ordonné → point de fusion plus élevé (55-59°C)\n- AL 1618 = MÉLANGE C16+C18 → structure plus AMORPHE → meilleur anti-polymorphisme\n→ MFC utilise le 1618 (mélange) plutôt que le 18 (pur) JUSTEMENT parce que le mélange de longueurs de chaîne différentes crée le désordre cristallin qui combat la polymorphie.",
         'SDS Dubois 13/12/2022 v6.01 + recherche web', 1,
         'DUB,AL 18,stéarylique,C18,pur,Dubois,112-92-5,alcool gras'],

        // === DUB GREEN WAX RAPESEED ===
        ['technique', 'matière première', 'DUB GREEN WAX RAPESEED — Cire de colza hydrogénée (Dubois)',
         "DUB GREEN WAX RAPESEED — CIRE DE COLZA HYDROGÉNÉE\nFournisseur : Stéarinerie Dubois Fils (gamme Green)\n\nIdentification :\n- Nom chimique : Hydrogenated rapeseed wax\n- CAS : 68334-28-1 ou 67701-30-8\n- REACH : Exempté Annexe IV (substance naturelle)\n- Usage : Utilisation industrielle\n\nPropriétés physiques (SDS Dubois) :\n- État : solide\n- Couleur : blanchâtre\n- Odeur : faible\n- Point de fusion : ≈50°C\n- Densité : 0,89-0,92 g/ml (25°C)\n- Pression vapeur : <0,01 mmHg (200°C)\n- Solubilité : insoluble dans l'eau\n\nCaractéristiques chimiques :\n- Obtenue par hydrogénation d'huile de colza riche en acide érucique (C22:1)\n- Indice d'iode final ≤4 gI₂/100g (saturation quasi-complète)\n- Composition typique acides gras : érucique (C22:0), oléique (C18:0), linoléique (C18:0)\n- Indice de saponification : 180-200 mg KOH/g (grades bougies)\n- Triglycerides comme structure de base\n\nSécurité :\n- Classification CLP : Non classé\n- Facilement biodégradable, non bioaccumulable\n- Incompatible : oxydants forts\n- Décomposition thermique : CO/CO₂\n\nINTÉRÊT POUR MFC :\n- Plus DURE que le soja (fusion 50°C vs 32-42°C Cire Végétale S)\n- Meilleur candidat pour pilier végétal (tient mieux sa forme)\n- Colza européen = argument marketing fort (circuit court, non-OGM, sans palme)\n- Confirme que Dubois fournit AUSSI les cires végétales à MFC, pas seulement les alcools gras\n- Alternative ou complément à la Cire Végétale S (soja Remuaux) pour clients premium",
         'SDS Dubois 13/12/2022 v6.01 + recherche web', 1,
         'DUB,GREEN WAX,rapeseed,colza,hydrogénée,Dubois,68334-28-1,végétale'],

        // === FOURNISSEUR : SER / GROUPE AWAX ===
        ['fournisseur', 'fournisseur', 'SER SpA (Groupe AWAX) — Fournisseur paraffines pilier MFC',
         "SER SpA — SINTESI E RICERCA (Wax Industry)\n\nGroupe : AWAX S.p.A. (même groupe que Hywax)\nUsine : Strada Quaglia, 26 - 10026 Santena (Turin), Italie\nBureaux : NEXTTO Polo Uffici Lingotto, Via Nizza 262, 10126 Torino\nSiège social : Via IV Novembre 30, 12025 Dronero (CN)\nTVA : IT05583420012\nEmail : ser@cere.it\nTél : +39 011 94 555 11\nWeb : serwax.com / cere.it\n\nProfil :\n- 30+ ans d'expérience en cires\n- 5000 clients actifs, 1000+ produits\n- Spécialiste mondial de cires pour bougies au sein du groupe AWAX\n- Fournit les meilleures manufactures de bougies au monde\n- Gamme : minérale, synthétique, animale, végétale, blends sur mesure, additifs\n- Modèle 'tailor-made waxes' = formulations personnalisées pour chaque client\n\nGROUPE AWAX comprend :\n- Hywax GmbH (Allemagne) : paraffines, microcristallines, Fischer-Tropsch (ex-Sasol Wax depuis mars 2022)\n- SER SpA (Italie) : spécialiste bougies, R&D, blends sur mesure\n- Alpha Wax BV (Pays-Bas) : distribution\n- Price's Candles (UK, Bedford) : plus ancienne maison de bougies au monde, Royal Warrant britannique\n- Quintanar (Espagne) : cires durables cosmétique/hot-melt\n\nProduits MFC identifiés :\n• Paraffine 6670 : pilier haute fusion, probablement sur mesure SER\n• Paraffine 6243 : pilier/melt blend avec stéarine intégrée (ex-Sasol)\n\nLa numérotation 6xxx est commune au groupe (6213 Hywax, 6243 et 6670 SER) = même système de référencement.",
         'Recherche web serwax.com + awax.it', 1,
         'SER,AWAX,Hywax,Italie,Turin,Santena,groupe,Price Candles,pilier,6670'],

        // === PARAFFINE 6670 — CORRIGÉE ===
        ['technique', 'matière première', 'Paraffine 6670 (SER/AWAX) — Pilier haute fusion',
         "PARAFFINE 6670 — SER SpA (Groupe AWAX, Italie)\n\nFournisseur : SER SpA, Santena (Turin), Italie\nGroupe : AWAX (même groupe que Hywax)\nUtilisée dans : Recette MFC-H — Cylindrique Louboutin (pilier 8 kg)\nDosage MFC : 77%\n\nCaractéristiques probables (pas de fiche technique publique) :\n- Type : paraffine haute fusion spécialisée pilier\n- Point de fusion : probablement ≥58°C (nécessaire pour autoportant)\n- Format : probablement pastilles (cohérent avec gamme SER)\n- Produit vraisemblablement sur mesure ('tailor-made') pour clients professionnels\n\nPas de fiche technique disponible en ligne → cohérent avec le modèle SER de formulations personnalisées pour chaque client professionnel.\n\nContexte :\n- Pas dans le catalogue public Hywax standard (5203, 6213, 2528)\n- La numérotation 6670 s'inscrit dans le système de référencement du groupe AWAX\n- MFC sort du catalogue Hywax Allemagne pour aller chez SER Italie spécifiquement pour les piliers\n- SER est le bras 'bougie' du groupe, avec le plus de R&D et d'expertise en formulation\n\nDifférence avec paraffines container MFC :\n- 5203, 6213, 2528 (Hywax Allemagne) = container, fusion basse-moyenne\n- 6670 (SER Italie) = pilier, fusion haute, rigidité structurelle",
         'Recherche web + analyse MFC', 1,
         '6670,SER,AWAX,pilier,haute fusion,paraffine,Italie,Cylindrique'],

        // === PARAFFINE 6243 — CORRIGÉE ===
        ['technique', 'matière première', 'Paraffine 6243 (Hywax/SER) — Pilier/Melt blend avec stéarine',
         "PARAFFINE 6243 — HYWAX/SER (Groupe AWAX)\n\nNom commercial : Sasol 6243 Blended Pillar / Melt Wax (nom historique)\nDevenu : Hywax 6243 (depuis mars 2022, changement Sasol → Hywax)\nFournisseur : Hywax GmbH / SER SpA (Groupe AWAX)\n\nCaractéristiques confirmées (recherche web) :\n- Type : mélange paraffine hautement raffinée + STÉARINE\n- Application : piliers, fondants (melts), votives\n- Format : pastilles (pellets)\n- Démoulage : excellent (easy mold release)\n- Adhérence colorant : excellente\n- Scent throw : outstanding\n- Stéarine intégrée → renforce la structure\n\nCORRECTION IMPORTANTE :\nLa 6243 n'est PAS une cire container comme la 6213.\nC'est une cire PILIER/MELT avec stéarine intégrée.\n\nImplication pour la formule Bois Blond (90% 6243 + 10% parfum) :\n- Aucun additif (pas de DUB 1618, pas de Nafol) = NORMAL\n- La stéarine déjà présente dans le blend joue un rôle similaire aux alcools gras\n- C'est un blend PRÉ-FORMULÉ, prêt à l'emploi\n- Pas besoin d'anti-défauts car la stéarine est déjà là\n\nÀ ne pas confondre avec :\n- 6213 : container, mélange paraffine + triglycérides végétaux, mou, fusion ~48°C\n- 6243 : pilier/melt, mélange paraffine + stéarine, dur, fusion plus élevée",
         'NI Candle Supplies UK + analyse MFC', 1,
         '6243,Hywax,Sasol,pilier,melt,stéarine,blend,Bois Blond,paraffine'],

        // === FAMILLE DUBOIS — 3 PRODUITS MFC ===
        ['astuce', 'additif', 'Famille Dubois — Les 3 produits MFC et leurs rôles',
         "FAMILLE STÉARINERIE DUBOIS — 3 PRODUITS IDENTIFIÉS CHEZ MFC\n\n1. DUB AL 1618 (mélange céto-stéarylique C16+C18)\n   → L'ADDITIF UNIVERSEL MFC à 10% dans toutes les recettes\n   → Mélange C16+C18 = structure amorphe = anti-polymorphisme\n   → Point de fusion : ~50-56°C\n   → 5 fonctions brevetées\n\n2. DUB AL 18 - 98% (alcool stéarylique pur C18)\n   → Référence technique, C18 pur à 98%\n   → Point de fusion plus élevé : 55-59°C\n   → Réseau cristallin plus ORDONNÉ que le 1618\n   → PAS utilisé dans les recettes MFC (le mélange 1618 est préféré)\n   → Intérêt : comprendre POURQUOI MFC choisit le 1618\n\n3. DUB GREEN WAX RAPESEED (cire de colza hydrogénée)\n   → Cire végétale, gamme 'Green' Dubois\n   → Point de fusion ≈50°C (plus dure que soja 32-42°C)\n   → Alternative au soja pour bougies végétales premium\n   → Argument : colza européen, non-OGM, sans palme\n\nPOURQUOI LE 1618 ET PAS LE 18 PUR ?\nLe mélange de chaînes C16 + C18 de longueurs DIFFÉRENTES crée un désordre cristallin (structure amorphe) qui empêche la cristallisation ordonnée. C'est exactement ce qui combat le polymorphisme. Le C18 pur, avec ses chaînes toutes identiques, s'organise trop bien → moins efficace comme anti-polymorphe.",
         'Analyse comparative SDS Dubois', 1,
         'Dubois,DUB,AL 18,AL 1618,GREEN WAX,rapeseed,famille,C16,C18,amorphe'],

        // === GROUPE AWAX — CARTOGRAPHIE FOURNISSEURS ===
        ['astuce', 'fournisseur', 'Groupe AWAX — Cartographie complète fournisseurs cires MFC',
         "CARTOGRAPHIE FOURNISSEURS CIRES MFC\n\nGROUPE AWAX (holding italienne, Turin) :\n├─ Hywax GmbH (Allemagne) → cires container MFC\n│  • 5203 : macrocristalline container\n│  • 6213 : blend paraffine/triglycérides container\n│  • 2528 : microcristalline (additif)\n│\n├─ SER SpA (Italie, Santena) → cires pilier MFC\n│  • 6670 : pilier haute fusion (Cylindrique)\n│  • 6243 : pilier/melt blend + stéarine (Bois Blond)\n│\n├─ Alpha Wax BV (Pays-Bas) → distribution\n├─ Price's Candles (UK) → Royal Warrant\n└─ Quintanar (Espagne) → cosmétique\n\nSTÉARINERIE DUBOIS (France, Boulogne) :\n• DUB AL 1618 : additif universel 10% toutes recettes\n• DUB AL 18 : référence technique C18 pur\n• DUB GREEN WAX RAPESEED : cire colza végétale\n\nAPICULTURE REMUAUX (France, Barbentane) :\n• Cire Végétale S (G 60/40) : soja hydrogéné, base végétale\n\nSASOL (Allemagne/Afrique du Sud) :\n• Nafol 1822 : alcool gras C18-C22 (via Sasol Performance Chemicals)\n\nNUCERA SOLUTIONS (ex-Chase Corp) :\n• Vybar 260 : polymère rétention parfum (pilier)\n\nBEKRO (Allemagne) :\n• Colorants oil-soluble (réf. 15081 pour pilier)\n\nKAISER LACKE :\n• Colorants bougies container\n\nWEDOO :\n• Mèches LX (48 références)",
         'Synthèse toutes sessions', 1,
         'AWAX,Hywax,SER,Dubois,Remuaux,Sasol,fournisseurs,cartographie'],

        // === COLZA vs SOJA — COMPARAISON ===
        ['technique', 'cire végétale', 'Colza vs Soja — Comparaison pour bougies végétales',
         "COLZA (DUB GREEN WAX RAPESEED) vs SOJA (Cire Végétale S)\n\nCOLZA HYDROGÉNÉ (Dubois) :\n- Point de fusion : ≈50°C\n- Dureté : MOYENNE (plus dur que soja)\n- Indice d'iode : ≤4 (très saturé)\n- Origine : européenne (France, Allemagne)\n- CAS : 68334-28-1\n- Argument marketing : local, non-OGM, sans palme, circuit court\n- Potentiel : pilier végétal (tient mieux sa forme)\n- Défaut : frosting possible, fissures\n\nSOJA HYDROGÉNÉ (Remuaux) :\n- Point de fusion : 32-42°C\n- Dureté : FAIBLE (mou)\n- Pénétration : 45-65 (1/10mm) → très mou\n- Origine : variable (Amérique, souvent OGM)\n- CAS : 8016-70-4\n- INCI : HYDROGENATED SOYBEAN OIL\n- Défauts : polymorphisme, faible adhérence verre, cristallisation\n- Nécessite : 30% alcools gras pour être utilisable (MFC-I)\n\nPOURQUOI MFC UTILISE LE SOJA (MFC-I) :\n- Recette validée La Bruket avec 30% alcools gras\n- Le soja + alcools gras donne un rendu crémeux naturel\n- Clients premium habitués au 'soja' comme argument de vente\n\nPOURQUOI LE COLZA POURRAIT ÊTRE UNE ALTERNATIVE :\n- Plus dur naturellement → moins d'additifs nécessaires ?\n- Européen → meilleur bilan carbone\n- Non-OGM garanti (le soja est souvent OGM)\n- Point de fusion plus élevé → meilleure tenue en été",
         'Analyse comparative SDS + recherche web', 1,
         'colza,soja,comparaison,végétale,rapeseed,fusion,dureté,OGM,européen'],

        // === STÉARINE — CLARIFICATION ===
        ['technique', 'additif', 'Stéarine vs Alcool gras — Deux anti-défauts différents',
         "STÉARINE vs ALCOOL GRAS — NE PAS CONFONDRE\n\nSTÉARINE (acide stéarique) :\n- Nature : acide gras saturé (C17H35COOH)\n- Fonction -COOH (acide carboxylique)\n- Point de fusion : 69°C\n- Rôle en bougie : durcisseur, opacifiant, démoulant\n- Trouvée dans : 6243 (blend paraffine + stéarine)\n- Source : végétale (palme, colza) ou animale\n- Ne combat PAS le polymorphisme\n\nALCOOL GRAS (céto-stéarylique) :\n- Nature : alcool gras à longue chaîne (C16-C18)\n- Fonction -OH (hydroxyle)\n- Point de fusion : 50-59°C\n- Rôle en bougie : anti-polymorphisme, anti-défauts, viscosité, dispersion parfum\n- Trouvé dans : DUB AL 1618, Nafol 1822\n- Source : huile de palme, pétrochimie\n- COMBAT le polymorphisme (breveté)\n\nPOINT CLÉ :\n- La 6243 (stéarine) = pas besoin d'alcool gras → le blend est autosuffisant\n- La Cire Végétale S (soja) = BESOIN de 30% alcools gras → le soja seul ne suffit pas\n- Le DUB AL 1618 (alcool gras) = l'arme anti-polymorphie, pas la stéarine",
         'Synthèse chimique formulations MFC', 1,
         'stéarine,alcool gras,différence,acide,hydroxyle,polymorphisme,6243,DUB']
    ];

    for (const [cat, sub, title, content, source, prio, tags] of entries) {
        await db.run('INSERT OR IGNORE INTO knowledge_base (category,subcategory,title,content,source,priority,tags) VALUES (?,?,?,?,?,?,?)',
            [cat, sub, title, content, source, prio, tags]);
    }
    console.log('  ✓ Session 18 : ' + entries.length + ' fiches (Dubois + SER/AWAX + corrections)');
}

module.exports.seedSession18 = seedSession18;

// === SESSION 19 : Températures process et corrections ===
async function seedSession19(db) {
    const exists = await db.get("SELECT id FROM knowledge_base WHERE title LIKE '%Températures de coulage%Choc thermique%'");
    if (exists) { console.log('  ✓ Session 19 : 16 fiches (températures process)'); return; }

    const entries = [
        ['technique', 'process', 'Températures de coulage — Choc thermique et défauts',
         "TEMPÉRATURE DE COULAGE — RÈGLE MFC\n\n" +
         "TEMPÉRATURE CORRECTE : 70-75°C\n" +
         "JAMAIS en dessous de 65°C pour un coulage en verre.\n\n" +
         "POURQUOI PAS 55°C :\n" +
         "Un coulage à 55°C provoque un CHOC THERMIQUE entre la cire tiède et le verre froid.\n" +
         "Conséquences :\n" +
         "- Striures visibles sur les parois du verre\n" +
         "- Bulles d'air emprisonnées dans la masse\n" +
         "- Décollement (wet spots) accentué\n" +
         "- Surface irrégulière\n\n" +
         "ADAPTATION SELON L'ATELIER :\n" +
         "Si l'atelier est froid (< 20°C) :\n" +
         "- CHAUFFER LES VERRES avant coulage (étuve 40-50°C ou pistolet thermique)\n" +
         "- Réduire l'écart thermique verre/cire à maximum 30°C\n" +
         "- NE PAS baisser la température de coulage en dessous de 65°C\n" +
         "- Préférer chauffer le verre plutôt que refroidir la cire\n\n" +
         "Si l'atelier est chaud (> 22°C) :\n" +
         "- Coulage à 70°C suffit\n" +
         "- Pas besoin de préchauffer les verres\n\n" +
         "TEMPÉRATURES STANDARD MFC :\n" +
         "1. Fonte des cires : 80-85°C (homogénéisation complète)\n" +
         "2. Ajout parfum : 60-65°C (ne pas dépasser le flash point)\n" +
         "3. Mélange doux : 2 minutes minimum\n" +
         "4. Coulage : 70-75°C (jamais < 65°C)\n" +
         "5. Refroidissement : lent et naturel (pas de courant d'air)",
         'Savoir-faire MFC production', 1,
         'température,coulage,choc thermique,striures,bulles,verre,chauffer,atelier,process,fonte'],

        ['technique', 'process', 'Préchauffage des verres — Quand et comment',
         "PRÉCHAUFFAGE DES VERRES\n\n" +
         "QUAND PRÉCHAUFFER :\n" +
         "- Atelier < 18°C (hiver)\n" +
         "- Verres stockés dans un entrepôt froid\n" +
         "- Premiers coulages du matin (verre à température ambiante basse)\n" +
         "- Verres épais (> 3mm) qui gardent le froid plus longtemps\n\n" +
         "COMMENT :\n" +
         "- Étuve à 40-50°C pendant 15-20 minutes\n" +
         "- OU pistolet thermique rapidement sur chaque verre\n" +
         "- OU placer les verres près de la cuve de fonte 30min avant\n" +
         "- JAMAIS au micro-ondes (choc thermique du verre lui-même)\n\n" +
         "POURQUOI ÇA MARCHE :\n" +
         "L'écart thermique verre/cire doit rester < 30°C.\n" +
         "Verre à 20°C + cire à 70°C = écart 50°C → risque de défauts.\n" +
         "Verre à 45°C + cire à 70°C = écart 25°C → coulage propre.\n\n" +
         "RÉSULTAT :\n" +
         "- Zéro striure\n" +
         "- Moins de wet spots\n" +
         "- Meilleure adhérence cire/verre\n" +
         "- Surface lisse et uniforme",
         'Savoir-faire MFC production', 2,
         'verre,préchauffage,étuve,température,défauts,wet spots,adhérence'],

        ['technique', 'process', 'Température d\'atelier — Conditions optimales de production',
         "TEMPÉRATURE D'ATELIER MFC\n\n" +
         "TEMPÉRATURE OPTIMALE : 20-22°C\n\n" +
         "C'est la plage idéale pour la production de bougies de luxe.\n" +
         "En dessous de 20°C ou au-dessus de 22°C, des défauts apparaissent.\n\n" +
         "ATELIER TROP FROID (< 20°C) :\n" +
         "- Refroidissement trop rapide de la cire\n" +
         "- Fissures de retrait (la cire se contracte brutalement)\n" +
         "- Wet spots (décollement cire/verre)\n" +
         "- Surface craquelée ou irrégulière\n" +
         "- Solution : CHAUFFER LES VERRES (étuve 40-50°C), pas baisser la cire\n\n" +
         "ATELIER TROP CHAUD (> 22°C) :\n" +
         "- Refroidissement trop lent\n" +
         "- Risque de suintage du parfum\n" +
         "- Surface molle, empreintes de doigts\n" +
         "- Temps de démoulage allongé (piliers)\n\n" +
         "RÈGLES MFC :\n" +
         "- Maintenir l'atelier entre 20 et 22°C toute l'année\n" +
         "- Pas de courant d'air pendant le refroidissement\n" +
         "- Pas de climatisation soufflant directement sur les bougies\n" +
         "- En hiver : vérifier la température avant le premier coulage\n" +
         "- Stocker les verres dans l'atelier (pas dans un entrepôt froid)",
         'Savoir-faire MFC production', 1,
         'atelier,température,20°C,22°C,froid,chaud,conditions,production,refroidissement'],

        ['technique', 'parfum', 'Solvants porteurs des parfums — Solubilité dans les cires',
         "SOLVANTS PORTEURS — IMPACT SUR LA FORMULATION BOUGIE\n\n" +
         "Un parfum commercial contient 20-60% de SOLVANT PORTEUR.\n" +
         "C'est le solvant qui détermine la compatibilité avec la cire, PAS les molécules odorantes.\n\n" +
         "POURQUOI LE DPG ET LE PG NE FONCTIONNENT PAS DANS LA CIRE :\n" +
         "Le DPG (Dipropylène Glycol) et le PG (Propylène Glycol) sont des DIOLS — des molécules\n" +
         "portant deux groupes hydroxyle (-OH). Ces groupes -OH sont très POLAIRES.\n" +
         "Les cires (paraffine, soja, colza) sont des hydrocarbures APOLAIRES.\n\n" +
         "Règle fondamentale de chimie : les semblables dissolvent les semblables.\n" +
         "- Polaire + Polaire = miscible (eau + DPG → OK)\n" +
         "- Apolaire + Apolaire = miscible (cire + IPM → OK)\n" +
         "- Polaire + Apolaire = IMMISCIBLE (DPG + cire → séparation immédiate)\n\n" +
         "Le DPG est miscible avec l'eau (constante diélectrique élevée).\n" +
         "La cire est apolaire (constante diélectrique ~2).\n" +
         "Le DPG se sépare INSTANTANÉMENT de la cire fondue.\n" +
         "Source : Cosmetics & Toiletries, Perfumer & Flavorist Vol.32 June 2007\n\n" +
         "CONSÉQUENCES EN PRODUCTION :\n" +
         "- Séparation de phase visible (liquide qui perle à la surface)\n" +
         "- Suintage (bleeding/syneresis) — gouttes sur la bougie refroidie\n" +
         "- Obstruction de la mèche — le DPG remonte par capillarité mais ne brûle pas proprement\n" +
         "- Flamme irrégulière, champignonnage, fumée noire\n" +
         "- Diffusion à froid réduit car le parfum est mal dispersé dans la cire\n\n" +
         "INSOLUBLES DANS LES CIRES (POLAIRES) :\n" +
         "- DPG (Dipropylène Glycol) — CAS 25265-71-8 — C6H14O3\n" +
         "  2 groupes -OH. Miscible eau. Flash point 132°C.\n" +
         "  Le plus courant car le moins cher. Parfait pour diffuseurs/encens, MAUVAIS pour bougies.\n" +
         "  Source: PerfumersWorld — 'Avoid in wax-based products due to solubility problems.'\n" +
         "  Source: Perfumer & Flavorist 2007 — 'DPG is not soluble with wax, causes fragrance bleeding.'\n" +
         "- PG (Propylène Glycol) — CAS 57-55-6 — C3H8O2\n" +
         "  2 groupes -OH. Totalement miscible eau. Flash point 99°C.\n" +
         "  Utilisé en cosmétique et alimentaire (E1520). Même incompatibilité cire que le DPG.\n\n" +
         "SOLUBLES DANS LES CIRES (APOLAIRES/ESTERS) :\n" +
         "- IPM (Isopropyl Myristate) — CAS 110-27-0 — C17H34O2\n" +
         "  Ester gras (myristate d'isopropyle). Chaîne grasse C14 → apolaire → miscible cire.\n" +
         "  Excellente capillarité mèche. Le meilleur solvant pour parfum bougie.\n" +
         "  Source: Cosmetics & Toiletries — 'Nonpolar solvents good in candle include benzyl benzoate and DEP.'\n" +
         "- Benzyl Benzoate — CAS 120-51-4 — C14H12O2\n" +
         "  Ester aromatique. Soluble cire. Flash point 148°C.\n" +
         "  MAIS : accélère le polymorphisme en cire végétale (interaction cristalline).\n" +
         "- DEP (Diéthyl Phtalate) — CAS 84-66-2 — C12H14O4\n" +
         "  Ester phtalique. Partiellement soluble cire. Controversé (phtalate).\n" +
         "  Limiter à 8% charge parfum max.\n" +
         "- Triéthyl Citrate — CAS 77-93-0 — C12H20O7\n" +
         "  Ester citrique. Soluble cire. Alternative 'naturelle' au DEP.\n\n" +
         "DPG DANS LA FDS — RÔLE RÉEL :\n" +
         "Le DPG sert à dissoudre les POUDRES dans la formule du parfumeur.\n" +
         "Vanilline, Ambrox, Ethyl Menthol = tous des poudres à l'état pur.\n" +
         "Le parfumeur les dissout dans le DPG pour les rendre liquides et manipulables.\n" +
         "Un parfum avec beaucoup de notes poudrées/ambrées aura PLUS de DPG.\n" +
         "Source: SimbiFragrance — 'DPG's only purpose is to be stirred into powders to make them pourable.'\n\n" +
         "RÈGLE MFC :\n" +
         "1. Lire la FDS section 3 — identifier le solvant porteur\n" +
         "2. Si DPG ou PG > 20% → REFUSER pour usage bougie OU demander reformulation sur base IPM\n" +
         "3. Deux parfums 'identiques' de deux fournisseurs auront un comportement DIFFÉRENT\n" +
         "   si l'un est sur base DPG et l'autre sur base IPM\n" +
         "4. Les molécules odorantes sont les mêmes — seul le solvant porteur change le comportement",
         'Sources: Perfumer & Flavorist 2007, Cosmetics & Toiletries, PerfumersWorld, SimbiFragrance, Eco Candle Project', 1,
         'DPG,PG,IPM,solvant,solubilité,parfum,FDS,suintage,séparation,insoluble,polaire,apolaire,diol,ester,benzyl benzoate'],

        ['Science — Chimie', 'chimie', 'Polarité et solubilité — Pourquoi DPG/PG sont insolubles dans la cire',
         "POLARITÉ ET SOLUBILITÉ — EXPLICATION SCIENTIFIQUE\n\n" +
         "PRINCIPE : 'Similia similibus solvuntur' — les semblables dissolvent les semblables\n\n" +
         "CONSTANTES DIÉLECTRIQUES (mesure de la polarité) :\n" +
         "- Eau : ε = 80 (très polaire)\n" +
         "- Propylène Glycol : ε ≈ 32 (polaire — groupe des solvants semi-polaires)\n" +
         "- DPG : ε ≈ 25 (polaire)\n" +
         "- Éthanol : ε = 25 (semi-polaire)\n" +
         "- Cire de paraffine : ε ≈ 2.2 (apolaire)\n" +
         "- Cire de soja : ε ≈ 2-3 (apolaire)\n" +
         "- IPM : ε ≈ 3.5 (apolaire — ester gras)\n" +
         "- Benzyl Benzoate : ε ≈ 5 (faiblement polaire — compatible cire)\n\n" +
         "RÈGLE DE SOLUBILITÉ :\n" +
         "- Solvants polaires (ε > 20) → solubles entre eux, insolubles dans les apolaires\n" +
         "- Solvants apolaires (ε < 20) → solubles entre eux, insolubles dans les polaires\n" +
         "- Le DPG (ε≈25) est donc MISCIBLE avec l'eau (ε=80) mais IMMISCIBLE avec la cire (ε≈2)\n\n" +
         "STRUCTURE MOLÉCULAIRE :\n" +
         "DPG : HO-CH(CH3)-CH2-O-CH2-CH(CH3)-OH\n" +
         "  → 2 groupes hydroxyle (-OH) = interactions hydrogène fortes = polaire\n" +
         "PG : CH3-CH(OH)-CH2-OH\n" +
         "  → 2 groupes hydroxyle (-OH) = polaire\n" +
         "IPM : CH3-(CH2)12-COO-CH(CH3)2\n" +
         "  → Longue chaîne carbonée C14 + ester = apolaire → miscible cire\n" +
         "Cire paraffine : CnH2n+2 (n=20-40)\n" +
         "  → Hydrocarbure pur = 100% apolaire\n\n" +
         "POURQUOI L'IPM FONCTIONNE :\n" +
         "L'IPM est un ester d'acide gras (acide myristique C14 + isopropanol).\n" +
         "Sa longue chaîne carbonée (14 carbones) lui confère un caractère apolaire\n" +
         "similaire aux chaînes de la cire. Il s'insère entre les molécules de cire\n" +
         "comme une clé dans une serrure.\n\n" +
         "LIMITE DE SOLUBILITÉ DU PARFUM DANS LA CIRE :\n" +
         "Chaque cire a une capacité maximale de dissolution (comme le sel dans l'eau).\n" +
         "Au-delà → synérèse (suintage). Le parfum non dissous forme des gouttelettes.\n" +
         "Paraffine dure : max ~10-12% parfum (si solvant compatible)\n" +
         "Soja : max ~8-10% parfum\n" +
         "Si le solvant porteur est du DPG → la capacité réelle est bien plus basse\n" +
         "car le DPG lui-même n'est pas dissous.",
         'Sources: Eco Candle Project, BasicMedical Key (pharmaceutical solvents), chimie générale', 1,
         'polarité,constante diélectrique,solubilité,DPG,PG,IPM,apolaire,polaire,hydroxyle,ester,cire'],

        ['technique', 'parfum', 'Analyse FDS parfum — Checklist MFC pour évaluer un parfum',
         "LECTURE FDS PARFUM — CHECKLIST MFC\n\n" +
         "1. SECTION 2 — CLASSIFICATION :\n" +
         "   - Point éclair (flash point) → température MAX d'ajout du parfum\n" +
         "   - Pictogrammes (inflammable GHS02, sensibilisant GHS07/GHS08)\n\n" +
         "2. SECTION 3 — COMPOSITION (LE PLUS IMPORTANT) :\n" +
         "   a) IDENTIFIER LE SOLVANT PORTEUR :\n" +
         "      - Chercher : 'Dipropylene Glycol', 'DPG', CAS 25265-71-8\n" +
         "      - Chercher : 'Propylene Glycol', 'PG', CAS 57-55-6\n" +
         "      - Si DPG/PG > 20% → parfum NON ADAPTÉ bougie en l'état\n" +
         "      - Alternative OK : 'Isopropyl Myristate' (IPM), 'Benzyl Benzoate'\n\n" +
         "   b) IDENTIFIER LES ALLERGÈNES IFRA :\n" +
         "      - Linalol (CAS 78-70-6), Limonène (CAS 5989-27-5)\n" +
         "      - Citronellol (CAS 106-22-9), Géraniol (CAS 106-24-1)\n" +
         "      - Coumarine (CAS 91-64-5), Cinnamal (CAS 104-55-2)\n" +
         "      → Obligatoire à déclarer sur l'étiquette bougie (REACh/CLP)\n\n" +
         "   c) IDENTIFIER LES ESTERS AROMATIQUES :\n" +
         "      - Benzyl Benzoate (CAS 120-51-4)\n" +
         "      - Benzyl Salicylate (CAS 118-58-1)\n" +
         "      - Si > 10% total esters → augmenter alcools gras en cire végétale\n" +
         "        car ils accélèrent le polymorphisme\n\n" +
         "3. SECTION 9 — PROPRIÉTÉS PHYSIQUES :\n" +
         "   - Densité : > 1.0 → parfum chargé en muscs lourds (diffusion lente)\n" +
         "   - Densité : < 0.95 → parfum léger (diffusion rapide, bon diffusion à froid)\n\n" +
         "INTERPRÉTATION RAPIDE :\n" +
         "- Flash point < 60°C → composants très volatils, ajout à basse température\n" +
         "- Flash point > 90°C → composants lourds, peut supporter ajout à 65°C\n" +
         "- DPG/PG > 20% → refuser OU reformuler OU réduire drastiquement le %\n" +
         "- Un parfum avec beaucoup de poudres (vanilline, ambrox) aura plus de DPG\n" +
         "  car le DPG sert à solubiliser les matières premières solides du parfumeur\n\n" +
         "IMPACT PRATIQUE MFC :\n" +
         "Le même 'ambre' de Givaudan et de Grasse Expertise sera formulé différemment.\n" +
         "Les molécules odorantes sont identiques — seuls le solvant et les proportions changent.\n" +
         "C'est pour ça que CHAQUE parfum nécessite un test de combustion SPÉCIFIQUE.\n" +
         "Ne jamais extrapoler le comportement d'un parfum à un autre, même de même famille.",
         'Savoir-faire MFC + FDS analyse + Perfumer & Flavorist 2007', 1,
         'FDS,lecture,analyse,flash point,solvant,allergène,IFRA,ester,polymorphisme,checklist,DPG,CAS'],

        ['Science — Parfum', 'parfum', 'Diffusion à froid vs Diffusion à chaud — Science de la diffusion olfactive',
         "COLD THROW vs HOT THROW — DIFFUSION DU PARFUM\n\n" +
         "COLD THROW (à froid, bougie éteinte) :\n" +
         "Les molécules de parfum s'évaporent lentement à température ambiante.\n" +
         "Seules les NOTES DE TÊTE (top notes) sont perceptibles :\n" +
         "- Point d'évaporation bas → terpènes (limonène, linalol), agrumes (bergamote, mandarine)\n" +
         "- C'est l'odeur quand le client soulève le couvercle en boutique\n" +
         "- Le diffusion à froid VEND la bougie. Le diffusion à chaud FIDÉLISE le client.\n\n" +
         "HOT THROW (à chaud, bougie allumée) :\n" +
         "La chaleur du bain de fusion (melt pool) accélère l'évaporation de TOUTES les molécules.\n" +
         "Les NOTES DE FOND (base notes) deviennent perceptibles :\n" +
         "- Point d'évaporation élevé → muscs, vanilline, ambre, santal\n" +
         "- La profondeur du melt pool détermine la quantité de parfum libérée\n" +
         "- Pool 1/4\" à 1/2\" (6-12mm) = optimal\n\n" +
         "FACTEURS QUI INFLUENCENT LE THROW :\n" +
         "1. Qualité du parfum : parfums pour bougie (heat-stable) vs diffuseur (pas adapté)\n" +
         "2. % de parfum : 6-10% optimal. Au-delà → suintage, pas plus de diffusion\n" +
         "3. Calibre de la mèche : trop petite = pool étroit = mauvais throw\n" +
         "   Trop grande = brûle le parfum trop vite = throw qui s'épuise\n" +
         "4. Diamètre du contenant : plus large = pool plus grand = meilleur throw\n" +
         "5. Temps de MATURATION (cure) : ESSENTIEL\n" +
         "6. Solvant porteur : DPG = mauvais throw car mal dispersé dans la cire\n\n" +
         "ÉVOLUTION DES NOTES PENDANT LA COMBUSTION :\n" +
         "- Minutes 0-15 : notes de tête (agrumes, herbes)\n" +
         "- Minutes 15-60 : notes de cœur (floraux, épices)\n" +
         "- Au-delà : notes de fond (bois, muscs, vanille)\n" +
         "C'est pourquoi on évalue le diffusion à chaud après 2h minimum de combustion.",
         'Sources: CandleScience, Blended Waxes, Harlem Candle Co.', 1,
         'diffusion à froid,diffusion à chaud,diffusion,melt pool,notes,tête,cœur,fond,évaporation,mèche'],

        ['technique', 'process', 'Maturation des bougies (cure time) — Le secret du diffusion à chaud',
         "MATURATION / CURE TIME — ÉTAPE OBLIGATOIRE\n\n" +
         "RÈGLE : Ne JAMAIS vendre ou tester une bougie fraîchement coulée.\n\n" +
         "Pendant la maturation, le parfum se lie chimiquement à la structure cristalline de la cire.\n" +
         "Une bougie non maturée aura un diffusion à froid correct mais un diffusion à chaud FAIBLE.\n\n" +
         "DURÉES DE MATURATION RECOMMANDÉES :\n" +
         "- Paraffine pure : 3-5 jours minimum\n" +
         "- Cire de soja : 7-14 jours minimum (la plus longue)\n" +
         "- Blend paraffine/végétale : 5-7 jours\n" +
         "- Cire de coco/coco-soja : 7-10 jours\n\n" +
         "Plus la maturation est longue, plus le diffusion à chaud est fort.\n" +
         "Après 14 jours en soja, le diffusion à chaud peut être 2x plus fort qu'à J+3.\n\n" +
         "CONDITIONS DE MATURATION :\n" +
         "- Couvercle FERMÉ (préserve les notes de tête volatiles)\n" +
         "- À l'abri de la lumière UV (dégrade les molécules de parfum)\n" +
         "- Température ambiante stable (20-22°C — même que l'atelier)\n" +
         "- Pas de courant d'air\n\n" +
         "CE QUI SE PASSE CHIMIQUEMENT :\n" +
         "Pendant le refroidissement et les jours qui suivent :\n" +
         "1. La cire cristallise → les molécules de parfum se retrouvent piégées\n" +
         "   dans les espaces entre les cristaux\n" +
         "2. Les cristaux continuent de se réorganiser pendant des jours\n" +
         "3. Le parfum migre et se distribue uniformément dans la masse\n" +
         "4. Les molécules de parfum s'adsorbent sur les surfaces cristallines\n\n" +
         "PARAFFINE vs SOJA — POURQUOI LA DIFFÉRENCE :\n" +
         "La paraffine a une structure cristalline SERRÉE et régulière\n" +
         "→ piège le parfum vite et bien → maturation courte\n" +
         "Le soja a une structure AMORPHE (molle, irrégulière)\n" +
         "→ le parfum migre plus lentement → maturation plus longue nécessaire\n\n" +
         "IMPACT MFC :\n" +
         "- Tests de combustion : toujours après maturation complète\n" +
         "- Un test à J+1 ne reflète PAS le comportement réel de la bougie\n" +
         "- Noter la date de coulage sur chaque échantillon\n" +
         "- Minimum J+7 avant tout test client pour du soja",
         'Sources: CandleScience, Night Sky Candles, Affinati, Glow CLP', 1,
         'maturation,cure,temps,diffusion à chaud,cristallisation,soja,paraffine,maturer,attente'],

        ['Science — Chimie', 'chimie', 'Structure cristalline des cires et rétention de parfum',
         "STRUCTURE CRISTALLINE ET RÉTENTION DU PARFUM\n\n" +
         "La capacité d'une cire à retenir et diffuser le parfum dépend de sa structure cristalline.\n\n" +
         "PARAFFINE (cristaux macro, réguliers) :\n" +
         "- Structure cristalline SERRÉE et ORDONNÉE\n" +
         "- Piège le parfum efficacement entre les cristaux\n" +
         "- Libération CONTRÔLÉE et PROGRESSIVE pendant la combustion\n" +
         "- Capacité parfum naturelle : ~3% sans additif, 8-12% avec additifs\n" +
         "- Meilleur diffusion à chaud global de toutes les cires\n" +
         "- La cire de référence pour la performance olfactive\n\n" +
         "SOJA (structure amorphe, désordonnée) :\n" +
         "- Structure MOLLE et IRRÉGULIÈRE\n" +
         "- Migration du parfum plus rapide (parfum 'voyage' dans la cire)\n" +
         "- Libération RAPIDE au début puis s'épuise\n" +
         "- Capacité parfum naturelle : 8-10% (sans additif)\n" +
         "- Diffusion à froid souvent plus faible que paraffine\n" +
         "- Nécessite maturation longue pour stabiliser\n\n" +
         "COCO (amorphe, grasse) :\n" +
         "- Très bonne solubilité des huiles de parfum\n" +
         "- Bain de fusion se forme vite → diffusion à chaud rapide et fort\n" +
         "- Point de fusion bas → fond trop facilement en été\n" +
         "- Généralement blendée avec soja ou paraffine pour la structure\n\n" +
         "POINT DE FUSION ET DIFFUSION :\n" +
         "- Point de fusion BAS → pool se forme vite → diffusion rapide et forte\n" +
         "- Point de fusion HAUT → pool lent → diffusion lente mais durable\n" +
         "- Compromis MFC : nos blends (5203, 6243) ont des points de fusion\n" +
         "  intermédiaires (56-62°C) = bon compromis rapidité/durabilité\n\n" +
         "RÔLE DU VYBAR (polymère additif) :\n" +
         "- Augmente la capacité de rétention du parfum dans la cire\n" +
         "- Distribue le parfum uniformément dans la masse\n" +
         "- Réduit le mottling (marbrure) en paraffine\n" +
         "- Vybar 103 : cires dures (piliers, votives)\n" +
         "- Vybar 260 : cires molles (containers)\n" +
         "- Dosage : 0.5-2% du poids de cire\n" +
         "- ATTENTION : trop de vybar PIÈGE le parfum → réduit le diffusion à chaud\n" +
         "- Beaucoup de cires pré-blendées contiennent déjà du vybar\n\n" +
         "RÔLE DE L'ACIDE STÉARIQUE :\n" +
         "- Durcit la cire (ralentit la fonte → combustion plus longue)\n" +
         "- Améliore le diffusion à chaud en ralentissant l'évaporation du parfum\n" +
         "- Dosage : 5-10% du poids de cire\n" +
         "- Aussi démoulant pour les piliers\n" +
         "- Ne pas confondre avec les ALCOOLS gras (anti-polymorphisme)\n\n" +
         "RÈGLE MFC — OPTIMISATION DU THROW :\n" +
         "1. Choisir un parfum avec solvant compatible (IPM, pas DPG)\n" +
         "2. Doser à 8% (sweet spot — au-delà, pas de gain mais risque de suintage)\n" +
         "3. Ajouter le parfum à la bonne température (flash point - 10°C)\n" +
         "4. Mélanger 2 minutes minimum, doucement (pas de bulles d'air)\n" +
         "5. Maturer 7-14 jours couvercle fermé\n" +
         "6. Calibrer la mèche pour un pool de 6-12mm de profondeur",
         'Sources: Blended Waxes, The Flaming Candle, CandleScience, Eco Candle Project', 1,
         'cristal,structure,rétention,parfum,vybar,paraffine,soja,coco,throw,pool,acide stéarique'],

        ['technique', 'parfum', 'Température d\'ajout du parfum — Règle scientifique corrigée',
         "TEMPÉRATURE D'AJOUT DU PARFUM — BASÉE SUR LA SCIENCE\n\n" +
         "⚠️ CORRECTION D'UN MYTHE RÉPANDU :\n" +
         "Beaucoup de sites recommandent d'ajouter le parfum 'au flash point'.\n" +
         "C'est FAUX. Le flash point est un indicateur de SÉCURITÉ au transport,\n" +
         "pas un guide de température d'ajout.\n" +
         "Réf: CandleScience, Armatage Candle Co., NorthWood Candle\n\n" +
         "RÈGLE VALIDÉE PAR TESTS EN LABORATOIRE :\n" +
         "Ajouter le parfum à 80-85°C (175-185°F) dans la cire fondue,\n" +
         "QUEL QUE SOIT le flash point du parfum.\n" +
         "C'est la température optimale pour :\n" +
         "- La liaison chimique parfum-cire (binding)\n" +
         "- L'homogénéité du mélange\n" +
         "- La sécurité (pas de poches d'huile non mélangée)\n\n" +
         "Réf: CandleScience — 'We recommend always adding fragrance oil\n" +
         "at 185°F, regardless of the flashpoint. Confirmed through rigorous\n" +
         "testing in our in-house labs.'\n\n" +
         "POURQUOI LE PARFUM NE 'BRÛLE PAS' À 85°C :\n" +
         "- Le point d'ébullition des molécules de parfum est BIEN PLUS HAUT :\n" +
         "  Limonène : 176°C, Linalol : 198°C, Vanilline : 285°C\n" +
         "- À 85°C, on est loin de l'évaporation massive\n" +
         "- Le parfum est dilué dans 90% de cire → propriétés du MÉLANGE\n\n" +
         "ERREURS RÉELLES :\n" +
         "1. TROP FROID (< 60°C) :\n" +
         "   - Le parfum ne se mélange pas uniformément\n" +
         "   - Poches d'huile dans la cire = DANGER incendie\n" +
         "   - Diffusion à chaud irrégulier, suintage\n\n" +
         "2. LAISSER CHAUFFER TROP LONGTEMPS :\n" +
         "   - Même si 85°C est sans danger pour l'ajout,\n" +
         "     laisser le mélange sur la source de chaleur pendant\n" +
         "     des heures peut affaiblir les notes de tête\n" +
         "   - Verser relativement vite après mélange\n\n" +
         "3. PAS ASSEZ MÉLANGÉ :\n" +
         "   - Minimum 2 minutes de mélange DOUX\n" +
         "   - Mouvement circulaire constant, pas de bulles\n\n" +
         "ASTUCE MFC VALIDÉE :\n" +
         "Si le parfum est très dense ou froid, le tiédir avant ajout :\n" +
         "tremper le flacon dans de l'eau chaude (40°C) pendant 5 minutes.\n" +
         "Réduit l'écart de viscosité et améliore le mélange.\n" +
         "Réf: Eco Candle Project, LEUXSCENT",
         'Réf: CandleScience Labs, Armatage Candle Co. (2022-2023), Eco Candle Project, LEUXSCENT (2025)', 1,
         'température,ajout,parfum,flash point,ébullition,mélange,85°C,binding,homogène'],

        ['technique', 'parfum', 'Charge maximale de parfum par type de cire',
         "CHARGE MAXIMALE DE PARFUM — LIMITES PAR CIRE\n\n" +
         "Chaque cire a une CAPACITÉ MAXIMALE de dissolution du parfum.\n" +
         "Au-delà → synérèse (suintage), mauvaise combustion, pas plus de throw.\n\n" +
         "CAPACITÉS MAXIMALES :\n" +
         "- Paraffine pure (sans additif) : 3-4% maximum\n" +
         "- Paraffine + Vybar : 8-12%\n" +
         "- Paraffine pré-blendée (5203, 6243) : 8-10% (vybar/stéarine inclus)\n" +
         "- Soja pur : 8-10%\n" +
         "- Coco pur : 10-12% (excellente solubilité)\n" +
         "- Blend coco/soja : 10-12%\n" +
         "- Cire d'abeille : 4-6% (retient mal les parfums ajoutés)\n\n" +
         "DOSAGE OPTIMAL MFC :\n" +
         "- 8% = sweet spot pour la plupart des cires et parfums\n" +
         "- 6% minimum pour un throw perceptible\n" +
         "- 10% seulement si le parfum est faible ET le solvant compatible\n" +
         "- 12% = risque de suintage même en cire de coco\n\n" +
         "SIGNES DE SURCHARGE :\n" +
         "- Gouttes de liquide sur la surface (synérèse)\n" +
         "- Pool huileux autour de la mèche\n" +
         "- Flamme qui crépite ou fume\n" +
         "- Le throw n'est PAS plus fort (le surplus ne diffuse pas)\n\n" +
         "IMPORTANT — CE N'EST PAS QUE LE % :\n" +
         "Un parfum à 8% sur base IPM sera MIEUX dispersé\n" +
         "qu'un parfum à 6% sur base DPG.\n" +
         "Le solvant porteur change la capacité RÉELLE de la cire.\n" +
         "Un parfum avec 30% de DPG à 8% de charge = en réalité\n" +
         "2.4% d'insoluble dans la cire = limite de suintage atteinte.\n\n" +
         "CALCUL PRATIQUE :\n" +
         "Masse totale bougie : 200g\n" +
         "Charge parfum 8% : 16g de parfum\n" +
         "Si parfum contient 30% DPG : 4.8g de DPG dans la cire\n" +
         "Sur 184g de cire : 2.6% d'insoluble → suintage probable\n" +
         "Solution : réduire à 6% OU changer de parfum (base IPM)",
         'Sources: The Flaming Candle, CandleScience, Eco Candle Project', 1,
         'charge,maximum,pourcentage,parfum,capacité,suintage,synérèse,dosage,DPG,calcul'],

        ['Science — Chimie', 'chimie', 'Point éclair vs Point d\'ébullition — Le grand malentendu en chandellerie',
         "POINT ÉCLAIR vs POINT D'ÉBULLITION — CLARIFICATION SCIENTIFIQUE\n\n" +
         "Le point éclair (flash point) est le plus grand MYTHE de la chandellerie.\n" +
         "Il n'a AUCUN rapport avec la puissance olfactive d'une bougie.\n\n" +
         "DÉFINITIONS :\n" +
         "- POINT ÉCLAIR (Flash Point) : température à laquelle les VAPEURS d'un liquide\n" +
         "  peuvent s'enflammer brièvement au contact d'une flamme nue.\n" +
         "  C'est un terme LÉGAL de transport (IATA, ADR), pas un indicateur de performance.\n" +
         "  Réf: Armatage Candle Company (2022), NorthWood Candle & Craft (2021)\n\n" +
         "- POINT D'ÉBULLITION (Boiling Point) : température à laquelle un liquide\n" +
         "  se transforme massivement en gaz. C'est ICI que le parfum perd ses molécules.\n" +
         "  Les points d'ébullition des molécules de parfum sont TRÈS AU-DESSUS\n" +
         "  des températures de travail en bougie (55-85°C).\n" +
         "  Réf: Armatage Candle Company — 'Fragrance only degrades if notes evaporate\n" +
         "  or burn off because the compounds reach their boiling points.'\n\n" +
         "POURQUOI LE FLASH POINT N'AFFECTE PAS LE THROW :\n" +
         "1. En bougie, le parfum est MÉLANGÉ à la cire (90% cire, 10% parfum)\n" +
         "   → les propriétés du mélange ≠ propriétés du parfum pur\n" +
         "2. Le flash point nécessite un GRAND VOLUME de liquide pur + flamme nue\n" +
         "   → conditions impossibles dans une bougie à 6-10% de charge\n" +
         "3. Chauffer un parfum à son flash point ne crée PAS d'évaporation massive\n" +
         "   → il faudrait atteindre le POINT D'ÉBULLITION (très supérieur)\n" +
         "Réf: Lone Star Candle Supply — 'A fragrance oil's flash point may not affect\n" +
         "your candle's scent throw.'\n" +
         "Réf: Scented Flame — 'Flashpoint is a legal term unrelated to fragrance performance.'\n\n" +
         "TEMPÉRATURE D'AJOUT — CE QUE DIT LA SCIENCE :\n" +
         "CandleScience (tests en labo) : ajouter à 85°C (185°F) QUEL QUE SOIT le flash point.\n" +
         "C'est la température optimale pour la liaison parfum-cire.\n" +
         "Ajouter TROP FROID (< 60°C) = mélange hétérogène = poches d'huile = danger.\n" +
         "Réf: CandleScience Support — 'We recommend always adding fragrance oil\n" +
         "to your wax at 185°F, regardless of the flashpoint. We have confirmed this\n" +
         "through rigorous testing in our in-house labs.'\n\n" +
         "CE QUI COMPTE POUR LE RENDU OLFACTIF :\n" +
         "→ Le POINT D'ÉBULLITION des molécules individuelles (pas le flash point du mélange)\n" +
         "→ La PRESSION DE VAPEUR (vapor pressure) à température ambiante et de combustion\n" +
         "→ Le SOLVANT PORTEUR (DPG vs IPM)\n" +
         "→ La MATURATION\n" +
         "→ Le calibre de MÈCHE (taille du melt pool)",
         'Réf: Armatage Candle Co. (2022), NorthWood Candle (2021), Lone Star, Scented Flame, CandleScience, Nikura (2025)', 1,
         'flash point,point éclair,ébullition,mythe,température,ajout,parfum,throw,dégradation'],

        ['Science — Chimie', 'chimie', 'Volatilité moléculaire et rendu olfactif — Points d\'ébullition des molécules de parfum',
         "VOLATILITÉ MOLÉCULAIRE — RELATION AVEC LE RENDU OLFACTIF\n\n" +
         "Le rendu olfactif d'un parfum en bougie est déterminé par la VOLATILITÉ\n" +
         "de ses molécules, elle-même fonction du POINT D'ÉBULLITION et de la PRESSION DE VAPEUR.\n\n" +
         "POINTS D'ÉBULLITION DE MOLÉCULES COURANTES EN PARFUMERIE :\n" +
         "(données : PubChem, The Good Scents Company, GC-FID analysis)\n\n" +
         "NOTES DE TÊTE (très volatiles, Bp < 200°C) :\n" +
         "- Éthyl butyrate (fruité)    : Bp 121°C  — MW 116 g/mol\n" +
         "- Myrcène (herbacé)           : Bp 167°C  — MW 136 g/mol\n" +
         "- Limonène (agrume)           : Bp 176°C  — MW 136 g/mol — CAS 5989-27-5\n" +
         "- Linalol (floral/lavande)    : Bp 198°C  — MW 154 g/mol — CAS 78-70-6\n" +
         "→ S'évaporent VITE à température ambiante → fort COLD THROW\n" +
         "→ Épuisées rapidement en combustion → diffusion à chaud qui diminue\n" +
         "Réf: Seigneurin et al. (2024) HAL hal-04695520 — mesures GC-FID sur 8 molécules\n\n" +
         "NOTES DE CŒUR (moyennement volatiles, Bp 200-250°C) :\n" +
         "- Éthyl heptanoate (fruité)   : Bp 188°C  — MW 158 g/mol\n" +
         "- Citronellol (rosé)          : Bp 225°C  — MW 156 g/mol — CAS 106-22-9\n" +
         "- Éthyl octanoate (fruité)    : Bp 208°C  — MW 172 g/mol\n" +
         "- Géraniol (rosé)             : Bp 230°C  — MW 154 g/mol — CAS 106-24-1\n" +
         "→ Libérées progressivement → cœur stable du diffusion à chaud\n\n" +
         "NOTES DE FOND (peu volatiles, Bp > 250°C) :\n" +
         "- Éthyl décanoate (cireux)    : Bp 245°C  — MW 200 g/mol\n" +
         "- Vanilline (vanille)         : Bp 285°C  — MW 152 g/mol — CAS 121-33-5\n" +
         "- Hexyl cinnamaldéhyde (jasmin): Bp 308°C — MW 216 g/mol\n" +
         "- Coumarine (foin/amande)     : Bp 301°C  — MW 146 g/mol — CAS 91-64-5\n" +
         "- Muscs synthétiques          : Bp > 300°C — MW > 250 g/mol\n" +
         "→ Quasi pas de diffusion à froid, nécessitent la CHALEUR pour être perçues\n" +
         "→ Longue tenue en combustion\n" +
         "Réf: Seigneurin et al. (2024) HAL hal-04695520\n\n" +
         "PRESSION DE VAPEUR — LE VRAI MOTEUR DE LA DIFFUSION :\n" +
         "C'est la pression de vapeur à la température du melt pool (~60-80°C)\n" +
         "qui détermine COMBIEN de molécules passent dans l'air.\n" +
         "- Haute pression de vapeur → diffusion forte → épuisement rapide\n" +
         "- Basse pression de vapeur → diffusion faible → tenue longue\n" +
         "Réf: Chastrette, M. (2002) — classification moléculaire des odorants\n\n" +
         "ÉTUDE NATURE (2013) — COMPLEXITÉ MOLÉCULAIRE :\n" +
         "Seigneurie et al., Scientific Reports (Nature) srep00206 :\n" +
         "'Aucune relation entre le point d'ébullition et le nombre de notes olfactives\n" +
         "(r = 0.16, p = 0.236) ou l'agréabilité (r = 0.12, p = 0.387).'\n" +
         "→ Le point d'ébullition détermine QUAND la molécule est perçue (tête/cœur/fond)\n" +
         "   mais PAS la qualité ou la puissance intrinsèque de l'odeur.\n" +
         "Réf: Snitz et al. (2013) Scientific Reports 3:206, DOI 10.1038/srep00206\n\n" +
         "ÉTUDE PMC (2024) — ÉVAPORATION IN VIVO :\n" +
         "Seigneurin et al. (2024), PMC12666731 :\n" +
         "L'ordre d'évaporation mesuré par GC-FID correspond aux points d'ébullition :\n" +
         "éthyl butyrate (121°C) > myrcène (167°C) > limonène (176°C) >\n" +
         "éthyl heptanoate (188°C) > éthyl octanoate (208°C) >\n" +
         "éthyl décanoate (245°C) > hexyl cinnamaldéhyde (308°C)\n" +
         "→ Confirme que le point d'ébullition prédit l'ordre de volatilisation.\n" +
         "Réf: Seigneurin et al. (2024) PMC12666731\n\n" +
         "RÉTENTION DE PARFUM (2024) — NOMBRE DE CARBONES :\n" +
         "Hu et al. (2024) — Research and Development of Fragrance Retention Technology :\n" +
         "'Les composés avec moins d'atomes de carbone ont des points d'ébullition plus bas\n" +
         "et se volatilisent rapidement, tandis que ceux avec trop d'atomes de carbone\n" +
         "ont une pression de vapeur basse, les rendant peu volatils.'\n" +
         "'Le nombre d'atomes de carbone varie généralement entre 4 et 20.'\n" +
         "'Les composés à chaîne ouverte tendent à avoir une fragrance plus forte\n" +
         "que leurs homologues cycliques.'\n" +
         "Réf: Hu et al. (2024) HSET Data, DOI non spécifié\n\n" +
         "PERFUMER & FLAVORIST — VOLATILITÉ EMPIRIQUE :\n" +
         "'Les taux d'évaporation à température d'usage sont généralement parallèles\n" +
         "aux points d'ébullition, mais pour de nombreuses substances, l'association\n" +
         "et d'autres phénomènes affectent les courbes température/volatilité.'\n" +
         "Réf: Perfumer & Flavorist, 'Stability of Fragrance Profile'",
         'Sources scientifiques: voir références dans le texte', 1,
         'ébullition,volatilité,pression vapeur,moléculaire,tête,cœur,fond,diffusion,limonène,linalol,vanilline,coumarine'],

        ['Science — Chimie', 'chimie', 'Structure moléculaire et perception olfactive — Les études de référence',
         "STRUCTURE MOLÉCULAIRE ET PERCEPTION OLFACTIVE\n\n" +
         "ÉTUDES SCIENTIFIQUES DE RÉFÉRENCE :\n\n" +
         "1. Snitz et al. (2013) — Nature Scientific Reports 3:206\n" +
         "   'Molecular complexity determines the number of olfactory notes\n" +
         "   and the pleasantness of smells'\n" +
         "   → 54 odorants testés, concentrations de vapeur égalisées\n" +
         "   → PAS de corrélation entre point d'ébullition et nombre de notes\n" +
         "   → PAS de corrélation entre point d'ébullition et agréabilité\n" +
         "   → La COMPLEXITÉ MOLÉCULAIRE (branches, groupes fonctionnels) détermine\n" +
         "     le nombre de notes perçues et l'agréabilité\n" +
         "   DOI: 10.1038/srep00206\n\n" +
         "2. Seigneurin et al. (2024) — HAL hal-04695520, PMC12666731\n" +
         "   'Exploring the impact of fragrance molecular and skin properties\n" +
         "   on the evaporation profile of fragrances'\n" +
         "   → 8 molécules testées in vitro (verre, Strat-M) et in vivo (peau)\n" +
         "   → L'ordre d'évaporation correspond aux points d'ébullition\n" +
         "   → Mais la PEAU modifie l'évaporation (hydratation, TEWL, rugosité)\n" +
         "   → 2 clusters : molécules légères (Bp < 210°C) influencées par rugosité,\n" +
         "     molécules lourdes (Bp > 210°C) influencées par TEWL\n" +
         "   HAL: hal-04695520v1, hal-05117939v1\n\n" +
         "3. Sell, C. (2006) — 'The Chemistry of Fragrances'\n" +
         "   Royal Society of Chemistry\n" +
         "   → Ouvrage de référence en chimie des parfums\n" +
         "   → Chapitres sur la relation structure-odeur\n" +
         "   → La structure 3D (forme, groupes fonctionnels) détermine la note\n" +
         "   → Le point d'ébullition détermine la DYNAMIQUE temporelle (top/mid/base)\n" +
         "   ISBN: 0-85404-824-3\n\n" +
         "4. Firmenich / Nature (2022)\n" +
         "   'From molecules to perception: 126 years at the forefront of olfactory science'\n" +
         "   → Les relations structure-odeur sont IRRÉGULIÈRES\n" +
         "   → Des molécules très différentes peuvent avoir la même note (ex: muscs)\n" +
         "   → Une même molécule peut être perçue différemment par 2 personnes\n" +
         "   → 400+ types de récepteurs olfactifs, variation génétique importante\n" +
         "   DOI: 10.1038/d42473-022-00164-4\n\n" +
         "5. Hu et al. (2024) — HSET Data\n" +
         "   'Research and Development of Fragrance Retention Technology'\n" +
         "   → Revue des technologies de rétention du parfum\n" +
         "   → Nombre de carbones (C4-C20) corrélé au point d'ébullition\n" +
         "   → Chaînes ouvertes → fragrance plus forte que cycliques\n" +
         "   → Aldéhydes et isonitriles = stabilité moindre\n\n" +
         "6. Sowndhararajan & Kim (2016) — PMC5198031\n" +
         "   'Influence of Fragrances on Human Psychophysiological Activity'\n" +
         "   → Revue des effets EEG des arômes inhalés\n" +
         "   → Lavande : augmente relaxation (ondes alpha)\n" +
         "   → Romarin : augmente vigilance (ondes beta)\n" +
         "   → Le linalol (R) et (S) ont des effets DIFFÉRENTS sur le cerveau\n" +
         "     malgré la même formule chimique (chiralité)\n" +
         "   DOI: 10.3390/molecules21091090\n\n" +
         "7. Perfumer & Flavorist — 'Stability of Fragrance Profile'\n" +
         "   → Les taux d'évaporation à température d'usage sont PARALLÈLES\n" +
         "     aux points d'ébullition (mais pas toujours : association, phénomènes secondaires)\n" +
         "   → Recommande aux parfumeurs de mesurer eux-mêmes les volatilités relatives\n\n" +
         "CONCLUSION POUR MFC :\n" +
         "Le point d'ébullition d'une molécule détermine QUAND elle est perçue\n" +
         "(tête/cœur/fond) mais pas SA QUALITÉ ni SON INTENSITÉ.\n" +
         "Le flash point du MÉLANGE ne prédit RIEN sur le rendu olfactif.\n" +
         "Seuls les tests de combustion réels permettent d'évaluer le throw.",
         'Sources: voir DOI et références dans le texte', 1,
         'étude,recherche,science,moléculaire,perception,olfactif,ébullition,volatilité,structure,récepteur'],

        ['Science — Chimie', 'chimie', 'Quantité de solvant dans un parfum et impact sur le rendu olfactif en bougie',
         "QUANTITÉ DE SOLVANT — IMPACT SUR LE RENDU OLFACTIF EN BOUGIE\n\n" +
         "Le solvant dans un parfum a un DOUBLE RÔLE :\n" +
         "1. Rôle TECHNIQUE : dissoudre les ingrédients solides (vanilline, muscs),\n" +
         "   aider à la miscibilité avec la cire, faciliter la diffusion ('lift').\n" +
         "2. Rôle ÉCONOMIQUE (négatif) : 'couper' l'huile = diluer pour baisser le coût.\n" +
         "   Certaines huiles bon marché contiennent jusqu'à 90% de solvant !\n" +
         "Réf: Stock Fragrance — 'Solvents can be used to cut an oil, industry slang\n" +
         "for reducing cost. In some cases, solvent loads can go up to and over 90%.'\n\n" +
         "RÈGLE FONDAMENTALE :\n" +
         "Une dose plus faible d'huile concentrée SURPASSE TOUJOURS\n" +
         "une dose plus forte d'huile diluée.\n" +
         "Réf: Stock Fragrance — 'Consumer testing has proven that a lower dosage\n" +
         "of a more concentrated oil consistently outperforms a higher dosage\n" +
         "of a less concentrated oil.'\n\n" +
         "SEUILS DE SOLVANT ET CONSÉQUENCES :\n" +
         "- 0-15% solvant : huile concentrée premium.\n" +
         "  → Throw puissant, tenue longue, caractère intact.\n" +
         "  → Usage recommandé : 6-8% charge dans la cire.\n" +
         "  Réf: The Flaming Candle — 'We recommend 1 oz per pound (6%).\n" +
         "  Due to the high concentration of our fragrance oils.'\n\n" +
         "- 15-30% solvant : huile standard.\n" +
         "  → Throw correct, usage 8-10% charge.\n" +
         "  → Acceptable si le solvant est compatible cire (IPM, DOA, BB).\n\n" +
         "- 30-50% solvant : huile diluée.\n" +
         "  → Throw affaibli, caractère modifié.\n" +
         "  → Nécessite 10-12% charge pour compenser.\n" +
         "  → ATTENTION : si le solvant est DPG = catastrophe en bougie.\n\n" +
         "- >50% solvant : huile très diluée ('coupée').\n" +
         "  → Performance médiocre même à charge maximale.\n" +
         "  → Les solvants eux-mêmes saturent la capacité de la cire.\n" +
         "  → Risque de suintage, séparation, combustion irrégulière.\n" +
         "  Réf: Stock Fragrance — 'High fragrance loads cause separation, color\n" +
         "  change and unstable product, like when a candle sweats.'\n\n" +
         "LE SOLVANT AIDE LA DIFFUSION (QUAND IL EST COMPATIBLE) :\n" +
         "Paradoxe : un MINIMUM de solvant compatible est UTILE.\n" +
         "Sans solvant du tout, la cire piège le parfum et l'empêche de diffuser.\n" +
         "Le solvant compatible (IPM, DOA) aide à 'lifter' le parfum dans l'air.\n" +
         "Réf: Stock Fragrance — 'Candle oils need solvents to help lift the fragrance\n" +
         "into the air and give better hot/diffusion à froid. Without them, the candle wax\n" +
         "would literally hold in and suppress the fragrance.'\n" +
         "Réf: CandleScience — 'Solvents help the components of a fragrance burn\n" +
         "more easily, blend better, improve fragrance throw, and increase longevity.'\n\n" +
         "CALCUL PRATIQUE POUR MFC :\n" +
         "Exemple : bougie 200g, charge parfum 8% = 16g de parfum.\n" +
         "Si le parfum contient 40% de solvant :\n" +
         "→ 6.4g de solvant + 9.6g de matières aromatiques actives dans 184g de cire.\n" +
         "→ Concentration réelle de matières actives : 5.2% seulement.\n" +
         "Si le solvant est DPG : 6.4g insolubles → suintage garanti.\n" +
         "Si le solvant est IPM : 6.4g solubles → OK mais throw réduit vs concentré.\n\n" +
         "RECOMMANDATION MFC :\n" +
         "Vérifier la FDS section 3 : lister TOUS les solvants et leurs %.\n" +
         "Calculer le % RÉEL de matières aromatiques actives.\n" +
         "Préférer les huiles à < 25% de solvant total.\n" +
         "Adapter la charge en conséquence.",
         'Sources: Stock Fragrance (2024), The Flaming Candle (2025), CandleScience (2024), LEUXSCENT (2025)', 1,
         'solvant,quantité,pourcentage,dilué,concentré,throw,performance,DPG,IPM,couper,charge,actif'],

        ['Science — Chimie', 'chimie', 'Solvants pour molécules lourdes — Guide de compatibilité pour bougies',
         "SOLVANTS POUR MOLÉCULES LOURDES EN BOUGIE — GUIDE COMPLET\n\n" +
         "Les molécules LOURDES (notes de fond : muscs, vanilline, coumarine,\n" +
         "ambrox, labdanum, patchouli) posent un défi en bougie :\n" +
         "- Elles sont souvent SOLIDES à température ambiante\n" +
         "- Elles ont besoin d'un solvant pour être liquéfiées\n" +
         "- Elles diffusent lentement (pression de vapeur basse)\n" +
         "- Elles ont tendance à RESTER PIÉGÉES dans la cire\n\n" +
         "LE CHOIX DU SOLVANT EST CRITIQUE POUR CES MOLÉCULES.\n\n" +
         "CLASSEMENT DES SOLVANTS POUR MOLÉCULES LOURDES EN BOUGIE :\n\n" +
         "1. DOA — Dioctyl Adipate (CAS 103-23-1)\n" +
         "   ★★★★★ MEILLEUR solvant pour bougies\n" +
         "   - MW 370 g/mol — Bp 214°C — Flash pt 196°C\n" +
         "   - Incolore, inodore, faible viscosité\n" +
         "   - EXCELLENTE compatibilité avec TOUTES les cires\n" +
         "   - Surpasse l'IPM pour la performance en bougie\n" +
         "   - Formule classique : 50% concentré + 50% DOA\n" +
         "   Réf: Perfumer & Flavorist Vol.32 (2007) — 'Good heavy co-solvent\n" +
         "   for candle fragrances, helping bridge differences with wax in\n" +
         "   certain rich or spicy-type fragrances.'\n" +
         "   Réf: Pell Wall Perfumery — 'The best solvent for most candle scents,\n" +
         "   gives great performance and is fully miscible with most waxes.'\n" +
         "   Réf: David Rowe (Basenotes, parfumeur professionnel retraité) :\n" +
         "   'DOA turned out to be a better solvent than IPM.'\n" +
         "   'DOA in Soy wax will perform better than IPM, but both will\n" +
         "   perform better in paraffin.'\n\n" +
         "2. Benzyl Benzoate — BB (CAS 120-51-4)\n" +
         "   ★★★★ Spécialiste des MUSCS et SOLIDES\n" +
         "   - MW 212 g/mol — Bp 323°C — Flash pt 148°C\n" +
         "   - Connu comme le 'solvant universel' des muscs cristallins\n" +
         "   - Dissout vanilline, éthyl vanilline, muscs nitrés, absolues lourdes\n" +
         "   - Double rôle : solvant + fixateur (ralentit l'évaporation)\n" +
         "   - Léger arôme balsamique propre (quasi imperceptible)\n" +
         "   ⚠️ ATTENTION en cire végétale : peut accélérer le polymorphisme\n" +
         "   si > 10% du total (former cristaux blancs en surface)\n" +
         "   → Si BB > 10%, augmenter les alcools gras (cétylique/stéarylique)\n" +
         "   Réf: Gemlite — 'BB is the universal solvent for solid fragrance\n" +
         "   chemicals, like vanilla and musk type fragrances.'\n" +
         "   Réf: Fraterworks — 'Vital in dissolving challenging materials\n" +
         "   like crystalline musks or stubborn absolutes.'\n" +
         "   Réf: Pell Wall/Arctander — 'Particularly helpful for nitro-musks,\n" +
         "   certain natural extracts and other very low-polarity ingredients\n" +
         "   that can be difficult to dissolve.'\n" +
         "   Réf: PerfumersWorld — 'Fixative-blender-solvent for balsams, gums.'\n\n" +
         "   ASTUCE VANILLINE :\n" +
         "   Faire un pré-mélange 50% BB + 50% alcool benzylique,\n" +
         "   puis dissoudre l'éthyl vanilline/vanilline dans cette solution.\n" +
         "   Ajouter un absorbeur UV pour réduire la décoloration.\n" +
         "   Réf: David Rowe (Basenotes 2023)\n\n" +
         "3. IPM — Isopropyl Myristate (CAS 110-27-0)\n" +
         "   ★★★½ Bon polyvalent pour bougies\n" +
         "   - MW 270 g/mol — Bp 315°C — Flash pt 157°C\n" +
         "   - Chaîne grasse C14 = très bonne compatibilité cire\n" +
         "   - Propriétés fixatrices (ralentit l'évaporation)\n" +
         "   - Moins performant que DOA pour les notes lourdes\n" +
         "   - Excellent pour les huiles de citrus et notes fraîches\n" +
         "   Réf: Basenotes/Pell Wall — 'IPM is the solvent to use if you want\n" +
         "   to fragrance an oil based product, such as a candle.'\n" +
         "   Réf: Cosmetics & Toiletries — '[IPM and benzyl benzoate are]\n" +
         "   nonpolar solvents good in a candle.'\n\n" +
         "4. DEP — Diethyl Phthalate (CAS 84-66-2)\n" +
         "   ★★★ Historiquement bon, en déclin\n" +
         "   - MW 222 g/mol — Bp 295°C\n" +
         "   - Bon solvant universel pour bougies\n" +
         "   - Solubilité PARTIELLE dans la cire (limiter à < 8% de charge)\n" +
         "   ⚠️ Mauvaise image 'phtalate' (confusion avec les phtalates toxiques)\n" +
         "   → Beaucoup de clients demandent 'phtalate-free'\n" +
         "   → DEP lui-même est considéré sûr (pas le même que DEHP/DBP)\n" +
         "   Réf: Cosmetics & Toiletries — 'DEP is safe. But consumers demand\n" +
         "   removal due to guilt by association.'\n" +
         "   Réf: P&F 2007 — historiquement le standard industrie\n\n" +
         "5. TEC — Triethyl Citrate (CAS 77-93-0)\n" +
         "   ★★★ Alternative 'clean label'\n" +
         "   - MW 276 g/mol — Bp 294°C\n" +
         "   - Compatible cire, biodégradable\n" +
         "   - Favori de Firmenich pour les bases propres\n" +
         "   - Remplace progressivement le DPG dans l'industrie\n" +
         "   Réf: Pell Wall — 'TEC is replacing all products containing DPG.'\n" +
         "   Réf: Basenotes — 'TEC would also work in non-polar environments\n" +
         "   such as a candle.' (communication d'un parfumeur professionnel)\n\n" +
         "SOLVANTS À ÉVITER POUR BOUGIES :\n" +
         "❌ DPG (Dipropylene Glycol) — POLAIRE, insoluble dans la cire\n" +
         "   Réf: P&F 2007 — 'A candle fragrance no-no!'\n" +
         "   Réf: Cosmetics & Toiletries — 'DPG would immediately separate.'\n" +
         "❌ PG (Propylene Glycol) — Même problème que DPG, pire encore\n" +
         "❌ Éthanol — S'évapore à la chaleur, incompatible bougies\n\n" +
         "POUR LES PARFUMS RICHES EN NOTES LOURDES (orientaux, boisés, ambrés) :\n" +
         "Réf: David Rowe (Basenotes, parfumeur professionnel) :\n" +
         "'Pour la cire de soja, j'ai dû augmenter les notes de tête (aldéhydes C10,\n" +
         "C12 MNA) et réduire les notes de fond (labdanum, patchouli).'\n" +
         "→ Les molécules lourdes sont plus PIÉGÉES en soja qu'en paraffine.\n" +
         "→ Le DOA aide à compenser ce problème.\n\n" +
         "Réf: Perfumer & Flavorist (2020) — Jessica R. Weber, Premier Specialties :\n" +
         "'Soy waxes are made of large nonvolatile molecules (triglycerides/fatty acids),\n" +
         "the wax can TRAP volatile fragrance components. For soy, testing should be\n" +
         "done on top note-boosting chemicals and different solvents.'\n\n" +
         "RÉSUMÉ MFC — CHOIX DU SOLVANT PAR TYPE DE PARFUM :\n" +
         "• Oriental/Ambré/Musc lourd → DOA ou BB\n" +
         "• Vanille/Gourmand → BB (dissout la vanilline) + DOA\n" +
         "• Floral classique → IPM ou DOA\n" +
         "• Frais/Agrumes → IPM (bonne lift des notes de tête)\n" +
         "• Boisé/Épicé riche → DOA (pont entre cire et notes lourdes)\n" +
         "• Clean/Savonneux → TEC ou IPM",
         'Sources: P&F Vol.32 (2007), Pell Wall Perfumery, Fraterworks, Basenotes (David Rowe), Gemlite, Stock Fragrance, CandleScience, Cosmetics & Toiletries, PerfumersWorld', 1,
         'solvant,DOA,adipate,benzyl benzoate,IPM,DEP,TEC,musc,vanilline,lourd,fond,cristallin,dissoudre,bougie,cire,lift']
    ];

    for (const [cat, sub, title, content, source, prio, tags] of entries) {
        await db.run('INSERT OR IGNORE INTO knowledge_base (category,subcategory,title,content,source,priority,tags) VALUES (?,?,?,?,?,?,?)',
            [cat, sub, title, content, source, prio, tags]);
    }
    console.log('  ✓ Session 19 : ' + entries.length + ' fiches (températures process)');
}

module.exports.seedSession19 = seedSession19;

// ═══════════════════════════════════════════════════
// SESSION 20 — COLORANTS À BOUGIES
// ═══════════════════════════════════════════════════

async function seedSession20(db) {
    const check = await db.get("SELECT COUNT(*) as c FROM knowledge_base WHERE tags LIKE '%colorant%liposoluble%'");
    if (check.c > 0) { console.log('  ✓ Session 20 : fiches colorants déjà présentes'); return; }

    const entries = [
        ['technique', 'colorant', 'Types de colorants — Classification technique pour bougies',
         "CLASSIFICATION DES COLORANTS POUR BOUGIES\n\n" +
         "1. COLORANTS LIPOSOLUBLES (Oil-Soluble Dyes) ✅ RECOMMANDÉS\n" +
         "Nature : composés organiques (dérivés d'anilines)\n" +
         "Propriété : se DISSOLVENT complètement dans la cire fondue\n" +
         "La cire reste transparente, couleur uniforme dans toute la masse\n" +
         "Le colorant BRÛLE avec la cire → aucune obstruction de mèche\n" +
         "Formes : liquide, granulés (chips/flakes), blocs, pastilles\n" +
         "Dosage : 1-2 g/kg cire (standard), 5 g/kg max (teintes profondes)\n" +
         "Compatible : paraffine, stéarine, soja, coco, cire d'abeille\n\n" +
         "2. PIGMENTS (Insoluble) ⚠️ PROBLÉMATIQUES\n" +
         "Nature : particules inorganiques ou organiques INSOLUBLES\n" +
         "NE SE DISSOLVENT PAS → restent en suspension puis sédimentent\n" +
         "Les particules OBSTRUENT la mèche par capillarité\n" +
         "→ Flamme qui faiblit → extinction prématurée\n" +
         "→ Champignonnage accéléré\n" +
         "Usage acceptable : trempage extérieur uniquement (Bekro, Kaiser)\n\n" +
         "RÈGLE MFC :\n" +
         "Seuls les colorants LIPOSOLUBLES sont utilisés en production.\n" +
         "Fournisseurs validés : Bekro Chemie, Kaiser Lacke.",
         'Réf: Armatage Candle Co. (2021), Bramble Berry (2025), NorthWood Candle (2023), CandleScience, Winsor & Newton', 1,
         'colorant,liposoluble,pigment,mica,TiO2,dioxyde titane,crayon,type,classification'],

        ['technique', 'colorant', 'Colorants liposolubles — Formes et dosages',
         "COLORANTS LIPOSOLUBLES — DÉTAIL DES FORMES\n\n" +
         "LIQUIDE :\n" +
         "- Très concentré : 15 ml colore jusqu'à 1 kg de cire\n" +
         "- Dissolution rapide même à basse température\n" +
         "- Facile à mélanger entre couleurs pour créer des teintes\n" +
         "- Précision de dosage au goutte-à-goutte\n" +
         "- Inconvénient : salissant, difficile à nettoyer en cas de renversement\n" +
         "- Agiter avant utilisation\n" +
         "Réf: CandleScience — '1 oz de colorant liquide suffit pour 100 lb de cire'\n\n" +
         "GRANULÉS / CHIPS / FLAKES :\n" +
         "- Dosage facile à la balance\n" +
         "- Pas de salissure\n" +
         "- Dissolution à ~70-85°C en remuant\n" +
         "- 1/4 cuillère à café / livre de cire = teinte moyenne\n" +
         "- 1/2 cuillère à café / livre de cire = teinte profonde\n" +
         "Réf: Bramble Berry (2025) — tests documentés avec photos\n\n" +
         "BLOCS :\n" +
         "- Idéaux pour grands volumes\n" +
         "- Couper ou raper avant ajout\n" +
         "- Couleurs plus intenses en soja, pastel en paraffine\n" +
         "- Nécessite plus de mélange que les liquides\n\n" +
         "PASTILLES (système Bekro/Kaiser) :\n" +
         "- Dosage précis et reproductible (chaque pastille = même contenu)\n" +
         "- Pas de poussière, manipulation propre\n" +
         "- Conservation longue\n" +
         "- Système professionnel industriel\n\n" +
         "TEMPÉRATURE D'AJOUT :\n" +
         "Ajouter le colorant à 70-85°C dans la cire fondue\n" +
         "Mélanger jusqu'à dissolution COMPLÈTE (pas de stries, pas de points)\n" +
         "Faire un test papier : tremper une bande de papier sulfurisé,\n" +
         "laisser refroidir 1 min → voir la couleur finale",
         'Réf: CandleScience, Bramble Berry (2025), Bekro Chemie, Kaiser Lacke', 1,
         'colorant,liposoluble,liquide,granulé,bloc,pastille,dosage,température'],

        ['technique', 'colorant', 'Pigments et mèche — Mécanisme d\'obstruction',
         "POURQUOI LES PIGMENTS OBSTRUENT LA MÈCHE\n\n" +
         "MÉCANISME DE CAPILLARITÉ :\n" +
         "La mèche fonctionne comme une autoroute pour la cire fondue.\n" +
         "La cire liquide monte par action capillaire dans le tissage de coton.\n" +
         "Les colorants liposolubles sont DISSOUS → passent librement.\n" +
         "Les pigments sont des PARTICULES solides → trop grosses pour le tissage.\n\n" +
         "Réf: Armatage Candle Co. — 'Wicks are carefully designed to transport\n" +
         "wax blends, and they're not designed to handle large, undissolved\n" +
         "particles. Pigments don't dissolve in wax, they act like large rocks.\n" +
         "The rocks get stuck in the weave of the wick.'\n\n" +
         "CONSÉQUENCES :\n" +
         "1. Flamme qui rétrécit progressivement\n" +
         "2. Creux qui se forme et se remplit de cire liquide\n" +
         "3. La bougie s'éteint prématurément\n" +
         "4. Si la bougie continue : champignonnage massif\n\n" +
         "Réf: Terre de Bougies — 'les contaminants inorganiques dans la cire\n" +
         "(cire dure, cire artificielle, colorants surtout pigments, et huile\n" +
         "de parfum) endommagent la mèche.'\n\n" +
         "TEST BRAMBLE BERRY (2025) :\n" +
         "Test avec Ultramarine Pink Oxide (pigment) dans cire :\n" +
         "→ Le pigment est tombé au fond du pot immédiatement\n" +
         "→ Au brûlage : la flamme a lutté pour rester allumée\n" +
         "→ Extinction après 30 minutes\n" +
         "→ Couleur jolie mais bougie non fonctionnelle\n\n" +
         "RÈGLE MFC :\n" +
         "JAMAIS de pigment dans une bougie destinée à brûler.\n" +
         "Seuls les colorants liposolubles (Bekro, Kaiser, CandleScience)\n" +
         "sont acceptables pour la coloration dans la masse.",
         'Réf: Armatage Candle Co. (2021), Bramble Berry (2025), Terre de Bougies (2024)', 1,
         'colorant,pigment,mèche,obstruction,capillarité,particule,insoluble'],

        ['technique', 'colorant', 'Champignonnage — Causes liées aux colorants et additifs',
         "CHAMPIGNONNAGE (CARBON BUILDUP) ET COLORANTS\n\n" +
         "DÉFINITION :\n" +
         "Accumulation de carbone en forme de champignon au bout de la mèche.\n" +
         "Résultat d'une combustion INCOMPLÈTE : plus de cire aspirée que brûlée.\n\n" +
         "CAUSES LIÉES AUX COLORANTS :\n" +
         "1. Pigments insolubles qui s'accumulent sur la mèche\n" +
         "2. Colorants liposolubles en SURDOSAGE\n" +
         "3. Mica ou poudres mélangées dans la masse\n" +
         "4. TiO₂ (dioxyde de titane) en excès\n\n" +
         "AUTRES CAUSES :\n" +
         "- Mèche trop grosse pour le contenant\n" +
         "- Charge parfum excessive (> 10%)\n" +
         "- Parfums complexes avec vanilline\n" +
         "- Combustion continue > 4 heures\n" +
         "- Mèches à âme zinc (plus sujettes)\n" +
         "- Mèche non émouchée avant rallumage\n\n" +
         "Réf: CandleScience — 'Le champignon est un signe que la mèche\n" +
         "est trop grosse pour la bougie. Les séries CD sont plus sujettes\n" +
         "au champignonnage que d'autres.'\n\n" +
         "CONSÉQUENCES SI NON TRAITÉ :\n" +
         "- Flamme irrégulière et trop grande\n" +
         "- Production excessive de suie\n" +
         "- La boule de carbone peut TOMBER dans le bain de fusion\n" +
         "  → flamme secondaire → risque d'incendie\n" +
         "- Noircissement du contenant\n\n" +
         "Réf: Big Moon Beeswax — 'A carbon ball can land on the side\n" +
         "of the candle and burn a hole right through. The entire candle\n" +
         "can turn into a puddle of wax with two active flames.'\n\n" +
         "SOLUTIONS :\n" +
         "1. Utiliser UNIQUEMENT des colorants liposolubles\n" +
         "2. Doser correctement (1-2 g/kg)\n" +
         "3. Calibrer la mèche avec colorant + parfum inclus\n" +
         "4. Émocher (trimmer) à 5-6 mm avant chaque allumage\n" +
         "5. Ne pas brûler plus de 3-4 heures consécutives\n" +
         "6. Règle générale : prévoir +1 taille de mèche quand on ajoute\n" +
         "   colorant + parfum vs cire seule",
         'Réf: CandleScience, The Flaming Candle, Armatage, Blaizen Candles, Big Moon Beeswax, Supplies for Candles', 1,
         'colorant,champignonnage,carbone,mèche,combustion,pigment,suie'],

        ['technique', 'colorant', 'Suie et émissions — Impact des colorants',
         "SUIE (SOOT) ET COLORANTS\n\n" +
         "La suie est le produit d'une combustion INCOMPLÈTE du carbone.\n\n" +
         "DONNÉES SCIENTIFIQUES :\n" +
         "Étude Krause (1999) :\n" +
         "→ Un type de bougie peut produire 100x plus de suie qu'un autre\n" +
         "→ Les bougies très parfumées et très colorées sont les plus émettrices\n\n" +
         "Étude Fine et al. (1999) :\n" +
         "→ Émissions de carbone élémentaire : 40 à 3370 µg/g de bougie\n" +
         "→ Variation énorme selon la formulation\n\n" +
         "FACTEURS AGGRAVANTS :\n" +
         "- Plus le ratio carbone/hydrogène est élevé → plus de suie\n" +
         "- Parfums = hydrocarbures insaturés (liquides) → plus de suie que cire seule\n" +
         "- Colorants en excès = plus de matière à brûler\n" +
         "- Bougies en conteneur : le verre perturbe le flux d'air → plus de suie\n" +
         "- Courants d'air → flamme instable → combustion incomplète\n\n" +
         "Étude Lau et al. (1997) :\n" +
         "→ Benzo[a]pyrène en air : 0.002 µg/m³ (sous les limites PEL de 200 µg/m³)\n\n" +
         "RÉDUIRE LA SUIE :\n" +
         "1. Colorants liposolubles uniquement (brûlent complètement)\n" +
         "2. Dosage modéré (ne pas surcharger)\n" +
         "3. Mèche correctement calibrée\n" +
         "4. Émocher avant chaque allumage\n" +
         "5. Éviter les courants d'air\n" +
         "6. Ne pas dépasser 3-4h de combustion continue",
         'Réf: Krause (1999), Fine et al. (1999), Lau et al. (1997), Soapmaking Forum', 1,
         'colorant,suie,soot,émission,carbone,combustion,benzo,particule'],

        ['technique', 'colorant', 'Décoloration UV et stabilisateurs',
         "DÉCOLORATION DES BOUGIES ET PROTECTION UV\n\n" +
         "CAUSE PRINCIPALE : les UV (lumière naturelle ou artificielle)\n" +
         "Les UV détruisent les liaisons chimiques des colorants.\n\n" +
         "AUTRES CAUSES DE CHANGEMENT DE COULEUR :\n" +
         "- Vanilline dans le parfum → jaunissement progressif\n" +
         "- Huiles essentielles d'agrumes → altération de la teinte\n" +
         "- Oxydation naturelle de la cire dans le temps\n" +
         "- Cires naturelles (soja, abeille) ont une teinte propre qui évolue\n\n" +
         "Réf: CandleScience — 'Chaque fois que les bougies sont exposées à\n" +
         "la lumière, surtout le soleil direct, elles peuvent pâlir ou jaunir.'\n\n" +
         "SOLUTIONS :\n" +
         "1. INHIBITEUR UV (CandleScience, Kaiser)\n" +
         "   - Dosage : 0.25-0.5% du poids de cire\n" +
         "   - Ajouter à 85°C, mélanger pour dissoudre\n" +
         "   - Protège contre le jaunissement et la perte de couleur\n" +
         "   - NE protège PAS contre le givrage (frosting)\n\n" +
         "2. STABILISATEUR HALS (Hindered Amine Light Stabilizer)\n" +
         "   - Intégré par certains fabricants de cire\n" +
         "   - Combat la photo-oxydation\n" +
         "   Réf: Armatage — 'HALS is the lesser known weapon. Wax\n" +
         "   manufacturers may include this to fight photo-oxidation.'\n\n" +
         "3. BEKRO : systèmes anti-UV et antioxydants intégrés dans leurs colorants\n" +
         "   Réf: Bekro — 'stabiliser, anti-oxidant system and stable dye/pigment\n" +
         "   systems to minimise colour fading during production or by light.'\n\n" +
         "4. STOCKAGE :\n" +
         "   - À l'abri de la lumière directe\n" +
         "   - Couvercle fermé\n" +
         "   - Température fraîche et stable\n\n" +
         "COLORANTS PIGMENTAIRES vs LIPOSOLUBLES FACE AUX UV :\n" +
         "Les pigments résistent MIEUX aux UV que les colorants liposolubles.\n" +
         "Mais ils obstruent la mèche → compromis impossible pour bougies à brûler.\n" +
         "Réf: The Flaming Candle (2025)",
         'Réf: CandleScience, Armatage Candle Co. (2025), Bekro Chemie, The Flaming Candle, Kaiser Lacke', 1,
         'colorant,UV,décoloration,jaunissement,stabilisateur,HALS,inhibiteur,vanilline,stockage'],

        ['fournisseur', 'colorant', 'Bekro Chemie GmbH — Fabricant de colorants bougies',
         "BEKRO CHEMIE GmbH\n" +
         "Fondé en 1966 en Allemagne\n" +
         "Leader européen des colorants pour bougies\n" +
         "Fournisseur accrédité Candles Quality Association\n" +
         "Exportation mondiale\n\n" +
         "GAMMES :\n" +
         "- Top 80 : 80 couleurs standard (le plus vendu)\n" +
         "- Couleurs custom : développées pour chaque fabricant,\n" +
         "  testées selon conditions de production spécifiques\n" +
         "- Système RAINBOW : couleurs de base à mélanger en labo\n\n" +
         "TYPES DE PRODUITS :\n" +
         "- Colorants liposolubles solides (grains/pastilles)\n" +
         "- Colorants liposolubles liquides\n" +
         "- Pigments pour trempage/enrobage\n\n" +
         "CARACTÉRISTIQUES :\n" +
         "- Systèmes anti-UV et antioxydants intégrés\n" +
         "- Haute résistance à la lumière et à la chaleur\n" +
         "- Sans substances nocives\n" +
         "- Compatible paraffine, stéarine, soja, coco, olive, cire d'abeille\n" +
         "- Dosage : 1-2 g/kg (couleur standard), 5 g/kg (blanc)\n" +
         "- Consistance lot à lot exceptionnelle\n\n" +
         "AVANTAGE CLÉ :\n" +
         "Les couleurs custom évitent les coûteuses erreurs de mélange\n" +
         "en production. Chaque lot est fabriqué selon des valeurs colorimétriques\n" +
         "définies et contrôlé selon des tests qualité stricts.",
         'bekro.de — Fournisseur accrédité Candles Quality Association', 1,
         'colorant,liposoluble,Bekro,fournisseur,Allemagne,pastille,liquide,custom,RAINBOW'],

        ['fournisseur', 'colorant', 'Kaiser Lacke GmbH — Vernis et couleurs pour bougies',
         "KAISER LACKE GmbH\n" +
         "Nuremberg, Allemagne — 90 ans d'existence\n" +
         "Leader mondial des vernis et couleurs pour bougies\n" +
         "Fournisseur accrédité Candles Quality Association\n\n" +
         "PRODUITS COLORATION DANS LA MASSE :\n" +
         "- Système liquiDYE 2620 : couleurs de base pour mélange\n" +
         "- Système liquiDYE 2624 : couleurs prêtes à l'emploi\n" +
         "- Pastilles colorées : dosage précis et reproductible\n\n" +
         "PRODUITS FINITION DE SURFACE :\n" +
         "- Vernis solvant : brillant, mat, nacré, métallique, effet glace\n" +
         "- Vernis hydro : résistants, sans odeur, peu de solvant\n" +
         "- Vernis sérigraphie pour décor\n" +
         "- Système 2501 : couleurs pour trempage\n\n" +
         "ADDITIFS :\n" +
         "- Améliorateur de combustion\n" +
         "- Stabilisateur UV\n" +
         "- Dispersant pour couleurs solides\n" +
         "- Dispersant pour couleurs liquides\n\n" +
         "PARTICULARITÉ :\n" +
         "Kaiser propose à la fois coloration dans la masse ET finition\n" +
         "de surface → solution complète pour décor de bougies.\n" +
         "Gamme d'effets unique : nacré, métallique or/argent, glace, mat.\n" +
         "Site : kaiser-lacke.de",
         'kaiser-lacke.de — Fournisseur accrédité Candles Quality Association', 1,
         'colorant,Kaiser,vernis,laque,fournisseur,Allemagne,liquiDYE,pastille,trempage,sérigraphie'],

        ['technique', 'colorant', 'Impact des colorants sur le calibrage de mèche',
         "COLORANT ET CALIBRAGE DE MÈCHE\n\n" +
         "RÈGLE GÉNÉRALE :\n" +
         "Prévoir +1 taille de mèche quand on ajoute colorant + parfum\n" +
         "par rapport à une bougie en cire seule.\n\n" +
         "Réf: Candleers — 'The conventional wisdom with wick size is that\n" +
         "whatever size wick a candle with no dye or fragrance oils uses,\n" +
         "then you need to use one size bigger after adding fragrance oils\n" +
         "and dyes.'\n\n" +
         "IMPACT PAR COULEUR :\n" +
         "- Les couleurs foncées (noir, bleu foncé, rouge profond) nécessitent\n" +
         "  plus de colorant → impact plus fort sur la combustion\n" +
         "- Les pastels nécessitent moins de colorant → impact minimal\n\n" +
         "IMPACT PAR TYPE DE CIRE :\n" +
         "- Soja : les blocs donnent des couleurs foncées vibrantes\n" +
         "- Paraffine : les blocs donnent des teintes claires à foncées\n" +
         "- Soja : les liquides donnent des couleurs pastel\n" +
         "Réf: CandleScience\n\n" +
         "RÈGLE MFC :\n" +
         "TOUJOURS tester avec la formulation COMPLÈTE :\n" +
         "cire + parfum + colorant + contenant\n" +
         "Un test sans colorant NE PRÉDIT PAS le comportement réel.\n" +
         "Chaque combinaison couleur/parfum/cire peut nécessiter\n" +
         "un ajustement de mèche différent.\n\n" +
         "ATTENTION VANILLINE :\n" +
         "Les parfums riches en vanilline peuvent altérer la couleur finale.\n" +
         "Toujours tester la combinaison parfum + colorant en petit lot.",
         'Réf: CandleScience, Candleers, Bramble Berry, NorthWood Candle', 1,
         'colorant,mèche,calibrage,taille,combustion,soja,paraffine,vanilline']
    ];

    for (const [cat, sub, title, content, source, prio, tags] of entries) {
        await db.run('INSERT OR IGNORE INTO knowledge_base (category,subcategory,title,content,source,priority,tags) VALUES (?,?,?,?,?,?,?)',
            [cat, sub, title, content, source, prio, tags]);
    }
    console.log('  ✓ Session 20 : ' + entries.length + ' fiches (colorants bougies)');
}

module.exports.seedSession20 = seedSession20;
