import express from 'express';
import cors from 'cors';
import fileUpload from 'express-fileupload';
import createError from 'http-errors';
import path from 'path';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import compression from 'compression';
import routes from './api/routes/index';
import config from './config/index';
import { colorString } from './utils/log';
const __dirname = path.resolve();


const { ENV, PORT } = config;

export const app = express();

app.use(compression());

app.use(fileUpload({
  useTempFiles: true,
  tempFileDir: './tmp'
}));

const isProd = (req, res, next) => {
  if (ENV === 'DEV') {
    res.redirect('/api'); 
  } else {
    next();
  }
}

app.disable('etag');
app.use(cors())
app.use(morgan((tokens, req, res) => {
  return [
    colorString('api'),
    tokens.method(req, res),
    tokens.url(req, res),
    tokens.status(req, res),
    tokens['response-time'](req, res), 'ms'
  ].join(' ')
}));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json({ limit: '500mb' }));
app.use(express.urlencoded({ limit: '500mb', extended: true, parameterLimit: 1000000000000000 }));
app.use('/api', routes);

// If production redirect to '/api'
app.use(isProd);
// Otherwise server app static files
app.use(express.static(path.join(__dirname, 'build')));
// Use wildcard because of frontend routing, otherwise it will fail to serve static files
app.get('/*', function (req, res) {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
  console.log(err);
  res.status(500).json({error: err.message});
});

const server = app.listen(PORT, () => {
  console.log(`🚀 App running on http://localhost:${PORT} - ${ENV}`);
});

export default server;