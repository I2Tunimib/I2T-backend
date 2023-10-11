import ParseService from "../services/parse/parse.service";
import config from "../../config/index";
import jwt from 'jsonwebtoken';

const {
  JWT_SECRET,
  JWT_EXPIRES_IN,
  helpers: {
    getUsersPath
  }
} = config;

const AuthController = {
  signIn: async (req, res, next) => {
    console.log(req.body);
    const { username: usernameReq, password: passwordReq } = req.body;

    try {
      // check if user exist
      const user = await ParseService.findOneInJson({
        path: getUsersPath(),
        pattern: 'users.*',
        condition: ({ username, password }) => usernameReq === username && password === passwordReq
      });

      console.log(user);

      if (!user) {
        return res.status(401).json({ error: 'Invalid username or password' });
      }

      // sign a new token
      const token = jwt.sign({
        id: user.id,
        username: user.username
      },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
      );

      res.status(200).json({ token });
    } catch (err) {
      next(err);
    }
  },
  me: async (req, res, next) => {
    const { token } = req.body;

    try {
      const decoded = jwt.verify(token, JWT_SECRET);

      const user = await ParseService.findOneInJson({
        path: getUsersPath(),
        pattern: 'users.*',
        condition: ({ id }) => id === decoded.id
      });

      if (!user) {
        return res.status(400).json({ loggedIn: false, user: null });
      }

      res.status(200).json({ loggedIn: true, user: { id: user.id, username: user.username } });
    } catch (err) {
      next(err);
    }

  }
}

export default AuthController;