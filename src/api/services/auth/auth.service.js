import config from "../../../config/index.js";
import jwt from 'jsonwebtoken';

const {
  JWT_SECRET
} = config


const AuthService = {
  verifyToken: (req) => {
    const token = String(req?.headers?.authorization?.replace('Bearer ', ''));
    const decoded = jwt.verify(token, JWT_SECRET);
    return decoded;
  }
};

export default AuthService;
