"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const default_1 = __importDefault(require("./routes/default"));
const attestation_1 = __importDefault(require("./routes/attestation"));
const assertion_1 = __importDefault(require("./routes/assertion"));
const body_parser_1 = __importDefault(require("body-parser"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const express_session_1 = __importDefault(require("express-session"));
const crypto_1 = __importDefault(require("crypto"));
const mongoose_1 = __importDefault(require("mongoose"));
const cors = require('cors');
//import users from './routes/users';
require('dotenv').config();
const path = require('path');
const app = (0, express_1.default)();
//connect to MongoDB
// mongoose.connect('mongodb+srv://deafhole:microsoft@cluster0.7ssubtn.mongodb.net/zygi?retryWrites=true&w=majority&appName=Cluster0').then(
//     () => {console.log('Connected to MongoDB')},
//     err => {console.log('Error connecting to MongoDB')}
// );

app.use(cors());

mongoose_1.default.connect(process.env.MONGO_DB_URI || 'mongodb+srv://deafhole:microsoft@cluster0.7ssubtn.mongodb.net/zygi?retryWrites=true&w=majority&appName=Cluster0').then(() => console.log('Connected to MongoDB'), err => console.log('Error connecting to MongoDB', err));
app.use(body_parser_1.default.urlencoded({ extended: false }));
app.use(body_parser_1.default.json());
app.use((0, express_session_1.default)({
    secret: crypto_1.default.randomBytes(32).toString('hex'),
    resave: true,
    saveUninitialized: true
}));
app.use((0, cookie_parser_1.default)());

//app.use(express.static('./src/public/'));
//need to make a build folder

console.log('Directory:', __dirname);
console.log('Serving files from:', path.join(__dirname, 'public'));
console.log('Sign-in page path:', path.join(__dirname, 'public', 'signin.html'));

//this is the line that serves the files
app.use(express_1.default.static(path.join(__dirname, 'public')));


// app.get('/test.css', (req, res) => {
//     res.sendFile(path.join(__dirname, 'public', 'test.css'));
// });

// app.get('/signin', (req, res) => {
//     res.sendFile(path.join(__dirname, 'public', 'signin.html'));
// });

app.get('/dashboard', (req, res) => {
    console.log('Dashboard requested');
    res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});




//const port = 3000;
/**
 * routes
 */
app.use('/', default_1.default);
app.use('/attestation', attestation_1.default);
app.use('/assertion', assertion_1.default);
//app.use('/users', users);
app.listen(process.env.PORT, () => {
    console.log(`listen port: ${process.env.PORT}`);
});
