const express = require('express');
const config = require('config');
const mongoose = require('mongoose');
const app = express();
const port = process.env.PORT || 8080;
const mongo = config.get('mongo');
const cors = require('cors');
const { db } = require('./models/Collection.js');

app.use(cors());
app.use(express.json({limit: '50mb', extended: true}));
app.use(express.urlencoded( {limit: '50mb', extended: true}))
app.use('/api', require('./routes/routes.js'));


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