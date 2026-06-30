import express from "express";
import cors from "cors";
import fileUpload from "express-fileupload";
import createError from "http-errors";
import path from "path";
import cookieParser from "cookie-parser";
import morgan, { token } from "morgan";
import compression from "compression";
import routes from "./api/routes/index.js";
import config from "./config/index.js";
import { colorString } from "./utils/log.js";
import zipTmpFileMiddleware from "./api/middleware/zip-tmp-file.middleware.js";
import logger from "./api/middleware/logger.js";
import loggerJson from "./api/middleware/logger-json.js";
import swaggerUi from "swagger-ui-express";
import swaggerSpec from "./api/docs/swagger.js";
const __dirname = path.resolve();

const { ENV, PORT } = config;

export const app = express();

app.use(compression());

app.use(
  fileUpload({
    useTempFiles: true,
    tempFileDir: "./tmp",
  }),
);

app.use(zipTmpFileMiddleware);
const isProd = (req, res, next) => {
  // Only redirect to '/api' when running in production-like environments.
  // When ENV is 'DEV' we must not redirect so the dev server and SPA dev tooling work.
  if (ENV !== "DEV") {
    res.redirect("/api");
  } else {
    next();
  }
};

app.disable("etag");
const FRONTEND_ORIGIN = String(
  process.env.FRONTEND_URL || "http://vm.chronos.disco.unimib.it:3001",
).replace(/\/+$/, "");

/**
 * Normalize an origin string to a canonical origin without trailing slash.
 * Accepts values like 'http://host:port/' or 'http://host:port' and returns 'http://host:port'.
 */
function normalizeOrigin(origin) {
  if (!origin) return "";
  try {
    const u = new URL(String(origin));
    return `${u.protocol}//${u.host}`.replace(/\/+$/, "");
  } catch (e) {
    // fallback: trim trailing slashes
    return String(origin).replace(/\/+$/, "");
  }
}

const corsOptions = {
  origin: function (incomingOrigin, callback) {
    // Allow no-origin requests (e.g. curl, some same-origin navigation cases)
    if (!incomingOrigin) return callback(null, true);

    // Allow any origin by reflecting the incoming origin.
    // When `credentials: true` is set, the CORS middleware will echo the
    // request Origin back in the Access-Control-Allow-Origin response header.
    return callback(null, true);
  },
  credentials: true,
  allowedHeaders: ["Content-Type", "Authorization", "x-table-dataset-info"],
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
};

// Use configured CORS options and ensure preflight (OPTIONS) uses same logic
app.use(cors(corsOptions));
app.options("*", cors(corsOptions));
app.use(
  morgan((tokens, req, res) => {
    const url = tokens.url(req, res);
    return [
      url.startsWith("/api") ? colorString("api") : colorString("static"),
      tokens.method(req, res),
      url,
      tokens.status(req, res),
      tokens["response-time"](req, res),
      "ms",
    ].join(" ");
  }),
);
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));
app.use(express.json({ limit: "500mb" }));
app.use(
  express.urlencoded({
    limit: "500mb",
    extended: true,
    parameterLimit: 1000000000000000,
  }),
);
// Apply logger middleware after body parsing
app.use(logger);
app.use(loggerJson);
app.use("/api", routes);
const swaggerUiOptions = {
  customSiteTitle: "I2T API Docs",
  customCss: `
    .swagger-ui .topbar { padding: 8px 16px; }
    #sw-login-widget {
      display: flex; align-items: center; gap: 8px; margin-left: auto;
    }
    #sw-login-widget input {
      padding: 4px 8px; border-radius: 4px; border: 1px solid #ccc;
      font-size: 13px; background: #fff; color: #333;
    }
    #sw-login-widget button {
      padding: 5px 14px; background: #49cc90; color: #fff;
      border: none; border-radius: 4px; cursor: pointer; font-size: 13px;
      font-weight: 600;
    }
    #sw-login-widget button:hover { background: #3aaa74; }
    #sw-login-status { font-size: 12px; min-width: 90px; }
  `,
  customJsStr: `
    (function () {
      function injectWidget() {
        const topbar = document.querySelector('.topbar-wrapper');
        if (!topbar || document.getElementById('sw-login-widget')) return;

        const widget = document.createElement('div');
        widget.id = 'sw-login-widget';
        widget.innerHTML =
          '<input id="sw-user" type="text" placeholder="Username" autocomplete="username" />' +
          '<input id="sw-pass" type="password" placeholder="Password" autocomplete="current-password" />' +
          '<button id="sw-login-btn">Login</button>' +
          '<span id="sw-login-status"></span>';
        topbar.appendChild(widget);

        document.getElementById('sw-login-btn').addEventListener('click', async function () {
          const username = document.getElementById('sw-user').value.trim();
          const password = document.getElementById('sw-pass').value;
          const status   = document.getElementById('sw-login-status');

          if (!username || !password) {
            status.style.color = '#f93e3e';
            status.textContent = 'Fill both fields';
            return;
          }

          status.style.color = '#888';
          status.textContent = 'Signing in…';

          try {
            const resp = await fetch('/api/auth/signin', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ username, password }),
            });

            if (!resp.ok) {
              status.style.color = '#f93e3e';
              status.textContent = '✗ Invalid credentials';
              return;
            }

            const data = await resp.json();
            // preauthorizeApiKey only works for apiKey-type schemes.
            // bearerAuth is http/bearer, so we must use authActions.authorize directly.
            window.ui.authActions.authorize({
              bearerAuth: {
                name: 'bearerAuth',
                schema: {
                  type: 'http',
                  scheme: 'bearer',
                  bearerFormat: 'JWT',
                },
                value: data.token,
              },
            });
            status.style.color = '#49cc90';
            status.textContent = '✓ Authorized';
            document.getElementById('sw-pass').value = '';
          } catch (e) {
            status.style.color = '#f93e3e';
            status.textContent = '✗ Network error';
          }
        });

        // Allow pressing Enter in the password field to trigger login
        document.getElementById('sw-pass').addEventListener('keydown', function (e) {
          if (e.key === 'Enter') document.getElementById('sw-login-btn').click();
        });
      }

      // Swagger UI renders asynchronously; poll until the topbar appears
      const interval = setInterval(function () {
        if (document.querySelector('.topbar-wrapper')) {
          clearInterval(interval);
          injectWidget();
        }
      }, 100);
    })();
  `,
};

app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec, swaggerUiOptions));
app.get("/api/docs.json", (req, res) => {
  res.setHeader("Content-Type", "application/json");
  res.send(swaggerSpec);
});

// If production redirect to '/api'
app.use(isProd);
// Otherwise server app static files
app.use(express.static(path.join(__dirname, "build")));
// Use wildcard because of frontend routing, otherwise it will fail to serve static files
app.get(/^(?!\/api\/).*/, function (req, res) {
  res.sendFile(path.join(__dirname, "build", "index.html"));
});

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
  console.log(err);
  // If headers are already sent, delegate to the default Express error handler
  // to avoid 'Cannot set headers after they are sent to the client'.
  if (res.headersSent) {
    return next(err);
  }
  res.status(500).json({ error: err.message });
});

const server = app.listen(PORT, () => {
  console.log(`🚀 App running on http://localhost:${PORT} - ${ENV}`);
});

export default server;
