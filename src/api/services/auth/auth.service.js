import config from "../../../config/index.js";
import jwt from 'jsonwebtoken';

const {
  JWT_SECRET
} = config


const AuthService = {
  verifyToken: (req) => {
    console.log('verifyToken called with headers:', JSON.stringify(req?.headers, null, 2));
    
    // Check for authorization header (case insensitive)
    const headers = req?.headers || {};
    const authHeader = headers.authorization || headers.Authorization;
    
    console.log('Found authHeader:', authHeader);
    
    if (!authHeader) {
      throw new Error('Authorization header missing');
    }
    
    if (!authHeader.startsWith('Bearer ')) {
      throw new Error('Authorization header must start with "Bearer "');
    }
    
    const token = authHeader.replace('Bearer ', '');
    console.log('Extracted token:', token ? `${token.substring(0, 10)}...` : 'null/empty');
    
    if (!token || token === 'undefined' || token === 'null' || token.trim() === '') {
      throw new Error('Invalid token: token is empty or null');
    }
    
    const decoded = jwt.verify(token, JWT_SECRET);
    console.log('Token decoded successfully, user ID:', decoded?.id);
    return decoded;
  }
};

export default AuthService;
