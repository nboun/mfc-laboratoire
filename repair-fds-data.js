// repair-fds-data.js — Corriger les 3 parfums dont les composants FDS sont mal parsés
// Usage: coller dans la console navigateur avec le serveur lancé

const repairs = [
  {
    name_pattern: "VELOURS D'HERBE",
    components: [
      { cas: "120-51-4", name: "benzyl benzoate", percentage: 16.6089 },
      { cas: "121-32-4", name: "3-ethoxy-4-hydroxybenzaldehyde", percentage: 9.0 },
      { cas: "928-96-1", name: "cis-hex-3-en-1-ol", percentage: 8.6014 },
      { cas: "101-86-0", name: "alpha-hexylcinnamaldehyde", percentage: 8.0 },
      { cas: "103-95-7", name: "2-methyl-3-(4-isopropylphenyl) propanal", percentage: 7.0 },
      { cas: "103694-68-4", name: "2,2-dimethyl-3-(3-tolyl)propan-1-ol", percentage: 4.092 },
      { cas: "63500-71-0", name: "mixture cis/trans-tetrahydro-2-isobutyl-4-methylpyran-4-ol", percentage: 2.676 },
      { cas: "68039-49-6", name: "dimethylcyclohex-3-ene-1-carbaldehyde (mixed isomers)", percentage: 2.4 },
      { cas: "115-95-7", name: "linalyl acetate", percentage: 2.0 },
      { cas: null, name: "koavone", percentage: 2.0 },
      { cas: "104-21-2", name: "p-methoxybenzyl acetate", percentage: 1.4 },
      { cas: "127-51-5", name: "3-methyl-4-(2,6,6-trimethyl-2-cyclohexen-1-yl)-3-buten-2-one", percentage: 0.96 },
      { cas: "7779-30-8", name: "1-(2,6,6-trimethyl-2-cyclohexene-1-yl)pent-1-ene-3-one", percentage: 0.56 },
      { cas: "6259-76-3", name: "hexyl salicylate", percentage: 0.48 },
      { cas: "127-43-5", name: "methyl ionone, mixed isomers", percentage: 0.16 },
      { cas: "4756-19-8", name: "benzenepropanol, beta-methyl-4-(1-methylethyl)-", percentage: 0.105 }
    ]
  },
  {
    name_pattern: "AMBRE GRIS",
    components: [
      { cas: "54464-57-2", name: "1-(1,2,3,4,5,6,7,8-octahydro-2,3,8,8-tetramethyl-2-naphthalenyl)ethanone", percentage: 12.50 },
      { cas: "19870-74-7", name: "methyl cedryl ether", percentage: 4.38 },
      { cas: "58567-11-6", name: "ethoxymethoxy cyclododecane (boisambrene forte)", percentage: 3.75 },
      { cas: "127-51-5", name: "alpha-iso-methylionone", percentage: 3.13 },
      { cas: "4707-47-5", name: "methyl atrarate", percentage: 3.13 },
      { cas: "4940-11-8", name: "ethyl maltol", percentage: 2.50 },
      { cas: "60-12-8", name: "phenylethyl alcohol", percentage: 1.25 },
      { cas: "929625-08-1", name: "2-(2,2,7,7-tetramethyltricyclo[6.2.1.0(1,6)]undec-5(4)-en-5-yl)propan-1-ol", percentage: 0.94 },
      { cas: "70788-30-6", name: "1-(2,2,6-trimethylcyclohexyl)-3-hexanol", percentage: 0.63 },
      { cas: "106-24-1", name: "geraniol", percentage: 0.62 },
      { cas: "5989-27-5", name: "d-limonene (r)-p-mentha-1,8-diene", percentage: 0.46 },
      { cas: "103-54-8", name: "cinnamyl acetate", percentage: 0.31 },
      { cas: "476332-65-7", name: "Heptamethyl Decahydroindenofuran", percentage: 0.25 },
      { cas: "127-43-5", name: "beta-methylionone", percentage: 0.16 },
      { cas: null, name: "hydrocarbon (terpenes / sesquiterpenes)", percentage: 0.20 },
      { cas: "13215-88-8", name: "4-(2-Butenylidene)-3,5,5-trimethylcyclohex-2-en-1-one", percentage: 0.09 },
      { cas: "90028-67-4", name: "mousse arbre ou chene", percentage: 0.01 },
      { cas: "80-56-8", name: "alpha-pinene", percentage: 0.01 }
    ]
  },
  {
    name_pattern: "THE VERT NEW",
    components: [
      { cas: "101-86-0", name: "alpha-hexylcinnamaldehyde", percentage: 8.00 },
      { cas: "78-70-6", name: "linalool", percentage: 5.14 },
      { cas: "115-95-7", name: "linalyl acetate", percentage: 4.04 },
      { cas: "5989-27-5", name: "d-limonene (r)-p-mentha-1,8-diene", percentage: 1.87 },
      { cas: "5392-40-5", name: "citral", percentage: 1.61 },
      { cas: "79-77-6", name: "trans-beta-ionone", percentage: 1.50 },
      { cas: "8000-41-7", name: "terpineol", percentage: 1.50 },
      { cas: "80-54-6", name: "p-tert-butyl-alpha-methylhydrocinnamic aldehyde (lilial)", percentage: 1.00 },
      { cas: "140-11-4", name: "benzyl acetate", percentage: 1.00 },
      { cas: "91-64-5", name: "coumarin", percentage: 1.00 },
      { cas: "106-24-1", name: "geraniol", percentage: 0.84 },
      { cas: "121-32-4", name: "ethyl vanillin", percentage: 0.60 },
      { cas: "106-25-2", name: "nerol", percentage: 0.50 },
      { cas: "106-22-9", name: "dl-citronellol", percentage: 0.40 },
      { cas: "101-84-8", name: "diphenyl ether", percentage: 0.40 },
      { cas: "23726-92-3", name: "(z)-beta-1-(2,6,6-trimethyl-1-cyclohexen-1-yl)-2-buten-1-one (cis-beta-damascone)", percentage: 0.40 },
      { cas: "127-91-3", name: "beta-pinene", percentage: 0.36 },
      { cas: "3691-12-1", name: "azulene,1,2,3,4,5,6,7,8-octahydro-1,4-dimethyl-7-(1-methylethyl)", percentage: 0.28 },
      { cas: "99-85-4", name: "1,4-cyclohexadiene,1-methyl-4-(1-methylethyl)-", percentage: 0.24 },
      { cas: "24720-09-0", name: "trans-alpha-1-(2,6,6-trimethyl-2-cyclohexen-1-yl)-2-buten-1-one", percentage: 0.21 },
      { cas: "64-17-5", name: "ethyl alcohol", percentage: 0.20 },
      { cas: "87-44-5", name: "beta-caryophyllene", percentage: 0.18 },
      { cas: "122-03-2", name: "cuminaldehyde", percentage: 0.10 },
      { cas: "65442-31-1", name: "6-sec-butylquinoline", percentage: 0.10 },
      { cas: "69178-43-4", name: "1,1-diethoxyisooctan", percentage: 0.10 },
      { cas: "80-56-8", name: "alpha-pinene", percentage: 0.10 },
      { cas: "89-83-8", name: "thymol", percentage: 0.10 },
      { cas: "2437-25-4", name: "dodecanenitrile", percentage: 0.10 },
      { cas: "112-31-2", name: "decanal", percentage: 0.10 },
      { cas: null, name: "hydrocarbon (terpenes / sesquiterpenes)", percentage: 1.69 },
      { cas: "106-23-0", name: "citronellal", percentage: 0.07 },
      { cas: "122-40-7", name: "alpha-amylcinnamic aldehyde (aca)", percentage: 0.04 },
      { cas: "470-82-6", name: "eucalyptol", percentage: 0.04 },
      { cas: "104-09-6", name: "p-tolylacetaldehyde", percentage: 0.04 },
      { cas: "68039-49-6", name: "2,4-dimethyl-3-cyclohexen-1-carboxaldehyde", percentage: 0.03 },
      { cas: "6728-26-3", name: "trans-2-hexenal", percentage: 0.02 },
      { cas: "105-87-3", name: "geranyl acetate", percentage: 0.02 },
      { cas: "586-62-9", name: "terpinolene", percentage: 0.01 },
      { cas: "499-75-2", name: "carvacrol", percentage: 0.01 },
      { cas: "491-07-6", name: "d,l-isomenthone", percentage: 0.01 },
      { cas: "495-61-4", name: "l-b-bisabolene", percentage: 0.01 }
    ]
  }
];

// Execute repair
fetch('/api/fragrances/batch-repair', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ repairs })
}).then(r => r.json()).then(data => {
  console.log('=== RÉPARATION FDS ===');
  data.results.forEach(r => console.log(`${r.status === 'not_found' ? '❌' : '✅'} ${r.pattern || r.name}: ${r.inserted || 0} composants`));
}).catch(err => console.error('Erreur:', err));
