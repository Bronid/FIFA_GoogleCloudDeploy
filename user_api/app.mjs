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
import bcrypt from 'bcrypt';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'view')));

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  next();
});

let mongoLogin = "cloudp731";
let mongoPassword = "y9XhDjrbE9YMTvHr";

let mongoURL = `mongodb+srv://${mongoLogin}:${mongoPassword}@fifa.mfucycd.mongodb.net/?retryWrites=true&w=majority`;

let mongoc = new MongoClient(mongoURL);

const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'User API',
      version: '1.0.0',
      description: 'API for managing user data',
    },
    securityDefinitions: {
      jwt: {
        type: 'apiKey',
        name: 'Authorization',
        in: 'header',
      },
    },
  },
  apis: [__filename],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

const secretKey = 'your-secret-key'; // Change this to a secure secret key

function generateToken(user) {
  return jwt.sign(user, secretKey, { expiresIn: '1h' }); // Token expires in 1 hour
}

function hasPermissionToInvoke(req, res, next) {
  const requestedUser = req.params.login;
  
  if (req.user.login === requestedUser || req.user.rank === 'admin') {
    next();
  } else {
    return res.status(403).json({ message: 'Access forbidden for this user' });
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


function isAdmin(req, res, next) {
  if (req.user && req.user.rank === 'admin') {
    next();
  } else {
    res.status(403).json({ message: 'Access forbidden for non-admin users' });
  }
}

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
 *                 minLength: 6
 *               password:
 *                 type: string
 *                 minLength: 6
 *     responses:
 *       '200':
 *         description: Successful registration
 *         content:
 *           application/json:
 *             example:
 *               _id: "1234567890"
 *               login: "example_user"
 *               rank: "user"
 *               money: 0
 *               matches: []
 *       '400':
 *         description: Bad request, invalid input
 *         content:
 *           application/json:
 *             example:
 *               message: "Login should have at least 5 characters"
 *       '500':
 *         description: Internal server error
 *         content:
 *           application/json:
 *             example:
 *               error: "Internal server error"
 */
app.post('/users/register', async (req, res) => {
  const MIN_LOGIN_LENGTH = 6;
  const MIN_PASSWORD_LENGTH = 6;
  const { login, password } = req.body;
  const rank = "user";
  const money = 0;
  const matches = [];

  if (login.length < MIN_LOGIN_LENGTH) {
    return res.status(400).json({ message: `Login should have at least ${MIN_LOGIN_LENGTH} characters` });
  }

  if (password.length < MIN_PASSWORD_LENGTH) {
    return res.status(400).json({ message: `Password should have at least ${MIN_PASSWORD_LENGTH} characters` });
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  try {
    const dbo = mongoc.db('FIFA');
    const existingUser = await dbo.collection('Users').findOne({ login });

    if (existingUser) {
      return res.status(400).json({ message: 'User with this login already exists' });
    }

    const user = await dbo.collection('Users').insertOne({ login, password: hashedPassword, rank, money, matches });
    const token = generateToken({ login: login, rank: rank });
    res.json({ login, token });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /users/login:
 *   post:
 *     summary: Log in a user
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
 *     responses:
 *       '200':
 *         description: Successful login
 *         content:
 *           application/json:
 *             example:
 *               user:
 *                 _id: "1234567890"
 *                 login: "example_user"
 *                 rank: "user"
 *                 money: 0
 *                 matches: []
 *               token: "your_generated_token"
 *       '401':
 *         description: Invalid login or password
 *         content:
 *           application/json:
 *             example:
 *               message: "Invalid login or password"
 *       '500':
 *         description: Internal server error
 *         content:
 *           application/json:
 *             example:
 *               error: "Internal server error"
 */
app.post('/users/login', async (req, res) => {
  const { login, password } = req.body;

  try {
    const dbo = mongoc.db('FIFA');
    const user = await dbo.collection('Users').findOne({ login });

    if (user && await bcrypt.compare(password, user.password)) {
      const token = generateToken({ login: user.login, rank: user.rank });
      res.json({ user, token });
    } else {
      res.status(401).json({ message: 'Invalid login or password' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /users/getuser:
 *   get:
 *     summary: Get user information
 *     security:
 *       - jwt: []
 *     parameters:
 *       - in: query
 *         name: login
 *         required: true
 *         description: The login of the user to retrieve
 *         schema:
 *           type: string
 *     responses:
 *       '200':
 *         description: Successful response
 *         content:
 *           application/json:
 *             example:
 *               _id: "1234567890"
 *               login: "example_user"
 *               rank: "user"
 *               money: 0
 *               matches: []
 *       '403':
 *         description: Access forbidden
 *         content:
 *           application/json:
 *             example:
 *               message: "Access forbidden for this user"
 *       '401':
 *         description: Token validation error
 *         content:
 *           application/json:
 *             examples:
 *               TokenExpiredError:
 *                 value:
 *                   message: "Token has expired"
 *               TokenValidationError:
 *                 value:
 *                   message: "Failed to authenticate token"
 *       '500':
 *         description: Internal server error
 *         content:
 *           application/json:
 *             example:
 *               error: "Internal server error"
 */
app.get('/users/getuser/:login', verifyToken, hasPermissionToInvoke, async (req, res) => {
  const { login } = req.params;
  console.log({login});

  try {
    const dbo = mongoc.db('FIFA');
    const user = await dbo.collection('Users').findOne({ login });
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /users/updateuser/{login}:
 *   put:
 *     summary: Update user information
 *     parameters:
 *       - in: path
 *         name: login
 *         required: true
 *         description: Login of the user to be updated
 *         schema:
 *           type: string
 *           example: "john_doe"
 *     security:
 *       - jwt: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               money:
 *                 type: integer
 *               rank:
 *                 type: string
 *               password:
 *                 type: string
 *             example:
 *               money: 100
 *               rank: "admin"
 *               password: "newpassword"
 *     responses:
 *       '200':
 *         description: Successful response
 *         content:
 *           application/json:
 *             example:
 *               status: "OK"
 *       '403':
 *         description: Access forbidden for this user
 *       '401':
 *         description: Token has expired or failed to authenticate token
 *       '500':
 *         description: Internal server error
 */
app.put('/users/updateuser/:login', verifyToken, hasPermissionToInvoke, async (req, res) => {
  const { login } = req.params;
  const { money, rank, password } = req.body;

  const updatedFields = {};

  if (req.user.rank == "admin") {
    if (money !== undefined) {
      updatedFields.money = money;
    }
  
    if (rank !== undefined) {
      updatedFields.rank = rank;
    }
  }

  if (password !== undefined) {
    const hashedPassword = await bcrypt.hash(password, 10);
    updatedFields.password = hashedPassword;
  }

  try {
    const dbo = mongoc.db('FIFA');
    const updatedUser = await dbo.collection('Users').findOneAndUpdate(
      { login },
      { $set: updatedFields },
      { returnDocument: 'after' }
    );

    res.status(200).json({ status: "OK" });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});


/**
 * @swagger
 * /users/getallusers:
 *   get:
 *     summary: Get all users
 *     security:
 *       - jwt: []
 *     responses:
 *       '200':
 *         description: Successful response
 *         content:
 *           application/json:
 *             example:
 *               - _id: "609c6d407519d63908d5ef35"
 *                 login: "user1"
 *                 rank: "user"
 *                 money: 100
 *                 matches: []
 *               - _id: "609c6d407519d63908d5ef36"
 *                 login: "admin1"
 *                 rank: "admin"
 *                 money: 500
 *                 matches:
 *                   - matchID: "609c6d407519d63908d5ef37"
 *                     bet_on: "Team A"
 *                     amount: 50
 *       '401':
 *         description: Token has expired or failed to authenticate token
 *       '403':
 *         description: Access forbidden for non-admin users
 *       '500':
 *         description: Internal server error
 */
app.get('/users/getallusers', verifyToken, isAdmin, async (req, res) => {
  try {
    const dbo = mongoc.db('FIFA');
    const users = await dbo.collection('Users').find({}).toArray();
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /users/deleteuser/{login}:
 *   delete:
 *     summary: Delete user by login
 *     parameters:
 *       - in: path
 *         name: login
 *         required: true
 *         description: Login of the user to be deleted
 *         schema:
 *           type: string
 *           example: "user1"
 *     security:
 *       - jwt: []
 *     responses:
 *       '200':
 *         description: Successful response
 *         content:
 *           application/json:
 *             example:
 *               message: "User deleted successfully"
 *       '401':
 *         description: Token has expired or failed to authenticate token
 *       '403':
 *         description: Access forbidden for this user
 *       '404':
 *         description: User not found
 *       '500':
 *         description: Internal server error
 */
app.delete('/users/deleteuser/:login', verifyToken, hasPermissionToInvoke, async (req, res) => {
  const { login } = req.params;

  try {
    const dbo = mongoc.db('FIFA');
    const userToDelete = await dbo.collection('Users').findOne({ login });

    if (!userToDelete) {
      return res.status(404).json({ error: 'User not found' });
    }

    await dbo.collection('Users').deleteOne({ login });
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /users/dobet/{matchID}:
 *   post:
 *     summary: Place a bet on a match
 *     parameters:
 *       - in: path
 *         name: matchID
 *         required: true
 *         description: ID of the match to place a bet on
 *         schema:
 *           type: string
 *           example: "65606fc05c0b3725824be3e7"
 *       - in: header
 *         name: Authorization
 *         required: true
 *         description: JWT token obtained during login
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               bet_on:
 *                 type: string
 *               amount:
 *                 type: integer
 *             example:
 *               bet_on: "Team A"
 *               amount: 100
 *     responses:
 *       '200':
 *         description: Bet placed successfully
 *         content:
 *           application/json:
 *             example:
 *               message: 'Bet placed successfully'
 *       '400':
 *         description: Bad request, e.g., invalid match or match not available for betting, insufficient funds, or amount not an integer
 *         content:
 *           application/json:
 *             example:
 *               error: 'Invalid match or match is not available for betting'
 *               error: 'Insufficient funds to place the bet'
 *               error: 'Amount must be an integer'
 *       '500':
 *         description: Internal server error
 *         content:
 *           application/json:
 *             example:
 *               error: 'Failed to place bet'
 */
app.post('/users/dobet/:matchID', verifyToken, async (req, res) => {
  const { login } = req.user;
  const matchID = req.params.matchID;
  const bet_on = req.body.bet_on;
  const amount = parseInt(req.body.amount);

  if (isNaN(amount) || !Number.isInteger(amount)) {
      console.log("test");
      return res.status(400).json({ error: 'Amount must be an integer' });
  }

  try {
    const dbo = mongoc.db('FIFA');
  
    const match = await dbo.collection('Match').findOne({ _id: new ObjectId(matchID) });
    console.log(match);

    if (!match || match.is_end === true) {
      return res.status(400).json({ error: 'Invalid match or match is not available for betting' });
    }
    const user = await dbo.collection('Users').findOne({ login });

    if (!user) {
      return res.status(400).json({ error: 'User not found' });
    }

    const updatedMoney = user.money - amount;
    console.log(updatedMoney);

    if (updatedMoney < 0) {
      return res.status(400).json({ error: 'Insufficient funds to place the bet' });
    }

    await dbo.collection('Users').updateOne({ login }, { $set: { money: updatedMoney } });

    const userBet = {
      matchID: new ObjectId(matchID),
      bet_on,
      amount,
      team_1: match.country_home,
      team_2: match.country_guest,
      date: match.date,
    };

    await dbo.collection('Users').updateOne({ login }, { $push: { matches: userBet } });

    res.json({ message: 'Bet placed successfully' });
  } catch (error) {
    console.error('Error placing bet:', error);
    res.status(500).json({ error: 'Failed to place bet' });
  }
});

/**
 * @swagger
 * /users/adduser:
 *   post:
 *     summary: Add a new user
 *     security:
 *       - jwt: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               login:
 *                 type: string
 *                 minLength: 6
 *               password:
 *                 type: string
 *                 minLength: 6
 *               rank:
 *                 type: string
 *                 enum: [user, admin]
 *     responses:
 *       '201':
 *         description: User added successfully
 *         content:
 *           application/json:
 *             example:
 *               _id: "1234567890"
 *               login: "new_user"
 *               rank: "user"
 *               money: 0
 *               matches: []
 *       '400':
 *         description: Bad request, invalid input
 *         content:
 *           application/json:
 *             example:
 *               message: "Login should have at least 6 characters"
 *               message: "Password should have at least 6 characters"
 *               message: "Invalid rank"
 *       '401':
 *         description: Token has expired or failed to authenticate token
 *       '403':
 *         description: Access forbidden for non-admin users
 *       '500':
 *         description: Internal server error
 */
app.post('/users/adduser', verifyToken, isAdmin, async (req, res) => {
  const MIN_LOGIN_LENGTH = 6;
  const MIN_PASSWORD_LENGTH = 6;
  const { login, password, rank, money } = req.body;
  const matches = [];

  if (login.length < MIN_LOGIN_LENGTH) {
    return res.status(400).json({ message: `Login should have at least ${MIN_LOGIN_LENGTH} characters` });
  }

  if (password.length < MIN_PASSWORD_LENGTH) {
    return res.status(400).json({ message: `Password should have at least ${MIN_PASSWORD_LENGTH} characters` });
  }

  if (!['user', 'admin'].includes(rank)) {
    return res.status(400).json({ message: 'Invalid rank' });
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  try {
    const dbo = mongoc.db('FIFA');
    const existingUser = await dbo.collection('Users').findOne({ login });

    if (existingUser) {
      return res.status(400).json({ message: 'User with this login already exists' });
    }

    const user = await dbo.collection('Users').insertOne({ login, password: hashedPassword, rank, money, matches });
    const addedUser = await dbo.collection('Users').findOne({ _id: user.insertedId });
    res.status(201).json(addedUser);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});


app.listen(8081, () => {
  console.log('Server is running');
});
