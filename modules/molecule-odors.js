/**
 * MFC Laboratoire — Descripteurs Olfactifs Moléculaires
 * Source : TGSC, Flavornet, FlavorDB2, Arctander, littérature parfumerie
 *
 * Chaque entrée CAS contient :
 *   odor       : descripteurs olfactifs principaux (à froid / ambiant)
 *   odor_hot   : comportement olfactif à chaud (melt pool ~55-65°C)
 *   threshold  : seuil de détection olfactif en ppm (quand disponible)
 *   odor_family: famille olfactive primaire
 *   odor_note  : position pyramide (tête / cœur / fond)
 *
 * Règle thermique : les molécules à pression vapeur élevée (volatilité haute)
 * sont amplifiées en melt pool. Les molécules lourdes restent discrètes à froid
 * mais peuvent ressortir à chaud si leur % est élevé.
 */

const ODOR_DB = {
    // ══════════ TERPÈNES & DÉRIVÉS ══════════
    '78-70-6':    { odor: 'floral, lavande, boisé, citronné', odor_hot: 'floral intense, lavande prononcée', threshold: 0.006, odor_family: 'floral', odor_note: 'tête/cœur' },
    '5989-27-5':  { odor: 'citron, orange, frais, agrume', odor_hot: 'agrume très intense, zeste', threshold: 0.01, odor_family: 'agrume', odor_note: 'tête' },
    '127-91-3':   { odor: 'boisé, pin, résine, sec', odor_hot: 'pin fort, térébenthine', threshold: 0.14, odor_family: 'boisé', odor_note: 'tête' },
    '80-56-8':    { odor: 'pin, résine, frais, camphré', odor_hot: 'pin très fort, térébenthine agressive', threshold: 0.006, odor_family: 'boisé', odor_note: 'tête' },
    '87-44-5':    { odor: 'boisé, épicé, poivré, sec', odor_hot: 'épicé chaud, poivré doux', threshold: 0.064, odor_family: 'épicé', odor_note: 'cœur/fond' },
    '469-61-4':   { odor: 'boisé, cèdre, sec', odor_hot: 'cèdre doux, boisé chaud', threshold: null, odor_family: 'boisé', odor_note: 'fond' },
    '546-28-1':   { odor: 'boisé, cèdre, doux', odor_hot: 'cèdre rond, boisé', threshold: null, odor_family: 'boisé', odor_note: 'fond' },
    '77-53-2':    { odor: 'boisé, cèdre, doux, légèrement camphoré', odor_hot: 'boisé chaud, cèdre crémeux', threshold: null, odor_family: 'boisé', odor_note: 'fond' },
    '3338-55-4':  { odor: 'vert, herbe, basilic, frais', odor_hot: 'herbacé intense, vert fort', threshold: 0.034, odor_family: 'vert', odor_note: 'tête' },
    '98-55-5':    { odor: 'floral, lilas, pin, frais', odor_hot: 'lilas épanoui, floral doux', threshold: 0.33, odor_family: 'floral', odor_note: 'cœur' },
    '123-35-3':   { odor: 'balsamique, fruité, boisé, terreux', odor_hot: 'herbacé balsamique intense', threshold: 0.013, odor_family: 'herbacé', odor_note: 'tête' },
    '13466-78-9': { odor: 'doux, citronné, résine', odor_hot: 'résine douce, citronné chaud', threshold: null, odor_family: 'boisé', odor_note: 'tête' },
    '13877-91-3': { odor: 'vert, herbe, floral', odor_hot: 'vert herbacé, floral chaud', threshold: 0.034, odor_family: 'vert', odor_note: 'tête' },
    '18172-67-3': { odor: 'boisé, pin, frais', odor_hot: 'pin prononcé', threshold: 0.14, odor_family: 'boisé', odor_note: 'tête' },
    '79-92-5':    { odor: 'camphoré, boisé, terreux', odor_hot: 'camphre fort, boisé brut', threshold: null, odor_family: 'boisé', odor_note: 'tête' },
    '99-87-6':    { odor: 'agrume, cumin, frais, terreux', odor_hot: 'cumin chaud, agrume', threshold: null, odor_family: 'agrume', odor_note: 'tête/cœur' },
    '99-85-4':    { odor: 'herbacé, citronné, pétrole doux', odor_hot: 'herbacé chaud, terpénique', threshold: null, odor_family: 'herbacé', odor_note: 'tête' },
    '99-86-5':    { odor: 'citronné, herbacé, terreux', odor_hot: 'herbacé fort, citron', threshold: null, odor_family: 'herbacé', odor_note: 'tête' },
    '586-62-9':   { odor: 'boisé, doux, pin, citronné', odor_hot: 'boisé citronné, pin doux', threshold: null, odor_family: 'boisé', odor_note: 'tête' },
    '470-82-6':   { odor: 'eucalyptus, frais, camphoré, menthol', odor_hot: 'eucalyptus très fort, mentholé', threshold: 0.012, odor_family: 'frais', odor_note: 'tête' },
    '5989-54-8':  { odor: 'citron, pin, menthol léger', odor_hot: 'agrume mentholé intense', threshold: 0.01, odor_family: 'agrume', odor_note: 'tête' },
    '10408-16-9': { odor: 'boisé, doux, floral léger', odor_hot: 'boisé subtil', threshold: null, odor_family: 'boisé', odor_note: 'fond' },
    '77-54-3':    { odor: 'boisé, cèdre, doux, ambré', odor_hot: 'cèdre ambré chaud', threshold: null, odor_family: 'boisé', odor_note: 'fond' },
    '7212-44-4':  { odor: 'boisé, floral, fruité, vert', odor_hot: 'floral boisé, rose chaude', threshold: null, odor_family: 'floral', odor_note: 'cœur/fond' },

    // ══════════ ALDÉHYDES & CÉTONES ══════════
    '5392-40-5':  { odor: 'citron, frais, vert, pétillant', odor_hot: 'citron intense, zeste frais', threshold: 0.003, odor_family: 'agrume', odor_note: 'tête' },
    '104-55-2':   { odor: 'cannelle, épicé, chaud, doux', odor_hot: 'cannelle brûlante, épicé fort', threshold: 0.003, odor_family: 'épicé', odor_note: 'cœur' },
    '121-33-5':   { odor: 'vanille, sucré, crémeux, baumier', odor_hot: 'vanille chaude, sucré prononcé, caramel', threshold: 0.029, odor_family: 'gourmand', odor_note: 'fond' },
    '23696-85-7': { odor: 'rose, fruité, prune, confiture', odor_hot: 'fruité intense, rose confite', threshold: 0.000002, odor_family: 'fruité', odor_note: 'cœur' },
    '112-31-2':   { odor: 'agrume, orange, peau, gras', odor_hot: 'orange cireuse, savonneuse', threshold: 0.001, odor_family: 'agrume', odor_note: 'tête' },
    '124-13-0':   { odor: 'agrume, gras, vert, orange', odor_hot: 'agrume gras intense', threshold: 0.0007, odor_family: 'agrume', odor_note: 'tête' },
    '111-71-7':   { odor: 'vert, gras, agrume, amande', odor_hot: 'gras vert prononcé, aldéhydé', threshold: 0.003, odor_family: 'vert', odor_note: 'tête' },
    '110-41-8':   { odor: 'agrume, gras, propre, savon', odor_hot: 'savonneux chaud, agrume gras', threshold: null, odor_family: 'agrume', odor_note: 'tête/cœur' },
    '112-54-9':   { odor: 'agrume, gras, propre, citron', odor_hot: 'gras citronné, savonneux', threshold: 0.002, odor_family: 'agrume', odor_note: 'tête' },
    '112-44-7':   { odor: 'agrume, gras, rose, frais', odor_hot: 'gras rosé, savon chaud', threshold: null, odor_family: 'agrume', odor_note: 'tête' },
    '122-78-1':   { odor: 'miel, floral, vert, jacinthe', odor_hot: 'miel intense, floral fort, entêtant', threshold: 0.004, odor_family: 'floral', odor_note: 'tête/cœur' },
    '107-75-5':   { odor: 'muguet, frais, floral, propre', odor_hot: 'muguet doux, floral léger', threshold: null, odor_family: 'floral', odor_note: 'cœur' },

    // ══════════ MUSCS SYNTHÉTIQUES ══════════
    '1222-05-5':  { odor: 'musc, propre, sucré, poudré', odor_hot: 'musc chaud, poudré, linge propre', threshold: null, odor_family: 'musc', odor_note: 'fond' },
    '54464-57-2': { odor: 'boisé, ambré, velours, cèdre doux', odor_hot: 'ambré boisé chaud, velouté', threshold: null, odor_family: 'boisé', odor_note: 'fond' },
    '33704-61-9': { odor: 'musc, boisé, épicé, noix de coco', odor_hot: 'musc boisé chaud, épicé doux', threshold: null, odor_family: 'musc', odor_note: 'fond' },
    '21145-77-7': { odor: 'musc, poudré, sucré, ambré', odor_hot: 'musc poudré chaud', threshold: null, odor_family: 'musc', odor_note: 'fond' },
    '81-14-1':    { odor: 'musc, sucré, poudré, animal doux', odor_hot: 'musc animal chaud', threshold: null, odor_family: 'musc', odor_note: 'fond' },

    // ══════════ ESTERS ══════════
    '102-20-5':   { odor: 'rose, miel, fruité, baumier', odor_hot: 'miel rosé chaud', threshold: null, odor_family: 'floral', odor_note: 'cœur/fond' },
    '104-67-6':   { odor: 'pêche, fruité, crémeux, noix de coco', odor_hot: 'pêche chaude, lactone crémeuse', threshold: 0.06, odor_family: 'fruité', odor_note: 'cœur' },
    '105-54-4':   { odor: 'fruité, ananas, fraise, sucré', odor_hot: 'fruité sucré intense', threshold: 0.001, odor_family: 'fruité', odor_note: 'tête' },
    '141-78-6':   { odor: 'éthéré, fruité, bonbon, sucré', odor_hot: 'sucré éthéré fort', threshold: 0.005, odor_family: 'fruité', odor_note: 'tête' },
    '103-45-7':   { odor: 'rose, miel, fruité, floral', odor_hot: 'rose miellée chaude', threshold: null, odor_family: 'floral', odor_note: 'cœur' },
    '103-54-8':   { odor: 'floral, baumier, épicé doux', odor_hot: 'baumier chaud, cannelle douce', threshold: null, odor_family: 'floral', odor_note: 'cœur' },
    '103-41-3':   { odor: 'baumier, doux, chocolat, ambre', odor_hot: 'baumier ambré chaud', threshold: null, odor_family: 'baumier', odor_note: 'fond' },

    // ══════════ PHÉNOLS ══════════
    '97-53-0':    { odor: 'girofle, épicé, chaud, boisé', odor_hot: 'girofle fort, épicé brûlant', threshold: 0.006, odor_family: 'épicé', odor_note: 'cœur' },
    '127-51-5':   { odor: 'violet, iris, poudré, boisé', odor_hot: 'iris poudré chaud, floral doux', threshold: 0.012, odor_family: 'floral', odor_note: 'cœur' },
    '93-51-6':    { odor: 'vanille, fumé, épicé, créosol', odor_hot: 'vanille fumée intense, feu de bois', threshold: null, odor_family: 'fumé', odor_note: 'cœur/fond' },

    // ══════════ ALCOOLS ══════════
    '60-12-8':    { odor: 'rose, floral, miel, légèrement épicé', odor_hot: 'rose intense, miellé chaud', threshold: 0.75, odor_family: 'floral', odor_note: 'cœur' },
    '106-22-9':   { odor: 'rose, géranium, citronné, frais', odor_hot: 'rose chaude, géranium', threshold: 0.04, odor_family: 'floral', odor_note: 'cœur' },
    '7540-51-4':  { odor: 'rose, géranium, citronné', odor_hot: 'rose chaude citronnée', threshold: 0.04, odor_family: 'floral', odor_note: 'cœur' },
    '106-24-1':   { odor: 'rose, géranium, doux, floral', odor_hot: 'rose intense, géranium chaud', threshold: 0.04, odor_family: 'floral', odor_note: 'cœur' },
    '106-25-2':   { odor: 'rose, frais, vert, citronné', odor_hot: 'rose fraîche, citronnée', threshold: 0.3, odor_family: 'floral', odor_note: 'tête/cœur' },
    '126-91-0':   { odor: 'boisé, floral, lavande', odor_hot: 'lavande boisée chaude', threshold: 0.006, odor_family: 'floral', odor_note: 'tête/cœur' },
    '18479-58-8': { odor: 'frais, citronné, métallique, propre', odor_hot: 'frais métallique, citron vert', threshold: 0.004, odor_family: 'frais', odor_note: 'tête' },
    '3391-86-4':  { odor: 'champignon, terreux, humide', odor_hot: 'champignon intense, sous-bois', threshold: 0.001, odor_family: 'terreux', odor_note: 'tête/cœur' },
    '78-69-3':    { odor: 'muguet, floral, frais, boisé', odor_hot: 'muguet doux, floral propre', threshold: null, odor_family: 'floral', odor_note: 'cœur' },
    '928-96-1':   { odor: 'vert, herbe coupée, feuille', odor_hot: 'herbe coupée intense, vert vif', threshold: 0.07, odor_family: 'vert', odor_note: 'tête' },
    '3681-71-8':  { odor: 'vert, banane, fruité, herbe', odor_hot: 'vert fruité intense, banane verte', threshold: null, odor_family: 'vert', odor_note: 'tête' },

    // ══════════ SOLVANTS / CARRIERS ══════════
    '34590-94-8': { odor: 'quasi inodore, léger solvant', odor_hot: 'solvant léger, étouffe diffusion', threshold: null, odor_family: 'solvant', odor_note: 'n/a' },
    '142-82-5':   { odor: 'essence, pétrole', odor_hot: 'essence forte, inflammable', threshold: null, odor_family: 'solvant', odor_note: 'n/a' },

    // ══════════ EXTRAITS NATURELS ══════════
    '94333-88-7': { odor: 'boisé, fumé, cuir, résine', odor_hot: 'fumé boisé, feu de camp', threshold: null, odor_family: 'boisé', odor_note: 'fond' },
    '11028-42-5': { odor: 'boisé, cèdre, sec', odor_hot: 'cèdre chaud, boisé sec', threshold: null, odor_family: 'boisé', odor_note: 'fond' },

    // ══════════ COUMARINES & LACTONES ══════════
    '91-64-5':    { odor: 'foin coupé, vanille, amande, doux', odor_hot: 'foin sucré chaud, vanille tonka', threshold: null, odor_family: 'gourmand', odor_note: 'cœur/fond' },
    '706-14-9':   { odor: 'pêche, noix de coco, crémeux', odor_hot: 'pêche crémeuse chaude, lactone', threshold: 0.011, odor_family: 'fruité', odor_note: 'cœur' },
    '713-95-1':   { odor: 'noix de coco, crémeux, beurre, pêche', odor_hot: 'noix de coco chaude, crémeuse', threshold: null, odor_family: 'fruité', odor_note: 'cœur/fond' },

    // ══════════ AMBRÉS & BOISÉS SYNTHÉTIQUES ══════════
    '68039-49-6': { odor: 'ambre, boisé, cèdre, musc doux', odor_hot: 'ambre boisé chaud', threshold: null, odor_family: 'ambré', odor_note: 'fond' },
    '32388-55-9': { odor: 'ambre, animal, cuir, tabac', odor_hot: 'ambre fort, animal chaud', threshold: null, odor_family: 'ambré', odor_note: 'fond' },
    '70788-30-6': { odor: 'boisé, ambré, ambre gris', odor_hot: 'ambre gris chaud, marin boisé', threshold: null, odor_family: 'ambré', odor_note: 'fond' },

    // ══════════ MUSCS MACROCYCLIQUES ══════════
    '111879-80-2':{ odor: 'musc blanc, propre, peau, crémeux', odor_hot: 'musc chaud, peau propre', threshold: null, odor_family: 'musc', odor_note: 'fond' },
    '34902-57-3': { odor: 'musc, ambré, poudré, animal', odor_hot: 'musc animal chaud', threshold: null, odor_family: 'musc', odor_note: 'fond' },
    '63391-28-6': { odor: 'musc, poudré, nitro, doux', odor_hot: 'musc poudré doux', threshold: null, odor_family: 'musc', odor_note: 'fond' },

    // ══════════ SALICYLATES & BENZOATES ══════════
    '118-58-1':   { odor: 'baumier, doux, ambré, jasmin léger', odor_hot: 'baumier chaud, ambré doux', threshold: null, odor_family: 'baumier', odor_note: 'cœur/fond' },
    '87-20-7':    { odor: 'baumier, floral, fruité doux', odor_hot: 'baumier fruité chaud', threshold: null, odor_family: 'baumier', odor_note: 'cœur/fond' },
    '120-51-4':   { odor: 'baumier, doux, fruité léger, amande', odor_hot: 'baumier doux chaud', threshold: null, odor_family: 'baumier', odor_note: 'fond' },
    '119-36-8':   { odor: 'wintergreen, menthol, sucré', odor_hot: 'wintergreen fort, menthol sucré', threshold: 0.1, odor_family: 'frais', odor_note: 'tête/cœur' },
    '22451-48-5': { odor: 'baumier, doux, myrrhe, oriental', odor_hot: 'myrrhe chaude, oriental', threshold: null, odor_family: 'baumier', odor_note: 'fond' },

    // ══════════ ACÉTALS & ACÉTATES ══════════
    '101-48-4':   { odor: 'vert, jacinthe, terre, feuille', odor_hot: 'jacinthe verte intense', threshold: null, odor_family: 'vert', odor_note: 'tête' },
    '104-21-2':   { odor: 'floral, fruité, doux, aubépine', odor_hot: 'floral doux, aubépine', threshold: null, odor_family: 'floral', odor_note: 'cœur' },

    // ══════════ CINNAMATES & CINNAMIQUES ══════════
    '101-39-3':   { odor: 'cannelle, épicé, oriental', odor_hot: 'cannelle forte, épicé chaud', threshold: null, odor_family: 'épicé', odor_note: 'cœur' },
    '103-95-7':   { odor: 'muguet, floral, rose, cyclamen', odor_hot: 'floral cyclamen chaud, vert rose', threshold: null, odor_family: 'floral', odor_note: 'cœur' },

    // ══════════ IONONES & IRONES ══════════
    '14901-07-6': { odor: 'violet, iris, boisé, framboise', odor_hot: 'violet poudré, iris chaud', threshold: 0.007, odor_family: 'floral', odor_note: 'cœur' },
    '79-77-6':    { odor: 'violet, iris, boisé, poudré', odor_hot: 'iris boisé chaud', threshold: 0.007, odor_family: 'floral', odor_note: 'cœur' },

    // ══════════ HÉDIONE & JASMONATES ══════════
    '24851-98-7': { odor: 'jasmin, frais, transparent, aérien', odor_hot: 'jasmin aérien chaud, radiant', threshold: null, odor_family: 'floral', odor_note: 'cœur' },
    '122-70-3':   { odor: 'rose, vert, frais', odor_hot: 'rose verte chaude', threshold: null, odor_family: 'floral', odor_note: 'cœur' },
    '22457-23-4': { odor: 'floral, jasmin, muguet, frais', odor_hot: 'jasmin frais, vert floral', threshold: null, odor_family: 'floral', odor_note: 'cœur' },

    // ══════════ BOISÉS SYNTHÉTIQUES ══════════
    '1786-08-9':  { odor: 'santal, boisé, lacté, crémeux', odor_hot: 'santal crémeux chaud', threshold: null, odor_family: 'boisé', odor_note: 'fond' },
    '65113-99-7': { odor: 'santal, boisé, crémeux, rosé', odor_hot: 'santal crémeux chaud, rosé', threshold: null, odor_family: 'boisé', odor_note: 'fond' },
    '3407-42-9':  { odor: 'santal, lacté, boisé doux', odor_hot: 'santal lacté intense', threshold: null, odor_family: 'boisé', odor_note: 'fond' },
    '28219-61-6': { odor: 'boisé, mousse, terreux, humide', odor_hot: 'mousse humide, sous-bois chaud', threshold: null, odor_family: 'boisé', odor_note: 'fond' },
    '32210-23-4': { odor: 'boisé, santal, doux, crémeux', odor_hot: 'santal doux chaud', threshold: null, odor_family: 'boisé', odor_note: 'fond' },

    // ══════════ PHENYLPROPANOÏDES ══════════
    '93-53-8':    { odor: 'jacinthe, vert, floral, doux', odor_hot: 'jacinthe verte intense, floral fort', threshold: 0.004, odor_family: 'floral', odor_note: 'tête/cœur' },
    '104-09-6':   { odor: 'amande amère, cerise, doux', odor_hot: 'amande chaude, cerise douce', threshold: null, odor_family: 'gourmand', odor_note: 'tête' },
    '122-03-2':   { odor: 'cumin, épicé, herbal', odor_hot: 'cumin fort, épicé chaud', threshold: null, odor_family: 'épicé', odor_note: 'cœur' },
    '120-14-9':   { odor: 'vanille, crémeux, boisé, amande', odor_hot: 'vanille crémeuse chaude', threshold: null, odor_family: 'gourmand', odor_note: 'fond' },

    // ══════════ FRUITÉS SYNTHÉTIQUES ══════════
    '121-39-1':   { odor: 'rose, miel, fruité doux', odor_hot: 'rose miellée chaude', threshold: null, odor_family: 'floral', odor_note: 'cœur' },
    '19870-74-7': { odor: 'fruité, tropical, exotique, floral', odor_hot: 'fruité tropical chaud', threshold: null, odor_family: 'fruité', odor_note: 'cœur' },
    '123-11-5':   { odor: 'aubépine, doux, floral, amande', odor_hot: 'aubépine douce, amande chaude', threshold: null, odor_family: 'floral', odor_note: 'cœur' },

    // ══════════ COMPOSÉS SOUFRÉS / THIOLS (traces puissantes) ══════════
    '38462-22-5': { odor: 'pamplemousse, soufré, tropical, cassis', odor_hot: 'pamplemousse intense, tropical soufré', threshold: 0.00001, odor_family: 'agrume', odor_note: 'tête' },

    // ══════════ VANILLINES & GOURMANDS ══════════
    '121-32-4':   { odor: 'vanille, sucré, barbe à papa, caramel', odor_hot: 'vanille sucrée intense, caramel chaud', threshold: 0.05, odor_family: 'gourmand', odor_note: 'fond' },
    '4940-11-8':  { odor: 'barbe à papa, sucré, caramel, fruit cuit', odor_hot: 'SUCRÉ TRÈS INTENSE, caramel brûlé, confiserie', threshold: 0.001, odor_family: 'gourmand', odor_note: 'cœur/fond' },
    '81-25-4':    { odor: 'ambré, poudré, doux, tabac', odor_hot: 'ambré poudré, tabac chaud', threshold: null, odor_family: 'ambré', odor_note: 'fond' },

    // ══════════ BENZALDÉHYDES ══════════
    '100-52-7':   { odor: 'amande amère, cerise, marzipan', odor_hot: 'amande intense, cerise forte', threshold: 0.003, odor_family: 'gourmand', odor_note: 'tête' },
    '122-78-1bis':{ odor: 'miel, jacinthe, vert', odor_hot: 'miel intense', threshold: 0.004, odor_family: 'floral', odor_note: 'tête' },

    // ══════════ HUILES ESSENTIELLES ══════════
    '68917-10-2': { odor: 'mousse, terreux, boisé, vert', odor_hot: 'mousse terreuse intense', threshold: null, odor_family: 'boisé', odor_note: 'fond' },
    '9000-72-0':  { odor: 'baumier, vanille, résine, doux', odor_hot: 'résine vanillée chaude', threshold: null, odor_family: 'baumier', odor_note: 'fond' },
    '8014-09-3':  { odor: 'rose, géranium, citronnelle', odor_hot: 'rose géranium chaude', threshold: null, odor_family: 'floral', odor_note: 'cœur' },
    '84775-71-3': { odor: 'agrume, mandarine, zeste, frais', odor_hot: 'mandarine intense, zeste chaud', threshold: null, odor_family: 'agrume', odor_note: 'tête' },
    '90028-67-4': { odor: 'fumé, boisé, cuir, goudron', odor_hot: 'fumé cuir intense, goudron chaud', threshold: null, odor_family: 'fumé', odor_note: 'fond' },
    '68956-56-9': { odor: 'boisé, herbacé, frais, terpénique', odor_hot: 'herbacé terpénique chaud', threshold: null, odor_family: 'herbacé', odor_note: 'tête/cœur' },

    // ══════════ MOLÉCULES SPÉCIFIQUES GREEN FIG ══════════
    '103-95-7b':  { odor: 'muguet, cyclamen, floral doux', odor_hot: 'cyclamen chaud, muguet', threshold: null, odor_family: 'floral', odor_note: 'cœur' },

    // ══════════ VERTS & HERBE COUPÉE (pour diagnostic) ══════════
    '3913-81-3':  { odor: 'vert, concombre, gras, feuille', odor_hot: 'concombre vert intense', threshold: null, odor_family: 'vert', odor_note: 'tête' },
    '6728-26-3':  { odor: 'vert, herbe coupée, feuille, pomme verte', odor_hot: 'herbe coupée forte, vert intense', threshold: 0.017, odor_family: 'vert', odor_note: 'tête' },
    '505-57-7':   { odor: 'vert, feuille, herbe', odor_hot: 'vert herbacé intense', threshold: null, odor_family: 'vert', odor_note: 'tête' },

    // ══════════ AUTRES MOLÉCULES COURANTES ══════════
    '140-11-4':   { odor: 'jasmin, fruité, doux, floral', odor_hot: 'jasmin fruité chaud', threshold: null, odor_family: 'floral', odor_note: 'cœur' },
    '4602-84-0':  { odor: 'boisé, floral, muguet', odor_hot: 'boisé floral chaud', threshold: null, odor_family: 'floral', odor_note: 'cœur/fond' },
    '105-87-3':   { odor: 'rose, lavande, frais, fruité', odor_hot: 'rose fraîche, lavande chaude', threshold: null, odor_family: 'floral', odor_note: 'cœur' },
    '115-95-7':   { odor: 'floral, lavande, bergamote, frais', odor_hot: 'lavande chaude, bergamote', threshold: null, odor_family: 'floral', odor_note: 'tête/cœur' },
    '78-70-6b':   { odor: 'lavande, boisé, floral', odor_hot: 'lavande boisée chaude', threshold: null, odor_family: 'floral', odor_note: 'tête/cœur' },

    // ══════════ SANTAL & PATCHOULI ══════════
    '5986-55-0':  { odor: 'santal, boisé, doux, rose', odor_hot: 'santal rosé chaud', threshold: null, odor_family: 'boisé', odor_note: 'fond' },
    '5355-75-9':  { odor: 'patchouli, terreux, boisé, camphoré', odor_hot: 'patchouli terreux intense', threshold: null, odor_family: 'boisé', odor_note: 'fond' },

    // ══════════ METHYL-IONONES ══════════
    '1335-46-2':  { odor: 'violet, iris, poudré, floral', odor_hot: 'iris poudré intense', threshold: null, odor_family: 'floral', odor_note: 'cœur' },

    // ══════════ DIVERS ══════════
    '122-99-6':   { odor: 'rose léger, phénolique', odor_hot: 'phénolique chaud', threshold: null, odor_family: 'floral', odor_note: 'cœur' },
    '69178-43-4': { odor: 'rose, floral, cristallin, frais', odor_hot: 'rose cristalline chaude', threshold: null, odor_family: 'floral', odor_note: 'cœur' },
    '131812-67-4':{ odor: 'boisé, ambré, chaud, suédé', odor_hot: 'ambré boisé chaud', threshold: null, odor_family: 'ambré', odor_note: 'fond' },
    '13828-37-0': { odor: 'muguet, floral, frais, vert', odor_hot: 'muguet frais chaud', threshold: null, odor_family: 'floral', odor_note: 'cœur' },
    '138-87-4':   { odor: 'menthol, frais, herbacé', odor_hot: 'menthol fort, herbal', threshold: null, odor_family: 'frais', odor_note: 'tête' },
    '123-68-2':   { odor: 'fruité, ananas, cireux', odor_hot: 'ananas cireux chaud', threshold: null, odor_family: 'fruité', odor_note: 'tête' },
    '144020-22-4':{ odor: 'musc, propre, fruité, poudré', odor_hot: 'musc fruité chaud', threshold: null, odor_family: 'musc', odor_note: 'fond' },
    '68901-15-5': { odor: 'vert, fruité, frais', odor_hot: 'vert fruité chaud', threshold: null, odor_family: 'vert', odor_note: 'tête/cœur' },
    '13374-50-3': { odor: 'frais, citronné, propre, muguet', odor_hot: 'citronné muguet chaud', threshold: null, odor_family: 'frais', odor_note: 'tête' },
    '25225-08-5': { odor: 'musc, poudré, crémeux', odor_hot: 'musc crémeux chaud', threshold: null, odor_family: 'musc', odor_note: 'fond' },
    '67634-01-9': { odor: 'fruité, vert, tropical', odor_hot: 'fruité tropical chaud', threshold: null, odor_family: 'fruité', odor_note: 'tête' },
    '1392325-86-8':{ odor: 'boisé, musc, ambré', odor_hot: 'boisé ambré chaud', threshold: null, odor_family: 'boisé', odor_note: 'fond' },
};

