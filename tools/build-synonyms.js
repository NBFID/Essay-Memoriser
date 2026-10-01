// Builds ../synonyms.txt: one line per group of words close enough in meaning to count as the same answer.
// Run it once after `npm i --no-save wordnet-db`:  node tools/build-synonyms.js
//
// Most groups come from WordNet: words that share a meaning, a verb with the broader verb it is a
// kind of ("reveal" is a way to "show"), and an adjective with the one it is a shade of. A word only
// joins a group if that meaning is one of its eight most common, which keeps the pairs close.
// Single plain words only; no names, species or chemicals.
const fs = require('fs');
const path = require('path');
const dir = path.join(path.dirname(require.resolve('wordnet-db')), 'dict') + path.sep;
const SENSES = 8;
const ok = w => /^[a-z]{3,}$/.test(w);
const SKIP = new Set(['05', '20', '27']);  // noun.animal, noun.plant, noun.substance

// Swaps that essay writers make all the time and WordNet files under different meanings
const EXTRA = [
  'show demonstrate illustrate highlight emphasise emphasize underscore underline reveal convey depict portray present display exhibit expose represent reflect capture',
  'explore examine investigate probe consider interrogate analyse analyze scrutinise scrutinize',
  'suggest imply indicate signal hint connote',
  'criticise criticize condemn critique challenge question denounce',
  'idea notion concept thought belief',
  'sad unhappy sorrowful miserable',
  'clear obvious evident apparent',
  'important significant crucial vital key essential',
  'however yet nevertheless nonetheless but though although',
  'therefore thus hence consequently',
  'also additionally furthermore moreover',
  'create construct craft build form shape',
  'audience reader responder viewer',
  'composer author writer playwright poet novelist',
  'power control authority dominance',
  'change transform alter shift',
  'human humanity mankind humankind people',
  'use utilise utilize employ'
];

const groups = new Map();  // part of speech + offset -> Set of words
const skip = new Set();
for (const pos of ['noun', 'verb', 'adj', 'adv']) {
  for (const line of fs.readFileSync(dir + 'data.' + pos, 'utf8').split('\n')) {
    if (!/^\d{8} /.test(line)) continue;
    const f = line.split(' ');
    if (pos === 'noun' && SKIP.has(f[1])) skip.add(pos + f[0]);
  }
  for (const line of fs.readFileSync(dir + 'index.' + pos, 'utf8').split('\n')) {
    if (!line || line[0] === ' ') continue;
    const f = line.trim().split(' ');
    if (!ok(f[0])) continue;
    f.slice(6 + +f[3]).slice(0, SENSES).forEach(off => {  // its meanings, most common first
      const id = pos + off;
      if (skip.has(id)) return;
      if (!groups.has(id)) groups.set(id, new Set());
      groups.get(id).add(f[0]);
    });
  }
}

const lines = new Set(EXTRA);
for (const set of groups.values()) if (set.size > 1) lines.add([...set].sort().join(' '));
for (const [pos, sym] of [['verb', '@'], ['adj', '&']]) {
  for (const line of fs.readFileSync(dir + 'data.' + pos, 'utf8').split('\n')) {
    if (!/^\d{8} /.test(line)) continue;
    const f = line.split(' ');
    const a = groups.get(pos + f[0]);
    if (!a) continue;
    const at = 4 + 2 * parseInt(f[3], 16), n = +f[at];
    for (let i = 0; i < n; i++) {
      const p = f.slice(at + 1 + 4 * i, at + 5 + 4 * i);
      const b = p[0] === sym && groups.get(pos + p[1]);
      if (!b) continue;
      const both = new Set([...a, ...b]);
      if (both.size > 1 && both.size <= 12) lines.add([...both].sort().join(' '));
    }
  }
}

const head = '# Word groups built from WordNet 3.1. Copyright 2011 by Princeton University. All rights reserved. https://wordnet.princeton.edu/license-and-commercial-use\n';
const out = head + [...lines].sort().join('\n') + '\n';
fs.writeFileSync(path.join(__dirname, '..', 'synonyms.txt'), out);
console.log(lines.size + ' groups, ' + Math.round(out.length / 1024) + ' KB');
