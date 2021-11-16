import { existsSync } from 'fs'
import { writeFile } from 'fs/promises'
import express from 'express';
import cors from 'cors';
import fileUpload from 'express-fileupload';
import createError from 'http-errors';
import path from 'path';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import http from 'http';
import routes from './api/routes/index';
import config from './config/index';

const __dirname = path.resolve();

const { ENV, PORT } = config;

const app = express();
app.use(fileUpload({
  useTempFiles: true,
  tempFileDir: './tmp'
}));

if (!existsSync('./public/tables.info.json')) {
  await writeFile('./public/tables.info.json', JSON.stringify({ meta: { lastIndex: -1 }, tables: {} }), null, 2)
}

if (!existsSync('./public/datasets.info.json')) {
  await writeFile('./public/datasets.info.json', JSON.stringify({ meta: { lastIndex: -1 }, datasets: {}}), null, 2)
}

const isProd = (req, res, next) => {
  if (ENV === 'DEV') {
    res.redirect('/api'); 
  } else {
    next();
  }
}


app.disable('etag');
app.use(cors())
app.use(morgan('dev'));
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

const server = http.createServer(app);

server.listen(PORT, () => {
  console.log(`🚀 App running on http://localhost:${PORT} - ${ENV}`);
});

