try {
    // This is the file produced by webpack
    importScripts('background.js', 'scryptworker.js');
} catch (e) {
    // This will allow you to see error logs during registration/execution
    console.error(e);
}