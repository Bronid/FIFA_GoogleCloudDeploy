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

var app = express();
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
      title: 'FIFA Match API',
      version: '1.0.0',
      description: 'API for managing FIFA match data',
    },
  },
  apis: [__filename],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

app.get('/api-docs.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.listen(8080, () => {
  console.log('server is running');
});

/**
 * @swagger
 * /matches:
 *   get:
 *     summary: Get all matches
 *     responses:
 *       '200':
 *         description: Successful response
 */
app.get('/matches', async (req, res) => {
  let dbo = mongoc.db('FIFA');
  let result = await dbo.collection('Match').find().toArray();
  res.json(result);
});

/**
 * @swagger
 * /matches/{filter}:
 *   get:
 *     summary: Get matches by country name or id
 *     parameters:
 *       - in: path
 *         name: filter
 *         required: true
 *         description: Country name or ID
 *         schema:
 *           type: string
 *           example: "Team A"
 *     responses:
 *       '200':
 *         description: Successful response
 */
app.get('/matches/:nameparam', async (req, res) => {
  let dbo = mongoc.db('FIFA');
  let conditionByName = {
    $or: [
      { country_guest: req.params.nameparam },
      { country_home: req.params.nameparam }
    ]
  };
  let result = await dbo.collection('Match').find(conditionByName).toArray();

  if (result.length === 0) {
    try {
      let conditionById = { _id: new ObjectId(req.params.nameparam) };
      result = await dbo.collection('Match').find(conditionById).toArray();
    } catch (error) {
      console.error('Invalid ObjectId:', error.message);
    }
  }

  res.json(result);
});

/**
 * @swagger
 * /addmatch:
 *   post:
 *     summary: Add a new match
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               date:
 *                 type: string
 *               country_home:
 *                 type: string
 *               country_guest:
 *                 type: string
 *               country_home_score:
 *                 type: integer
 *               country_guest_score:
 *                 type: integer
 *               user_score:
 *                 type: integer
 *           example:
 *             date: "13-09-2013"
 *             country_home: "Team A"
 *             country_guest: "Team B"
 *             country_home_score: 2
 *             country_guest_score: 1
 *             user_score: 0
 *     responses:
 *       '200':
 *         description: Successful response
 *         content:
 *           application/json:
 *             example:
 *               date: "13-09-2013"
 *               country_home: "Team A"
 *               country_guest: "Team B"
 *               country_home_score: 2
 *               country_guest_score: 1
 *               user_score: 0
 */
app.post('/addmatch', async (req, res) => {
  let dbo = mongoc.db('FIFA');
  let result = await dbo.collection('Match').insertOne(req.body);
  console.log(req.body);
  res.end(JSON.stringify(req.body));
});

/**
 * @swagger
 * /matches/{matchId}:
 *   delete:
 *     summary: Delete matches by ID
 *     parameters:
 *       - in: path
 *         name: matchId
 *         required: true
 *         description: ID of the match
 *         schema:
 *           type: string
 *           example: "65606fe95c0b3725824be3e8"
 *     responses:
 *       '200':
 *         description: Successful response
 */
app.delete('/matches/:nameparam', async (req, res) => {
  let dbo = mongoc.db('FIFA');
  let oid = { _id: new ObjectId(req.params.nameparam) };
  let result = await dbo.collection('Match').deleteOne(oid);

  if (result.deletedCount == 1) {
    res.json({ message: 'Match deleted successfully' });
  } else {
    res.json({ message: 'Match not found or not deleted' });
  }
});

/**
 * @swagger
 * /updatematches/{matchId}:
 *   put:
 *     summary: Update matches by ID
 *     parameters:
 *       - in: path
 *         name: matchId
 *         required: true
 *         description: ID of the match to be updated
 *         schema:
 *           type: string
 *           example: "65606fc05c0b3725824be3e7"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               date:
 *                 type: string
 *               country_home:
 *                 type: string
 *               country_guest:
 *                 type: string
 *               country_home_score:
 *                 type: integer
 *               country_guest_score:
 *                 type: integer
 *               user_score:
 *                 type: integer
 *             example:
 *               date: "13-09-2013"
 *               country_home: "Team A"
 *               country_guest: "Team B"
 *               country_home_score: 2
 *               country_guest_score: 1
 *               user_score: 0
 *     responses:
 *       '200':
 *         description: Successful response
 *         content:
 *           application/json:
 *             example:
 *               date: "13-09-2013"
 *               country_home: "Team A"
 *               country_guest: "Team B"
 *               country_home_score: 2
 *               country_guest_score: 1
 *               user_score: 0
 */
app.put('/updatematches/:nameparam', async (req, res) => {
  let dbo = mongoc.db('FIFA');
  let id = { _id: new ObjectId(req.params.nameparam) };
  let match = await dbo.collection('Match').findOne(id);

  if (req.body.got_user_score != null){
    match.user_score += 1
  }
  
  let updateDocument = {
    $set: {
      date: req.body.date || match.date,
      country_home: req.body.country_home || match.country_home,
      country_guest: req.body.country_guest || match.country_guest,
      country_home_score: req.body.country_home_score || match.country_home_score,
      country_guest_score: req.body.country_guest_score || match.country_guest_score,
      user_score: req.body.user_score || match.user_score,
    },
  };

  let result = await dbo.collection('Match').updateOne(id, updateDocument);
  res.json(result);
});

