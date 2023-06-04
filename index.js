const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express();
require('dotenv').config();
const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());
// const VerifyJWT = (req, res, next) => {
// 	const authorization = req.headers.authorization;
// 	if (!authorization) {
// 		return res
// 			.status(401)
// 			.send({ error: true, message: 'unauthorized access' });
// 	}
// 	// bearer token
// 	const token = authorization.split(' ')[1];
// 	jwt.verify(token.process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
// 		if (err) {
// 			return res
// 				.status(401)
// 				.send({ error: true, message: 'unauthorized access' });
// 		}
// 		req.decoded=de
// 	});
// };

// console.log(process.env.DB_PASS);

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.t4pio7r.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
	serverApi: {
		version: ServerApiVersion.v1,
		strict: true,
		deprecationErrors: true,
	},
});

async function run() {
	try {
		// Connect the client to the server	(optional starting in v4.7)
		await client.connect();

		const usersCollection = client.db('bistroDb').collection('users');
		const menuCollection = client.db('bistroDb').collection('menu');
		const reviewsCollection = client.db('bistroDb').collection('reviews');
		const carCollection = client.db('bistroDb').collection('carts');

		// users related api
		app.get('/users', async (req, res) => {
			const result = await usersCollection.find().toArray();
			res.send(result);
		});

		app.post('/users', async (req, res) => {
			const user = req.body;
			console.log('user', user);
			const query = { email: user.email };
			const exitingUser = await usersCollection.findOne(query);
			console.log('exit', exitingUser);
			if (exitingUser) {
				return res.send({ message: 'Already exit' });
			}
			const result = await usersCollection.insertOne(user);
			res.send(result);
		});

		// menu related api
		app.get('/menu', async (req, res) => {
			const result = await menuCollection.find().toArray();
			res.send(result);
		});

		// app.post('/jwt', (req, res) => {
		// 	const user = req.body;
		// 	const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
		// 		expiresIn: '1h',
		// 	});
		// 	res.send(token);
		// });

		// review related apis
		app.get('/reviews', async (req, res) => {
			const result = await reviewsCollection.find().toArray();
			res.send(result);
		});

		app.patch('/users/admin/:id', async (req, res) => {
			const id = req.params.id;
			const filter = { _id: new ObjectId(id) };
			const updatedDoc = {
				$set: {
					role: 'admin',
				},
			};
			const result = await usersCollection.updateOne(filter, updatedDoc);
			res.send(result);
		});

		// cart bistro collection
		app.get('/carts', async (req, res) => {
			const email = req.query.email;
			// console.log(email);
			if (!email) {
				res.send([]);
			}
			const query = { email: email };
			const result = await carCollection.find(query).toArray();
			res.send(result);
		});

		app.post('/carts', async (req, res) => {
			const item = req.body;
			const result = await carCollection.insertOne(item);
			res.send(result);
		});

		// Deleted section
		app.delete('/carts/:id', async (req, res) => {
			const id = req.params.id;
			const query = { _id: new ObjectId(id) };
			const result = await carCollection.deleteOne(query);
			res.send(result);
		});

		// Send a ping to confirm a successful connection
		await client.db('admin').command({ ping: 1 });
		console.log(
			'Pinged your deployment. You successfully connected to MongoDB!'
		);
	} finally {
		// Ensures that the client will close when you finish/error
		// await client.close();
	}
}
run().catch(console.dir);

app.get('/', (req, res) => {
	res.send('Bistro Boss Server is running');
});

app.listen(port, () => {
	console.log(`Bistro Boss server port:${port}`);
});

/**
 *
 * users:usersCollections
 * app.get('/users')
 * app.get('/users/:id')
 * app.post('/users')
 * app.patch('/users/:id')
 * app.put('/users/:id')
 * app.deleted('/users/:id)*/