/**
 * Obtenir le profil olfactif d'une molécule par CAS
 * @param {string} cas - Numéro CAS
 * @returns {object|null} Profil olfactif ou null
 */
function getOdorProfile(cas) {
    return ODOR_DB[cas] || null;
}

/**
 * Analyser le profil olfactif d'un parfum complet
 * @param {Array} components - [{cas_number, name, percentage_min, percentage_max}]
 * @returns {object} Analyse complète
 */
function analyzeOlfactoryProfile(components) {
    const families = {};
    const notes = { tête: [], cœur: [], fond: [] };
    const hotAlerts = [];
    const sweetMolecules = [];
    const greenMolecules = [];
    
    for (const comp of components) {
        const odor = ODOR_DB[comp.cas_number];
        if (!odor) continue;
        
        const pct = comp.percentage_max || comp.percentage_min || 0;
        
        // Classifier par famille olfactive
        if (!families[odor.odor_family]) families[odor.odor_family] = { pct: 0, molecules: [] };
        families[odor.odor_family].pct += pct;
        families[odor.odor_family].molecules.push({ name: comp.name, cas: comp.cas_number, pct });
        
        // Classifier par note
        const noteKey = odor.odor_note || 'cœur';
        for (const n of noteKey.split('/')) {
            const k = n.trim();
            if (notes[k]) notes[k].push({ name: comp.name, odor: odor.odor, pct });
        }
        
        // Détecter les alertes à chaud
        if (odor.odor_hot && odor.odor_hot.toUpperCase() !== odor.odor_hot && 
            (odor.odor_hot.includes('intense') || odor.odor_hot.includes('fort') || odor.odor_hot.includes('INTENSE'))) {
            hotAlerts.push({
                name: comp.name,
                cas: comp.cas_number,
                pct,
                odor_cold: odor.odor,
                odor_hot: odor.odor_hot,
                threshold: odor.threshold
            });
        }
        
        // Détecter sucré
        if (odor.odor.includes('sucré') || odor.odor.includes('caramel') || odor.odor.includes('vanille') || odor.odor.includes('miel')) {
            sweetMolecules.push({ name: comp.name, cas: comp.cas_number, pct, odor: odor.odor, odor_hot: odor.odor_hot });
        }
        
        // Détecter vert
        if (odor.odor.includes('vert') || odor.odor.includes('herbe') || odor.odor.includes('feuille')) {
            greenMolecules.push({ name: comp.name, cas: comp.cas_number, pct, odor: odor.odor, odor_hot: odor.odor_hot });
        }
    }
    
    // Trier familles par %
    const sortedFamilies = Object.entries(families)
        .sort((a, b) => b[1].pct - a[1].pct)
        .map(([name, data]) => ({ name, ...data }));
    
    return {
        families: sortedFamilies,
        notes,
        hotAlerts,
        sweetMolecules,
        greenMolecules,
        coverage: components.filter(c => ODOR_DB[c.cas_number]).length,
        total: components.length
    };
}

