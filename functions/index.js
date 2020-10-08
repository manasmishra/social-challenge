const functions = require('firebase-functions');

const express = require("express");
const app = express();

const { getAllScreams, createOneScream } = require("./handlers/screams");
const { signUp, login, uploadImage } = require("./handlers/users");
const { FBAuth } = require("./util/fbAuth");

app.get("/screams", getAllScreams);
app.post("/screams", FBAuth, createOneScream);

app.post("/signUp", signUp);
app.post("/login", login);
app.post("/user/image", FBAuth, uploadImage);

exports.api = functions.https.onRequest(app);
// functions.region("europe-west1").https().onRequest(app)