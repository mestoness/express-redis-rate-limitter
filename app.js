const redis = require("redis");
const express = require("express");
const client = redis.createClient();
const PORT = process.env.PORT || 3001;
const app = express();

client.on("connect", (error) => {
  console.log("succes");
});
client.on("error", (error) => {
  console.error(error);
});
const limitter = async (req, res, next) => {
  const limitterOptions = {
    max: 20,
    time: 60,
    id: "rate",
  };
  let ip = req.connection.remoteAddress || req.headers["x-forwarded-for"];
  if (ip.includes("::ffff:")) {
    ip = ip.split(":").reverse()[0];
  }
  if (ip) {
    client.ttl(limitterOptions.id + ":" + ip, function (errTLL, tll) {
      if (errTLL) {
        console.log(errTLL);
      } else {
        client.get(limitterOptions.id + ":" + ip, function (err, response) {
          if (err) {
            console.log(err);
          } else {
            if (response == null) {
              client.set(
                limitterOptions.id + ":" + ip,
                "1",
                "EX",
                limitterOptions.time,
                function (err, responseProcess) {
                  if (err) {
                    console.log(err);
                  } else {
                    next();
                  }
                }
              );
            } else {
              if (response > limitterOptions.max) {
                res.json({ error: "Rate Limit Error!" });
              } else {
                client.set(
                  limitterOptions.id + ":" + ip,
                  Number(response) + 1,
                  "EX",
                  Number(tll),
                  function (err, responseProcess) {
                    if (err) {
                      console.log(err);
                    } else {
                      next();
                    }
                  }
                );
              }
            }
          }
        });
      }
    });
  } else {
    next();
  }
};

app.use("*", limitter);
app.get("/", async function (req, res) {
  res.json({});
});

app.listen(PORT, (err) => {
  if (err) return console.log(err);
  console.log("http://localhost:" + PORT);
});
