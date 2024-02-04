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
import jwt from 'jsonwebtoken';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

var app = express();
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'view')));

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  next();
});

let mongoURL = `mongodb://mongo:27017`;

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

const secretKey = 'your-secret-key'; // Change this to a secure secret key

app.get('/api-docs.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

function isAdmin(req, res, next) {
  if (req.user && req.user.rank === 'admin') {
    next();
  } else {
    res.status(403).json({ message: 'Access forbidden for non-admin users' });
  }
}

function verifyToken(req, res, next) {
  const token = req.headers.authorization;

  if (!token) {
    return res.status(403).json({ message: 'Token not provided' });
  }

  jwt.verify(token, secretKey, (err, decoded) => {
    if (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ message: 'Token has expired' });
      } else {
        return res.status(401).json({ message: 'Failed to authenticate token' });
      }
    }

    req.user = decoded;
    next();
  });
}

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
 *     security:
 *       - jwt: []
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
 *           example:
 *             date: "13-09-2013"
 *             country_home: "Team A"
 *             country_guest: "Team B"
 *     responses:
 *       '200':
 *         description: Successful response
 *         content:
 *           application/json:
 *             example:
 *               date: "13-09-2013"
 *               country_home: "Team A"
 *               country_guest: "Team B"
 *               is_end: false
 */
app.post('/addmatch', verifyToken, isAdmin, async (req, res) => {
  try {
    const { date, country_home, country_guest } = req.body;

    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!date.match(dateRegex)) {
      console.log(date);
      return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD.' });
    }

    const newMatch = {
      date,
      country_home,
      country_guest,
      is_end: false,
    };

    let dbo = mongoc.db('FIFA');
    let result = await dbo.collection('Match').insertOne(newMatch);
    console.log(newMatch);
    res.json(newMatch);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
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
app.delete('/matches/:nameparam', verifyToken, isAdmin, async (req, res) => {
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
 *     security:
 *       - jwt: []
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
 *               is_end:
 *                 type: boolean
 *               winner:
 *                 type: string
 *             example:
 *               date: "13-09-2013"
 *               country_home: "Team A"
 *               country_guest: "Team B"
 *               country_home_score: 2
 *               country_guest_score: 1
 *               is_end: true
 *               winner: "Team A"
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
 *               is_end: true
 *               winner: "Team A"
 */
app.put('/updatematches/:nameparam', verifyToken, isAdmin, async (req, res) => {
  try {
    const dbo = mongoc.db('FIFA');
    const matchId = { _id: new ObjectId(req.params.nameparam) };
    const match = await dbo.collection('Match').findOne(matchId);

    if (match.is_end) {
      return res.json({ error: 'You cannot update this match. This match has ended.' });
    }

    const homeScore = parseInt(req.body.country_home_score);
    const guestScore = parseInt(req.body.country_guest_score);
    console.log('homeScore:', homeScore);
    console.log('guestScore:', guestScore);

    const isIntegerScore = !isNaN(homeScore) && !isNaN(guestScore);
    console.log(isIntegerScore);

    if (!isIntegerScore) {
      console.log("test");
      return res.status(400).json({ error: 'Invalid date or score format' });
    }

    var addWinner;
    var add_is_end;

    if (homeScore > guestScore) {
      addWinner = req.body.country_home;
      add_is_end = true;
    }
    else if (homeScore < guestScore) {
      addWinner = req.body.country_guest;
      add_is_end = true;
    }
    else {
      addWinner = "Draw";
      add_is_end = true;
    }

    const updateDocument = {
      $set: {
        date: req.body.date || match.date,
        country_home: req.body.country_home || match.country_home,
        country_guest: req.body.country_guest || match.country_guest,
        country_home_score: req.body.country_home_score || match.country_home_score,
        country_guest_score: req.body.country_guest_score || match.country_guest_score,
        is_end: add_is_end || match.is_end,
        winner: addWinner || match.winner,
      },
    };

    const result = await dbo.collection('Match').updateOne(matchId, updateDocument);

    if (add_is_end) {
      const userBets = await dbo.collection('Users').find({ 'matches.matchID': matchId._id }).toArray();

      userBets.forEach(async (user) => {
        const betIndex = user.matches.findIndex((usermatch) => usermatch.matchID.toString() === matchId._id.toString());
        if (betIndex !== -1 && !user.matches[betIndex].winner) {
          await dbo.collection('Users').updateOne(
            { _id: user._id, 'matches.matchID': matchId._id },
            {
              $set: {
                'matches.$.winner': addWinner,
                'matches.$.team_1_score': req.body.country_home_score,
                'matches.$.team_2_score': req.body.country_guest_score,
              },
            }
          );
          if (user.matches[betIndex].bet_on === addWinner) {
            await dbo.collection('Users').updateOne({ _id: user._id }, { $inc: { money: user.matches[betIndex].amount * 2 } });
          }
        }
      });
    }

    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


app.listen(8080, () => {
  console.log('server is running');
});
