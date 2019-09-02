'use strict';

var express = require('express');
var mongo = require('mongodb');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const bodyParser = require('body-parser');
const dns = require('dns');
var cors = require('cors');
const url = require('url');
dotenv.config();
var app = express();

// Basic Configuration 
var port = process.env.PORT || 3000;
console.log(process.env.MONGOLAB_URI)
/** this project needs a db !! **/
mongoose.connect(process.env.MONGOLAB_URI, { useNewUrlParser: true });
const urlShortSchema = new mongoose.Schema({
  "original_url": String,
  "short_url": Number
});

const URLShort = mongoose.model('URLShort', urlShortSchema);

// mongoose.connect(process.env.MONGOLAB_URI);
app.use(cors());
// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }))

// parse application/json
app.use(bodyParser.json())
/** this project needs to parse POST bodies **/
// you should mount the body-parser here

app.use('/public', express.static(process.cwd() + '/public'));

app.get('/', function (req, res) {
  res.sendFile(process.cwd() + '/views/index.html');
});


// your first API endpoint... 
app.get("/api/hello", function (req, res) {
  res.json({ greeting: 'hello API' });
});


function isURLValid(req, res, next) {
  const urlParsed = url.parse(req.body.url, true);
  dns.lookup(urlParsed.host, (err) => {
    if (err) {
      res.json({ "error": "invalid URL" });
    } else {
      next();
    }
  })
}

function makeShortUrl(cb) {
  const shortUrl = Math.floor((Math.random() * 50000) + 1);
  URLShort.find({ "short_url": shortUrl }, (err, ursl) => {
    if (err) {
      cb(err);
    } else {
      if (ursl.length === 0) {
        cb(null, shortUrl);
      } else {
        makeShortUrl(cb);
      }
    }
  })
}

function findShortUrl(req, res, next) {
  const shortUrl = req.params.shortUrl;
  URLShort.find({ "short_url": shortUrl }, (err, urls) => {
    if (err) throw err
    if (urls.length === 0) {
      res.json({ "error": "No short url found for given input" })
    } else {
      req.shortUrlFinded = urls[0].original_url;
      next();
    }
  })
}

function saveURL(req, res, next) {
  makeShortUrl((err, shortUrl) => {
    if (err) throw err;
    const query = { "original_url": req.body.url };
    const update = {
      "original_url": req.body.url,
      "short_url": shortUrl
    }
    const options = { upsert: true, new: true, setDefaultsOnInsert: true };
    URLShort.findOneAndUpdate(query, update, options, (err) => {
      if (err) {
        res.json({ "error": err });
      } else {
        req.shortUrl = shortUrl;
        next();
      }
    });
  })
}

app.post("/api/shorturl/new", isURLValid, saveURL, (req, res) => {
  const url = req.body.url;
  res.json({
    "original_url": url,
    "short_url": req.shortUrl
  });
})

app.get("/api/shorturl/:shortUrl", findShortUrl, (req, res) => {
  res.status(301).redirect(req.shortUrlFinded);
})



app.listen(port, function () {
  console.log(`Node.js listening in port: ${port}`);
});