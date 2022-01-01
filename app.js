const express = require('express');
const config = require('config');
const mongoose = require('mongoose');
const app = express();
const port = process.env.port || 8080;
const mongo = config.get('mongo');

app.use(express.json({extended: true}));
app.use('/api/auth', require('./routes/authrotes'));

async function run () {
    try {
        await mongoose.connect(mongo);
        app.listen(port, () => {console.log(`app is running on port ${port}`)})
     } catch(e) {
        console.log('Ошибка!' + e);
        process.exit()
     }

}

run()