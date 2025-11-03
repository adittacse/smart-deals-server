const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const dotenv = require("dotenv");
dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// middleware
app.use(express.json());
app.use(cors());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.gkaujxr.mongodb.net/?appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: false,
        deprecationErrors: true,
    },
});

app.get("/", (req, res) => {
    res.send("Smart Deals Server is running.");
});

async function run() {
    try {
        await client.connect();

        const db = client.db("smart_DB");
        const usersCollection = db.collection("users");
        const productsCollection = db.collection("products");
        const bidsCollection = db.collection("bids");

        // users collections api's
        app.post("/users", async (req, res) => {
            const newUser = req.body;
            const email = newUser.email;
            const query = { email: email };
            const existingUser = await usersCollection.findOne(query);
            if (existingUser) {
                res.send({ message: "User already exists." });
            } else {
                const result = await usersCollection.insertOne(newUser);
                res.send(result);
            }
        });

        // products collections api's
        app.get("/products", async (req, res) => {
            // const projectFields = { title: 1 };
            // const cursor = productsCollection.find().sort({ price_min: -1 }).limit(5).project(projectFields);
            const email = req.query.email;
            const query = {};
            if (email) {
                query.email = email;
            }
            const cursor = productsCollection.find(query).sort({ created_at: -1 });
            const result = await cursor.toArray();
            res.send(result);
        });

        app.get("/latest-products", async (req, res) => {
            const cursor = productsCollection
                .find()
                .sort({ created_at: -1 })
                .limit(6);
            const result = await cursor.toArray();
            res.send(result);
        });

        app.get("/products/:id", async (req, res) => {
            const id = req.params.id;
            // const query = { _id: new ObjectId(id) };
            const query = ObjectId.isValid(id)
                ? { _id: new ObjectId(id) }
                : { _id: id };
            const result = await productsCollection.findOne(query);
            res.send(result);
        });

        app.get("/categories", async (req, res) => {
            const list = await productsCollection.distinct("category");
            const categories = list
                .filter(Boolean)
                .map(s => s.trim())
                .filter((v, i, a) => a.indexOf(v) === i)
                .sort((a, b) => a.localeCompare(b));
            res.send(categories);
        });

        app.post("/products", async (req, res) => {
            const newProduct = req.body;
            const result = await productsCollection.insertOne(newProduct);
            res.send(result);
        });

        app.patch("/products/:id", async (req, res) => {
            const id = req.params.id;
            const updatedProduct = req.body;
            const query = { _id: new ObjectId(id) };
            const update = {
                $set: updatedProduct,
            };
            const options = {};
            const result = await productsCollection.updateOne(
                query,
                update,
                options,
            );
            res.send(result);
        });

        app.delete("/products/:id", async (req, res) => {
            const id = req.params.id;
            // const query = { _id: new ObjectId(id) };
            const query = ObjectId.isValid(id)
                ? { _id: new ObjectId(id) }
                : { _id: id };
            const result = await productsCollection.deleteOne(query);
            res.send(result);
        });

        // bids collections api's
        app.get("/bids", async (req, res) => {
            const email = req.query.email;
            const query = {};
            if (email) {
                query.buyer_email = email;
            }
            const cursor = bidsCollection.find(query);
            const result = await cursor.toArray();
            res.send(result);
        });

        app.get("/bids/:id", async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await bidsCollection.findOne(query);
            res.send(result);
        });

        app.get("/my-bids", async (req, res) => {
            const query = {};
            if (req.query.email) {
                query.buyer_email = req.query.email;
            }
            const bids = await bidsCollection.find(query).toArray();
            const result = [];
            for (const bid of bids) {
                const product = await productsCollection.findOne({ _id: bid.product });
                result.push({
                    ...bid,
                    product_image: product?.image,
                    product_title: product?.title,
                    product_price_min: product?.price_min,
                    product_price_max: product?.price_max,
                });
            }
            res.send(result);
        });

        app.get("/products/bids/:productId", async (req, res) => {
            const productId = req.params.productId;
            const product = await productsCollection.findOne({
                _id: productId,
            });
            const query = { product: productId };
            const bids = await bidsCollection
                .find(query)
                .sort({ bid_price: -1 })
                .toArray();
            // const result = await cursor.toArray();
            const result = bids.map((bid) => ({
                ...bid,
                product_image: product?.image,
                product_title: product?.title,
                product_price_min: product?.price_min,
                product_price_max: product?.price_max,
            }));
            res.send(result);
        });

        app.post("/bids", async (req, res) => {
            const newBid = req.body;
            const result = await bidsCollection.insertOne(newBid);
            res.send(result);
        });

        app.delete("/bids/:id", async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await bidsCollection.deleteOne(query);
            res.send(result);
        });

        await client.db("admin").command({ ping: 1 });
        console.log(
            "Pinged your deployment. You successfully connected to MongoDB!",
        );
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);

app.listen(port, () => {
    console.log(
        `Smart Deals Server listening on: ${process.env.PROTOCOL}://${process.env.HOST}:${process.env.PORT}`,
    );
});
