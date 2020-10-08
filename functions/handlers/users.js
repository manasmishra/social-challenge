const { db, admin } = require("../util/admin");
const { firebaseConfig } = require("../util/config");
const firebase = require("firebase");
const { logger } = require("firebase-functions");
firebase.initializeApp(firebaseConfig);

const isEmpty = (str) => {
  if (str.trim() === "") {
    return true;
  }
  return false;
};

const isEmail = (email) => {
  const regEx = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  if (email.match(regEx)) {
    return true;
  }
  return false;
};
exports.signUp = async (req, res) => {
  const newUser = {
    email: req.body.email,
    password: req.body.password,
    confirmPassword: req.body.confirmPassword,
    handle: req.body.handle,
  };
  const errors = {};
  if (isEmpty(newUser.email)) {
    errors.email = `Must not be empty`;
  } else if (!isEmail(newUser.email)) {
    errors.email = `Must be a valid Email.`;
  }
  if (isEmpty(newUser.password)) {
    errors.password = `Must not be empty.`;
  }
  if (newUser.password !== newUser.confirmPassword)
    errors.confirmPassword = `Passwords must match`;
  if (isEmpty(newUser.handle)) {
    errors.handle = `Must not be empty.`;
  }
  if (Object.keys(errors).length > 0) {
    return res.status(400).json(errors);
  }
  try {
    const noImg = "no-img.png";
    const user = await db.doc(`/users/${newUser.handle}`).get();
    if (user.exists) {
      return res.status(400).json({ handle: `This handle is already taken.` });
    }
    const data = await firebase
      .auth()
      .createUserWithEmailAndPassword(newUser.email, newUser.password);
    const token = await data.user.getIdToken();
    const userCredentials = {
      handle: newUser.handle,
      email: newUser.email,
      createdAt: new Date().toISOString(),
      userId: data.user.uid,
      imageUrl: `https://firebasestorage.googleapis.com/v0/b/${firebaseConfig.storageBucket}/o/${noImg}?alt=media`
    };
    const craetedUser = await db
      .doc(`/users/${newUser.handle}`)
      .set(userCredentials);
    return res.status(201).json({ token });
  } catch (error) {
    console.error("got errpr:", error);
    if (error.code === "auth/email-already-in-use") {
      return res.status(400).json({ email: "email already exists" });
    }
    return res.status(500).json({ error: error.code });
  }
};

exports.login = async (req, res) => {
  const { email, password } = req.body;
  let errors = {};
  if (isEmpty(email)) errors.email = "Must not be empty";
  if (isEmpty(password)) errors.password = "Must not be empty";

  if (Object.keys(errors).length > 0) {
    return res.status(400).json(errors);
  }
  try {
    const data = await firebase
      .auth()
      .signInWithEmailAndPassword(email, password);
    const token = await data.user.getIdToken();
    return res.json({ token });
  } catch (error) {
    console.error("error occured", error);
    if (error.code === "auth/wrong-password") {
      return res.status(401).json({ message: "Email and password is wrong" });
    }
    return res.status(500).json({ error: error.code });
  }
};

exports.uploadImage = async (req, res) => {
  console.log("Insde uploadImage Route");
  const BusBoy = require("busboy");
  const path = require("path");
  const os = require("os");
  const fs = require("fs");
  const busBoy = new BusBoy({ headers: req.headers });
  let imageFileName;
  let imageToBeUploaded = {};

  busBoy.on("file", (fieldName, file, fileName, encoding, mimeType) => {
    console.log(fieldName);
    console.log(fileName);
    console.log(mimeType);

    const imageExtension = fileName.split(".")[fileName.split(".").length - 1];
    imageFileName = `${Math.random(Math.random()*100000000000)}.${imageExtension}`;
    const filePath = path.join(os.tmpdir(), imageFileName);
    imageToBeUploaded = {
      filePath,
      mimeType
    };
    file.pipe(fs.createWriteStream(filePath));
  });
  busBoy.on("finish", async () => {
    try {
      await admin.storage().bucket().upload(imageToBeUploaded.filePath, {
        resumable: false,
        metadata: {
          metadata: {
            contentType: imageToBeUploaded.mimeType
          }
        }
      });
      const imageUrl = `https://firebasestorage.googleapis.com/v0/b/${firebaseConfig.storageBucket}/o/${imageFileName}?alt=media`;
      await db.doc(`/users/${req.user.handle}`).update({ imageUrl });
      return res.json({ message: `Image uplaoded sucessfully` });
    } catch (err) {
      logger.error(err);
      return res.status(500).json({ error: err.code });
    }
  });
  busBoy.end(req.rawBody);
};
