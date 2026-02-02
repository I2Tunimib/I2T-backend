import { Router } from "express";
import asyncMiddleware from "../middleware/async.middleware.js";
import AuthController from "../controllers/auth.controller.js";

const router = Router();

router.post("/signup", asyncMiddleware(AuthController.signUp));
router.post("/signin", asyncMiddleware(AuthController.signIn));
router.post("/me", asyncMiddleware(AuthController.me));
router.post("/verify", asyncMiddleware(AuthController.verify));

// Keycloak server-side minimal routes (PKCE)
// Starts the authorization redirect and handles the callback exchange.
// These are simple GET endpoints so the browser can be redirected to/from Keycloak.
router.get("/keycloak/login", asyncMiddleware(AuthController.keycloakLogin));
router.get(
  "/keycloak/callback",
  asyncMiddleware(AuthController.keycloakCallback),
);
// Endpoint to return token payload / simple auth check using server-set cookie
router.get("/keycloak/me", asyncMiddleware(AuthController.keycloakMe));

// Server-side logout: clears server cookies and redirects to Keycloak end-session
router.get("/keycloak/logout", asyncMiddleware(AuthController.keycloakLogout));

export default router;
