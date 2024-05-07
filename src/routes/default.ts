import express, { Request, Response } from 'express';
import {User} from '../models/userSchema';

const router = express.Router();

router.get('/userinfo', async (req: Request, res: Response) => {
  if (!req.session.isLoggedIn || !req.session.username) {
    return res.json({
      status: 'failed',
      errorMessage: 'Not logged in.',
    });
  }
  
  try {
    const user = await User.findOne({ username: req.session.username });
    if (!user) {
      return res.json({
        status: 'failed',
        errorMessage: 'User not found.',
      });
    }

    res.json({
      status: 'ok',
      errorMessage: '',
      username: user.username
    });
  } catch (error) {
    res.status(500).json({
      status: 'failed',
      errorMessage: 'Error retrieving user information.'
    });
  }
});

router.get('/logout', (req: Request, res: Response) => {
  req.session.destroy((err) => {
    if (err) {
      return res.json({
        status: 'failed',
        errorMessage: 'Error logging out.',
        //errorMessage: err.message,
      });
    }
  });
  res.json({
    status: 'ok',
    errorMessage: ''
  });
});

export default router;