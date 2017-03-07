
const fs = require('fs');
const path = require('path');

const testUtil = requireCompiled('test_util');

const cases    = fs.readdirSync(__dirname + '/cases');
const expected = trai(_ => fs.readdirSync(__dirname + '/expected'), []);

function requireCompiled(path) {
    try {
        return require(__dirname + '/../build/tests/' + path);
    } catch (_) {
        console.error('Library not compiled: run tsc first');
        process.exit(1);
    }
}

function trai(f, def) {
    try {
        return f();
    } catch (_) {
        return def;
    }
}

function rmrf(path) {
    if (!fs.existsSync(path)) {
        return;
    }

    if (fs.statSync(path).isFile()) {
        fs.unlinkSync(path);
        return;
    }

    fs.readdirSync(path).forEach(p => rmrf(path + '/' + p));
    fs.rmdirSync(path);
}

const allResults = {};
for (const c of cases) {
    const results = [];

    testUtil.__colector.apply = function(res) {
        results.push(res);
    };

    // require the compiled
    requireCompiled('cases/' + c.replace(/\.ts$/, ''));

    const text = results
        .map(x => JSON.stringify(x, null, '    '))
        .join('\n\n');

    allResults[c] = text + '\n';
}

rmrf(__dirname + '/actual');
fs.mkdirSync(__dirname + '/actual');

const actualSources = {};
for (const c of cases) {
    const fileName = c + '.json';

    fs.writeFileSync(
        __dirname + '/actual/' + fileName,
        allResults[c]
    );

    actualSources[fileName] = allResults[c];
}

const expectedSources = {};
for (const x of expected) {
    expectedSources[x] = fs.readFileSync(__dirname + '/expected/' + x, 'utf8');
}

const errors = [];
const allFiles = new Set(Object.keys(expectedSources).concat(Object.keys(actualSources)));
for (const file of allFiles) {
    if (!actualSources[file]) {
        errors.push(`File deleted: "${file}"`);
        continue;
    }

    if (!expectedSources[file]) {
        errors.push(`New file: "${file}"`);
        continue;
    }

    if (actualSources[file] !== expectedSources[file]) {
        errors.push(`File changed: "${file}"`);
        continue;
    }
}

console.log(errors.length ? errors.join('\n')
                          : 'All good!');

// remove clutter
errors.length || rmrf(__dirname + '/actual');

process.exit(errors.length && 1)
