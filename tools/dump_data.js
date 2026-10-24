// Prints the app's word/sentence/phrase data as JSON, so build_assets.py reads exactly what the app reads.
global.window = global;
const path = require('path');
const dataDir = path.join(__dirname, '..', 'js', 'data');
['categories.js', 'words.js', 'sentences.js', 'phrases.js'].forEach((f) => require(path.join(dataDir, f)));
process.stdout.write(JSON.stringify({ words: WORDS, sentences: SENTENCES, phrases: PHRASES }));