/**
 * Diagnostic d'anomalie olfactive
 * Ex: "sent sucré à chaud alors que c'est herbe coupée"
 * @param {Array} components - Composants du parfum
 * @param {string} issue - Description du problème ('sucré_à_chaud', 'vert_trop_fort', etc.)
 * @returns {object} Diagnostic avec molécules responsables et solutions
 */
function diagnoseOlfactoryIssue(components, issue) {
    const analysis = analyzeOlfactoryProfile(components);
    const result = { issue, suspects: [], solutions: [] };
    
    switch (issue) {
        case 'sucré_à_chaud':
            result.suspects = analysis.sweetMolecules
                .sort((a, b) => b.pct - a.pct)
                .map(m => ({
                    ...m,
                    explanation: `${m.name} (${m.pct}%) — odeur: "${m.odor}" → à chaud: "${m.odor_hot}"`
                }));
            if (result.suspects.length) {
                result.solutions.push('Baisser la mèche d\'un cran → réduit la température du bain de cire de ~5°C, atténue la volatilisation des molécules sucrées');
                result.solutions.push('Utiliser une cire plus dure (point de fusion élevé) → ralentit la diffusion des notes sucrées');
                result.solutions.push('Réduire le % parfum de 0.5-1% → diminue la concentration des molécules sucrées');
                if (result.suspects.some(s => s.pct > 5)) {
                    result.solutions.push('⚠ Molécule sucrée >5% détectée — le sucré à chaud sera difficile à éliminer sans reformulation');
                }
            }
            break;
            
        case 'vert_trop_fort':
            result.suspects = analysis.greenMolecules
                .sort((a, b) => b.pct - a.pct)
                .map(m => ({
                    ...m,
                    explanation: `${m.name} (${m.pct}%) — odeur: "${m.odor}" → à chaud: "${m.odor_hot}"`
                }));
            if (result.suspects.length) {
                result.solutions.push('Monter la mèche d\'un cran → augmente la température, les notes vertes de tête se dissipent plus vite');
                result.solutions.push('Augmenter le % de muscs / fixateurs → atténue les notes vertes par masquage');
            }
            break;
            
        case 'diffusion_faible':
            const heavyMolecules = components
                .filter(c => {
                    const o = ODOR_DB[c.cas_number];
                    return o && (o.odor_note === 'fond' || o.odor_note === 'cœur/fond');
                })
                .sort((a, b) => (b.percentage_max || 0) - (a.percentage_max || 0));
            result.suspects = heavyMolecules.map(m => {
                const o = ODOR_DB[m.cas_number];
                return { name: m.name, cas: m.cas_number, pct: m.percentage_max || m.percentage_min || 0, 
                         odor: o.odor, explanation: `Note de fond lourde — diffuse peu à température ambiante` };
            });
            result.solutions.push('Augmenter la mèche → plus de chaleur, meilleure volatilisation des notes de fond');
            result.solutions.push('Utiliser une cire avec point de fusion plus bas → bain plus chaud, meilleure diffusion');
            break;
    }
    
    return result;
}

module.exports = { ODOR_DB, getOdorProfile, analyzeOlfactoryProfile, diagnoseOlfactoryIssue };
