const assert = require('node:assert');
const { test } = require('node:test');
const { getMoonIllumination, parseCloudCover } = require('../js/server.js');

test('Moon Illumination Logic', (t) => {
    // Known New Moon: 2000-01-06T18:14:00Z
    const newMoon = new Date('2000-01-06T18:14:00Z');
    const illumNew = getMoonIllumination(newMoon);
    assert.ok(illumNew < 0.01, `New moon illumination should be near 0, got ${illumNew}`);

    // Known Full Moon: ~14.76 days later (Jan 21 2000)
    const fullMoon = new Date(newMoon.getTime() + 14.765 * 24 * 60 * 60 * 1000);
    const illumFull = getMoonIllumination(fullMoon);
    assert.ok(illumFull > 0.99, `Full moon illumination should be near 1, got ${illumFull}`);

    // Test with date before known new moon (negative diff)
    const prevFullMoon = new Date(newMoon.getTime() - 14.765 * 24 * 60 * 60 * 1000);
    const illumPrevFull = getMoonIllumination(prevFullMoon);
    assert.ok(illumPrevFull > 0.99, `Previous full moon illumination should be near 1, got ${illumPrevFull}`);
});

test('Cloud Cover Parsing', (t) => {
    assert.strictEqual(parseCloudCover('Clear'), 0);
    assert.strictEqual(parseCloudCover('Mostly Clear'), 0); // Contains 'clear'
    assert.strictEqual(parseCloudCover('1/4 covered'), 25);
    assert.strictEqual(parseCloudCover('1/2 covered'), 50);
    assert.strictEqual(parseCloudCover('over 1/2 covered'), 75);
    assert.strictEqual(parseCloudCover('Unknown'), 10); // Default
    assert.strictEqual(parseCloudCover(null), 100);
});
