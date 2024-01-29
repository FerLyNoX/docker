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

let mongoc = new MongoClient(process.env.MONGODB_URI);

const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Match API',
      version: '1.0.0',
      description: 'API for match data',
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
  console.log(111);
  console.log('server is running');
  console.log(process.env.MONGODB_URI);
  });

/**
 * @swagger
 * /:
 *   get:
 *     summary: Strona główna
 *     responses:
 *       '200':
 *         description: Successful response
 */
app.get('/', async (req, res) => {
  console.log('Root path requested');
  res.sendFile(path.join(__dirname, 'view', 'main.html'));
});

/**
 * @swagger
 * /matches:
 *   get:
 *     summary: Wyświetl wszystkie meczy
 *     responses:
 *       '200':
 *         description: Successful response
 */
app.get('/matches', async (req, res) => {
  let dbo = mongoc.db('fifa');
  let result = await dbo.collection('Meczy').find().toArray();
  const htmlContent = await fs.readFile(path.join(__dirname, 'view', 'matchlist.html'), 'utf-8');
  const htmlWithScript = `
	${htmlContent}
	<script>
	  var matchesData = ${JSON.stringify(result)};
	  window.onload = populateMatchList;
	</script>
  `;
  console.log(result);
  res.send(htmlWithScript);
});

/**
 * @swagger
 * /matches/{countryName}:
 *   get:
 *     summary: Wyświetl mecze po country name
 *     parameters:
 *       - in: path
 *         name: nameparam
 *         required: true
 *         description: Country name
 *         schema:
 *           type: string
 *           example: "Team A"
 *     responses:
 *       '200':
 *         description: Successful response
 */
app.get('/matches/:nameparam', async (req, res) => {
  let dbo = mongoc.db('fifa');
  let condition = { $or: [{ kraj_defenders: req.params.nameparam }, { kraj_ataka: req.params.nameparam }] };
  let result = await dbo.collection('Meczy').find(condition).toArray();
  const htmlContent = await fs.readFile(path.join(__dirname, 'view', 'matchlist.html'), 'utf-8');
  const htmlWithScript = `
	${htmlContent}
	<script>
	  var matchesData = ${JSON.stringify(result)};
	  // Call the function when the page is loaded
	  window.onload = populateMatchList;
	</script>
	`;
  console.log(result);
  res.send(htmlWithScript);
});

/**
 * @swagger
 * /addmatch:
 *   get:
 *     summary: Wyświetl strone do dodawania nowego meczu
 *     responses:
 *       '200':
 *         description: Successful response
 */
app.get('/addmatch', async (req, res) => {
  res.sendFile(path.join(__dirname, 'view', 'addmatch.html'));
});

/**
 * @swagger
 * /addmatch:
 *   post:
 *     summary: Dodaj nowy mecz
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
 *           example:
 *             date: "13-09-2013"
 *             country_home: "Team A"
 *             country_guest: "Team B"
 *             country_home_score: 2
 *             country_guest_score: 1
 *     responses:
 *       '200':
 *         description: Successful response
 *         content:
 *           application/json:
 *             example:
 *                 date: "13-09-2013"
 *                 country_home: "Team A"
 *                 country_guest: "Team B"
 *                 country_home_score: 2
 *                 country_guest_score: 1
 */
app.post('/addmatch', async (req, res) => {
  let dbo = mongoc.db('fifa');
  let result = await dbo.collection('Meczy').insertOne(req.body);
  console.log(req.body);
  res.end(JSON.stringify(req.body));
});

/**
 * @swagger
 * /matches/{matchId}:
 *   delete:
 *     summary: Usunąć mecz po ID
 *     parameters:
 *       - in: path
 *         name: nameparam
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
  let dbo = mongoc.db('fifa');
  let oid = { _id: new ObjectId(req.params.nameparam) };
  console.log(oid);
  let result = dbo.collection('Meczy').deleteMany(oid);
  res.end(JSON.stringify(result));
});

/**
 * @swagger
 * /updatematches/{matchId}:
 *   get:
 *     summary: Wyświetl detale meczu po ID i wstaw w <form> w pole HTML
 *     parameters:
 *       - in: path
 *         name: nameparam
 *         required: true
 *         description: ID of the match to be updated
 *         schema:
 *           type: string
 *           example: "65606fc05c0b3725824be3e7"
 *     responses:
 *       '200':
 *         description: Successful response
 */
app.get('/updatematches/:nameparam', async (req, res) => {
  let dbo = mongoc.db('fifa');
  let oid = { _id: new ObjectId(req.params.nameparam) };
  let result = await dbo.collection('Meczy').find(oid).toArray();
  const htmlContent = await fs.readFile(path.join(__dirname, 'view', 'updatematch.html'), 'utf-8');
  const htmlWithScript = `
	${htmlContent}
	<script>
	  var matchData = ${JSON.stringify(result)};
	  window.onload = populateMatchList;
	</script>
	`;
  console.log(result);
  res.send(htmlWithScript);
});

/**
 * @swagger
 * /updatematches/{matchId}:
 *   put:
 *     summary: Odswież dane po ID
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
 *             example:
 *               date: "13-09-2013"
 *               country_home: "Team A"
 *               country_guest: "Team B"
 *               country_home_score: 2
 *               country_guest_score: 1
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
 */
app.put('/updatematches/:nameparam', async (req, res) => {
  let dbo = mongoc.db('fifa');
  let id = { _id: new ObjectId(req.params.nameparam) };

  let updateDocument = {
    $set: {
      date: req.body.date,
      kraj_defenders: req.body.kraj_defenders,
      kraj_ataka: req.body.kraj_ataka,
      bramki_kraju_defenders: req.body.bramki_kraju_defenders,
      bramki_kraju_ataka: req.body.bramki_kraju_ataka,
    },
  };

  let result = await dbo.collection('Meczy').updateOne(id, updateDocument);
  res.end(JSON.stringify(result));
});
