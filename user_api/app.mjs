import * as http from 'http';
import { MongoClient, ObjectId } from 'mongodb';
import express from 'express';
import bodyParser from 'body-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import fs from 'fs/promises';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'view')));

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
});

let mongoLogin = "cloudp731"
let mongoPassword = "y9XhDjrbE9YMTvHr"

let mongoURL = `mongodb+srv://${mongoLogin}:${mongoPassword}@fifa.mfucycd.mongodb.net/?retryWrites=true&w=majority`

let mongoc = new MongoClient(mongoURL);

const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'User API',
      version: '1.0.0',
      description: 'API for managing user data',
    },
  },
  apis: [__filename],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.listen(8081, () => {
  console.log('Server is running');
});

/**
 * @swagger
 * /users/register:
 *   post:
 *     summary: Register a new user
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               login:
 *                 type: string
 *               password:
 *                 type: string
 *               score:
 *                 type: integer
 *           example:
 *             login: "user123"
 *             password: "password123"
 *             score: 10
 *     responses:
 *       '200':
 *         description: Successful response
 *         content:
 *           application/json:
 *             example:
 *               _id: "5f4a5ea6bc9f1729d8d21937"
 *               login: "user123"
 *               password: "password123"
 *               score: 10
 */
app.post('/users/register', async (req, res) => {
  const dbo = mongoc.db('FIFA');

  const existingUser = await dbo.collection('Users').findOne({ login: req.body.login });
  if (existingUser) {
    res.status(400).json({ message: 'User with this login already exists' });
    return;
  }

  const result = await dbo.collection('Users').insertOne(req.body);
});


/**
 * @swagger
 * /users/login:
 *   post:
 *     summary: Login user
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               login:
 *                 type: string
 *               password:
 *                 type: string
 *           example:
 *             login: "user123"
 *             password: "password123"
 *     responses:
 *       '200':
 *         description: Successful response
 *         content:
 *           application/json:
 *             example:
 *               _id: "5f4a5ea6bc9f1729d8d21937"
 *               login: "user123"
 *               password: "password123"
 *               score: 10
 *       '401':
 *         description: Unauthorized
 */
app.post('/users/login', async (req, res) => {
  const dbo = mongoc.db('FIFA');
  const user = await dbo.collection('Users').findOne({ login: req.body.login, password: req.body.password });
  if (user) {
    res.json(user);
  } else {
    res.status(401).json({ message: 'Invalid login or password' });
  }
});

/**
 * @swagger
 * /users/givescore:
 *   post:
 *     summary: Give score to a user
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *               password:
 *                 type: string
 *           example:
 *             username: "user123"
 *             password: "password123"
 *     responses:
 *       '200':
 *         description: Successful response
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               message: "Score given successfully"
 *       '400':
 *         description: Bad request
 */
app.post('/users/givescore', async (req, res) => {
    const dbo = mongoc.db('FIFA');
  
    const user = await dbo.collection('Users').findOne({ login: req.body.login, password: req.body.password });

    if (!user) {
      res.status(400).json({ success: false, message: 'Invalid username or password' });
      return;
    }
  
    if (user.score <= 0) {
      res.status(400).json({ success: false, message: 'User has insufficient score' });
      return;
    }

    const result = await Promise.all([
      dbo.collection('Users').updateOne({ login: req.body.login, password: req.body.password }, { $inc: { score: -1 } }),
    ]);
  
    res.json({ success: true, message: 'Score given successfully' });
  });

  