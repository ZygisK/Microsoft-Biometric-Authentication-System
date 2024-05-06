import express from 'express';
import defaultrouttes from './routes/default';
import attestation from './routes/attestation';
import assertion from './routes/assertion';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import expressSession from 'express-session';
import crypto from 'crypto';
import mongoose from 'mongoose';
import cors from 'cors'; // Import CORS module

//import users from './routes/users';

const app: express.Express = express()

declare module 'express-session' {
  interface SessionData {
    username?: string;
    currentChallenge?: string;
    isLoggedIn?: boolean;
  }
}

//connect to MongoDB
mongoose.connect('mongodb+srv://deafhole:microsoft@cluster0.7ssubtn.mongodb.net/zygi?retryWrites=true&w=majority&appName=Cluster0').then(
    () => {console.log('Connected to MongoDB')},
    err => {console.log('Error connecting to MongoDB')}
);

// Use CORS middleware
app.use(cors());

app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())
app.use(expressSession({
  secret: crypto.randomBytes(32).toString('hex'),
  resave: true,
  saveUninitialized: true
}));
app.use(cookieParser());
app.use(express.static('./src/public/'));

// Add the middleware function to set HTTP headers
app.use((req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, post-check=0, pre-check=0');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  next();
});

const port = 3000;

/** 
 * routes
 */
app.use('/', defaultrouttes);
app.use('/attestation', attestation);
app.use('/assertion', assertion);

//app.use('/users', users);

app.listen(port, () => {
  console.log(`listen port: ${port}`);
});