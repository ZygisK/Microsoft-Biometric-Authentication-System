"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const userSchema_1 = require("../models/userSchema");
const router = express_1.default.Router();
router.get('/userinfo', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    // if (!req.session.isLoggedIn || !req.session.username) {
    //     return res.json({
    //         status: 'failed',
    //         errorMessage: 'Not logged in.',
    //     });
    // }
    // try {
    //     const user = yield userSchema_1.User.findOne({ username: req.session.username });
    //     if (!user) {
    //         return res.json({
    //             status: 'failed',
    //             errorMessage: 'User not found.',
    //         });
    //     }
    //     res.json({
    //         status: 'ok',
    //         errorMessage: '',
    //         username: user.username
    //     });
    // }
    // catch (error) {
    //     res.status(500).json({
    //         status: 'failed',
    //         errorMessage: 'Error retrieving user information.'
    //     });
    // }
}));
router.get('/logout', (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.json({
          status: 'failed',
          errorMessage: 'Error logging out.',
        });
      }
  
     // res.redirect(302,'http://localhost:3000/signin.html');
      res.redirect(302,'https://mern-video.azurewebsites.net/signin.html');
      

    });
  });
exports.default = router;
