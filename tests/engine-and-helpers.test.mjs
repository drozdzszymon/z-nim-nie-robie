import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

const moduleCache = new Map();

function loadTsModule(absPath) {
  const normalized = path.normalize(absPath);
  if (moduleCache.has(normalized)) {
    return moduleCache.get(normalized).exports;
  }

  const source = fs.readFileSync(normalized, 'utf8');
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
    fileName: normalized,
  }).outputText;

  const mod = { exports: {} };
  moduleCache.set(normalized, mod);

  const localRequire = (specifier) => {
    if (specifier.startsWith('.')) {
      const base = path.resolve(path.dirname(normalized), specifier);
      const candidates = [base, `${base}.ts`, `${base}.tsx`, path.join(base, 'index.ts')];
      const found = candidates.find((c) => fs.existsSync(c) && fs.statSync(c).isFile());
      if (!found) {
        throw new Error(`Cannot resolve ${specifier} from ${normalized}`);
      }
      return loadTsModule(found);
    }
    throw new Error(`External import not mocked in unit test: ${specifier}`);
  };

  new Function('exports', 'module', 'require', transpiled)(mod.exports, mod, localRequire);
  return mod.exports;
}

const typesMod = loadTsModule(path.join(rootDir, 'app', '(tabs)', 'types.ts'));
const matchmakerMod = loadTsModule(path.join(rootDir, 'app', '(tabs)', 'engine', 'matchmaker.ts'));
const helpersMod = loadTsModule(path.join(rootDir, 'constants', 'training-helpers.ts'));
const i18nMod = loadTsModule(path.join(rootDir, 'app', '(tabs)', 'i18n.ts'));

const { DEFAULT_SPARRING_OPTIONS } = typesMod;
const { generateRound, applyRoundResult } = matchmakerMod;
const {
  parsePlayerWeight,
  sanitizeDecimalWeightInput,
  sanitizeStoredPlayers,
  sanitizeTrainingHistory,
  calcBestWeightThreshold,
  buildTriadZadaniowkiGroupsWithResting,
  extractActiveStagePairs,
} = helpersMod;
const { t } = i18nMod;

const makePlayer = ({
  id,
  type = 'ADULT',
  gear = 'NO',
  gender = 'M',
  weight = 80,
  skillLevel = type === 'ADULT' ? 2 : 0,
  isGuest = false,
}) => ({
  id,
  type,
  gear,
  gender,
  weight,
  skillLevel,
  isGuest,
  restDebt: 0,
  lastRestRound: 0,
  consecutiveMatches: 0,
  helpedKidCount: 0,
  mismatchDebt: 0,
});

const pairKey = (a, b) => [a, b].sort().join('::');

test('genderMatching PREFER completes independently per age group without infinite KID/ADULT repeat deadlock', () => {
  const history = new Map();
  let roster = [
    makePlayer({ id: 'KF1', type: 'KID', gender: 'F', weight: 36 }),
    makePlayer({ id: 'KF2', type: 'KID', gender: 'F', weight: 38 }),
    makePlayer({ id: 'KM1', type: 'KID', gender: 'M', weight: 37 }),
    makePlayer({ id: 'KM2', type: 'KID', gender: 'M', weight: 39 }),
    makePlayer({ id: 'AF1', type: 'ADULT', gender: 'F', weight: 62, skillLevel: 2 }),
    makePlayer({ id: 'AF2', type: 'ADULT', gender: 'F', weight: 64, skillLevel: 2 }),
    makePlayer({ id: 'AM1', type: 'ADULT', gender: 'M', weight: 65, skillLevel: 2 }),
    makePlayer({ id: 'AM2', type: 'ADULT', gender: 'M', weight: 67, skillLevel: 2 }),
  ];

  const options = { ...DEFAULT_SPARRING_OPTIONS, genderMatching: 'PREFER' };

  const r1 = generateRound(roster, history, 1, [], options, 3);
  const r1Keys = new Set(r1.matches.map((m) => pairKey(m.p1.id, m.p2.id)));
  assert.ok(r1Keys.has(pairKey('KF1', 'KF2')), 'Round 1 should pair kid females together');
  assert.ok(r1Keys.has(pairKey('AF1', 'AF2')), 'Round 1 should pair adult females together');
  roster = applyRoundResult(r1.matches, r1.resting, 1, history, roster);

  const r2 = generateRound(roster, history, 2, [], options, 3);
  const r2Keys = new Set(r2.matches.map((m) => pairKey(m.p1.id, m.p2.id)));
  assert.ok(!r2Keys.has(pairKey('KF1', 'KF2')), 'Round 2 must not repeat KF1 vs KF2');
  assert.ok(!r2Keys.has(pairKey('AF1', 'AF2')), 'Round 2 must not repeat AF1 vs AF2');
});

