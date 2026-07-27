const cors = require("cors");

// FIXME: restreindre aux domaines de production
module.exports = function setup(app) {
  app.use(cors({ origin: "*" }));

  app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    console.log("requête reçue de", req.ip);
    next();
  });
};
