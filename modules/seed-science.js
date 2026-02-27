// ═══════════════════════════════════════════════════════════════
// CONNAISSANCES SCIENTIFIQUES — LA SCIENCE DERRIÈRE LE SAVOIR-FAIRE
// Sources : publications scientifiques, brevets, études Ökometric,
// ScienceDirect, NASA, National Candle Association, Wikipedia
// ═══════════════════════════════════════════════════════════════

async function seedScience(db) {
    const marker = await db.get("SELECT COUNT(*) as c FROM knowledge_base WHERE category='Science — Combustion'");
    if (marker.c > 0) { console.log('  ✓ Connaissances scientifiques déjà chargées'); return; }

    const entries = [

    // ════════════════════════════════════════════════
    // 1. SCIENCE DE LA FLAMME ET COMBUSTION
    // ════════════════════════════════════════════════

    ['Science — Combustion', 'Flamme', '🔥 Les 5 zones d\'une flamme de bougie',
     'Une flamme de bougie comporte 5 zones distinctes scientifiquement identifiées :\n\n' +
     'ZONE I — Zone sombre (non-lumineuse) ≈ 600°C\n' +
     'Directement autour de la mèche. La cire fond, se vaporise mais ne brûle PAS encore (pas assez d\'oxygène). ' +
     'C\'est la zone de pyrolyse : les longues chaînes hydrocarbures de la cire (C20-C40) se cassent en molécules plus petites.\n\n' +
     'ZONE II — Zone bleue ≈ 800°C\n' +
     'Base de la flamme, surplus d\'oxygène → combustion propre et bleue. ' +
     'C\'est la chimiluminescence du carbone moléculaire C₂. ' +
     'Cette zone est responsable de la fusion de la cire autour de la mèche.\n\n' +
     'ZONE III — Zone de pyrolyse ≈ 1000°C\n' +
     'Au-dessus de la zone sombre. Déficit d\'oxygène → la pyrolyse produit des particules de carbone (suie). ' +
     'Les hydrocarbures fragmentés commencent à former des agglomérats de carbone.\n\n' +
     'ZONE IV — Zone lumineuse (jaune) ≈ 1200°C\n' +
     'La plus visible. Les particules de suie chauffent jusqu\'à l\'incandescence → lumière jaune visible. ' +
     'C\'est le même principe qu\'un filament d\'ampoule. Combustion encore incomplète.\n\n' +
     'ZONE V — Voile extérieur ≈ 1400°C\n' +
     'Bordure bleue presque invisible. Zone la PLUS CHAUDE. ' +
     'Contact direct avec l\'oxygène → combustion complète : CₙH₂ₙ₊₂ + O₂ → CO₂ + H₂O + chaleur + lumière.',
     'National Candle Association + Wikipedia + NASA', 1,
     'flamme,zone,combustion,température,pyrolyse,suie,incandescence'],

    ['Science — Combustion', 'Flamme', '🔬 Le cycle auto-entretenu de la bougie',
     'La combustion d\'une bougie est un cycle auto-entretenu en 5 étapes :\n\n' +
     '1. FUSION — La chaleur de la flamme (≈ 800°C zone bleue) fait fondre la cire solide autour de la mèche\n' +
     '2. CAPILLARITÉ — La cire liquide est aspirée vers le haut dans la mèche par action capillaire\n' +
     '3. VAPORISATION — Au sommet de la mèche, la chaleur intense vaporise la cire liquide en gaz\n' +
     '4. COMBUSTION — Les vapeurs de cire réagissent avec l\'O₂ → CO₂ + H₂O + chaleur + lumière\n' +
     '5. RETOUR — ¼ de l\'énergie produite irradie vers le bas et fond plus de cire → retour à l\'étape 1\n\n' +
     'Ce cycle explique pourquoi :\n' +
     '- La mèche doit être dimensionnée correctement : trop petite → pas assez de fuel → tunnel\n' +
     '- Trop grande → trop de fuel → flamme trop haute, suie, champignonnage\n' +
     '- Il faut ≈ 15 min pour que le cycle se stabilise (temps de "warm-up")\n' +
     '- Une bougie qui s\'éteint a rompu ce cycle (plus de fuel OU plus d\'O₂)',
     'Spalding B-number theory + Candle Science', 1,
     'combustion,cycle,capillarité,vaporisation,fusion,auto-entretenu'],

    ['Science — Combustion', 'Flamme', '🧪 Réaction chimique de la combustion',
     'Équation simplifiée de la combustion d\'une paraffine (exemple C25H52) :\n\n' +
     'C₂₅H₅₂ + 38 O₂ → 25 CO₂ + 26 H₂O + ÉNERGIE (chaleur + lumière)\n\n' +
     'En réalité, la combustion est plus complexe :\n' +
     '- Les hydrocarbures longs se fragmentent d\'abord par PYROLYSE (cracking thermique)\n' +
     '- Des radicaux libres se forment (CH•, C₂•, OH•)\n' +
     '- La suie = particules de carbone qui n\'ont pas eu assez d\'O₂ pour brûler complètement\n' +
     '- Le champignonnage = accumulation de carbone sur la mèche quand la combustion est incomplète\n\n' +
     'FAIT IMPORTANT (étude Ökometric 2007) :\n' +
     'Les émissions de combustion sont IDENTIQUES en composition et quantité pour toutes les cires ' +
     '(paraffine, soja, stéarine, cire d\'abeille). ' +
     'Ce qui détermine la propreté de la flamme n\'est PAS le type de cire mais le DIMENSIONNEMENT DE LA MÈCHE.',
     'Ökometric Wax and Emissions Study 2007 + Bayreuth Institute', 1,
     'chimie,combustion,pyrolyse,suie,champignonnage,émissions,ökometric'],

    ['Science — Combustion', 'Mèche', '📐 Modèle de Spalding — B-number et efficacité de mèche',
     'Le modèle de Spalding (validé par études ScienceDirect 2023) décrit mathématiquement la combustion :\n\n' +
     'B = (Chaleur libérée par combustion) / (Chaleur nécessaire pour vaporiser le fuel)\n\n' +
     'Le "transfer number B" prédit le taux de combustion d\'une bougie.\n' +
     'L\'étude récente a ajouté un facteur "EFFICACITÉ DE MÈCHE" au modèle original :\n' +
     '- Le taux de combustion dépend à la fois de la cire ET de la mèche\n' +
     '- Le choix de mèche a un impact FORT sur le taux de combustion\n' +
     '- La mèche n\'a PAS d\'impact significatif sur la hauteur/largeur de flamme (seulement indirect via le débit)\n\n' +
     'DONNÉES EXPÉRIMENTALES (piliers, paraffine/cire d\'abeille/soja) :\n' +
     '- 8 types de mèches testées (Ø 1.4–3.2mm, longueur 1–19.5mm)\n' +
     '- Précision du modèle taux combustion : ±1.7 g/h\n' +
     '- Précision prédiction diamètre pool de fusion : modèle numérique validé\n' +
     '- Après ≈ 15 min de warm-up, le taux de combustion reste CONSTANT pendant >100 min',
     'ScienceDirect — Impact of candle wicks and fuels (2023)', 2,
     'spalding,b-number,mèche,taux combustion,pool,efficacité,modèle'],

    // ════════════════════════════════════════════════
    // 2. SCIENCE DES CIRES — PARAFFINE
    // ════════════════════════════════════════════════

    ['Science — Cires', 'Paraffine', '⚗️ Composition chimique de la paraffine',
     'La paraffine est un mélange d\'alcanes saturés à chaîne droite :\n\n' +
     'Formule générale : CₙH₂ₙ₊₂ (où n = 20 à 40 typiquement)\n\n' +
     'Étymologie : du latin "parum affinis" = "peu d\'affinité" → très peu réactif chimiquement.\n' +
     'La paraffine est INSOLUBLE dans l\'eau, soluble dans l\'éther, le benzène et certains esters.\n' +
     'Non affectée par la plupart des réactifs chimiques courants.\n\n' +
     'PROPRIÉTÉS PHYSIQUES CLÉS :\n' +
     '- Point de fusion : 46–68°C selon le grade\n' +
     '- Densité : ≈ 900 kg/m³\n' +
     '- Structure cristalline : grands cristaux bien définis (vs micro = petits cristaux)\n' +
     '- La longueur des chaînes carbonées détermine le point de fusion\n' +
     '- Plus les chaînes sont longues → plus le point de fusion est élevé\n\n' +
     'PRODUCTION :\n' +
     'Extraite du slack wax (sous-produit du raffinage des huiles lubrifiantes).\n' +
     'Processus : chauffage + solvant (cétone) → refroidissement → cristallisation → filtration → affinage.\n' +
     'Less d\'huile résiduelle = plus raffinée (semi-raffinée vs raffinée).',
     'Wikipedia Paraffin Wax + EBSCO Research', 1,
     'paraffine,chimie,alcane,CnH2n+2,cristal,structure,raffinage'],

    ['Science — Cires', 'Paraffine', '📊 Les 6 paramètres ASTM de qualité d\'une paraffine',
     'Les paraffines sont caractérisées par 6 paramètres normés ASTM :\n\n' +
     '1. POINT DE FUSION (ASTM D87) — T° où la cire passe de solide à liquide\n' +
     '   Impact : dureté, temps de combustion, stabilité thermique\n\n' +
     '2. POINT DE CONGÉLATION (ASTM D938) — T° où la cire cesse de couler\n' +
     '   Impact : temps de prise, vitesse de refroidissement, répétabilité process\n\n' +
     '3. PÉNÉTRATION À L\'AIGUILLE (ASTM D1321) — Dureté mesurée en 1/10mm\n' +
     '   Impact : fermeté, stabilité dimensionnelle, adhérence verre\n\n' +
     '4. TENEUR EN HUILE (ASTM D721) — % d\'huile résiduelle\n' +
     '   Impact : risque de migration, odeur, toucher, rétention parfum\n' +
     '   < 0.5% = raffinée | 0.5-1.5% = semi-raffinée\n\n' +
     '5. VISCOSITÉ CINÉMATIQUE (ASTM D445) — Résistance à l\'écoulement fondu\n' +
     '   Impact : contrôle poids couche, écoulement, imprégnation\n\n' +
     '6. COULEUR SAYBOLT (ASTM D6045) — Comparaison visuelle cire fondue\n' +
     '   Échelle -30 à +30. Plus élevé = plus blanc = plus pur\n\n' +
     'CRITIQUE : Deux paraffines avec le MÊME point de fusion peuvent se comporter TRÈS différemment ! ' +
     'Il faut TOUJOURS évaluer l\'ensemble des propriétés, pas juste le point de fusion.',
     'ASTM Standards + IGI Wax + Hywax', 1,
     'ASTM,point fusion,congélation,pénétration,huile,viscosité,saybolt,qualité'],

    ['Science — Cires', 'Paraffine', '🔬 Teneur en huile — Impact scientifique sur la bougie',
     'La teneur en huile est LE paramètre le plus sous-estimé en bougerie :\n\n' +
     'EFFETS DE LA TENEUR EN HUILE :\n' +
     '- Haute teneur → cire plus souple, texture grasse, combustion plus fumeuse\n' +
     '- Haute teneur → risque de "migration" (suintement huile sur surface)\n' +
     '- Basse teneur → résistance au suintement, surface propre et sèche\n' +
     '- Basse teneur → meilleure stabilité long terme\n\n' +
     'POUR LES BOUGIES PARFUMÉES (études techniques Hywax/IGI) :\n' +
     '- L\'huile résiduelle interagit avec les huiles de parfum\n' +
     '- Trop d\'huile = le parfum ne se lie pas bien à la matrice de cire\n' +
     '- La paraffine raffinée (< 0.5% huile) a un pouvoir de rétention de parfum SUPÉRIEUR\n' +
     '  car les molécules de parfum prennent la place des molécules d\'huile\n' +
     '- Capacité de charge parfum : paraffine peut absorber 10-12% en poids avant dégradation\n\n' +
     'LIEN AVEC LA PÉNÉTRATION :\n' +
     '- Plus d\'huile = pénétration plus élevée (cire plus souple)\n' +
     '- Paraffine dure (pénétration basse) + faible huile = idéale pour piliers\n' +
     '- Paraffine souple (pénétration haute) + huile modérée = idéale pour containers',
     'IGI Wax Technical + Hywax Blog + Petronaft', 1,
     'huile,teneur,migration,rétention,parfum,pénétration,raffinée'],

    // ════════════════════════════════════════════════
    // 3. SCIENCE DE LA CIRE MICROCRISTALLINE
    // ════════════════════════════════════════════════

    ['Science — Cires', 'Microcristalline', '🔬 Paraffine vs Microcristalline — Différences moléculaires',
     'PARAFFINE = chaînes DROITES d\'alcanes (C20-C40)\n' +
     '→ Grands cristaux bien définis → rigide, cassante, translucide\n' +
     '→ Point de fusion : 46–68°C\n' +
     '→ Structure : plaques cristallines larges\n\n' +
     'MICROCRISTALLINE = chaînes RAMIFIÉES + isoparaffines + naphténiques\n' +
     '→ Cristaux très fins et irréguliers → flexible, élastique, opaque\n' +
     '→ Point de fusion : 60–90°C (plus élevé)\n' +
     '→ Structure : microcristaux finement imbriqués\n\n' +
     'CONSÉQUENCES POUR LA BOUGERIE :\n' +
     '- La microcristalline PIÈGE mieux l\'huile grâce à ses microcristaux\n' +
     '- Elle ADHÈRE mieux au verre (moins de décollement)\n' +
     '- Elle RÉSISTE mieux aux fissures (flexibilité)\n' +
     '- MAIS elle brûle MOINS bien seule (point de fusion trop haut)\n' +
     '- C\'est pourquoi MFC l\'utilise en COMPLÉMENT (5-10%) de la paraffine base\n\n' +
     'APPLICATION MFC :\n' +
     'Cire 6213 (paraffine dure) + Micro 2528 (5%) = la micro améliore l\'adhérence au verre ' +
     'et lisse la surface sans compromettre la combustion assurée par la 5203.',
     'Blended Waxes + Wikipedia Microcrystalline + Hywax', 1,
     'microcristalline,paraffine,cristal,structure,ramifié,flexible,2528,6213'],

    // ════════════════════════════════════════════════
    // 4. SCIENCE DU PARFUM DANS LA CIRE
    // ════════════════════════════════════════════════

    ['Science — Parfum', 'Solubilité', '🧪 Polarité et solubilité parfum/cire — "Like dissolves like"',
     'La règle fondamentale de la chimie : "le semblable dissout le semblable"\n\n' +
     'La CIRE (paraffine) = molécule NON-POLAIRE (chaînes C-H)\n' +
     'Le PARFUM = MÉLANGE de molécules polaires ET non-polaires\n\n' +
     'Les composants NON-POLAIRES du parfum (pinène, limonène) → se dissolvent BIEN dans la cire\n' +
     'Les composants POLAIRES du parfum (vanilline, phényléthyl alcool) → se dissolvent MAL\n\n' +
     'C\'EST POURQUOI :\n' +
     '- Certains parfums se mélangent parfaitement, d\'autres "saignent" (leaking/bleeding)\n' +
     '- Le DPG (dipropylène glycol) = solvant POLAIRE → BON pour shampoings, MAUVAIS pour bougies\n' +
     '- Le benzyl benzoate = solvant NON-POLAIRE → adapté aux bougies\n' +
     '- Un parfum trouble dans la cire = composants polaires incompatibles\n\n' +
     'RÔLE DES ALCOOLS GRAS (DUB, Nafol, CETO) :\n' +
     'Molécule AMPHIPATHIQUE = une partie polaire (OH) + une partie non-polaire (chaîne C16-C22)\n' +
     '→ Fait le PONT entre le parfum (souvent polaire) et la cire (non-polaire)\n' +
     '→ Plus le parfum contient de composants insolubles → plus il faut d\'alcool gras (5-10%)\n' +
     'C\'est la validation scientifique exacte du savoir-faire MFC.',
     'Cosmetics & Toiletries + Eco Candle Project + Brevet CA2655367A1', 1,
     'polarité,solubilité,parfum,non-polaire,polaire,DPG,alcool gras,amphipathique,bleeding'],

    ['Science — Parfum', 'Diffusion', '🌡️ Diffusion à chaud vs Diffusion à froid — Mécanisme scientifique',
     'HOT THROW = diffusion du parfum pendant la combustion\n' +
     'COLD THROW = diffusion du parfum à température ambiante (bougie éteinte)\n\n' +
     'MÉCANISME DU HOT THROW :\n' +
     '1. La flamme crée un pool de cire fondue\n' +
     '2. Dans le pool, le parfum dissout dans la cire liquide s\'évapore\n' +
     '3. Les courants de convection (air chaud monte) transportent les molécules de parfum\n' +
     '4. Les notes de tête (molécules légères, volatiles) partent en premier\n' +
     '5. Les notes de fond (molécules lourdes) persistent le plus longtemps\n\n' +
     'PARAFFINE vs SOJA — diffusion parfum :\n' +
     '- Paraffine : structure moléculaire simple → libère le parfum RAPIDEMENT\n' +
     '  Peak de diffusion : 15-30 min après allumage\n' +
     '- Soja : structure moléculaire plus dense → libère le parfum PROGRESSIVEMENT\n' +
     '  Peak de diffusion : 45-60 min après allumage\n' +
     '- Paraffine peut absorber 10-12% de parfum vs 6-10% pour le soja\n\n' +
     'FAIT : Le soja nécessite 1-2 semaines de "cure" (maturation) pour une diffusion optimale.',
     'Elchemy + CandleScience + Supra Candle Supplies', 2,
     'diffusion à chaud,diffusion à froid,diffusion,parfum,paraffine,soja,volatilité,convection'],

    ['Science — Parfum', 'Mélange', '⚙️ Température de mélange parfum/cire — Science',
     'La température d\'ajout du parfum est CRITIQUE pour la qualité finale :\n\n' +
     'TROP CHAUD (>95°C) :\n' +
     '- Les composants les plus volatils du parfum S\'ÉVAPORENT → perte de notes de tête\n' +
     '- Risque si on dépasse le point d\'éclair (flash point) du parfum\n\n' +
     'TROP FROID (<70°C) :\n' +
     '- La cire commence à cristalliser → le parfum ne peut PAS se mélanger aux zones solides\n' +
     '- Distribution inégale → diffusion à chaud irrégulier\n\n' +
     'TEMPÉRATURE OPTIMALE : 75-85°C (la cire est homogène et liquide, pas trop chaude)\n\n' +
     'POURQUOI :\n' +
     '- Le parfum liquide a sa propre viscosité. Plus chaud = viscosité plus basse des DEUX\n' +
     '- Mélanger à plus basse température est possible SI on mélange PLUS LONGTEMPS\n' +
     '- Minimum 2 minutes de mélange doux (pas de bulles d\'air)\n' +
     '- Tiédir le flacon de parfum avant = réduit les risques de séparation\n\n' +
     'SCIENCE : Le parfum NE SE LIE PAS chimiquement à la cire.\n' +
     'C\'est un MÉLANGE HOMOGÈNE (solution) : les molécules de parfum sont dispersées uniformément ' +
     'dans la matrice de cire, piégées lors de la cristallisation.',
     'Eco Candle Project + Supra Candle Supplies', 2,
     'température,mélange,parfum,flash point,viscosité,cristallisation,homogène'],

    // ════════════════════════════════════════════════
    // 5. SCIENCE DES ALCOOLS GRAS (ÉMOLLIENTS)
    // ════════════════════════════════════════════════

    ['Science — Alcools gras', 'Mécanisme', '🧬 Les 5 fonctions scientifiques des alcools gras dans la bougie',
     'Les alcools gras (cétylique C16, stéarylique C18, Nafol C18-22) ont 5 fonctions prouvées par brevet :\n\n' +
     '1. COMPATIBILISANT AMPHIPATHIQUE\n' +
     'Partie polaire (OH) + chaîne non-polaire (C16-C22) → fait le pont entre parfum et cire.\n' +
     'Sans alcool gras : le parfum "saigne" de la cire. Avec : il reste piégé.\n\n' +
     '2. AIDE À LA COMBUSTION\n' +
     'Abaisse la viscosité de la cire fondue → meilleur approvisionnement en fuel vers la mèche\n' +
     '→ combustion plus propre, moins de suie. Permet des mèches plus petites.\n\n' +
     '3. RÉGULATION THERMIQUE\n' +
     'Points d\'ébullition : cétylique 180°C, stéarylique 210°C.\n' +
     'Quand la flamme surchauffe, l\'alcool gras s\'évapore et ABSORBE la chaleur (effet endothermique).\n' +
     '→ Maintient la température à 180-210°C au pied de la flamme.\n' +
     '→ EMPÊCHE le jaunissement de la cire après plusieurs cycles.\n\n' +
     '4. ANTI-CRISTALLISATION (POLYMORPHISME)\n' +
     'Inhibe la cristallisation nette des triglycérides → moins de fissures, moins de frosting.\n' +
     'Processus de fabrication plus rapide, moins de rebuts.\n\n' +
     '5. RÉDUCTION DES BULLES\n' +
     'Brevet : 20-30% alcool gras élimine les bulles pendant la combustion\n' +
     'et permet de RÉDUIRE significativement la taille de mèche (CDN20-22 → CDN8-10).',
     'Brevet CA2655367A1 + Brevet US20100212214A1', 1,
     'alcool gras,cétylique,stéarylique,nafol,DUB,amphipathique,combustion,polymorphisme,bulles'],

    ['Science — Alcools gras', 'Chimie', '🔬 Alcool cétylique — Fiche scientifique',
     'NOM : 1-Hexadécanol (alcool cétylique, cetyl alcohol)\n' +
     'FORMULE : CH₃(CH₂)₁₅OH — chaîne de 16 carbones + groupe hydroxyle\n' +
     'CAS : 36653-82-4\n' +
     'MASSE MOLAIRE : 242.44 g/mol\n' +
     'POINT DE FUSION : 49.3°C\n' +
     'POINT D\'ÉBULLITION : 180°C (clé pour la régulation thermique dans la bougie)\n\n' +
     'DÉCOUVERTE : Michel Chevreul en 1817 (à partir du spermaceti de cachalot)\n' +
     'PRODUCTION MODERNE : réduction de l\'ester éthylique de l\'acide palmitique\n\n' +
     'PROPRIÉTÉS EN BOUGERIE :\n' +
     '- Insoluble dans l\'eau, soluble dans les alcools et huiles\n' +
     '- Nature AMPHIPATHIQUE : tête OH polaire + queue C16 non-polaire\n' +
     '- Fonction de SOLUBILISANT : aide les molécules polaires du parfum à se disperser dans la cire non-polaire\n' +
     '- Poudre/flocons blancs à température ambiante → fond facilement dans le blend\n\n' +
     'MFC utilise : DUB AL 1618 (mélange C16+C18 de Stéarinerie Dubois)\n' +
     'Le "1618" = alcool C16 (cétylique) + C18 (stéarylique) en mélange.',
     'DrugBank + Britannica + Chevreul 1817', 2,
     'cétylique,hexadécanol,CH3,C16,amphipathique,chevreul,DUB,palmitique'],

    ['Science — Alcools gras', 'Chimie', '🔬 Nafol 1822 — Fiche scientifique',
     'NOM : Nafol 1822 (mélange d\'alcools gras C18 + C22)\n' +
     'COMPOSITION : Stéaryl alcohol (C18H38O) + Béhényl alcohol (C22H46O)\n' +
     '"1822" = longueurs de chaîne carbone : C18 et C22\n\n' +
     'ALCOOL STÉARYLIQUE (C18) :\n' +
     '- 1-Octadécanol\n' +
     '- Point de fusion : 59.4°C\n' +
     '- Point d\'ébullition : 210°C → rôle de régulation thermique dans la flamme\n\n' +
     'ALCOOL BÉHÉNYLIQUE (C22) :\n' +
     '- 1-Docosanol\n' +
     '- Point de fusion : 71°C\n' +
     '- Chaîne plus longue → encore plus efficace comme compatibilisant\n\n' +
     'POURQUOI NAFOL 1822 vs DUB 1618 :\n' +
     '- Nafol a des chaînes PLUS LONGUES (C18-22 vs C16-18)\n' +
     '- Plus efficace pour les parfums à forte teneur en insolubles\n' +
     '- Point de fusion plus élevé → mieux pour les formulations végétales\n' +
     '- MFC utilise Nafol principalement dans les blends végétaux (Soja/Nafol/CETO)',
     'Fournisseur Sasol + MFC Expertise', 2,
     'nafol,1822,stéarylique,béhénylique,C18,C22,octadécanol,docosanol'],

    // ════════════════════════════════════════════════
    // 6. SCIENCE DU VYBAR (POLYMÈRE HYPER-RAMIFIÉ)
    // ════════════════════════════════════════════════

    ['Science — Additifs', 'Vybar', '🧪 Vybar 260 — Polymère hyper-ramifié, mécanisme d\'action',
     'NATURE : Polyoléfine hyper-ramifiée (hyperbranched polyolefin)\n' +
     'FABRICANT : Baker Hughes (breveté)\n' +
     'USAGE : 0.5-2% en poids dans la cire fondue\n\n' +
     'MÉCANISME D\'ACTION (4 effets) :\n\n' +
     '1. RÉTENTION DE PARFUM (effet principal)\n' +
     'Les branches du polymère créent des "poches" qui piègent les molécules de parfum.\n' +
     'Permet de charger 2x à 3x plus de parfum (6% → 12-15%)\n' +
     'MAIS ATTENTION : trop de Vybar (>3%) = parfum EMPRISONNÉ → diffusion à chaud RÉDUIT !\n\n' +
     '2. ANTI-MOTTLING (anti-marbrure)\n' +
     'Empêche la migration des huiles de parfum vers la surface.\n' +
     'La surface reste lisse et uniforme au lieu de créer des cristaux visibles.\n\n' +
     '3. OPACITÉ ET COULEUR\n' +
     'Augmente l\'opacité de la cire → couleurs plus vives et plus uniformes.\n\n' +
     '4. DURETÉ ET ANTI-FISSURE\n' +
     'Renforce la structure cristalline → moins de déformations pendant fabrication et usage.\n\n' +
     'VYBAR 260 = pour paraffines à point de fusion < 58°C (containers)\n' +
     'VYBAR 103 = pour paraffines à point de fusion > 58°C (piliers)\n' +
     'VYBAR 343 = compatible avec l\'effet mottling (design voulu)\n\n' +
     'MFC utilise le Vybar 260 principalement dans la formule "Verre en Cire" ' +
     '(la coque dure qui sert de contenant à la bougie).',
     'Baker Hughes + CerasMartí + How To Make Candles + The Wax Chandler', 2,
     'vybar,260,103,polymère,ramifié,rétention,mottling,opacité,baker hughes'],

    // ════════════════════════════════════════════════
    // 7. SCIENCE DES CIRES VÉGÉTALES
    // ════════════════════════════════════════════════

    ['Science — Cires', 'Végétale', '🌱 Cire de soja — Propriétés scientifiques',
     'NOM CHIMIQUE : Huile de soja hydrogénée (Hydrogenated Soybean Oil)\n' +
     'CAS : 8016-70-4\n' +
     'COMPOSITION : Triglycérides d\'acides gras saturés (après hydrogénation)\n\n' +
     'L\'HYDROGÉNATION transforme les doubles liaisons C=C en liaisons simples C-C :\n' +
     '- Huile de soja liquide → cire de soja solide\n' +
     '- Plus d\'hydrogénation → point de fusion plus élevé → cire plus dure\n\n' +
     'PROPRIÉTÉS vs PARAFFINE :\n' +
     '- Point de fusion : 49-54°C (plus bas que la plupart des paraffines)\n' +
     '- Structure moléculaire : plus COMPLEXE (triglycérides vs alcanes simples)\n' +
     '- Rétention parfum : 6-10% (vs 10-12% paraffine)\n' +
     '- Diffusion à chaud : pic à 45-60 min (vs 15-30 min paraffine) → plus progressif\n' +
     '- Cure time : 1-2 SEMAINES nécessaires (vs quelques jours paraffine)\n' +
     '- Hygroscopique : absorbe l\'humidité → risque de frosting\n' +
     '- Combustion : plus propre selon perception (MAIS étude Ökometric = identique)\n\n' +
     'PROBLÈMES COURANTS :\n' +
     '- Frosting (cristallisation blanche en surface) = NORMAL pour le soja\n' +
     '- Wet spots (décollement du verre) = fréquent\n' +
     '- Nécessite des alcools gras pour stabiliser la cristallisation',
     'CandleScience + Supra Candle + Eco Candle Project', 2,
     'soja,végétale,hydrogénée,triglycéride,frosting,cure,diffusion à chaud'],

    // ════════════════════════════════════════════════
    // 8. SCIENCE DE LA MÈCHE — CAPILLARITÉ
    // ════════════════════════════════════════════════

    ['Science — Mèche', 'Capillarité', '💧 Action capillaire — Le moteur de la bougie',
     'La mèche = une pompe à cire liquide fonctionnant par CAPILLARITÉ.\n\n' +
     'PRINCIPE PHYSIQUE :\n' +
     'La cire liquide "aime" coller aux fibres de coton de la mèche (ADSORPTION).\n' +
     'Elle est aussi attirée par ses propres molécules voisines (COHÉSION).\n' +
     'Ces deux forces combinées font MONTER le liquide dans les fibres.\n\n' +
     'FACTEURS QUI INFLUENCENT LA CAPILLARITÉ :\n' +
     '- VISCOSITÉ de la cire fondue : plus fluide → capillarité plus rapide\n' +
     '  → C\'est pourquoi les alcools gras AMÉLIORENT la combustion (ils fluidifient)\n' +
     '- DIAMÈTRE de la mèche : plus large → plus de fuel transporté → flamme plus grande\n' +
     '- TRESSAGE de la mèche : plus serré → capillarité plus lente mais plus régulière\n' +
     '- TRAITEMENT de la mèche : zinc/papier/kraft → modifie la rigidité et le débit\n\n' +
     'ÉTUDE HYPERGRAVITÉ (centrifugeuse) :\n' +
     'Quand la gravité augmente (3-9g), la capillarité est SUPPRIMÉE.\n' +
     'Au-delà d\'un seuil critique (Gcr), la cire ne peut plus atteindre le sommet de la mèche.\n' +
     '→ Flamme réduite puis extinction.\n' +
     'Cela prouve que la capillarité est LE mécanisme fondamental de la bougie.\n\n' +
     'MÈCHES MFC :\n' +
     '- LX = coton tressé plat → capillarité standard, très polyvalent\n' +
     '- HST = coton haute absorption → pour parfums lourds qui "étouffent" la mèche\n' +
     '- P214 = armature papier kraft → rigidité + effet capillaire spécifique',
     'ScienceDirect 2023 + Wikipedia Candle + NASA microgravity', 1,
     'capillarité,mèche,viscosité,adsorption,cohésion,LX,HST,P214,tressage'],

    ['Science — Mèche', 'Matériaux', '📜 Mèches modernes — Matériaux et traitements',
     'Les mèches modernes sont en COTON TRESSÉ (pas torsadé) :\n\n' +
     'TRESSAGE vs TORSION :\n' +
     '- Tressé : la mèche se courbe en brûlant → l\'extrémité entre dans la zone la plus chaude\n' +
     '→ AUTO-ROGAGE : la mèche s\'auto-consume → pas besoin de la couper\n' +
     '- Torsadé (ancien) : brûle droit → accumulation de carbone → nécessite des mouchettes\n\n' +
     'TRAITEMENTS CHIMIQUES :\n' +
     '- Nitrate d\'ammonium : empêche la mèche de continuer à rougeoyer après extinction\n' +
     '- Sulfate d\'ammonium : même effet anti-braise\n' +
     '- IMPORTANT : les mèches à noyau PLOMB sont interdites depuis les années 1970\n' +
     '- Noyaux modernes : zinc ou alliage zinc (rigidité pour containers profonds)\n\n' +
     'DIMENSIONNEMENT CRITIQUE :\n' +
     '- Mèche trop grande → flamme trop haute → suie → champignonnage → risque sécurité\n' +
     '- Mèche trop petite → pool trop étroit → tunnel → extinction\n' +
     '- Le diamètre de la mèche détermine le DÉBIT de fuel (grammes/heure)\n' +
     '- L\'étude ScienceDirect confirme : la mèche a un impact FORT sur le taux de combustion ' +
     'mais PAS sur la forme de flamme (qui dépend de la thermodynamique)',
     'Wikipedia Candle + ScienceDirect 2023', 2,
     'mèche,coton,tressage,auto-rogage,zinc,plomb,dimensionnement,suie'],

    // ════════════════════════════════════════════════
    // 9. SCIENCE DES DÉFAUTS DE BOUGIE
    // ════════════════════════════════════════════════

    ['Science — Défauts', 'Troubleshooting', '🔍 Tunnel, champignonnage, suie — Explications scientifiques',
     'TUNNELING (tunnel de combustion)\n' +
     'Cause : la mèche ne génère pas assez de chaleur pour fondre la cire jusqu\'au bord.\n' +
     'Physique : le flux thermique radial est insuffisant pour le diamètre du container.\n' +
     'Solution : augmenter la taille de mèche OU réduire le diamètre OU augmenter le % paraffine 5203\n' +
     '(meilleure conductivité thermique que la cire 6213 seule)\n\n' +
     'CHAMPIGNONNAGE (mushrooming)\n' +
     'Cause : accumulation de CARBONE non brûlé au sommet de la mèche.\n' +
     'Physique : le débit de fuel dépasse la capacité de combustion complète.\n' +
     'La mèche transporte plus de cire que la flamme ne peut brûler → le carbone s\'accumule.\n' +
     'Solution : réduire la taille de mèche OU augmenter les alcools gras (facilitent la combustion)\n\n' +
     'SUIE EXCESSIVE\n' +
     'Cause : combustion INCOMPLÈTE. Les particules de carbone s\'échappent de la flamme.\n' +
     'Étude Ökometric : la suie ne dépend PAS du type de cire mais du DIMENSIONNEMENT de mèche.\n' +
     'Une mèche surdimensionnée pour N\'IMPORTE QUELLE cire produira de la suie.\n' +
     'Solution : réduire la mèche, trimmer à 5mm, éviter les courants d\'air.\n\n' +
     'FROSTING (cristallisation blanche)\n' +
     'Spécifique aux cires végétales (soja). Les triglycérides recristallisent en surface.\n' +
     'Solution : alcools gras (inhibent la cristallisation nette) + température de coulée contrôlée.',
     'CandleScience + Ökometric Study + MFC Expertise', 1,
     'tunnel,champignonnage,mushrooming,suie,soot,frosting,combustion,mèche,défaut']

    ];

    let count = 0;
    for (const [cat, sub, title, content, source, priority, tags] of entries) {
        await db.run(
            'INSERT INTO knowledge_base (category, subcategory, title, content, source, priority, tags) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [cat, sub, title, content, source, priority, tags]
        );
        count++;
    }
    console.log(`  ✓ Science : ${count} fiches encyclopédiques chargées`);
}

module.exports = { seedScience };
