const express = require("express");
const cors = require("cors");
require("dotenv").config();
const jwt = require("jsonwebtoken");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

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
      console.log(result);
      res.send(result);
    });

    app.post("/products", jwtVerify, userVerify, isSeller, async (req, res) => {
      const productInfo = req.body;

      const result = await productsCollection.insertOne(productInfo);
      console.log(result);

      res.send(result);
    });

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

    // app.get("/appointments", jwtVerify, async (req, res) => {
    //   const userEmail = req.query.email;
    //   const decoded = req.decoded.email;
    //   const date = req.query.date;
    //   if (userEmail !== decoded) {
    //     return res.status(401).send({ massege: "unauthorized access" });
    //   } else {
    //     const query = {};
    //     const bookQuery = { appointmentDate: date };
    //     const appointments = await appointmentCollection.find(query).toArray();
    //     const booked = await bookingCollection.find(bookQuery).toArray();
    //     appointments.forEach((appointment) => {
    //       const appointmentBook = booked.filter(
    //         (book) => appointment.name === book.tretmentName
    //       );
    //       const bookSlots = appointmentBook.map((book) => book.appointmentTime);
    //       const remainingSlots = appointment.slots.filter(
    //         (slot) => !bookSlots.includes(slot)
    //       );
    //       appointment.slots = remainingSlots;
    //     });
    //     res.send(appointments);
    //   }
    // });
    // app.get("/users", jwtVerify, async (req, res) => {
    //   const userEmail = req.query.email;
    //   const decoded = req.decoded.email;
    //   if (userEmail !== decoded) {
    //     return res.status(401).send({ massege: "unauthorized access" });
    //   } else {
    //     const query = {};
    //     const result = await usersCollection.find(query).toArray();
    //     res.send(result);
    //   }
    // });
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
    // app.put("/makeAdmin", jwtVerify, isAdmin, async (req, res) => {
    //   const userEmail = req.query.email;
    //   const decoded = req.decoded.email;
    //   const requestId = req.query.id;
    //   if (userEmail !== decoded) {
    //     return res.status(401).send({ massege: "unauthorized access" });
    //   } else {
    //     const query = { _id: ObjectId(requestId) };
    //     const options = { upsert: true };
    //     const updateDoc = {
    //       $set: {
    //         role: "admin",
    //       },
    //     };
    //     const result = await usersCollection.updateOne(
    //       query,
    //       updateDoc,
    //       options
    //     );
    //     res.send(result);
    //   }
    // });
    // // temporary api || just added price in appointmentCollection
    // // app.get("/addprice", async (req, res) => {
    // //   const query = {};
    // //   const options = { upsert: true };
    // //   const updateDoc = {
    // //     $set: {
    // //       price: 99,
    // //     },
    // //   };
    // //   const result = await appointmentCollection.updateMany(
    // //     query,
    // //     updateDoc,
    // //     options
    // //   );
    // //   res.send(result);
    // // });
    // app.post("/create-payment-intent", async (req, res) => {
    //   const appointment = req.body;
    //   const price = appointment.price;
    //   const amount = price * 100;
    //   const paymentIntent = await stripe.paymentIntents.create({
    //     currency: "usd",
    //     amount: amount,
    //     payment_method_types: ["card"],
    //   });
    //   res.send({
    //     clientSecret: paymentIntent.client_secret,
    //   });
    // });
    // app.post("/payments", jwtVerify, async (req, res) => {
    //   const userEmail = req.query.email;
    //   const decoded = req.decoded.email;
    //   const payment = req.body;
    //   const id = payment.bookingId;
    //   const query = { _id: ObjectId(id) };
    //   if (userEmail !== decoded) {
    //     return res.status(403).send({ massege: "forbidden access" });
    //   } else {
    //     const result = await paymentCollection.insertOne(payment);
    //     const options = { upsert: true };
    //     const updateDoc = {
    //       $set: {
    //         status: "PAID",
    //       },
    //     };
    //     const booking = await bookingCollection.updateOne(
    //       query,
    //       updateDoc,
    //       options
    //     );
    //     res.send(result);
    //   }
    // });
    // app.get("/transactions", jwtVerify, async (req, res) => {
    //   const userEmail = req.query.email;
    //   const decoded = req.decoded.email;
    //   if (userEmail !== decoded) {
    //     return res.status(403).send({ massege: "forbidden access" });
    //   } else {
    //     const query = { email: userEmail };
    //     const result = await paymentCollection.find(query).toArray();
    //     res.send(result);
    //   }
    // });
    // app.put("/removeAdmin", jwtVerify, isAdmin, async (req, res) => {
    //   const userEmail = req.query.email;
    //   const decoded = req.decoded.email;
    //   const requestId = req.query.id;
    //   if (userEmail !== decoded) {
    //     return res.status(401).send({ massege: "unauthorized access" });
    //   } else {
    //     const query = { _id: ObjectId(requestId) };
    //     const options = { upsert: true };
    //     const updateDoc = {
    //       $set: {
    //         role: "",
    //       },
    //     };
    //     const result = await usersCollection.updateOne(
    //       query,
    //       updateDoc,
    //       options
    //     );
    //     res.send(result);
    //   }
    // });
    // app.post("/users", async (req, res) => {
    //   const user = req.body;
    //   const result = await usersCollection.insertOne(user);
    //   res.send(result);
    // });
    // app.post("/booking", async (req, res) => {
    //   const date = req.query.date;
    //   const userEmail = req.query.email;
    //   const query = { appointmentDate: date };
    //   const alreadyBook = await bookingCollection.find(query).toArray();
    //   alreadyBook.map((book) => {
    //     if (book.email === userEmail) {
    //       res.send({ massege: "Already Book This Appointment!" });
    //       return;
    //     }
    //   });
    //   const bookingData = req.body;
    //   const result = await bookingCollection.insertOne(bookingData);
    //   res.send(result);
    // });
    // app.get("/booking", jwtVerify, async (req, res) => {
    //   const userEmail = req.query.email;
    //   const decoded = req.decoded.email;
    //   if (userEmail !== decoded) {
    //     return res.status(401).send({ massege: "unauthorized access" });
    //   } else {
    //     const query = { email: userEmail };
    //     const result = await bookingCollection.find(query).toArray();
    //     res.send(result);
    //   }
    // });

    // app.get("/specialist", jwtVerify, isAdmin, async (req, res) => {
    //   const userEmail = req.query.email;
    //   const decoded = req.decoded.email;
    //   if (userEmail !== decoded) {
    //     return res.status(401).send({ massege: "unauthorized access" });
    //   }
    //   const query = {};
    //   const result = await appointmentCollection
    //     .find(query)
    //     .project({ name: 1 })
    //     .toArray();
    //   res.send(result);
    // });
    // app.post("/doctors", jwtVerify, isAdmin, async (req, res) => {
    //   const userEmail = req.query.email;
    //   const decoded = req.decoded.email;
    //   const data = req.body;
    //   const result = await doctorsCollection.insertOne(data);
    //   if (result.acknowledged) {
    //     res.send(result);
    //   }
    // });
    // app.get("/doctors", jwtVerify, isAdmin, async (req, res) => {
    //   const userEmail = req.query.email;
    //   const decoded = req.decoded.email;
    //   if (userEmail !== decoded) {
    //     return res.status(403).send({ massege: "forbidden access" });
    //   } else {
    //     const query = {};
    //     const result = await doctorsCollection.find(query).toArray();
    //     res.send(result);
    //   }
    // });
    // app.delete("/doctors", jwtVerify, isAdmin, async (req, res) => {
    //   const id = req.query.id;
    //   const userEmail = req.query.email;
    //   const decoded = req.decoded.email;
    //   if (userEmail !== decoded) {
    //     return res.status(403).send({ massege: "forbidden access" });
    //   } else {
    //     const query = { _id: ObjectId(id) };
    //     const result = await doctorsCollection.deleteOne(query);
    //     if (result.deletedCount > 0) {
    //       res.send(result);
    //     }
    //   }
    // });
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