test('genderMatching PREFER with 3 females and 0 males respects VIP noRestPlayers', () => {
  const history = new Map();
  let roster = [
    makePlayer({ id: 'F1', type: 'ADULT', gender: 'F', weight: 60 }),
    makePlayer({ id: 'F_VIP', type: 'ADULT', gender: 'F', weight: 62 }),
    makePlayer({ id: 'F3', type: 'ADULT', gender: 'F', weight: 64 }),
  ];
  const options = { ...DEFAULT_SPARRING_OPTIONS, genderMatching: 'PREFER' };

  for (let round = 1; round <= 4; round++) {
    const res = generateRound(roster, history, round, ['F_VIP'], options, 4);
    assert.equal(res.resting.length, 1);
    assert.notEqual(res.resting[0].id, 'F_VIP', `VIP player must not rest in round ${round}`);
    roster = applyRoundResult(res.matches, res.resting, round, history, roster);
  }
});

test('genderMatching STRICT composes with weightDivisionEnabled', () => {
  const history = new Map();
  const roster = [
    makePlayer({ id: 'LF1', gender: 'F', weight: 58 }),
    makePlayer({ id: 'LF2', gender: 'F', weight: 62 }),
    makePlayer({ id: 'LM1', gender: 'M', weight: 70 }),
    makePlayer({ id: 'LM2', gender: 'M', weight: 74 }),
    makePlayer({ id: 'HF1', gender: 'F', weight: 84 }),
    makePlayer({ id: 'HF2', gender: 'F', weight: 88 }),
    makePlayer({ id: 'HM1', gender: 'M', weight: 92 }),
    makePlayer({ id: 'HM2', gender: 'M', weight: 96 }),
  ];
  const options = {
    ...DEFAULT_SPARRING_OPTIONS,
    genderMatching: 'STRICT',
    weightDivisionEnabled: true,
    weightDivisionThreshold: 80,
  };

  const { matches } = generateRound(roster, history, 1, [], options, 3);
  assert.equal(matches.length, 4);
  for (const m of matches) {
    assert.equal(m.p1.gender, m.p2.gender, 'STRICT gender must never mix M and F');
    assert.equal(m.p1.weight <= 80, m.p2.weight <= 80, 'Weight division must not cross threshold');
  }
});

test('minority outfit round-robin does not erase outfit preference for promoted kid or new cycle', () => {
  const history = new Map();
  let roster = [
    makePlayer({ id: 'N1', type: 'ADULT', gear: 'NO', weight: 64, skillLevel: 1 }),
    makePlayer({ id: 'N2', type: 'ADULT', gear: 'NO', weight: 66, skillLevel: 1 }),
    makePlayer({ id: 'G1', type: 'ADULT', gear: 'GI', weight: 68, skillLevel: 1 }),
    makePlayer({ id: 'G2', type: 'ADULT', gear: 'GI', weight: 75, skillLevel: 2 }),
    makePlayer({ id: 'G3', type: 'ADULT', gear: 'GI', weight: 82, skillLevel: 3 }),
    makePlayer({ id: 'G4', type: 'ADULT', gear: 'GI', weight: 85, skillLevel: 3 }),
    makePlayer({ id: 'G5', type: 'ADULT', gear: 'GI', weight: 90, skillLevel: 4 }),
    makePlayer({ id: 'K1', type: 'KID', gear: 'GI', weight: 52 }),
  ];

  // Round 1: 7 adults + 1 GI kid -> K1 promoted to safest GI adult (G1), N1 fights N2
  const r1 = generateRound(roster, history, 1, [], DEFAULT_SPARRING_OPTIONS, 4);
  const k1MatchR1 = r1.matches.find((m) => m.p1.id === 'K1' || m.p2.id === 'K1');
  assert.ok(k1MatchR1);
  const k1PartnerR1 = k1MatchR1.p1.id === 'K1' ? k1MatchR1.p2 : k1MatchR1.p1;
  assert.equal(k1PartnerR1.gear, 'GI', 'Round 1 promoted GI kid should match a GI adult');
  roster = applyRoundResult(r1.matches, r1.resting, 1, history, roster);

  // Round 2: Even though N1 and N2 already met in Round 1, K1 (in GI) still has 4 unmet GI adults
  const r2 = generateRound(roster, history, 2, [], DEFAULT_SPARRING_OPTIONS, 4);
  const k1MatchR2 = r2.matches.find((m) => m.p1.id === 'K1' || m.p2.id === 'K1');
  assert.ok(k1MatchR2);
  const k1PartnerR2 = k1MatchR2.p1.id === 'K1' ? k1MatchR2.p2 : k1MatchR2.p1;
  assert.equal(k1PartnerR2.gear, 'GI', 'Round 2 promoted GI kid must still prefer unmet GI adults');
});

