import express from 'express';
import defaultrouttes from './routes/default';
import attestation from './routes/attestation';
import assertion from './routes/assertion';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import expressSession from 'express-session';
import crypto from 'crypto';
import mongoose from 'mongoose';
import config from './routes/config'; // Import the configuration

//import users from './routes/users';

require('dotenv').config();
const path = require('path');

const app: express.Express = express()

declare module 'express-session' {
  interface SessionData {
    username?: string;
    currentChallenge?: string;
    isLoggedIn?: boolean;
  }
}

//connect to MongoDB
// mongoose.connect('mongodb+srv://deafhole:microsoft@cluster0.7ssubtn.mongodb.net/zygi?retryWrites=true&w=majority&appName=Cluster0').then(
//     () => {console.log('Connected to MongoDB')},
//     err => {console.log('Error connecting to MongoDB')}
// );

mongoose.connect(process.env.MONGO_DB_URI || 'mongodb+srv://deafhole:microsoft@cluster0.7ssubtn.mongodb.net/zygi?retryWrites=true&w=majority&appName=Cluster0').then(
  () => console.log('Connected to MongoDB'),
  err => console.log('Error connecting to MongoDB', err)
);




app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())
app.use(expressSession({
  secret: crypto.randomBytes(32).toString('hex'),
  resave: true,
  saveUninitialized: true
}));
app.use(cookieParser());
//app.use(express.static('./src/public/'));

//need to make a build folder
app.use(express.static(path.join(__dirname, 'public')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

//const port = 3000;

/** 
 * routes
 */
app.use('/', defaultrouttes);
app.use('/attestation', attestation);
app.use('/assertion', assertion);

//app.use('/users', users);

app.listen(process.env.PORT, () => {
  console.log(`listen port: ${process.env.PORT}`);
});