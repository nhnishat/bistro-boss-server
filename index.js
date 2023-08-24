const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const port = process.env.PORT || 5000;
const app = express();
require('dotenv').config();
const stripe = require('stripe')(process.env.PAYMENT_SECRET_KEY);

// middleware
app.use(cors());
app.use(express.json());

const verifyJWT = (req, res, next) => {
	const authorization = req.headers.authorization;
	if (!authorization) {
		return res.status(401).send({ error: true, message: 'unauthorize access' });
	}
	// bearer token
	const token = authorization.split(' ')[1];
	jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (error, decoded) => {
		if (error) {
			return res
				.status(403)
				.send({ error: true, message: 'unauthorize token' });
		}
		req.decoded = decoded;
		next();
	});
};

const uri = `mongodb+srv://${process.env.USER_NAME}:${process.env.USER_PASS}@cluster0.t4pio7r.mongodb.net/?retryWrites=true&w=majority`;

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
		// await client.connect();
		// Send a ping to confirm a successful connection

		const usersCollection = client.db('bistro-boss').collection('users');
		const menuCollection = client.db('bistro-boss').collection('menu');
		const reviewsCollection = client.db('bistro-boss').collection('reviews');
		const cartsCollection = client.db('bistro-boss').collection('carts');
		const paymentCollection = client.db('bistro-boss').collection('payment');
		const bookingCollection = client.db('bistro-boss').collection('booking');
		const showBookingCollection = client
			.db('bistro-boss')
			.collection('showbooking');

		app.post('/jwt', (req, res) => {
			const user = req.body;
			const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
				expiresIn: '30d',
			});
			res.send(token);
		});

		// verifyAdmin
		const verifyAdmin = async (req, res, next) => {
			const email = req.decoded.email;
			const query = { email: email };
			const user = await usersCollection.findOne(query);

			if (!user || user.role !== 'admin') {
				return res
					.status(403)
					.send({ error: true, message: 'Access forbidden' });
			}

			next();
		};
		// booking collection

		app.get('/booking', async (req, res) => {
			const result = await bookingCollection.find().toArray();
			res.send(result);
		});
		app.get('/booking/:email', async (req, res) => {
			const email = req.params.email;
			const query = { email: email };
			const result = await bookingCollection.find(query).toArray();
			res.send(result);
		});

		app.post('/booking', async (req, res) => {
			const book = req.body;
			const bookingResult = await bookingCollection.insertOne(book);
			const showBookingData = { ...book, status: 'Done' };
			const showBookingResult = await showBookingCollection.insertOne(
				showBookingData
			);
			res.send({ bookingResult, showBookingResult });
		});
		app.delete('/booking/:id', async (req, res) => {
			const id = req.params.id;
			const query = { _id: new ObjectId(id) };
			const result = await bookingCollection.deleteOne(query);
			res.send(result);
		});

		app.post('/show-booking', async (req, res) => {
			const booking = req.body;
			const result = await showBookingCollection.insertOne(booking);
			res.send(result);
		});

		// users collection

		app.get('/users', verifyJWT, verifyAdmin, async (req, res) => {
			const result = await usersCollection.find().toArray();
			res.send(result);
		});

		app.post('/users', async (req, res) => {
			const user = req.body;
			const query = { email: user?.email };
			const existingUser = await usersCollection.findOne(query);
			if (existingUser) {
				return res.send('user already exist');
			}
			const result = await usersCollection.insertOne(user);
			res.send(result);
		});
		app.get('/users/admin/:email', verifyJWT, async (req, res) => {
			const email = req.params.email;
			const query = { email: email };
			const user = await usersCollection.findOne(query);

			if (!user) {
				res.status(404).send({ error: true, message: 'User not found' });
				return; // Return to prevent further execution
			}

			const isAdmin = user.role === 'admin';
			res.send({ admin: isAdmin });
		});

		// app.get('/users/admin/:email', verifyJWT, async (req, res) => {
		// 	const email = req.params.email;
		// 	if (req.decoded !== email) {
		// 		res.send({ admin: false });
		// 	}
		// 	const query = { email: email };
		// 	const user = await usersCollection.findOne(query);
		// 	const result = { admin: user?.role === 'admin' };
		// 	res.send(result);
		// });

		app.patch('/users/admin/:id', async (req, res) => {
			const id = req.params.id;
			// console.log(id);
			const filter = { _id: new ObjectId(id) };
			const updatedDoc = {
				$set: {
					role: 'admin',
				},
			};
			const result = await usersCollection.updateOne(filter, updatedDoc);
			res.send(result);
		});

		app.delete('/users/admin/:id', async (req, res) => {
			const id = req.params.id;
			// console.log(id);
			const query = { _id: new ObjectId(id) };
			const result = await usersCollection.deleteOne(query);
			res.send(result);
		});

		// menu collection

		app.get('/menu', async (req, res) => {
			const result = await menuCollection.find().toArray();
			// console.log(result);
			res.send(result);
		});

		app.post('/menu', verifyJWT, verifyAdmin, async (req, res) => {
			const newItem = req.body;
			const result = await menuCollection.insertOne(newItem);
			res.send(result);
		});

		app.delete('/menu/:id', verifyJWT, verifyAdmin, async (req, res) => {
			const id = req.params.id;
			const query = { _id: new ObjectId(id) };
			const result = await menuCollection.deleteOne(query);
			res.send(result);
		});

		// update menu
		app.patch('/menu/:id', verifyJWT, verifyAdmin, async (req, res) => {
			const id = req.params.id;
			const filter = { _id: id };
			const options = { upsert: true };
			const updateMenu = req.body;
			const menu = {
				$set: {
					name: updateMenu.name,
					category: updateMenu.category,
					price: updateMenu.price,
					recipe: updateMenu.recipe,
					image: updateMenu.image,
				},
			};

			const result = await menuCollection.updateOne(filter, menu, options);
			res.send(result);
		});

		// reviews collection
		app.get('/reviews', async (req, res) => {
			const result = await reviewsCollection.find().toArray();
			// console.log(result);
			res.send(result);
		});

		// cartsCollections
		app.get('/carts', verifyJWT, async (req, res) => {
			const email = req.query.email;
			if (!email) {
				res.send([]);
			}
			const decodedEmail = req.decoded.email;
			if (email !== decodedEmail) {
				return res
					.status(403)
					.send({ error: true, message: 'forbiden access' });
			}
			const query = { email: email };
			const result = await cartsCollection.find(query).toArray();
			// console.log(result);
			res.send(result);
		});
		app.post('/carts', async (req, res) => {
			const item = req.body;
			// console.log(item);
			const result = await cartsCollection.insertOne(item);
			// console.log(result);
			res.send(result);
		});
		// delete collection
		app.delete('/carts/:id', async (req, res) => {
			const id = req.params.id;
			// console.log(id);
			const query = { _id: new ObjectId(id) };
			const result = await cartsCollection.deleteOne(query);
			res.send(result);
		});

		// create peyment
		app.post('/create-payment-intent', verifyJWT, async (req, res) => {
			const { price } = req.body;
			const amount = parseInt(price * 100);
			const paymentIntent = await stripe.paymentIntents.create({
				amount: amount,
				currency: 'usd',
				payment_method_types: ['card'],
			});
			res.send({ clientSecret: paymentIntent.client_secret });
		});
		// peyment related api
		app.get('/payment/:email', async (req, res) => {
			const email = req.params.email;
			const query = { email: email };
			const result = await paymentCollection.find(query).toArray();
			res.send(result);
		});
		app.post('/payment', verifyJWT, async (req, res) => {
			const payment = req.body;
			const insertResult = await paymentCollection.insertOne(payment);
			const query = {
				_id: {
					$in: payment.cartItems.map((id) => new ObjectId(id)),
				},
			};
			const deleteResult = await cartsCollection.deleteMany(query);

			res.send({ insertResult, deleteResult });
		});

		// app.get('/home', async (req, res) => {
		// 	try {
		// 		// Use find() to retrieve all documents with menuItems
		// 		const documentsWithMenuItems = await paymentCollection
		// 			.find({ menuItems: { $exists: true } })
		// 			.toArray();

		// 		// Extract menuItems from each document
		// 		const menuItems = documentsWithMenuItems
		// 			.map((doc) => doc.menuItems)
		// 			.flat();

		// 		console.log('menuItems:', menuItems);
		// 		const pipeline = [
		// 			{
		// 				$match: {
		// 					menuItems: { $exists: true },
		// 				},
		// 			},
		// 			{
		// 				$lookup: {
		// 					from: 'menu',
		// 					localField: 'menuItems',
		// 					foreignField: '_id',
		// 					as: 'menuItemsData',
		// 				},
		// 			},
		// 		];

		// 		console.log('After $lookup - menuItemsData:', '$menuItemsData');
		// 		const cat = await paymentCollection.aggregate(pipeline).toArray();
		// 		console.log('admin home', cat);
		// 		res.send(cat);
		// 	} catch (error) {
		// 		console.error('Error in /home endpoint:', error);
		// 		res.status(500).send('Internal Server Error');
		// 	}
		// });

		app.get('/admin-stats', verifyJWT, verifyAdmin, async (req, res) => {
			const users = await usersCollection.estimatedDocumentCount();
			const products = await menuCollection.estimatedDocumentCount();
			const orders = await paymentCollection.estimatedDocumentCount();
			const payment = await paymentCollection.find().toArray();
			const revenue = payment.reduce(
				(sum, payment) => sum + parseFloat(payment.price),
				0
			);
			res.send({ users, products, orders, revenue });
		});
		app.get('/order-stats', verifyJWT, verifyAdmin, async (req, res) => {
			const pipeline = [
				{
					$lookup: {
						from: 'menu',
						localField: 'menuItems',
						foreignField: '_id',
						as: 'menuItemsData',
					},
				},
				{
					$unwind: '$menuItemsData',
				},
				{
					$group: {
						_id: '$menuItemsData.category',
						count: { $sum: 1 },
						total: { $sum: '$menuItemsData.price' },
					},
				},
				{
					$project: {
						category: '$_id',
						count: 1,
						total: { $round: ['$total', 2] },
						_id: 0,
					},
				},
			];

			const result = await paymentCollection.aggregate(pipeline).toArray();
			res.send(result);
		});

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
	res.send('Boss is sitting');
});
app.listen(port, () => {
	console.log(`Bistro Boss sitting on port ${port}`);
});
