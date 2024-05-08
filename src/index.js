const express = require('express');
const defaultrouttes = require('./routes/default');
const attestation = require('./routes/attestation');
const assertion = require('./routes/assertion');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const expressSession = require('express-session');
const crypto = require('crypto');
const mongoose = require('mongoose');
const config = require('./routes/config'); // Import the configuration
const path = require('path');

require('dotenv').config();

const app = express();

//connect to MongoDB
mongoose.connect(process.env.MONGO_DB_URI || 'your_mongodb_connection_string_here').then(
  () => console.log('Connected to MongoDB'),
  err => console.log('Error connecting to MongoDB', err)
);

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(expressSession({
  secret: crypto.randomBytes(32).toString('hex'),
  resave: true,
  saveUninitialized: true
}));
app.use(cookieParser());

// Use the built static files after deployment
app.use(express.static(path.join(__dirname, 'public')));

app.get('*', (req, res) => {
  const filePath = path.join(__dirname, 'public', 'index.html');
  console.log('Attempting to serve:', filePath);
  res.sendFile(filePath);
});

/** 
 * routes
 */
app.use('/', defaultrouttes);
app.use('/attestation', attestation);
app.use('/assertion', assertion);

app.listen(process.env.PORT, () => {
  console.log(`Server is listening on port: ${process.env.PORT}`);
});
