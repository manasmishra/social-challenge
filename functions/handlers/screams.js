const { db } = require("../util/admin");
exports.getAllScreams = (req, res) => {
  db.collection("screams")
    .orderBy("createdAt", "desc")
    .get()
    .then((data) => {
      const screams = [];
      data.forEach((doc) => {
        screams.push({
          screamId: doc.id,
          ...doc.data(),
        });
      });
      return res.json(screams);
    })
    .catch((err) => {
      console.error("error is:", err);
    });
};

exports.createOneScream = (req, res) => {
  const newScream = {
    body: req.body.body,
    userHandle: req.user.handle,
    createdAt: new Date().toISOString(),
  };
  db.collection("screams")
    .add(newScream)
    .then((doc) => {
      return res.json({ message: `Document ${doc.id} created successfully` });
    })
    .catch((err) => {
      console.error("error is:", err);
      return res.status(500).json({ error: "Something Went Wrong." });
    });
};
