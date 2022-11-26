const express = require("express");
const cors = require("cors");
require("dotenv").config();
const jwt = require("jsonwebtoken");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

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
    const categorysCollection = client.db("mobile_mart").collection("category");
    const cartItemsCollection = client.db("mobile_mart").collection("carts");
    const paymentCollection = client.db("mobile_mart").collection("payments");

    // const boostedItemsCollection = client
    //   .db("mobile_mart")
    //   .collection("boost_product");
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

    app.get("/chekAdmin/:email", jwtVerify, async (req, res) => {
      const userEmail = req.params.email;
      const decoded = req.decoded.email;

      if (userEmail !== decoded) {
        return res.status(403).send({ massege: "unauthorized access" });
      } else {
        const query = { email: userEmail };
        const user = await usersCollection.find(query).toArray();

        if (user[0]?.role !== "admin") {
          return res.status(403).send({ massege: "unauthorized access" });
        } else {
          res.send({ isAdmin: user[0]?.role === "admin" });
        }
      }
    });

    // app.get("/chekAdmin/:email", jwtVerify, async (req, res) => {
    //   const userEmail = req.params.email;
    //   const decoded = req.decoded.email;

    //   if (userEmail !== decoded) {
    //     return res.status(403).send({ massege: "unauthorized access" });
    //   } else {
    //     const query = { email: userEmail };
    //     const user = await usersCollection.find(query).toArray();

    //     if (user[0]?.role !== "admin") {
    //       return res.status(403).send({ massege: "unauthorized access" });
    //     } else {
    //       res.send({ isAdmin: user[0]?.role === "admin" });
    //     }
    //   }
    // });

    app.get("/chekSeller/:email", jwtVerify, async (req, res) => {
      const userEmail = req.params.email;
      const decoded = req.decoded.email;

      if (userEmail !== decoded) {
        return res.status(403).send({ massege: "unauthorized access" });
      } else {
        const query = { email: userEmail };
        const user = await usersCollection.find(query).toArray();

        if (user[0]?.role !== "seller") {
          return res.status(403).send({ massege: "unauthorized access" });
        } else {
          res.send({ isSeller: user[0]?.role === "seller" });
        }
      }
    });

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
      const userRole = req.query.role;

      let query;

      if (userRole) {
        query = { role: userRole };
      } else {
        query = {};
      }

      const result = await usersCollection.find(query).toArray();

      res.send(result);
    });

    app.put(
      "/users-verify",
      jwtVerify,
      userVerify,
      isAdmin,
      async (req, res) => {
        const userId = req.query.id;

        const filter = { _id: ObjectId(userId) };
        const options = { upsert: true };

        const updateDoc = {
          $set: {
            userStatus: "verify",
          },
        };
        const result = await usersCollection.updateOne(
          filter,
          updateDoc,
          options
        );
        res.send(result);
      }
    );

    app.put(
      "/users-unverify",
      jwtVerify,
      userVerify,
      isAdmin,
      async (req, res) => {
        const userId = req.query.id;

        const filter = { _id: ObjectId(userId) };
        const options = { upsert: true };

        const updateDoc = {
          $set: {
            userStatus: "",
          },
        };
        const result = await usersCollection.updateOne(
          filter,
          updateDoc,
          options
        );
        res.send(result);
      }
    );

    app.put("/make-admin", jwtVerify, userVerify, isAdmin, async (req, res) => {
      const userId = req.query.id;
      const filter = { _id: ObjectId(userId) };
      const options = { upsert: true };
      const updateDoc = {
        $set: {
          role: "admin",
        },
      };
      const result = await usersCollection.updateOne(
        filter,
        updateDoc,
        options
      );
      res.send(result);
    });

    app.put(
      "/remove-admin",
      jwtVerify,
      userVerify,
      isAdmin,
      async (req, res) => {
        const userId = req.query.id;
        const filter = { _id: ObjectId(userId) };
        const options = { upsert: true };
        const updateDoc = {
          $set: {
            role: "customer",
          },
        };
        const result = await usersCollection.updateOne(
          filter,
          updateDoc,
          options
        );
        res.send(result);
      }
    );

    app.delete("/users", jwtVerify, userVerify, isAdmin, async (req, res) => {
      const email = req.query.deleteEmail;

      const id = req.query.id;
      const query = { _id: ObjectId(id) };
      const user = await usersCollection.deleteOne(query);
      const product = await productsCollection.deleteMany(query);
      if (user.deletedCount > 0) {
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
        res.send(result);
      }
    });

    app.get("/products-categorys", async (req, res) => {
      const query = {};
      const categorys = await categorysCollection.find(query).toArray();
      const products = await productsCollection.find(query).toArray();
      res.send(categorys);
    });

    app.post(
      "/categorys",
      jwtVerify,
      userVerify,
      isSeller,
      async (req, res) => {
        const category = req.body;

        const result = await categorysCollection.insertOne(category);

        res.send(result);
      }
    );

    app.get("/categorys", jwtVerify, userVerify, isSeller, async (req, res) => {
      const query = {};
      const result = await categorysCollection.find(query).toArray();
      res.send(result);
    });

    app.get("/all-product", async (req, res) => {
      const category = req.query.categorys;
      const query = { category: category, isBooked: false };
      const result = await productsCollection.find(query).toArray();
      res.send(result);
    });

    app.get("/display-products", async (req, res) => {
      const query = { isBooked: false };
      const result = await productsCollection
        .find(query)
        .limit(4)
        .sort({ postDate: -1 })
        .toArray();
      res.send(result);
    });

    app.post("/add-carts", jwtVerify, userVerify, async (req, res) => {
      const cartItems = req.body;
      const newCartId = cartItems.cartId;
      const query = { cartId: newCartId };
      const alreadyAdded = await cartItemsCollection.findOne(query);

      if (alreadyAdded === null || alreadyAdded.cartId !== newCartId) {
        const result = await cartItemsCollection.insertOne(cartItems);
        res.send(result);
      } else {
        res.send({ massege: "this items already added" });
      }
    });

    app.get("/add-carts", jwtVerify, userVerify, async (req, res) => {
      const userEmail = req.query.email;
      const query = { userEmail: userEmail };
      const result = await cartItemsCollection.find(query).toArray();
      res.send(result);
    });

    app.delete("/add-carts", jwtVerify, userVerify, async (req, res) => {
      const id = req.query.id;
      const query = { _id: ObjectId(id) };
      const result = await cartItemsCollection.deleteOne(query);
      res.send(result);
    });

    app.get("/products-details/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await productsCollection.findOne(query);
      res.send(result);
    });

    app.put(
      "/add-advertise",
      jwtVerify,
      userVerify,
      isSeller,
      async (req, res) => {
        const boostedId = req.query.id;

        const filter = { _id: ObjectId(boostedId) };
        const options = { upsert: true };
        const updateDoc = {
          $set: {
            isBoosted: true,
          },
        };
        const result = await productsCollection.updateOne(
          filter,
          updateDoc,
          options
        );
        res.send(result);
      }
    );

    app.put(
      "/remove-advertise",
      jwtVerify,
      userVerify,
      isSeller,
      async (req, res) => {
        const boostedId = req.query.id;

        const filter = { _id: ObjectId(boostedId) };
        const options = { upsert: true };
        const updateDoc = {
          $set: {
            isBoosted: false,
          },
        };
        const result = await productsCollection.updateOne(
          filter,
          updateDoc,
          options
        );
        res.send(result);
      }
    );

    app.get("/add-advertise", async (req, res) => {
      const query = { isBoosted: true, isBooked: false };
      const result = await productsCollection.find(query).toArray();
      res.send(result);
    });

    app.put("/add-booking", jwtVerify, userVerify, async (req, res) => {
      const bookedId = req.query.id;
      const userEmail = req.query.email;

      const filter = { _id: ObjectId(bookedId) };
      const options = { upsert: true };
      const updateDoc = {
        $set: {
          isBooked: true,
          customerEmail: userEmail,
        },
      };
      const result = await productsCollection.updateMany(
        filter,
        updateDoc,
        options
      );
      res.send(result);
    });

    app.put("/remove-booking", jwtVerify, userVerify, async (req, res) => {
      const bookedId = req.query.id;

      const filter = { _id: ObjectId(bookedId) };
      const options = { upsert: true };
      const updateDoc = {
        $set: {
          isBooked: false,
          customerEmail: "",
        },
      };
      const result = await productsCollection.updateOne(
        filter,
        updateDoc,
        options
      );
      res.send(result);
    });

    app.get("/booking-product", jwtVerify, userVerify, async (req, res) => {
      const userEmail = req.query.email;

      const query = { customerEmail: userEmail };
      const result = await productsCollection.find(query).toArray();
      res.send(result);
    });

    app.get("/payment-product/:id", async (req, res) => {
      const productId = req.params.id;

      const query = { _id: ObjectId(productId) };
      const result = await productsCollection.findOne(query);
      res.send(result);
    });

    // payment
    app.post(
      "/create-payment-intent",
      jwtVerify,
      userVerify,
      async (req, res) => {
        const product = req.body;
        const price = product.sellPrice;
        const amount = price * 100;

        const paymentIntent = await stripe.paymentIntents.create({
          currency: "usd",
          amount: amount,
          payment_method_types: ["card"],
        });
        res.send({
          clientSecret: paymentIntent.client_secret,
        });
      }
    );

    app.post("/payments", jwtVerify, userVerify, async (req, res) => {
      const payments = req.body;

      const id = payments.bookingId;
      const query = { _id: ObjectId(id) };

      const result = await paymentCollection.insertOne(payments);

      if (result.insertedId) {
        const options = { upsert: true };

        const updateDoc = {
          $set: {
            paymentStatus: "PAID",
          },
        };
        const bookingProduct = await productsCollection.updateOne(
          query,
          updateDoc,
          options
        );

        const filter = { cartId: id };
        const cartDelete = await cartItemsCollection.deleteOne(filter);
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
