import ParseService from "../services/parse/parse.service.js";
import config from "../../config/index.js";
import jwt from "jsonwebtoken";
import axios from "axios";
import { nanoid } from "nanoid";
import nodemailer from "nodemailer";
import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import DatasetsService from "../services/datasets/datasets.service.js";
import FileSystemService from "../services/datasets/datasets.service.js";

// Simple in-memory PKCE store for short-lived verifiers (state -> { verifier, createdAt })
// Note: this is minimal and ephemeral; for production prefer a session store.
const pkceStore = new Map();
const {
  JWT_SECRET,
  JWT_EXPIRES_IN,
  helpers: {
    getUsersPath,
    getDatasetFilesPath,
    getDatasetDbPath,
    getTablesDbPath,
  },
} = config;

// Create a transporter for sending emails
const transporter = nodemailer.createTransport({
  service: "gmail",
  // host: process.env.EMAIL_HOST || "smtp.gmail.com",
  // port: process.env.EMAIL_PORT || 587,
  // secure: process.env.EMAIL_SECURE === "true", // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

const AuthController = {
  signUp: async (req, res, next) => {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }
    try {
      // Generate random password
      const username = "semT-" + nanoid(4);
      const password = nanoid(10);
      // Check if username already exists
      const existingUser = await ParseService.findOneInJson({
        path: getUsersPath(),
        pattern: "users.*",
        condition: (user) => user.username === username,
      });

      if (existingUser) {
        return res.status(400).json({ error: "Username already exists" });
      }

      // Read existing users
      const usersData = JSON.parse(await fs.readFile(getUsersPath()));
      const { meta, users } = usersData;
      const { lastIndex } = meta;
      const id = lastIndex + 1;

      // Create new user
      const newUser = {
        id,
        username,
        email: username,
        password,
        createdAt: new Date().toISOString(),
      };

      // Add user to database
      users[id] = newUser;

      // Update the last index
      const newCollection = {
        meta: {
          lastIndex: id,
        },
        users,
      };

      // Save the updated users collection
      await fs.writeFile(
        getUsersPath(),
        JSON.stringify(newCollection, null, 2),
      );

      // Create user dataset directory if it doesn't exist
      // const userDatasetPath = `${getDatasetFilesPath()}/${id}`;
      // try {
      //   await fs.mkdir(userDatasetPath, { recursive: true });
      // } catch (err) {
      //   console.error("Error creating user dataset directory", err);
      // }
      // Check if template.zip exists in the public folder and initialize user dataset
      const templatePath = path.join(process.cwd(), "public", "template.zip");
      try {
        const templateExists = await fs
          .access(templatePath)
          .then(() => true)
          .catch(() => false);

        if (templateExists) {
          // Copy template.zip to a temporary location with a unique name
          const tempFilePath = path.join(
            process.cwd(),
            "tmp",
            `template_${id}_${Date.now()}.zip`,
          );
          await fs.copyFile(templatePath, tempFilePath);

          // Call the dataset service to create the initial dataset
          await FileSystemService.addDataset(tempFilePath, "Evaluation", id);

          // Clean up the temporary file
          await fs
            .unlink(tempFilePath)
            .catch((e) => console.error("Error removing temp file:", e));
        }
      } catch (err) {
        console.error("Error initializing user dataset:", err);
      }

      // Send email with password
      const mailOptions = {
        from: process.env.EMAIL_SENDER,
        to: email,
        subject: "Welcome to SemTUI - Your Account Details",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
            <h2 style="color: #333;">Welcome to I2T-backend!</h2>
            <p>Your account has been created successfully.</p>
            <p><strong>Username:</strong> ${username}</p>
            <p><strong>Password:</strong> ${password}</p>
            <p>Please keep this information secure and don't share it with anyone.</p>
            <p>You can now log in to your account using these credentials.</p>
            <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #e0e0e0;">
              <p style="font-size: 12px; color: #777;">This is an automated email. Please do not reply.</p>
            </div>
          </div>
        `,
      };

      try {
        await transporter.sendMail(mailOptions);
      } catch (emailError) {
        console.error("Error sending email:", emailError);
        // Even if email fails, we continue to create the account
      }

      // Generate JWT token for immediate login
      const token = jwt.sign(
        {
          id: newUser.id,
          username: newUser.username,
        },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN },
      );

      // Return success without sending the password in the response
      res.status(201).json({
        message:
          "User created successfully. Password has been sent to your email.",
        token,
        user: {
          id: newUser.id,
          username: newUser.username,
        },
      });
    } catch (err) {
      console.error("Error in signUp:", err);
      next(err);
    }
  },
  verify: async (req, res, next) => {
    try {
      const { token } = req.body;
      const secretKey = config.RECAPTCHA_SECRET_KEY;
      const response = await axios.post(
        `https://www.google.com/recaptcha/api/siteverify?secret=${secretKey}&response=${token}`,
      );
      res.status(200).json({
        success: response.data.success,
        score: response.data.score,
        message: response.data["error-codes"],
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Server-side Keycloak login (PKCE) starter.
   *
   * - Generates PKCE verifier and code_challenge on the server using Node crypto.
   * - Stores verifier keyed by state in a small in-memory store.
   * - Redirects the browser to Keycloak authorize endpoint.
   *
   * Minimal and self-contained; does not require express-session.
   */
  keycloakLogin: async (req, res, next) => {
    try {
      const realmUrlRaw = process.env.KEYCLOAK_ISSUER;

      // Debug logging to help diagnose why Keycloak realm may be missing.
      // This logs only the environment variable values and the resolved config entry;
      // avoid printing secrets or tokens.
      try {
        console.log(
          "[KEYCLOAK DEBUG] process.env.KEYCLOAK_REALM_URL:",
          process.env.KEYCLOAK_REALM_URL,
        );
        console.log(
          "[KEYCLOAK DEBUG] process.env.KEYCLOAK_ISSUER:",
          process.env.KEYCLOAK_ISSUER,
        );
        console.log(
          "[KEYCLOAK DEBUG] config.keycloak && config.keycloak.realmUrl:",
          config.keycloak && config.keycloak.realmUrl,
        );
        console.log("[KEYCLOAK DEBUG] resolved realmUrlRaw:", realmUrlRaw);
      } catch (e) {
        // ignore any logging errors in environments that restrict console
      }

      if (!realmUrlRaw) {
        return res
          .status(500)
          .json({ error: "Keycloak realm URL not configured" });
      }

      // parse realmUrlRaw expecting something like: https://host:port/.../realms/REALM
      let parsed;
      try {
        parsed = new URL(realmUrlRaw);
      } catch (e) {
        return res.status(500).json({ error: "Invalid KEYCLOAK_REALM_URL" });
      }
      const pathname = parsed.pathname || "";
      const m = pathname.match(/\/realms\/([^\/\s]+)/);
      const realm =
        m && m[1] ? m[1] : pathname.split("/").filter(Boolean).pop();
      const basePath =
        pathname.substring(0, pathname.indexOf("/realms/")) || "";
      const kcBase = `${parsed.origin}${basePath}`.replace(/\/+$/, "");

      const clientId = process.env.KEYCLOAK_BACKEND_CLIENT_ID;
      ("I2T-BACKEND");

      // Build callback URL to this server (will be /api/auth/keycloak/callback)
      const protocol = req.headers["x-forwarded-proto"] || req.protocol;
      const host = process.env.BACKEND_URL;
      const callbackUrl = `${host}api/auth/keycloak/callback`;
      console.log("callback uri", callbackUrl);
      // generate code_verifier and code_challenge (S256)
      const verifier = crypto
        .randomBytes(64)
        .toString("base64")
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");
      const hash = crypto.createHash("sha256").update(verifier).digest();
      const challenge = hash
        .toString("base64")
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");

      const state = nanoid(16);
      // store verifier for this state (short-lived)
      pkceStore.set(state, { verifier, createdAt: Date.now() });

      const authUrl =
        `${kcBase}/realms/${encodeURIComponent(realm)}/protocol/openid-connect/auth` +
        `?client_id=${encodeURIComponent(clientId)}` +
        `&response_type=code` +
        `&scope=openid` +
        `&redirect_uri=${encodeURIComponent(callbackUrl)}` +
        `&state=${encodeURIComponent(state)}` +
        `&code_challenge=${encodeURIComponent(challenge)}` +
        `&code_challenge_method=S256`;

      return res.redirect(authUrl);
    } catch (err) {
      next(err);
    }
  },

  /**
   * Keycloak callback handler.
   *
   * - Exchanges authorization code for tokens using the stored PKCE verifier.
   * - Sets HTTP-only cookies with the Keycloak tokens and redirects back to the SPA root.
   * - Minimal implementation: cookies are set with httpOnly=true and secure=false (to work over HTTP).
   *   Adjust cookie options for production (secure, sameSite, domain).
   */
  keycloakCallback: async (req, res, next) => {
    try {
      const { code, state } = req.query;
      console.log("received callbacl data", req);
      if (!code || !state) {
        return res.status(400).send("Missing code or state");
      }

      const entry = pkceStore.get(state);
      if (!entry || !entry.verifier) {
        return res
          .status(400)
          .send("Invalid or expired state (PKCE verifier not found)");
      }
      // remove stored verifier immediately
      pkceStore.delete(state);
      const verifier = entry.verifier;

      const realmUrlRaw = process.env.KEYCLOAK_ISSUER;
      if (!realmUrlRaw) {
        return res
          .status(500)
          .json({ error: "Keycloak realm URL not configured" });
      }

      let parsed;
      try {
        parsed = new URL(realmUrlRaw);
      } catch (e) {
        return res.status(500).json({ error: "Invalid KEYCLOAK_REALM_URL" });
      }
      const pathname = parsed.pathname || "";
      const m = pathname.match(/\/realms\/([^\/\s]+)/);
      const realm =
        m && m[1] ? m[1] : pathname.split("/").filter(Boolean).pop();
      const basePath =
        pathname.substring(0, pathname.indexOf("/realms/")) || "";
      const kcBase = process.env.KEYCLOAK_ISSUER_INTERNAL;

      const clientId = process.env.KEYCLOAK_BACKEND_CLIENT_ID;
      ("I2T-BACKEND");

      const protocol = req.headers["x-forwarded-proto"] || req.protocol;
      const host = process.env.BACKEND_URL;
      const callbackUrl = `${host}api/auth/keycloak/callback`;

      const tokenUrl = `${kcBase}/protocol/openid-connect/token`;
      console.log("tokenUrl", tokenUrl);
      const body = new URLSearchParams();
      body.set("grant_type", "authorization_code");
      body.set("code", code);
      body.set("redirect_uri", callbackUrl);
      body.set("client_id", clientId);
      body.set("code_verifier", verifier);
      console.log("sending tokenresp");
      const tokenResp = await axios.post(tokenUrl, body.toString(), {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      });
      console.log("sending tokenresp answer", tokenResp);

      const data = tokenResp.data || {};
      // Set HTTP-only cookies for tokens (adjust options for production)
      try {
        res.cookie("kc_access_token", data.access_token || "", {
          httpOnly: true,
          secure: false,
          maxAge: data.expires_in ? data.expires_in * 1000 : 0,
        });
        if (data.refresh_token) {
          res.cookie("kc_refresh_token", data.refresh_token, {
            httpOnly: true,
            secure: false,
          });
        }
        if (data.id_token) {
          res.cookie("kc_id_token", data.id_token, {
            httpOnly: true,
            secure: false,
          });
        }
      } catch (e) {
        // ignore cookie set errors
      }

      // Redirect back to SPA root (frontend should read authentication state from server or rely on cookies)
      // Prefer FRONTEND_URL env variable when set (allows redirecting to the SPA host), fallback to '/'
      // Simplest no-env approach: append the access_token in the URL fragment so the SPA can read it
      // (NOTE: this exposes the token to browser JS — use only as a compatibility fallback).
      const postLoginRedirect =
        (process.env.FRONTEND_URL || `${host}`) + "datasets";
      // Append token as fragment so client-side JS can pick it up if cookies are unavailable
      let redirectWithToken = postLoginRedirect;
      if (data && data.access_token) {
        try {
          redirectWithToken += `#access_token=${encodeURIComponent(
            data.access_token,
          )}`;
        } catch (e) {
          // ignore encoding errors
        }
      }
      console.log("redirect uri", redirectWithToken);
      return res.redirect(redirectWithToken);
    } catch (err) {
      next(err);
    }
  },

  keycloakLogout: async (req, res, next) => {
    try {
      // Prefer id_token_hint from query param (frontend) if provided, otherwise read from cookies
      const idToken = req.query && req.query.id_token_hint;
      console.log("logout cookies", idToken);

      // Clear server-side cookies set by the Keycloak callback (use same options as set)
      try {
        res.clearCookie("kc_access_token", {
          httpOnly: true,
          secure: false,
          path: "/",
        });
        res.clearCookie("kc_refresh_token", {
          httpOnly: true,
          secure: false,
          path: "/",
        });
        res.clearCookie("kc_id_token", {
          httpOnly: true,
          secure: false,
          path: "/",
        });
      } catch (e) {
        // ignore cookie clearing errors
      }

      // Attempt to call Keycloak end-session endpoint so user is logged out in Keycloak as well
      const realmUrlRaw =
        process.env.KEYCLOAK_REALM_URL ||
        (config.keycloak && config.keycloak.realmUrl) ||
        process.env.KEYCLOAK_ISSUER ||
        null;
      const clientId = process.env.KEYCLOAK_BACKEND_CLIENT_ID;
      if (realmUrlRaw) {
        let parsed;
        try {
          parsed = new URL(realmUrlRaw);
        } catch (e) {
          // If the realm URL is invalid, just redirect to the frontend root
          return res.redirect("/");
        }

        const pathname = parsed.pathname || "";
        const m = pathname.match(/\/realms\/([^\/\s]+)/);
        const realm =
          m && m[1] ? m[1] : pathname.split("/").filter(Boolean).pop();
        const basePath =
          pathname.substring(0, pathname.indexOf("/realms/")) || "";
        const kcBase = `${parsed.origin}${basePath}`.replace(/\/+$/, "");

        const protocol = req.headers["x-forwarded-proto"] || req.protocol;
        const host = process.env.BACKEND_URL;

        // Determine the post_logout_redirect_uri preference:
        // 1) candidate from req.query.post_logout_redirect_uri if present and allowed
        // 2) else process.env.FRONTEND_URL if set
        // 3) fallback to request host root
        const candidate =
          req.query && req.query.post_logout_redirect_uri
            ? String(req.query.post_logout_redirect_uri)
            : null;
        const envFrontend = process.env.FRONTEND_URL || null;

        // Build allow-list from env ALLOWED_POST_LOGOUT_BASES (comma-separated prefixes)
        const allowedBasesRaw = process.env.ALLOWED_POST_LOGOUT_BASES || "";
        const allowedBases = allowedBasesRaw
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);

        function isAllowedUrl(u) {
          try {
            const parsed = new URL(u);
            if (allowedBases.length > 0) {
              return allowedBases.some((b) => parsed.href.startsWith(b));
            }
            // If no allow-list provided, default to strict check: same host as request
            return parsed.host === host;
          } catch (e) {
            return false;
          }
        }

        let postLogoutRedirect = null;
        if (candidate && isAllowedUrl(candidate)) {
          postLogoutRedirect = candidate;
        } else if (envFrontend) {
          postLogoutRedirect = envFrontend;
        } else {
          postLogoutRedirect = `${host}/`;
        }

        let endSessionUrl =
          `${kcBase}/realms/${encodeURIComponent(realm)}/protocol/openid-connect/logout` +
          `?post_logout_redirect_uri=${encodeURIComponent(postLogoutRedirect)}`;

        // Include id_token_hint when available; Keycloak often expects it
        if (clientId) {
          endSessionUrl += `&client_id=${encodeURIComponent(clientId)}`;
        }
        console.log("current end session url", endSessionUrl);
        return res.redirect(endSessionUrl);
      }

      // Fallback: redirect to frontend root
      return res.redirect("/");
    } catch (err) {
      next(err);
    }
  },

  signIn: async (req, res, next) => {
    const { username: usernameReq, password: passwordReq } = req.body;

    try {
      // check if user exist
      const user = await ParseService.findOneInJson({
        path: getUsersPath(),
        pattern: "users.*",
        condition: ({ username, password }) =>
          usernameReq === username && password === passwordReq,
      });

      if (!user) {
        return res.status(401).json({ error: "Invalid username or password" });
      }

      // sign a new token
      const token = jwt.sign(
        {
          id: user.id,
          username: user.username,
        },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN },
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
        pattern: "users.*",
        condition: ({ id }) => id === decoded.id,
      });

      if (!user) {
        return res.status(400).json({ loggedIn: false, user: null });
      }

      res.status(200).json({
        loggedIn: true,
        user: { id: user.id, username: user.username },
      });
      return res.redirect("/");
    } catch (err) {
      next(err);
    }
  },

  // Return decoded payload from kc_access_token cookie (if present) or other fallback locations
  keycloakMe: async (req, res, next) => {
    try {
      console.log("keycloak me request", req);
      // Accept token from cookie (preferred), Authorization header, query or body (fallbacks)
      let token = null;
      if (req.cookies && req.cookies.kc_access_token) {
        token = req.cookies.kc_access_token;
      } else if (req.cookies && req.cookies.kcAccessToken) {
        token = req.cookies.kcAccessToken;
      } else if (
        req.headers &&
        typeof req.headers.authorization === "string" &&
        req.headers.authorization.startsWith("Bearer ")
      ) {
        token = req.headers.authorization.slice(7);
      } else if (req.query && req.query.token) {
        token = req.query.token;
      } else if (req.body && req.body.token) {
        token = req.body.token;
      }

      if (!token) {
        // Log limited debug info (do not log tokens in production)
        try {
          console.warn(
            "keycloakMe: no token found. cookies:",
            req.cookies ? Object.keys(req.cookies) : null,
            "auth:",
            req.headers && req.headers.authorization ? "[present]" : "[absent]",
          );
        } catch (e) {
          // ignore logging errors
        }
        return res.status(401).json({
          loggedIn: false,
          error: "No access token provided",
        });
      }

      // Decode JWT payload without verifying (we only need the claims to return to the frontend)
      const parts = String(token).split(".");
      if (parts.length < 2) {
        return res
          .status(400)
          .json({ loggedIn: false, error: "Invalid token format" });
      }

      const payloadB64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
      // Pad base64 string if needed
      const pad = payloadB64.length % 4;
      const padded = payloadB64 + (pad ? "=".repeat(4 - pad) : "");
      const payloadJson = Buffer.from(padded, "base64").toString("utf8");
      let payload;
      try {
        payload = JSON.parse(payloadJson);
      } catch (e) {
        console.error("keycloakMe: failed to parse token payload", e);
        return res.status(500).json({
          loggedIn: false,
          error: "Failed to parse token payload",
        });
      }

      return res.status(200).json({ loggedIn: true, tokenPayload: payload });
    } catch (err) {
      console.error("keycloakMe error", err);
      next(err);
    }
  },
};

export default AuthController;
