import test from 'node:test';
import assert from 'node:assert/strict';
import { clientIndustries, industrySelection, industryLabel } from '../src/lib/client-industries.js';

test('industry options cover requested industries with unique identifiers', () => {
  for (const id of ['real-estate', 'mortgage-lending', 'roofing', 'medical']) {
    assert.equal(industrySelection(id), id);
    assert.notEqual(industryLabel(id), id);
  }
  assert.equal(new Set(clientIndustries.map(([id]) => id)).size, clientIndustries.length);
});
test('blank and custom industry values remain usable without replacing saved data', () => {
  assert.equal(industrySelection(''), '');
  assert.equal(industrySelection('other'), 'other');
  assert.equal(industrySelection('Solar Installation'), 'other');
  assert.equal(industryLabel('Solar Installation'), 'Solar Installation');
  assert.equal(industryLabel(''), 'Not entered');
});
