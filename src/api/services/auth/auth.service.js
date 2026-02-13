import config from "../../../config/index.js";
import jwt from "jsonwebtoken";
import jwksRsa from "jwks-rsa";
import ParseService from "../parse/parse.service.js";
import fs from "fs/promises";

const { JWT_SECRET, helpers } = config;
const { getUsersPath } = helpers || (() => ({}));

// jwks client for Keycloak
const JWKS_URI =
  (config.KEYCLOAK && config.KEYCLOAK.jwksUri) ||
  config.keycloak?.jwksUri ||
  process.env.KEYCLOAK_JWKS_URI;
let jwksClient = null;

if (JWKS_URI) {
  jwksClient = jwksRsa({
    jwksUri: JWKS_URI,
    cache: true,
    rateLimit: true,
  });
}
async function readUsers() {
  const p = getUsersPath();
  const txt = await fs.readFile(p, "utf8");
  return JSON.parse(txt);
}
async function writeUsers(data) {
  const p = getUsersPath();
  await fs.writeFile(p, JSON.stringify(data, null, 2), "utf8");
}
const AuthService = {
  verifyToken: async (req) => {
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
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      return decoded;
    } catch (e) {
      console.log("Local JWT decode failed, trying with keycloak");
    }
    if (!jwksClient)
      throw new Error(
        "Local token verify failed and Keycloak JWKS not configured",
      );

    const decodedHeader = jwt.decode(token, { complete: true });
    const kid = decodedHeader?.header?.kid;
    if (!kid) throw new Error("Token header missing kid");

    const getSigningKey = (kid) =>
      new Promise((resolve, reject) => {
        jwksClient.getSigningKey(kid, (err, key) => {
          if (err) return reject(err);
          try {
            const pubkey = key.getPublicKey();
            resolve(pubkey);
          } catch (err2) {
            reject(err2);
          }
        });
      });

    let publicKey;
    try {
      publicKey = await getSigningKey(kid);
    } catch (err) {
      throw new Error("Failed to obtain signing key: " + err.message);
    }
    let kcPayload;
    try {
      const verifyOptions = { algorithms: ["RS256"] };
      const issuer =
        (config.KEYCLOAK && config.KEYCLOAK.issuer) ||
        config.keycloak?.issuer ||
        process.env.KEYCLOAK_ISSUER;
      if (issuer) verifyOptions.issuer = issuer;
      kcPayload = jwt.verify(token, publicKey, verifyOptions);
    } catch (err) {
      throw new Error("Keycloak token verification failed: " + err.message);
    }
    // Map Keycloak identity to local user (preferred_username/email)
    const username =
      kcPayload.preferred_username ||
      kcPayload.username ||
      kcPayload.email ||
      kcPayload.sub;

    const existingUser = await ParseService.findOneInJson({
      path: getUsersPath(),
      pattern: "users.*",
      condition: (u) => u.username === username || u.email === username,
    });

    if (existingUser)
      return {
        id: existingUser.id,
        username: existingUser.username,
        keycloak: true,
        kc: kcPayload,
      };

    // Auto-provision minimal local user so numeric user.id exists for dataset checks
    try {
      const usersData = await readUsers();
      const { meta = { lastIndex: 0 }, users = {} } = usersData;
      const nextId = (meta.lastIndex || 0) + 1;
      const newUser = {
        id: nextId,
        username,
        email: kcPayload.email || null,
        password: null,
        createdAt: new Date().toISOString(),
      };
      users[nextId] = newUser;
      await writeUsers({ meta: { lastIndex: nextId }, users });
      return {
        id: nextId,
        username: newUser.username,
        keycloak: true,
        kc: kcPayload,
      };
    } catch (err) {
      // fallback: still return the keycloak payload but no local id
      return {
        id: null,
        username,
        keycloak: true,
        kc: kcPayload,
        warning: "could-not-write-local-user",
      };
    }
  },
};

export default AuthService;
