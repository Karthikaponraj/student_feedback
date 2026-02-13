
const express = require('express');
const app = express();
const PORT = 5007;

app.get('/', (req, res) => res.send('Hello'));

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Minimal server running on ${PORT}`);
});
