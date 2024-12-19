const {initializeApp} = require("firebase-admin/app");
const {getFirestore} = require("firebase-admin/firestore");

initializeApp();
const db = getFirestore();

const mailRepository = db.collection("mail");
const userRepository = db.collection("users");
const profileRepository = db.collection("profile");
const boardRepository = db.collection("board");
const blacklist = db.collection("blacklist");

module.exports = { mailRepository, userRepository, profileRepository, boardRepository, blacklist };
