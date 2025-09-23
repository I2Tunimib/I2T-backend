import config from "../../../config/index.js";
import jwt from "jsonwebtoken";

const { JWT_SECRET } = config;

const AuthService = {
  verifyToken: (req) => {
    // Check for authorization header (case insensitive)
    const headers = req?.headers || {};
    const authHeader = headers.authorization || headers.Authorization;

    if (!authHeader) {
      throw new Error("Authorization header missing");
    }

    if (!authHeader.startsWith("Bearer ")) {
      throw new Error('Authorization header must start with "Bearer "');
    }

    const token = authHeader.replace("Bearer ", "");

    if (
      !token ||
      token === "undefined" ||
      token === "null" ||
      token.trim() === ""
    ) {
      throw new Error("Invalid token: token is empty or null");
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    return decoded;
  },
};

export default AuthService;
