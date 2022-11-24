const express = require("express");
const cors = require("cors");
require("dotenv").config();
const jwt = require("jsonwebtoken");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const query = require("express/lib/middleware/query");

const port = process.env.POST || 5000;

const app = express();

// middleware
app.use(cors());
app.use(express.json());

// middleware function
const jwtVerify = (req, res, next) => {
  const bearerToken = req.headers.authorization;
  const jwtToken = bearerToken.split(" ")[1];

  jwt.verify(jwtToken, secret, (err, decoded) => {
    if (err) {
      return res.status(401).send({ massege: "unauthorized access" });
    } else {
      req.decoded = decoded;
      next();
    }
  });
};

const userVerify = (req, res, next) => {
  const userEmail = req.query.email;
  const decoded = req.decoded.email;

  if (userEmail !== decoded) {
    return res.status(401).send({ massege: "unauthorized access" });
  } else {
    next();
  }
};

const uri = process.env.DATABASE_URI;

const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

const secret = process.env.JWT_SECRET;

const run = async () => {
  try {
    const usersCollection = client.db("mobile_mart").collection("users");
    const productsCollection = client.db("mobile_mart").collection("products");

    // const bookingCollection = client.db("mobile_mart").collection("booking");
    // const doctorsCollection = client.db("mobile_mart").collection("doctors");
    // const paymentCollection = client.db("mobile_mart").collection("payments");
    // create JWT

    const isAdmin = async (req, res, next) => {
      const adminEmail = req.query.email;
      const filter = { email: adminEmail };
      const user = await usersCollection.find(filter).toArray();
      if (user[0]?.role === "admin") {
        next();
      } else {
        return res.status(401).send({ massege: "unauthorized access" });
      }
    };

    const isSeller = async (req, res, next) => {
      const sellerEmail = req.query.email;

      const query = { email: sellerEmail };
      const sellerInfo = await usersCollection.find(query).toArray();

      if (sellerInfo[0]?.role === "admin" || "seller") {
        next();
      } else {
        return res.status(401).send({ massege: "unauthorized access" });
      }
    };

    app.post("/jwt", async (req, res) => {
      const userInfo = req.body;
      const userEmail = { email: userInfo.email };

      const jwtToken = jwt.sign(userEmail, secret, { expiresIn: "5h" });
      const result = await usersCollection.insertOne(userInfo);
      res.send({ jwtToken });
    });

    app.get("/users", jwtVerify, userVerify, isAdmin, async (req, res) => {
      const query = {};
      const result = await usersCollection.find(query).toArray();

      //   console.log(result);
      res.send(result);
    });

    app.delete("/users", jwtVerify, userVerify, isAdmin, async (req, res) => {
      const email = req.query.deleteEmail;

      console.log(email);
      const id = req.query.id;
      const query = { _id: ObjectId(id) };
      const user = await usersCollection.deleteOne(query);
      const product = await productsCollection.deleteMany(query);
      if (user.deletedCount > 0) {
        console.log(product);
        res.send(user);
      }
    });

    app.post("/products", jwtVerify, userVerify, isSeller, async (req, res) => {
      const productInfo = req.body;
      const result = await productsCollection.insertOne(productInfo);
      res.send(result);
    });

    app.get(
      "/all-products",
      jwtVerify,
      userVerify,
      isAdmin,
      async (req, res) => {
        const query = {};
        const result = await productsCollection.find(query).toArray();
        console.log(result);
        res.send(result);
      }
    );

    app.get("/products", jwtVerify, userVerify, isSeller, async (req, res) => {
      const userEmail = req.query.email;

      const query = { sellerEmail: userEmail };
      const result = await productsCollection.find(query).toArray();
      res.send(result);
    });

    app.delete("/products", async (req, res) => {
      const id = req.query.id;

      const query = { _id: ObjectId(id) };
      const result = await productsCollection.deleteOne(query);
      if (result.deletedCount === 1) {
        console.log(result);
        res.send(result);
      }
    });
  } finally {
  }
};

run().catch((err) => console.log(err));

app.get("/", (req, res) => {
  res.send("Mobile Mart - Server is Running");
});

app.listen(port, () => {
  console.log(`Mobile Mart - Server is Running port: ${port}`);
});
