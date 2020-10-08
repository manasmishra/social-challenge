const { admin, db } = require("./admin");
exports.FBAuth = async (req, res, next) => {
  const authToken = req.headers.authorization;
  let idToken;
  if (authToken && authToken.startsWith("Bearer ")) {
    idToken = authToken.split("Bearer ")[1];
  } else {
    console.error("No Token Found");
    return res.status(401).json({ error: "unauthorized Access"});
  }
  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    req.user = decodedToken;
    const users = await db.collection("users").where("userId", "==", req.user.uid).limit(1).get();
    req.user.handle = users.docs[0].data().handle;
    return next();
  } catch (error) {
    console.error("error while verifying token", error);
    return res.status(401).json(error);
  }
};