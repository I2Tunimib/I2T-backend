const {CONFIG} = require('./config');

const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const indexRouter = require('./routes/index');
const http = require('http');

const app = express();

const isProd = (req, res, next) => {
  if (CONFIG.ENV === 'DEV') {
    res.redirect('/api'); 
  } else {
    next();
  }
}

//disabilitiamo la cache, (più che altro per debugging, poi può essere eliminato)
app.disable('etag');

app.use(logger('dev'));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json({ limit: '500mb' }));
app.use(express.urlencoded({ limit: '500mb', extended: true, parameterLimit: 1000000000000000 }));
app.use('/api', indexRouter);

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
  res.json({error: err.message});
});

const server = http.createServer(app);

server.listen(CONFIG.PORT, () => {
  console.log(`🚀 App running on http://localhost:${CONFIG.PORT} - ${CONFIG.ENV}`);
});

