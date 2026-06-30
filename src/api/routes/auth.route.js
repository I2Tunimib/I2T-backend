import { Router } from "express";
import asyncMiddleware from "../middleware/async.middleware.js";
import AuthController from "../controllers/auth.controller.js";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Authentication and user management
 */

/**
 * @swagger
 * /auth/signup:
 *   post:
 *     summary: Register a new user
 *     description: >
 *       Creates a new local user account. A random username (`semT-XXXX`) and
 *       password are generated server-side and emailed to the provided address.
 *       Returns a JWT for immediate login.
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: user@example.com
 *     responses:
 *       201:
 *         description: User created; credentials emailed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 token:
 *                   type: string
 *                   description: JWT for immediate use
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                     username:
 *                       type: string
 *       400:
 *         description: Email missing or username collision
 */
router.post("/signup", asyncMiddleware(AuthController.signUp));

/**
 * @swagger
 * /auth/signin:
 *   post:
 *     summary: Sign in with local credentials
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [username, password]
 *             properties:
 *               username:
 *                 type: string
 *                 example: semT-ab12
 *               password:
 *                 type: string
 *                 format: password
 *                 example: s3cr3tPass
 *     responses:
 *       200:
 *         description: Authenticated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                   description: "Signed JWT — pass as: Authorization: Bearer <token>"
 *       401:
 *         description: Invalid username or password
 */
router.post("/signin", asyncMiddleware(AuthController.signIn));

/**
 * @swagger
 * /auth/me:
 *   post:
 *     summary: Validate a local JWT and return the user
 *     description: >
 *       Accepts the JWT either in the `Authorization: Bearer` header **or** as
 *       `token` in the request body. The header takes precedence.
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               token:
 *                 type: string
 *                 description: JWT (alternative to Authorization header)
 *     responses:
 *       200:
 *         description: Token valid
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 loggedIn:
 *                   type: boolean
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                     username:
 *                       type: string
 *       400:
 *         description: Token invalid or user not found
 *       500:
 *         description: Malformed token
 */
router.post("/me", asyncMiddleware(AuthController.me));

/**
 * @swagger
 * /auth/verify:
 *   post:
 *     summary: Verify a reCAPTCHA v3 token
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [token]
 *             properties:
 *               token:
 *                 type: string
 *                 description: reCAPTCHA v3 response token from the client
 *     responses:
 *       200:
 *         description: Verification result
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 score:
 *                   type: number
 *                   format: float
 *                   description: reCAPTCHA confidence score (0.0–1.0)
 *                 message:
 *                   type: array
 *                   items:
 *                     type: string
 *                   description: Error codes from Google when success is false
 */
router.post("/verify", asyncMiddleware(AuthController.verify));

/**
 * @swagger
 * /auth/keycloak/login:
 *   get:
 *     summary: Start Keycloak PKCE authorization flow
 *     description: >
 *       Generates a PKCE code verifier/challenge, stores the verifier server-side
 *       keyed by a random `state`, then **redirects the browser** to the Keycloak
 *       authorization endpoint. The browser should follow this redirect directly
 *       (not via XHR).
 *     tags: [Auth]
 *     responses:
 *       302:
 *         description: Redirect to Keycloak authorization endpoint
 *       500:
 *         description: Keycloak realm URL not configured
 */
router.get("/keycloak/login", asyncMiddleware(AuthController.keycloakLogin));

/**
 * @swagger
 * /auth/keycloak/callback:
 *   get:
 *     summary: Keycloak PKCE callback
 *     description: >
 *       Exchanges the authorization code for tokens using the stored PKCE verifier,
 *       sets `kc_access_token`, `kc_refresh_token`, and `kc_id_token` as HTTP-only
 *       cookies, then redirects to the frontend (`FRONTEND_URL`).
 *       The access token is also appended as a URL fragment for SPA compatibility.
 *     tags: [Auth]
 *     parameters:
 *       - in: query
 *         name: code
 *         required: true
 *         schema:
 *           type: string
 *         description: Authorization code returned by Keycloak
 *       - in: query
 *         name: state
 *         required: true
 *         schema:
 *           type: string
 *         description: Opaque state value matching the one sent in /keycloak/login
 *     responses:
 *       302:
 *         description: Redirect to frontend with tokens set in cookies
 *       400:
 *         description: Missing code/state or invalid/expired PKCE state
 *       500:
 *         description: Keycloak realm URL not configured or token exchange failed
 */
router.get(
  "/keycloak/callback",
  asyncMiddleware(AuthController.keycloakCallback),
);

/**
 * @swagger
 * /auth/keycloak/me:
 *   get:
 *     summary: Return the decoded Keycloak token payload
 *     description: >
 *       Reads the access token from the `kc_access_token` cookie (preferred),
 *       `Authorization: Bearer` header, `?token` query param, or request body.
 *       Decodes the JWT payload without signature verification and returns it.
 *     tags: [Auth]
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Token payload
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 loggedIn:
 *                   type: boolean
 *                   example: true
 *                 tokenPayload:
 *                   type: object
 *                   description: Decoded JWT claims (sub, email, preferred_username, etc.)
 *       401:
 *         description: No access token provided
 *       400:
 *         description: Invalid token format
 */
router.get("/keycloak/me", asyncMiddleware(AuthController.keycloakMe));

/**
 * @swagger
 * /auth/keycloak/logout:
 *   get:
 *     summary: Server-side Keycloak logout
 *     description: >
 *       Clears the `kc_access_token`, `kc_refresh_token`, and `kc_id_token` cookies,
 *       then redirects the browser to the Keycloak end-session endpoint so the
 *       SSO session is also terminated.
 *     tags: [Auth]
 *     parameters:
 *       - in: query
 *         name: id_token_hint
 *         required: false
 *         schema:
 *           type: string
 *         description: Keycloak ID token (improves logout reliability when provided)
 *       - in: query
 *         name: post_logout_redirect_uri
 *         required: false
 *         schema:
 *           type: string
 *           format: uri
 *         description: Where to redirect after Keycloak logs out (must be in ALLOWED_POST_LOGOUT_BASES)
 *     responses:
 *       302:
 *         description: Redirect to Keycloak end-session endpoint
 */
router.get("/keycloak/logout", asyncMiddleware(AuthController.keycloakLogout));

/**
 * @swagger
 * /auth/users:
 *   get:
 *     summary: Search local users
 *     description: Returns users whose username or email contains the query string.
 *     tags: [Auth]
 *     parameters:
 *       - in: query
 *         name: q
 *         required: false
 *         schema:
 *           type: string
 *         description: Case-insensitive substring to match against username, email, or id
 *       - in: query
 *         name: role
 *         required: false
 *         schema:
 *           type: string
 *           example: editor
 *         description: Filter by role (`editor` also matches `admin`)
 *     responses:
 *       200:
 *         description: Matching users
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                   username:
 *                     type: string
 *                   email:
 *                     type: string
 *                   roles:
 *                     type: array
 *                     items:
 *                       type: string
 */
router.get("/users", asyncMiddleware(AuthController.searchUsers));

export default router;
