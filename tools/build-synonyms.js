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

// Swaps that essay writers make all the time and WordNet files under different meanings.
// Base forms only (endings are handled when matching); a word can sit in several groups.
const EXTRA = [
  // verbs for what a composer or a technique does
  'show demonstrate illustrate highlight emphasise emphasize underscore underline reveal convey depict portray present display exhibit expose represent reflect capture foreground accentuate showcase spotlight express manifest evince',
  'explore examine investigate probe consider interrogate analyse analyze scrutinise scrutinize trace study contemplate navigate',
  'suggest imply indicate signal hint connote signify denote insinuate allude intimate',
  'symbolise symbolize represent embody epitomise epitomize exemplify personify typify encapsulate signify characterise characterize',
  'criticise criticize condemn critique denounce censure rebuke attack lambast',
  'satirise satirize mock lampoon ridicule parody',
  'challenge question subvert undermine destabilise destabilize contest interrogate dispute refute reject repudiate rebut',
  'create construct craft build form shape manufacture fabricate forge fashion produce generate establish develop compose design devise conjure',
  'posit proffer propose present offer advance assert argue contend claim maintain suggest propound',
  'use utilise utilize employ leverage harness deploy apply exploit wield adopt',
  'allow enable permit let empower facilitate afford grant',
  'reinforce strengthen affirm reaffirm cement consolidate bolster underscore solidify confirm support',
  'evoke elicit arouse provoke stimulate stir inspire instil instill incite prompt engender generate',
  'cause precipitate catalyse catalyze trigger spark induce engender provoke prompt',
  'mirror echo parallel reflect resemble recall resonate',
  'reframe reimagine reconceptualise reconceptualize reshape reinterpret recontextualise recontextualize rework reconfigure transform appropriate adapt',
  'restrict limit inhibit curtail constrain suppress repress stifle confine prohibit hinder diminish reduce curb',
  'manipulate exploit weaponise weaponize orchestrate engineer',
  'coerce compel force pressure oblige',
  'advocate promote champion endorse support encourage espouse privilege favour favor prioritise prioritize',
  'acknowledge recognise recognize concede admit accept realise realize',
  'compare juxtapose contrast liken equate parallel',
  'worsen exacerbate intensify heighten amplify aggravate compound deepen magnify',
  'culminate climax coalesce converge conclude result',
  'position place situate frame cast establish',
  'envision envisage imagine picture conceive foresee visualise visualize',
  'foreshadow prefigure presage portend anticipate prelude',
  'render depict portray present',
  'warn caution admonish alert',
  'describe depict detail recount portray outline',
  'declare state assert proclaim announce say claim',
  'implore beg plead urge ask entreat beseech',
  'dehumanise dehumanize degrade objectify debase',
  'erode corrode degrade deteriorate decay corrupt weaken',
  'convey communicate express articulate transmit impart',
  'operate function serve act work',
  'arise emerge stem originate derive spring',
  'characterise characterize define typify mark distinguish underpin',
  'infuse imbue instil instill fill permeate saturate lace suffuse',
  'relinquish surrender abandon renounce forfeit yield cede',
  'expose reveal uncover unveil unmask disclose',
  'ensure guarantee secure safeguard',
  'sustain maintain preserve uphold retain',
  'confront face challenge encounter tackle address',
  // alternatives written side by side in the essays themselves
  'shift change evolve transform alter',
  'suspicion concern anxiety fear unease',
  'boundary parameter limit',
  'construct framework structure',
  'aristocracy governance leadership rule',
  'hierarchy orthodoxy order',
  'aspiration desire ambition',
  'authority power control dominance',
  'awakening revelation epiphany realisation realization',
  'corrupt questionable',
  'covert subtle',
  'deterioration corrosion decay decline',
  'divergent disparate different',
  'downfall dismissal regression decline',
  'driven motivated',
  'erratic irrational impulsive deceptive',
  'fracture schism rupture division',
  'humanity morality',
  'inane repetitive',
  'integrity honesty',
  'justice righteousness',
  'mediate reconcile',
  'mediation equilibrium balance',
  'obligation responsibility duty',
  'plot scheme machination',
  'prisoner inmate',
  'rejection repudiation',
  'resentment vengefulness vengeance',
  'resonate translate evolve',
  'selfish personal',
  'define underpin',
  // everyday swaps
  'idea notion concept thought belief',
  'sad unhappy sorrowful miserable',
  'illness disease sickness disorder',
  'clear obvious evident apparent',
  'important significant crucial vital key essential',
  'however yet nevertheless nonetheless but though although',
  'therefore thus hence consequently',
  'also additionally furthermore moreover',
  'audience reader responder viewer',
  'composer author writer playwright poet novelist',
  'human humanity mankind humankind people'
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