test('exact bitmask DP for 12 adults and beam solver for 14 kids achieve 0 repeats and avoid guest-vs-guest', () => {
  const history = new Map();
  let adults = Array.from({ length: 12 }, (_, i) =>
    makePlayer({
      id: `A${i + 1}`,
      type: 'ADULT',
      gear: i < 6 ? 'GI' : 'NO',
      weight: 65 + i * 3,
      skillLevel: ((i % 4) + 1),
      isGuest: i < 3, // 3 guests among 12 adults -> guest-vs-guest is 100% avoidable
    }),
  );

  const seenAdultPairs = new Set();
  for (let round = 1; round <= 6; round++) {
    const res = generateRound(adults, history, round, [], DEFAULT_SPARRING_OPTIONS, 6);
    assert.equal(res.matches.length, 6);
    for (const m of res.matches) {
      const key = pairKey(m.p1.id, m.p2.id);
      assert.ok(!seenAdultPairs.has(key), `Unexpected repeat ${key} in round ${round}`);
      seenAdultPairs.add(key);
      assert.ok(!(m.p1.isGuest && m.p2.isGuest), `Guest-vs-guest pair ${key} should be avoided`);
    }
    adults = applyRoundResult(res.matches, res.resting, round, history, adults);
  }

  const kidHistory = new Map();
  let kids = Array.from({ length: 14 }, (_, i) =>
    makePlayer({ id: `K${i + 1}`, type: 'KID', gear: i % 2 === 0 ? 'GI' : 'NO', weight: 30 + i * 2 }),
  );
  const seenKidPairs = new Set();
  for (let round = 1; round <= 6; round++) {
    const res = generateRound(kids, kidHistory, round, [], DEFAULT_SPARRING_OPTIONS, 6);
    assert.equal(res.matches.length, 7);
    for (const m of res.matches) {
      const key = pairKey(m.p1.id, m.p2.id);
      assert.ok(!seenKidPairs.has(key), `Unexpected kid repeat ${key} in round ${round}`);
      seenKidPairs.add(key);
    }
    kids = applyRoundResult(res.matches, res.resting, round, kidHistory, kids);
  }
});

test('applyRoundResult is immutable and does not mutate input roster objects', () => {
  const p1 = makePlayer({ id: 'P1', weight: 75 });
  const p2 = makePlayer({ id: 'P2', weight: 76 });
  const p3 = makePlayer({ id: 'P3', weight: 77 });
  const originalRoster = [p1, p2, p3];
  const history = new Map();

  const updated = applyRoundResult([{ p1, p2 }], [p3], 1, history, originalRoster);
  assert.equal(p1.consecutiveMatches, 0, 'Original p1 must remain untouched');
  assert.equal(p3.lastRestRound, 0, 'Original p3 must remain untouched');
  assert.equal(updated.find((p) => p.id === 'P1').consecutiveMatches, 1);
  assert.equal(updated.find((p) => p.id === 'P3').lastRestRound, 1);
});

test('buildTriadZadaniowkiGroupsWithResting never leaves a lone adult or singleton group unrendered', () => {
  for (const kidCount of [1, 2, 3, 4, 5, 6]) {
    const players = [
      ...Array.from({ length: kidCount }, (_, i) =>
        makePlayer({ id: `KID_${i + 1}`, type: 'KID', gear: i % 2 === 0 ? 'GI' : 'NO', weight: 35 + i * 4 }),
      ),
      makePlayer({ id: 'COACH_ADULT', type: 'ADULT', gear: 'GI', weight: 78, skillLevel: 4 }),
    ];

    const { groups, resting } = buildTriadZadaniowkiGroupsWithResting(players);
    let accounted = resting.length;
    for (const g of groups) {
      assert.ok(g.length === 2 || g.length === 3, `Group size must be 2 or 3, got ${g.length} for ${kidCount} kids + 1 adult`);
      accounted += g.length;
    }
    assert.equal(accounted, players.length, `All players must be accounted for (${kidCount} kids + 1 adult)`);
  }

  const single = buildTriadZadaniowkiGroupsWithResting([makePlayer({ id: 'SOLO' })]);
  assert.equal(single.groups.length, 0);
  assert.equal(single.resting.length, 1);
  assert.equal(single.resting[0].id, 'SOLO');
});

