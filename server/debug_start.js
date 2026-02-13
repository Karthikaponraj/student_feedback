try {
    require('./index.js');
} catch (err) {
    console.error('SERVER FAILED TO START:');
    console.error(err);
    process.exit(1);
}
