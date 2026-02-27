#!/usr/bin/env node
/**
 * import-kb-trempage.js — Import fiche trempage chandelles dans la KB
 */
const http = require('http');
const fs = require('fs');

const data = JSON.parse(fs.readFileSync(__dirname + '/../kb-trempage-chandelles.json', 'utf8'));

const payload = JSON.stringify({
    category: data.category,
    subcategory: data.subcategory,
    title: data.title,
    content: JSON.stringify(data.content),
    source: 'Test terrain MFC — 24/02/2026',
    priority: data.confidence,
    tags: 'trempage,chandelle,paraffine,4110,micro,2528,température,adhérence'
});

const req = http.request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/knowledge',
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) }
}, (res) => {
    let body = '';
    res.on('data', d => body += d);
    res.on('end', () => {
        const r = JSON.parse(body);
        if (r.success) {
            console.log(`✅ Fiche KB importée — ID: ${r.id}`);
            console.log(`   "${data.title}"`);
            console.log(`   Catégorie: ${data.category}`);
            console.log(`   Tags: trempage, chandelle, paraffine, température`);
        } else {
            console.log('❌ Erreur:', r.error);
        }
    });
});

req.on('error', e => console.error('❌ Serveur non accessible:', e.message));
req.write(payload);
req.end();
