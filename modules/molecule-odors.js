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

    // ══════════ HUILES ESSENTIELLES ══════════
    '68917-10-2': { odor: 'mousse, terreux, boisé, vert', odor_hot: 'mousse terreuse intense', threshold: null, odor_family: 'boisé', odor_note: 'fond' },
    '9000-72-0':  { odor: 'baumier, vanille, résine, doux', odor_hot: 'résine vanillée chaude', threshold: null, odor_family: 'baumier', odor_note: 'fond' },
    '8014-09-3':  { odor: 'rose, géranium, citronnelle', odor_hot: 'rose géranium chaude', threshold: null, odor_family: 'floral', odor_note: 'cœur' },
    '84775-71-3': { odor: 'agrume, mandarine, zeste, frais', odor_hot: 'mandarine intense, zeste chaud', threshold: null, odor_family: 'agrume', odor_note: 'tête' },
    '90028-67-4': { odor: 'fumé, boisé, cuir, goudron', odor_hot: 'fumé cuir intense, goudron chaud', threshold: null, odor_family: 'fumé', odor_note: 'fond' },
    '68956-56-9': { odor: 'boisé, herbacé, frais, terpénique', odor_hot: 'herbacé terpénique chaud', threshold: null, odor_family: 'herbacé', odor_note: 'tête/cœur' },

    // ══════════ MOLÉCULES SPÉCIFIQUES GREEN FIG ══════════

    // ══════════ VERTS & HERBE COUPÉE (pour diagnostic) ══════════
    '3913-81-3':  { odor: 'vert, concombre, gras, feuille', odor_hot: 'concombre vert intense', threshold: null, odor_family: 'vert', odor_note: 'tête' },
    '6728-26-3':  { odor: 'vert, herbe coupée, feuille, pomme verte', odor_hot: 'herbe coupée forte, vert intense', threshold: 0.017, odor_family: 'vert', odor_note: 'tête' },
    '505-57-7':   { odor: 'vert, feuille, herbe', odor_hot: 'vert herbacé intense', threshold: null, odor_family: 'vert', odor_note: 'tête' },

    // ══════════ AUTRES MOLÉCULES COURANTES ══════════
    '140-11-4':   { odor: 'jasmin, fruité, doux, floral', odor_hot: 'jasmin fruité chaud', threshold: null, odor_family: 'floral', odor_note: 'cœur' },
    '4602-84-0':  { odor: 'boisé, floral, muguet', odor_hot: 'boisé floral chaud', threshold: null, odor_family: 'floral', odor_note: 'cœur/fond' },
    '105-87-3':   { odor: 'rose, lavande, frais, fruité', odor_hot: 'rose fraîche, lavande chaude', threshold: null, odor_family: 'floral', odor_note: 'cœur' },
    '115-95-7':   { odor: 'floral, lavande, bergamote, frais', odor_hot: 'lavande chaude, bergamote', threshold: null, odor_family: 'floral', odor_note: 'tête/cœur' },

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

    // ══════════ ENRICHISSEMENT COMPLET — 236 molécules manquantes ══════════

    // ── ALDÉHYDES ALIPHATIQUES ──
    '124-19-6':   { odor: 'cireux, gras, agrume, rose', odor_hot: 'cireux gras intense, rose chaude', threshold: 0.001, odor_family: 'aldéhydé', odor_note: 'tête' },
    '112-45-8':   { odor: 'cireux, gras, floral, vert', odor_hot: 'cireux gras chaud, vert doux', threshold: null, odor_family: 'aldéhydé', odor_note: 'tête' },
    '20407-84-5': { odor: 'cireux, gras, violette, agrume', odor_hot: 'cireux chaud puissant', threshold: null, odor_family: 'aldéhydé', odor_note: 'tête' },
    '66-25-1':    { odor: 'vert, herbe coupée, pomme, gras', odor_hot: 'vert intense, herbe chaude', threshold: 0.005, odor_family: 'vert', odor_note: 'tête' },
    '590-86-3':   { odor: 'malté, cacao, fromage, vert', odor_hot: 'malté intense, cacao', threshold: null, odor_family: 'gourmand', odor_note: 'tête' },
    '2437-25-4':  { odor: 'cireux, gras, agrume léger, pêche', odor_hot: 'cireux gras chaud, fruité', threshold: null, odor_family: 'aldéhydé', odor_note: 'tête/cœur' },

    // ── ALDÉHYDES TERPÉNIQUES ──
    '5182-36-5':  { odor: 'citron, vert, frais, zeste', odor_hot: 'citron intense, zeste chaud', threshold: null, odor_family: 'agrume', odor_note: 'tête' },
    '106-23-0':   { odor: 'citronnelle, frais, rosé, vert', odor_hot: 'citronnelle chaude intense', threshold: 0.005, odor_family: 'agrume', odor_note: 'tête' },
    '1335-66-6':  { odor: 'herbacé, frais, citronné, vert', odor_hot: 'herbacé citronné chaud', threshold: null, odor_family: 'herbacé', odor_note: 'tête' },
    '116-26-7':   { odor: 'safran, herbacé, terreux, épicé', odor_hot: 'safran intense, herbacé chaud', threshold: 0.007, odor_family: 'épicé', odor_note: 'cœur' },
    '141-13-9':   { odor: 'gras, cireux, agrume doux, propre', odor_hot: 'cireux propre chaud', threshold: null, odor_family: 'aldéhydé', odor_note: 'tête/cœur' },

    // ── ALDÉHYDES AROMATIQUES ──
    '80-54-6':    { odor: 'muguet, cyclamen, frais, vert', odor_hot: 'muguet intense, floral fort', threshold: 0.0003, odor_family: 'floral', odor_note: 'cœur' },
    '101-86-0':   { odor: 'jasmin, floral, gras, vert', odor_hot: 'jasmin gras intense, floral chaud', threshold: null, odor_family: 'floral', odor_note: 'cœur/fond' },
    '120-57-0':   { odor: 'héliotrope, vanille, floral, poudré', odor_hot: 'héliotrope vanillé intense', threshold: null, odor_family: 'floral', odor_note: 'cœur' },
    '1205-17-0':  { odor: 'héliotrope, floral, poudré, vanille', odor_hot: 'héliotrope poudré chaud', threshold: null, odor_family: 'floral', odor_note: 'cœur/fond' },
    '6658-48-6':  { odor: 'muguet, cyclamen, floral, vert', odor_hot: 'cyclamen chaud, muguet intense', threshold: null, odor_family: 'floral', odor_note: 'cœur' },
    '5462-06-6':  { odor: 'muguet, melon, aqueux, frais', odor_hot: 'muguet aqueux chaud', threshold: null, odor_family: 'floral', odor_note: 'cœur' },
    '122-40-7':   { odor: 'jasmin, floral, doux, poudré', odor_hot: 'jasmin poudré chaud', threshold: null, odor_family: 'floral', odor_note: 'cœur/fond' },
    '7775-00-0':  { odor: 'muguet, cyclamen, floral, frais', odor_hot: 'cyclamen floral chaud', threshold: null, odor_family: 'floral', odor_note: 'cœur' },
    '67634-15-5': { odor: 'muguet, floral, vert, frais', odor_hot: 'muguet vert chaud', threshold: null, odor_family: 'floral', odor_note: 'cœur' },
    '27939-60-2': { odor: 'vert, herbal, floral, frais', odor_hot: 'vert herbal chaud', threshold: null, odor_family: 'vert', odor_note: 'tête/cœur' },
    '68039-48-5': { odor: 'vert, herbal, citronnelle, frais', odor_hot: 'herbal citronné chaud', threshold: null, odor_family: 'herbacé', odor_note: 'tête' },
    '125109-85-5':{ odor: 'muguet, floral, vert, aqueux', odor_hot: 'muguet aqueux chaud', threshold: null, odor_family: 'floral', odor_note: 'cœur' },
    '67874-81-1': { odor: 'herbacé, floral, vert, frais', odor_hot: 'herbacé floral chaud', threshold: null, odor_family: 'herbacé', odor_note: 'tête/cœur' },
    '4756-19-8':  { odor: 'muguet, cyclamen, floral doux', odor_hot: 'cyclamen muguet chaud', threshold: null, odor_family: 'floral', odor_note: 'cœur' },
    '31906-04-4': { odor: 'muguet, floral, doux, rosé', odor_hot: 'muguet rosé intense', threshold: null, odor_family: 'floral', odor_note: 'cœur' },
    '165184-98-5':{ odor: 'jasmin, floral, gras, ambre', odor_hot: 'jasmin gras ambré chaud', threshold: null, odor_family: 'floral', odor_note: 'cœur/fond' },
    '18127-01-0': { odor: 'muguet, melon, aqueux, vert', odor_hot: 'muguet melon intense', threshold: null, odor_family: 'floral', odor_note: 'cœur' },
    '1637294-12-2':{ odor: 'boisé, santal, floral, ambré', odor_hot: 'santal ambré chaud', threshold: null, odor_family: 'boisé', odor_note: 'fond' },
    '67634-14-4': { odor: 'muguet, cyclamen, frais, vert', odor_hot: 'cyclamen frais chaud', threshold: null, odor_family: 'floral', odor_note: 'cœur' },
    '52474-60-9': { odor: 'vert, herbe, floral léger', odor_hot: 'vert herbacé chaud', threshold: null, odor_family: 'vert', odor_note: 'tête' },
    '55066-49-4': { odor: 'muguet, floral, vert, frais', odor_hot: 'muguet vert intense', threshold: null, odor_family: 'floral', odor_note: 'cœur' },

    // ── ESTERS TERPÉNIQUES ──
    '141-12-8':   { odor: 'rose, vert, frais, fruité', odor_hot: 'rose verte chaude, fruité', threshold: null, odor_family: 'floral', odor_note: 'cœur' },
    '80-26-2':    { odor: 'herbacé, lavande, boisé, frais', odor_hot: 'lavande boisée chaude', threshold: null, odor_family: 'herbacé', odor_note: 'tête/cœur' },
    '125-12-2':   { odor: 'boisé, camphré, pin, frais', odor_hot: 'pin camphré intense', threshold: null, odor_family: 'boisé', odor_note: 'tête' },
    '5655-61-8':  { odor: 'pin, camphré, boisé, frais', odor_hot: 'pin camphré chaud', threshold: null, odor_family: 'boisé', odor_note: 'tête' },
    '142-92-7':   { odor: 'fruité, pomme, vert, doux', odor_hot: 'fruité pomme intense', threshold: null, odor_family: 'fruité', odor_note: 'tête' },
    '2442-10-6':  { odor: 'vert, champignon, terreux, mousse', odor_hot: 'terreux mousse chaud', threshold: null, odor_family: 'vert', odor_note: 'cœur' },
    '105-85-1':   { odor: 'rose, fruité, vert, doux', odor_hot: 'rose fruitée chaude', threshold: null, odor_family: 'floral', odor_note: 'cœur' },
    '150-84-5':   { odor: 'rose, fruité, frais, citronnelle', odor_hot: 'rose citronnée chaude', threshold: null, odor_family: 'floral', odor_note: 'cœur' },
    '105-86-2':   { odor: 'rose, fruité, vert, frais', odor_hot: 'rose verte fruitée chaude', threshold: null, odor_family: 'floral', odor_note: 'tête/cœur' },
    '24717-85-9': { odor: 'fruité, rose, vert, agrume', odor_hot: 'rose fruitée chaude', threshold: null, odor_family: 'floral', odor_note: 'cœur' },
    '8007-35-0':  { odor: 'herbacé, pin, lavande, frais', odor_hot: 'lavande herbacée chaude', threshold: null, odor_family: 'herbacé', odor_note: 'tête/cœur' },
    '88-41-5':    { odor: 'boisé, frais, propre, vert', odor_hot: 'boisé propre chaud', threshold: null, odor_family: 'boisé', odor_note: 'tête/cœur' },
    '116044-44-1':{ odor: 'fruité, vert, agrume, frais', odor_hot: 'fruité agrume chaud', threshold: null, odor_family: 'fruité', odor_note: 'tête' },

    // ── ESTERS SALICYLATES ──
    '2050-08-0':  { odor: 'floral, boisé, herbacé, mousse', odor_hot: 'herbacé boisé chaud', threshold: null, odor_family: 'herbacé', odor_note: 'cœur/fond' },
    '65405-77-8': { odor: 'vert, herbe coupée, floral, frais', odor_hot: 'vert herbacé intense', threshold: null, odor_family: 'vert', odor_note: 'tête/cœur' },
    '6259-76-3':  { odor: 'vert, floral, mousse, boisé', odor_hot: 'vert boisé mousse chaud', threshold: null, odor_family: 'vert', odor_note: 'cœur/fond' },
    '87-19-4':    { odor: 'herbacé, boisé, vert, orchidée', odor_hot: 'herbacé boisé doux', threshold: null, odor_family: 'herbacé', odor_note: 'cœur' },
    '25485-88-5': { odor: 'herbacé, boisé, mousse, frais', odor_hot: 'mousse boisée chaude', threshold: null, odor_family: 'herbacé', odor_note: 'cœur/fond' },

    // ── ESTERS AROMATIQUES & DIVERS ──
    '142-19-8':   { odor: 'fruité, pêche, ananas, tropical', odor_hot: 'fruité tropical intense', threshold: null, odor_family: 'fruité', odor_note: 'tête' },
    '2705-87-5':  { odor: 'fruité, ananas, tropical, vert', odor_hot: 'ananas tropical chaud', threshold: null, odor_family: 'fruité', odor_note: 'tête' },
    '10094-34-5': { odor: 'fruité, prune, rose, doux', odor_hot: 'fruité prune chaud', threshold: null, odor_family: 'fruité', odor_note: 'cœur' },
    '25152-85-6': { odor: 'vert, herbacé, floral, rose', odor_hot: 'vert rosé chaud', threshold: null, odor_family: 'vert', odor_note: 'cœur' },
    '57082-24-3': { odor: 'boisé, cèdre, sec, ambré', odor_hot: 'cèdre ambré chaud', threshold: null, odor_family: 'boisé', odor_note: 'fond' },
    '141773-73-1':{ odor: 'boisé, cèdre, doux, ambré', odor_hot: 'cèdre ambré chaud', threshold: null, odor_family: 'boisé', odor_note: 'fond' },
    '93-58-3':    { odor: 'fruité, doux, baumier, prune', odor_hot: 'fruité baumier chaud', threshold: null, odor_family: 'fruité', odor_note: 'cœur' },
    '134-20-3':   { odor: 'raisin, floral, fruité, musqué', odor_hot: 'raisin floral intense', threshold: null, odor_family: 'floral', odor_note: 'cœur' },
    '111-12-6':   { odor: 'violet, vert, fruité, frais', odor_hot: 'violet vert intense', threshold: null, odor_family: 'vert', odor_note: 'tête/cœur' },
    '111-80-8':   { odor: 'violet, vert, métallique, frais', odor_hot: 'violet métallique chaud', threshold: null, odor_family: 'vert', odor_note: 'tête' },
    '4707-47-5':  { odor: 'mousse, terreux, boisé, oakmoss', odor_hot: 'mousse terreuse intense', threshold: null, odor_family: 'boisé', odor_note: 'fond' },
    '6789-88-4':  { odor: 'herbacé, vert, fruité léger', odor_hot: 'herbacé vert chaud', threshold: null, odor_family: 'herbacé', odor_note: 'cœur' },
    '23726-92-3': { odor: 'boisé, fruité, doux, floral', odor_hot: 'boisé fruité chaud', threshold: null, odor_family: 'boisé', odor_note: 'cœur/fond' },
    '121-39-1':   { odor: 'rose, miel, fruité doux', odor_hot: 'rose miellée chaude', threshold: null, odor_family: 'floral', odor_note: 'cœur' },
    '134-28-1':   { odor: 'fumé, épicé, boisé, clou girofle', odor_hot: 'fumé épicé intense', threshold: null, odor_family: 'épicé', odor_note: 'cœur/fond' },
    '67633-96-9': { odor: 'vert, herbe coupée, fruité', odor_hot: 'vert herbacé chaud', threshold: null, odor_family: 'vert', odor_note: 'tête' },
    '77-83-8':    { odor: 'fraise, fruité, sucré, crémeux', odor_hot: 'fraise sucrée intense', threshold: null, odor_family: 'fruité', odor_note: 'tête/cœur' },
    '90-17-5':    { odor: 'rose, fruité, métallique, vert', odor_hot: 'rose métallique intense', threshold: null, odor_family: 'floral', odor_note: 'cœur' },
    '123-92-2':   { odor: 'banane, fruité, doux, bonbon', odor_hot: 'banane sucrée intense', threshold: 0.002, odor_family: 'fruité', odor_note: 'tête' },
    '18871-14-2': { odor: 'fruité, vert, doux, lacté', odor_hot: 'fruité lacté chaud', threshold: null, odor_family: 'fruité', odor_note: 'cœur' },
    '8050-15-5':  { odor: 'résineux, baumier, doux, ambré', odor_hot: 'résine ambrée chaude', threshold: null, odor_family: 'baumier', odor_note: 'fond' },

    // ── CÉTONES TERPÉNIQUES ──
    '10458-14-7': { odor: 'menthol, herbacé, minty, frais', odor_hot: 'menthe herbacée intense', threshold: null, odor_family: 'frais', odor_note: 'tête' },
    '89-80-5':    { odor: 'menthe, herbacé, frais, boisé', odor_hot: 'menthe boisée chaude', threshold: null, odor_family: 'frais', odor_note: 'tête' },
    '491-07-6':   { odor: 'menthe, vert, herbacé, frais', odor_hot: 'menthe verte intense', threshold: null, odor_family: 'frais', odor_note: 'tête' },
    '21368-68-3': { odor: 'camphré, frais, herbacé, medicinal', odor_hot: 'camphre puissant, medicinal', threshold: null, odor_family: 'frais', odor_note: 'tête' },
    '76-22-2':    { odor: 'camphré, frais, medicinal, eucalyptus', odor_hot: 'camphre intense, penetrant', threshold: 0.003, odor_family: 'frais', odor_note: 'tête' },
    '99-49-0':    { odor: 'carvi, menthe, anis, herbacé', odor_hot: 'carvi intense, anisé', threshold: null, odor_family: 'herbacé', odor_note: 'tête/cœur' },
    '6485-40-1':  { odor: 'menthe verte, carvi, herbacé', odor_hot: 'menthe verte intense', threshold: null, odor_family: 'herbacé', odor_note: 'tête' },
    '546-80-5':   { odor: 'herbacé, cèdre, thuja, camphré', odor_hot: 'herbacé camphré intense', threshold: null, odor_family: 'herbacé', odor_note: 'tête' },
    '7779-30-8':  { odor: 'violet, iris, poudré, floral', odor_hot: 'iris poudré intense', threshold: null, odor_family: 'floral', odor_note: 'cœur' },
    '127-43-5':   { odor: 'violet, iris, boisé, poudré', odor_hot: 'iris boisé poudré chaud', threshold: null, odor_family: 'floral', odor_note: 'cœur/fond' },
    '127-41-3':   { odor: 'violet, iris, framboise, poudré', odor_hot: 'iris framboise chaude', threshold: null, odor_family: 'floral', odor_note: 'cœur' },
    '127-42-4':   { odor: 'violet, iris, poudré, boisé', odor_hot: 'iris poudré chaud', threshold: null, odor_family: 'floral', odor_note: 'cœur' },
    '5932-68-3':  { odor: 'violet, iris, boisé, fruité', odor_hot: 'iris boisé intense', threshold: null, odor_family: 'floral', odor_note: 'cœur' },
    '79-89-0':    { odor: 'violet, iris, poudré, doux', odor_hot: 'iris poudré doux', threshold: null, odor_family: 'floral', odor_note: 'cœur' },
    '13215-88-8': { odor: 'fruité, prune, rose, boisé', odor_hot: 'prune rosée chaude', threshold: null, odor_family: 'fruité', odor_note: 'cœur' },
    '24720-09-0': { odor: 'fruité, prune, rose, tabac', odor_hot: 'prune rosée intense', threshold: null, odor_family: 'fruité', odor_note: 'cœur' },
    '43052-87-5': { odor: 'fruité, prune, rose, floral', odor_hot: 'prune rose intense', threshold: null, odor_family: 'fruité', odor_note: 'cœur' },
    '35044-68-9': { odor: 'fruité, rose, prune, boisé', odor_hot: 'rose prune intense', threshold: null, odor_family: 'fruité', odor_note: 'cœur' },
    '57378-68-4': { odor: 'fruité, prune, rose, vert', odor_hot: 'prune rose verte', threshold: null, odor_family: 'fruité', odor_note: 'cœur' },
    '23726-93-4': { odor: 'fruité, pomme, rose, tabac', odor_hot: 'pomme rosée tabac chaud', threshold: 0.00001, odor_family: 'fruité', odor_note: 'tête/cœur' },
    '488-10-8':   { odor: 'jasmin, floral, fruité, herbacé', odor_hot: 'jasmin fruité intense', threshold: null, odor_family: 'floral', odor_note: 'cœur' },
    '141-10-6':   { odor: 'floral, fruité, boisé, tabac', odor_hot: 'floral tabac chaud', threshold: null, odor_family: 'floral', odor_note: 'cœur' },
    '93-08-3':    { odor: 'floral, oranger, fruité, sucré', odor_hot: 'floral oranger intense', threshold: null, odor_family: 'floral', odor_note: 'cœur' },
    '81786-74-5': { odor: 'boisé, doux, crémeux, ambré', odor_hot: 'boisé crémeux chaud', threshold: null, odor_family: 'boisé', odor_note: 'cœur/fond' },
    '36306-87-3': { odor: 'fruité, prune, rose, boisé', odor_hot: 'prune rosée chaude', threshold: null, odor_family: 'fruité', odor_note: 'cœur' },
    '81786-75-6': { odor: 'boisé, fruité, herbacé, doux', odor_hot: 'boisé fruité chaud', threshold: null, odor_family: 'boisé', odor_note: 'cœur' },
    '80-71-7':    { odor: 'caramel, érable, sucré, noix', odor_hot: 'caramel érable intense', threshold: null, odor_family: 'gourmand', odor_note: 'cœur' },
    '5471-51-2':  { odor: 'framboise, fruité, sucré, berry', odor_hot: 'framboise intense sucrée', threshold: null, odor_family: 'fruité', odor_note: 'cœur' },
    '28371-99-5': { odor: 'vert, boisé, floral, frais', odor_hot: 'vert boisé chaud', threshold: null, odor_family: 'vert', odor_note: 'cœur' },
    '23911-56-0': { odor: 'boisé, herbacé, vert, frais', odor_hot: 'boisé herbacé intense', threshold: null, odor_family: 'boisé', odor_note: 'cœur' },

    // ── CÉTONES MUSQUÉES & MACROCYCLIQUES ──
    '65443-14-3': { odor: 'musc, poudré, doux, propre', odor_hot: 'musc poudré intense', threshold: null, odor_family: 'musc', odor_note: 'fond' },
    '82356-51-2': { odor: 'musc, boisé, ambré, doux', odor_hot: 'musc boisé chaud', threshold: null, odor_family: 'musc', odor_note: 'fond' },
    '37609-25-9': { odor: 'musc, poudré, propre, doux', odor_hot: 'musc poudré chaud', threshold: null, odor_family: 'musc', odor_note: 'fond' },
    '54440-17-4': { odor: 'musc, ambré, poudré, doux', odor_hot: 'musc ambré intense', threshold: null, odor_family: 'musc', odor_note: 'fond' },

    // ── CÉTONES BOISÉES / ISO E SUPER ──
    '68155-66-8': { odor: 'boisé, ambré, velouté, cèdre', odor_hot: 'boisé ambré enveloppant', threshold: null, odor_family: 'boisé', odor_note: 'fond' },
    '23787-90-8': { odor: 'boisé, ambré, cèdre, velouté', odor_hot: 'boisé ambré intense', threshold: null, odor_family: 'boisé', odor_note: 'fond' },
    '33704-61-9': { odor: 'boisé, ambré, musc, chaud', odor_hot: 'boisé ambré intense', threshold: null, odor_family: 'boisé', odor_note: 'fond' },
    '106185-75-5':{ odor: 'boisé, ambré, fruité, doux', odor_hot: 'boisé ambré chaud', threshold: null, odor_family: 'boisé', odor_note: 'fond' },

    // ── LACTONES & MACROCYCLES ──
    '106-02-5':   { odor: 'musc, poudré, animal, doux', odor_hot: 'musc animal intense', threshold: null, odor_family: 'musc', odor_note: 'fond' },
    '105-95-3':   { odor: 'musc, poudré, sucré, propre', odor_hot: 'musc sucré poudré chaud', threshold: null, odor_family: 'musc', odor_note: 'fond' },
    '54982-83-1': { odor: 'musc, poudré, propre, doux', odor_hot: 'musc poudré intense', threshold: null, odor_family: 'musc', odor_note: 'fond' },
    '28645-51-4': { odor: 'musc, ambré, fruité, animal', odor_hot: 'musc ambré intense', threshold: null, odor_family: 'musc', odor_note: 'fond' },
    '34902-57-3': { odor: 'musc, propre, poudré, animal', odor_hot: 'musc propre intense', threshold: null, odor_family: 'musc', odor_note: 'fond' },
    '4430-31-3':  { odor: 'noix de coco, lactique, crémeux', odor_hot: 'noix de coco crémeuse chaude', threshold: null, odor_family: 'gourmand', odor_note: 'cœur/fond' },
    '104-50-7':   { odor: 'noix de coco, pêche, crémeux, lacté', odor_hot: 'noix de coco pêche chaude', threshold: null, odor_family: 'gourmand', odor_note: 'cœur' },
    '118-71-8':   { odor: 'caramel, barbe à papa, sucré, fruit cuit', odor_hot: 'caramel sucré intense', threshold: 0.035, odor_family: 'gourmand', odor_note: 'cœur/fond' },
    '3658-77-3':  { odor: 'caramel, sucré, ananas cuit, barbe à papa', odor_hot: 'caramel fruit cuit intense', threshold: 0.001, odor_family: 'gourmand', odor_note: 'cœur' },
    '431-03-8':   { odor: 'beurre, crémeux, caramel, sucré', odor_hot: 'beurre caramel intense', threshold: 0.005, odor_family: 'gourmand', odor_note: 'tête/cœur' },

    // ── MUSCS POLYCYCLIQUES ──
    '1506-02-1':  { odor: 'musc, sucré, poudré, ambré', odor_hot: 'musc sucré ambré chaud', threshold: null, odor_family: 'musc', odor_note: 'fond' },
    '3691-12-1':  { odor: 'musc, poudré, propre, lactique', odor_hot: 'musc poudré intense', threshold: null, odor_family: 'musc', odor_note: 'fond' },
    '15323-35-0': { odor: 'musc, poudré, ambré, doux', odor_hot: 'musc ambré chaud', threshold: null, odor_family: 'musc', odor_note: 'fond' },
    '476332-65-7':{ odor: 'musc, ambré, boisé, propre', odor_hot: 'musc ambré boisé chaud', threshold: null, odor_family: 'musc', odor_note: 'fond' },

    // ── MONOTERPÈNES ──
    '555-10-2':   { odor: 'menthol, herbacé, terpénique', odor_hot: 'terpénique herbacé chaud', threshold: null, odor_family: 'herbacé', odor_note: 'tête' },
    '99-83-2':    { odor: 'terpénique, menthol, citronné, vert', odor_hot: 'terpénique citronné fort', threshold: null, odor_family: 'herbacé', odor_note: 'tête' },
    '508-32-7':   { odor: 'pin, boisé, camphré, frais', odor_hot: 'pin camphré intense', threshold: null, odor_family: 'boisé', odor_note: 'tête' },
    '2867-05-2':  { odor: 'boisé, herbacé, vert, frais', odor_hot: 'herbacé boisé chaud', threshold: null, odor_family: 'herbacé', odor_note: 'tête' },
    '7785-70-8':  { odor: 'pin, résine, frais, camphré', odor_hot: 'pin résine intense', threshold: null, odor_family: 'boisé', odor_note: 'tête' },

    // ── SESQUITERPÈNES ──
    '475-20-7':   { odor: 'boisé, herbacé, doux, balsamique', odor_hot: 'boisé balsamique chaud', threshold: null, odor_family: 'boisé', odor_note: 'fond' },
    '495-61-4':   { odor: 'boisé, balsamique, épicé, citron', odor_hot: 'boisé épicé chaud', threshold: null, odor_family: 'boisé', odor_note: 'fond' },
    '502-61-4':   { odor: 'boisé, vert, pomme, doux', odor_hot: 'boisé pomme chaud', threshold: null, odor_family: 'boisé', odor_note: 'cœur/fond' },
    '470-40-6':   { odor: 'boisé, terreux, herbacé, doux', odor_hot: 'boisé terreux chaud', threshold: null, odor_family: 'boisé', odor_note: 'fond' },
    '489-40-7':   { odor: 'boisé, herbacé, vert, terreux', odor_hot: 'boisé herbacé intense', threshold: null, odor_family: 'boisé', odor_note: 'fond' },
    '17627-44-0': { odor: 'boisé, balsamique, doux, épicé', odor_hot: 'boisé balsamique chaud', threshold: null, odor_family: 'boisé', odor_note: 'fond' },
    '18794-84-8': { odor: 'boisé, vert, pomme, citronné', odor_hot: 'boisé vert chaud', threshold: null, odor_family: 'boisé', odor_note: 'cœur/fond' },
    '68259-31-4': { odor: 'boisé, cèdre, ambré, sec', odor_hot: 'cèdre ambré intense', threshold: null, odor_family: 'boisé', odor_note: 'fond' },
    '16982-00-6': { odor: 'herbacé, boisé, vert, aromatique', odor_hot: 'herbacé boisé chaud', threshold: null, odor_family: 'herbacé', odor_note: 'cœur/fond' },
    '88-84-6':    { odor: 'boisé, herbacé, balsamique', odor_hot: 'boisé herbacé intense', threshold: null, odor_family: 'boisé', odor_note: 'fond' },

    // ── ALCOOLS TERPÉNIQUES ──
    '562-74-3':   { odor: 'terreux, herbacé, poivré, boisé', odor_hot: 'terreux poivré intense', threshold: null, odor_family: 'herbacé', odor_note: 'cœur' },
    '10339-55-6': { odor: 'frais, citronné, floral léger', odor_hot: 'citronné floral chaud', threshold: null, odor_family: 'frais', odor_note: 'tête' },
    '89-78-1':    { odor: 'menthol, frais, glacé, vert', odor_hot: 'menthol puissant, glacé', threshold: 0.04, odor_family: 'frais', odor_note: 'tête' },
    '507-70-0':   { odor: 'camphre, pin, boisé, frais', odor_hot: 'camphre pin intense', threshold: null, odor_family: 'boisé', odor_note: 'tête' },
    '464-45-9':   { odor: 'camphre, pin, boisé, herbacé', odor_hot: 'camphre herbacé intense', threshold: null, odor_family: 'boisé', odor_note: 'tête' },
    '586-81-2':   { odor: 'terreux, herbacé, boisé, épicé', odor_hot: 'terreux épicé chaud', threshold: null, odor_family: 'herbacé', odor_note: 'cœur' },
    '8000-41-7':  { odor: 'lilas, floral, pin, doux', odor_hot: 'lilas floral chaud', threshold: null, odor_family: 'floral', odor_note: 'cœur' },
    '106-21-8':   { odor: 'rose, citronnelle, frais, propre', odor_hot: 'rose citronnée chaude', threshold: null, odor_family: 'floral', odor_note: 'cœur' },
    '13254-34-7': { odor: 'frais, herbacé, vert, citronné', odor_hot: 'herbacé frais chaud', threshold: null, odor_family: 'herbacé', odor_note: 'tête' },

    // ── ALCOOLS SESQUITERPÉNIQUES ──
    '515-69-5':   { odor: 'floral, doux, herbacé, camomille', odor_hot: 'floral camomille chaud', threshold: null, odor_family: 'floral', odor_note: 'cœur/fond' },
    '89-88-3':    { odor: 'boisé, rosé, doux, terreux', odor_hot: 'boisé rosé chaud', threshold: null, odor_family: 'boisé', odor_note: 'fond' },
    '68129-81-7': { odor: 'vétiver, boisé, terreux, fumé', odor_hot: 'vétiver terreux intense', threshold: null, odor_family: 'boisé', odor_note: 'fond' },
    '40716-66-3': { odor: 'boisé, floral, cireux, doux', odor_hot: 'boisé floral chaud', threshold: null, odor_family: 'boisé', odor_note: 'cœur/fond' },
    '142-50-7':   { odor: 'boisé, floral, cireux, rose', odor_hot: 'boisé rosé intense', threshold: null, odor_family: 'boisé', odor_note: 'cœur/fond' },

    // ── ALCOOLS AROMATIQUES & SYNTHÉTIQUES ──
    '55066-48-3': { odor: 'rose, muguet, floral, vert', odor_hot: 'rose muguet intense', threshold: null, odor_family: 'floral', odor_note: 'cœur' },
    '63500-71-0': { odor: 'muguet, cyclamen, floral, frais', odor_hot: 'muguet cyclamen intense', threshold: null, odor_family: 'floral', odor_note: 'cœur' },
    '100-51-6':   { odor: 'doux, floral léger, fruité, baumier', odor_hot: 'doux baumier chaud', threshold: null, odor_family: 'baumier', odor_note: 'cœur' },
    '104-54-1':   { odor: 'jacinthe, baumier, doux, floral', odor_hot: 'baumier floral intense', threshold: null, odor_family: 'baumier', odor_note: 'cœur/fond' },
    '105-13-5':   { odor: 'floral, doux, crémeux, lilas', odor_hot: 'floral crémeux chaud', threshold: null, odor_family: 'floral', odor_note: 'cœur' },
    '28219-60-5': { odor: 'santal, boisé, lacté, crémeux', odor_hot: 'santal lacté intense', threshold: null, odor_family: 'boisé', odor_note: 'fond' },
    '198404-98-7':{ odor: 'boisé, ambré, santal, velouté', odor_hot: 'boisé ambré velouté', threshold: null, odor_family: 'boisé', odor_note: 'fond' },
    '929625-08-1':{ odor: 'boisé, santal, doux, crémeux', odor_hot: 'santal crémeux intense', threshold: null, odor_family: 'boisé', odor_note: 'fond' },
    '107898-54-4':{ odor: 'boisé, santal, rosé, crémeux', odor_hot: 'santal rosé chaud', threshold: null, odor_family: 'boisé', odor_note: 'fond' },
    '70788-30-6': { odor: 'boisé, santal, doux, balsamique', odor_hot: 'santal balsamique chaud', threshold: null, odor_family: 'boisé', odor_note: 'fond' },
    '83926-73-2': { odor: 'floral, muguet, rose, frais', odor_hot: 'muguet rosé chaud', threshold: null, odor_family: 'floral', odor_note: 'cœur' },
    '177772-08-6':{ odor: 'frais, vert, citronné, propre', odor_hot: 'frais citronné chaud', threshold: null, odor_family: 'frais', odor_note: 'tête/cœur' },
    '98-52-2':    { odor: 'terreux, boisé, doux, propre', odor_hot: 'terreux boisé chaud', threshold: null, odor_family: 'boisé', odor_note: 'cœur' },
    '66068-84-6': { odor: 'boisé, santal, camphré, doux', odor_hot: 'santal camphré chaud', threshold: null, odor_family: 'boisé', odor_note: 'fond' },
    '81782-77-6': { odor: 'vert, fruité, frais, rose', odor_hot: 'vert fruité chaud', threshold: null, odor_family: 'vert', odor_note: 'cœur' },
    '253454-23-8':{ odor: 'boisé, ambré, santal, velouté', odor_hot: 'boisé ambré intense', threshold: null, odor_family: 'boisé', odor_note: 'fond' },
    '41890-92-0': { odor: 'boisé, marine, ozonic, frais', odor_hot: 'boisé marine chaud', threshold: null, odor_family: 'boisé', odor_note: 'cœur/fond' },
    '505-32-8':   { odor: 'boisé, baumier, doux, sec', odor_hot: 'baumier boisé chaud', threshold: null, odor_family: 'baumier', odor_note: 'fond' },
    '150-86-7':   { odor: 'boisé, herbacé, vert, baumier', odor_hot: 'baumier herbacé chaud', threshold: null, odor_family: 'baumier', odor_note: 'fond' },
    '67801-20-1': { odor: 'santal, boisé, doux, crémeux', odor_hot: 'santal boisé intense', threshold: null, odor_family: 'boisé', odor_note: 'fond' },

    // ── ALCOOLS GRAS & SOLVANTS ──
    '112-92-5':   { odor: 'cireux, gras, doux, très léger', odor_hot: 'cireux gras faible', threshold: null, odor_family: 'neutre', odor_note: 'fond' },
    '36653-82-4': { odor: 'cireux, gras, léger', odor_hot: 'cireux gras faible', threshold: null, odor_family: 'neutre', odor_note: 'fond' },
    '64-17-5':    { odor: 'alcool, piquant, éthéré', odor_hot: 'alcool volatile, piquant', threshold: 10, odor_family: 'solvant', odor_note: 'tête' },
    '67-56-1':    { odor: 'alcool, piquant, acre', odor_hot: 'alcool acre intense', threshold: null, odor_family: 'solvant', odor_note: 'tête' },

    // ── PHÉNOLS ──
    '4180-23-8':  { odor: 'anis, réglisse, sucré, herbal', odor_hot: 'anis réglisse chaud', threshold: 0.05, odor_family: 'épicé', odor_note: 'cœur' },
    '97-54-1':    { odor: 'clou girofle, épicé, boisé, doux', odor_hot: 'clou girofle intense, épicé', threshold: null, odor_family: 'épicé', odor_note: 'cœur/fond' },
    '2785-87-7':  { odor: 'clou girofle, épicé, doux, fumé', odor_hot: 'clou girofle fumé chaud', threshold: null, odor_family: 'épicé', odor_note: 'cœur/fond' },
    '89-83-8':    { odor: 'thym, herbacé, épicé, medicinal', odor_hot: 'thym épicé intense', threshold: 0.001, odor_family: 'herbacé', odor_note: 'tête/cœur' },
    '499-75-2':   { odor: 'origan, thym, épicé, herbacé', odor_hot: 'origan herbacé intense', threshold: null, odor_family: 'herbacé', odor_note: 'tête/cœur' },
    '140-67-0':   { odor: 'anis, basilic, estragon, herbacé', odor_hot: 'anis basilic intense', threshold: null, odor_family: 'herbacé', odor_note: 'tête/cœur' },
    '93-16-3':    { odor: 'clou girofle, boisé, épicé, doux', odor_hot: 'clou girofle doux chaud', threshold: null, odor_family: 'épicé', odor_note: 'cœur/fond' },
    '128-37-0':   { odor: 'inodore (stabilisant)', odor_hot: 'inodore', threshold: null, odor_family: 'neutre', odor_note: 'fond' },

    // ── ÉTHERS ──
    '16409-43-1': { odor: 'rose, géranium, vert, frais', odor_hot: 'rose géranium intense', threshold: null, odor_family: 'floral', odor_note: 'tête/cœur' },
    '20298-70-8': { odor: 'rose, vert, géranium, frais', odor_hot: 'rose verte intense', threshold: null, odor_family: 'floral', odor_note: 'tête' },
    '20298-69-5': { odor: 'rose, géranium, vert, litchi', odor_hot: 'rose litchi intense', threshold: null, odor_family: 'floral', odor_note: 'tête' },
    '3033-23-6':  { odor: 'rose, vert, géranium, fruité', odor_hot: 'rose géranium chaude', threshold: null, odor_family: 'floral', odor_note: 'tête' },
    '16510-27-3': { odor: 'anis, estragol, doux, herbacé', odor_hot: 'anisé doux chaud', threshold: null, odor_family: 'herbacé', odor_note: 'cœur' },
    '101-84-8':   { odor: 'géranium, floral, herbacé, vert', odor_hot: 'géranium herbacé chaud', threshold: null, odor_family: 'floral', odor_note: 'cœur' },
    '19870-74-7': { odor: 'cèdre, boisé, ambré, doux', odor_hot: 'cèdre ambré intense', threshold: null, odor_family: 'boisé', odor_note: 'fond' },
    '65442-31-1': { odor: 'cèdre, boisé, ambré, sec', odor_hot: 'cèdre ambré sec chaud', threshold: null, odor_family: 'boisé', odor_note: 'fond' },
    '93-18-5':    { odor: 'floral, oranger, poudré, doux', odor_hot: 'oranger poudré chaud', threshold: null, odor_family: 'floral', odor_note: 'cœur/fond' },
    '67634-00-8': { odor: 'vert, frais, ozonic, agrume', odor_hot: 'vert ozonic intense', threshold: null, odor_family: 'vert', odor_note: 'tête' },

    // ── ACÉTALS & AMBRÉS ──
    '58567-11-6': { odor: 'ambré, boisé, chaud, musqué', odor_hot: 'ambré boisé intense', threshold: null, odor_family: 'ambré', odor_note: 'fond' },
    '32388-55-9': { odor: 'ambré, boisé, animal, puissant', odor_hot: 'ambré animal intense', threshold: null, odor_family: 'ambré', odor_note: 'fond' },
    '139504-68-0':{ odor: 'ambré, boisé, doux, cristallin', odor_hot: 'ambré cristallin intense', threshold: null, odor_family: 'ambré', odor_note: 'fond' },
    '154171-77-4':{ odor: 'ambré, boisé, doux, cristallin', odor_hot: 'ambré cristallin chaud', threshold: null, odor_family: 'ambré', odor_note: 'fond' },
    '27606-09-3': { odor: 'rose, poudré, doux, floral', odor_hot: 'rose poudré chaud', threshold: null, odor_family: 'floral', odor_note: 'cœur' },
    '67674-46-8': { odor: 'fruité, vert, frais, agrume', odor_hot: 'fruité vert chaud', threshold: null, odor_family: 'fruité', odor_note: 'tête' },
    '406488-30-0':{ odor: 'boisé, ambré, doux, poudré', odor_hot: 'ambré boisé poudré', threshold: null, odor_family: 'ambré', odor_note: 'fond' },

    // ── MARINE / OZONIC ──
    '28940-11-6': { odor: 'marine, ozonic, melon, frais', odor_hot: 'marine ozonic intense', threshold: null, odor_family: 'marin', odor_note: 'tête/cœur' },

    // ── HÉTÉROCYCLIQUES ──
    '120-72-9':   { odor: 'floral, animal, jasmin, naphtaline', odor_hot: 'animal jasmin intense', threshold: 0.0014, odor_family: 'animal', odor_note: 'cœur/fond' },
    '22457-23-4': { odor: 'vert, herbacé, terreux, mousse', odor_hot: 'herbacé mousse chaud', threshold: null, odor_family: 'vert', odor_note: 'cœur' },
    '14667-55-1': { odor: 'noisette, cacao, torréfié, terreux', odor_hot: 'noisette torréfiée intense', threshold: null, odor_family: 'gourmand', odor_note: 'cœur' },
    '61792-11-8': { odor: 'citron, vert, frais, ozonic', odor_hot: 'citron vert intense', threshold: null, odor_family: 'agrume', odor_note: 'tête' },

    // ── ACIDES ──
    '57-11-4':    { odor: 'gras, cireux, suif, léger', odor_hot: 'gras suif chaud', threshold: null, odor_family: 'neutre', odor_note: 'fond' },
    '57-10-3':    { odor: 'gras, cireux, léger', odor_hot: 'gras cireux chaud', threshold: null, odor_family: 'neutre', odor_note: 'fond' },
    '65-85-0':    { odor: 'baumier, doux, léger', odor_hot: 'baumier doux chaud', threshold: null, odor_family: 'baumier', odor_note: 'fond' },
    '103-82-2':   { odor: 'miel, floral, cireux, doux', odor_hot: 'miel floral chaud', threshold: null, odor_family: 'floral', odor_note: 'cœur/fond' },

    // ── GLYCOLS & SOLVANTS ──
    '25265-71-8': { odor: 'inodore (solvant)', odor_hot: 'très léger, éthéré', threshold: null, odor_family: 'solvant', odor_note: 'tête' },
    '84-66-2':    { odor: 'inodore (plastifiant)', odor_hot: 'inodore', threshold: null, odor_family: 'neutre', odor_note: 'fond' },
    '109-94-4':   { odor: 'éthéré, fruité, rhum', odor_hot: 'éthéré fruité fort', threshold: null, odor_family: 'solvant', odor_note: 'tête' },

    // ── STABILISANTS UV ──
    '3896-11-5':  { odor: 'inodore (stabilisant UV)', odor_hot: 'inodore', threshold: null, odor_family: 'neutre', odor_note: 'fond' },
    '1329-99-3':  { odor: 'inodore (solvant technique)', odor_hot: 'inodore', threshold: null, odor_family: 'neutre', odor_note: 'fond' },

    // ── HUILES NATURELLES & EXTRAITS ──
    '8016-23-7':  { odor: 'boisé, fumé, rose, balsamique', odor_hot: 'boisé fumé balsamique', threshold: null, odor_family: 'boisé', odor_note: 'fond' },
    '8016-26-0':  { odor: 'herbacé, frais, camphré, eucalyptus', odor_hot: 'herbacé camphré intense', threshold: null, odor_family: 'herbacé', odor_note: 'tête/cœur' },
    '84238-39-1': { odor: 'patchouli, terreux, boisé, camphoré', odor_hot: 'patchouli terreux intense', threshold: null, odor_family: 'boisé', odor_note: 'fond' },
    '84929-31-7': { odor: 'iris, poudré, terreux, violet', odor_hot: 'iris poudré terreux intense', threshold: null, odor_family: 'floral', odor_note: 'fond' },

    // ── MOLÉCULES SPÉCIFIQUES RESTANTES ──
    '68039-49-6': { odor: 'boisé, herbacé, vert, frais', odor_hot: 'boisé herbacé chaud', threshold: null, odor_family: 'boisé', odor_note: 'cœur' },
    '65113-99-7': { odor: 'santal, boisé, crémeux, rosé', odor_hot: 'santal crémeux chaud', threshold: null, odor_family: 'boisé', odor_note: 'fond' },
    '103694-68-4':{ odor: 'muguet, floral, doux, frais', odor_hot: 'muguet doux intense', threshold: null, odor_family: 'floral', odor_note: 'cœur' },
    '151-05-3':   { odor: 'floral, rose, fruité, doux', odor_hot: 'rose fruitée chaude', threshold: null, odor_family: 'floral', odor_note: 'cœur' },
    '9454789-19-0':{ odor: 'inconnu (CAS invalide)', odor_hot: 'inconnu', threshold: null, odor_family: 'inconnu', odor_note: 'inconnu' },
    '23696-85-7': { odor: 'ionone, violet, iris, poudré', odor_hot: 'iris poudré chaud', threshold: null, odor_family: 'floral', odor_note: 'cœur' },
    '54464-57-2': { odor: 'boisé, ambré, cèdre, doux', odor_hot: 'boisé ambré intense', threshold: null, odor_family: 'boisé', odor_note: 'fond' },

    // ── DERNIERS MANQUANTS ──
    '104-93-8':   { odor: 'anisé, doux, floral, crémeux', odor_hot: 'anisé crémeux chaud', threshold: null, odor_family: 'herbacé', odor_note: 'cœur' },
    '8008-56-8':  { odor: 'citron, frais, zeste, agrume vif', odor_hot: 'citron zeste intense', threshold: null, odor_family: 'agrume', odor_note: 'tête' },
    '8022-96-6':  { odor: 'jasmin, floral, animal, miel', odor_hot: 'jasmin animal intense', threshold: null, odor_family: 'floral', odor_note: 'cœur/fond' },
    '8015-73-4':  { odor: 'basilic, anis, herbacé, vert', odor_hot: 'basilic anisé intense', threshold: null, odor_family: 'herbacé', odor_note: 'tête' },
    '8006-81-3':  { odor: 'cannelle, épicé, chaud, sucré', odor_hot: 'cannelle épicée intense', threshold: null, odor_family: 'épicé', odor_note: 'cœur' },
    '8000-46-2':  { odor: 'géranium, rose, vert, menthol', odor_hot: 'géranium rose intense', threshold: null, odor_family: 'floral', odor_note: 'cœur' },
    '8000-27-9':  { odor: 'cèdre, boisé, sec, crayon', odor_hot: 'cèdre sec intense', threshold: null, odor_family: 'boisé', odor_note: 'fond' },
    '72968-50-4': { odor: 'agrume, boisé, floral, vert', odor_hot: 'agrume boisé chaud', threshold: null, odor_family: 'agrume', odor_note: 'tête/cœur' },
    '61789-17-1': { odor: 'fumé, boisé, rose, épicé', odor_hot: 'fumé boisé rosé', threshold: null, odor_family: 'boisé', odor_note: 'fond' },
};

/**
 * Obtenir le profil olfactif d'une molécule par CAS
 * @param {string} cas - Numéro CAS
 * @returns {object|null} Profil olfactif ou null
 */
function getOdorProfile(cas) {
    return ODOR_DB[cas] || null;
}

module.exports = { ODOR_DB, getOdorProfile };
