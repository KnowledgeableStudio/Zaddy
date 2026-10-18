import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PRODUCTS, UPCOMING, UPCOMING_HOODIES, UPCOMING_JEANS } from '../src/data/site.js';

const html = readFileSync(new URL('../dist/index.html', import.meta.url), 'utf8');
const cards = [...html.matchAll(/<article\b[^>]*>[\s\S]*?<\/article>/g)].map(match => match[0]);
const cardFor = name => cards.find(card => card.includes(`>${name}</h3>`));

for (const product of [...UPCOMING, ...UPCOMING_HOODIES, ...UPCOMING_JEANS]) {
  test(`${product.name} is a visible preview without a price or purchase action`, () => {
    const card = cardFor(product.name);
    assert.ok(card, 'Product card remains rendered');
    assert.ok(card.includes(product.description.replaceAll('&', '&amp;')), 'Description remains rendered');
    assert.match(card, /Coming Soon/);
    assert.match(card, /data-viewer-src=/);
    assert.match(card, /data-notify/);
    assert.doesNotMatch(card, /(?:\$|USD\s*|&#36;)\s*\d[\d,.]*/i, 'Coming Soon price must be absent from rendered HTML');
    assert.doesNotMatch(card, /data-add-to-cart/, 'Preview cannot be purchased');
  });
}

for (const product of PRODUCTS) {
  test(`${product.name} remains purchasable at its catalog price`, () => {
    const card = cardFor(product.name);
    assert.ok(card);
    assert.ok(card.includes(`$${product.price.toFixed(2)}`));
    assert.ok(card.includes(`data-add-to-cart="${product.id}"`));
  });
}
