const functions = require("firebase-functions");
const express = require("express");
const ejs = require("ejs");
const authRouter = require("./router/auth");
const profileRouter = require("./router/profile");
const boardRouter = require("./router/board");

const app = express();

app.engine('html', ejs.renderFile);
app.set('view engine', 'html');
app.set('views', '../../view');

app.use(express.json());
app.use(authRouter);
app.use(profileRouter);
app.use(boardRouter);

exports.api = functions.https.onRequest(app);