test('extractActiveStagePairs covers all 6 triad stages accurately', () => {
  const triad = [
    makePlayer({ id: 'P_A' }),
    makePlayer({ id: 'P_B' }),
    makePlayer({ id: 'P_C' }),
  ];
  const stagePairs = [];
  for (let step = 1; step <= 6; step++) {
    const pairs = extractActiveStagePairs({
      trainingMode: 'ZADANIOWKI',
      zadaniowkiType: 'TRÓJKI',
      step,
      matches: [],
      zadaniowkiGroups: [triad],
    });
    assert.equal(pairs.length, 1);
    stagePairs.push(`${pairs[0].p1}->${pairs[0].p2}`);
  }
  assert.equal(new Set(stagePairs).size, 6, 'All 6 ordered A/B/C combinations must occur across 6 stages');
});

test('parsePlayerWeight, calcBestWeightThreshold, and storage sanitizers handle edge cases and corrupt inputs', () => {
  assert.equal(sanitizeDecimalWeightInput('82,55..3kg'), '82.553');
  assert.equal(parsePlayerWeight('82,5'), 82.5);
  assert.equal(parsePlayerWeight('0'), null);
  assert.equal(parsePlayerWeight('-75'), null);
  assert.equal(parsePlayerWeight('Infinity'), null);
  assert.equal(parsePlayerWeight('450'), null);

  const decimalPlayers = [
    makePlayer({ id: 'D1', weight: 70.5 }),
    makePlayer({ id: 'D2', weight: 70.5 }),
    makePlayer({ id: 'D3', weight: 71.0 }),
    makePlayer({ id: 'D4', weight: 71.0 }),
  ];
  const threshold = calcBestWeightThreshold(decimalPlayers);
  assert.equal(decimalPlayers.filter((p) => p.weight <= threshold).length, 2);
  assert.equal(decimalPlayers.filter((p) => p.weight > threshold).length, 2);

  assert.deepEqual(sanitizeStoredPlayers('{bad json', false), []);
  assert.deepEqual(sanitizeStoredPlayers('{"not":"an array"}', false), []);

  const migrated = sanitizeStoredPlayers(
    JSON.stringify([
      { id: ' dummy ', type: 'DUMMY', weight: 80, gear: 'GI' },
      { id: ' kowalski ', type: 'ADULT', weight: 84, gear: 'GI', skillLevel: 3 },
      { id: 'KOWALSKI', type: 'ADULT', weight: 90, gear: 'NO', skillLevel: 1 },
      { id: 'BAD_WEIGHT', type: 'ADULT', weight: -10, gear: 'NO' },
    ]),
    true,
  );
  assert.equal(migrated.length, 1);
  assert.equal(migrated[0].id, 'KOWALSKI');
  assert.equal(migrated[0].skillLevel, 4, 'Legacy skill level 3 should migrate to 4 (PRO)');

  assert.deepEqual(sanitizeTrainingHistory('not-json'), []);
  const validHistory = sanitizeTrainingHistory(
    JSON.stringify([
      { id: 's1', date: '2026-04-17T12:00:00.000Z', mode: 'SPARING', rounds: 5, roundTimeMin: 6, players: ['A', 123], pairs: [[{ p1: 'A', p2: 'B' }, null]] },
      { id: '', date: 'invalid' },
    ]),
  );
  assert.equal(validHistory.length, 1);
  assert.deepEqual(validHistory[0].players, ['A']);
  assert.deepEqual(validHistory[0].pairs, [[{ p1: 'A', p2: 'B' }]]);

  assert.equal(t('done', 'EN'), 'DONE');
  assert.equal(t('done', 'PT'), 'PRONTO');
  assert.equal(t('weightThresholdLabel', 'EN'), 'LIMIT:');
});
