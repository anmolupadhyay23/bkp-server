const express = require('express');;
const mongoose = require('mongoose');
const authRouter = require('./routes/auth');
const cors = require('cors');

const PORT = 8000;

const app = express();

app.use(cors());

app.use(express.json());
app.use(authRouter);

mongoose
    .connect('mongodb+srv://anmolupadhyay23:BkpPanditxRajput@bkp.emeress.mongodb.net/?retryWrites=true&w=majority&appName=BKP')
    .then(() => {
        console.log('connection to database successful')
    }).catch((e) => {
        console.log(e);
    })

app.listen(PORT, "0.0.0.0", () => {
    console.log(`connected at port ${PORT}`)
});