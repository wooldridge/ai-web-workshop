import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { config } from 'dotenv';

import swaggerUi from 'swagger-ui-express';
import swaggerDocument from './openapi.json' assert { type: 'json' };

import DigestClient from "digest-fetch";
import { getRelevantWords, buildWordQuery, buildCombinedQuery, postSearch, buildCircleQuery, buildRangeConstraintQuery } from './searchUtils.js'
import queryOptions from './queryOptions.json' assert { type: 'json' };
import { STOP_WORDS } from './constants.js';

config({path: "./.env"});
const app = express();
app.use(cors());
app.use(bodyParser.json()); 

app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
app.get('/docs', swaggerUi.setup(swaggerDocument, false));

app.post('/api/reports', (req, res) => {

  console.log('/api/reports');

  const { qtext, type, start, end, latitude, longitude, radius } = req.body;

  console.log('Request Body:', req.body);

  const digestClient = new DigestClient(
    process.env.MARKLOGIC_USERNAME, 
    process.env.MARKLOGIC_PASSWORD, 
    { algorithm: 'MD5' }
  );

  const pageLength = process.env.PAGE_LENGTH || 10;

  const url = process.env.MARKLOGIC_BASE_PATH + `v1/search?format=json&options=search-options&pageLength=${pageLength}`;

  const queries = [];

  let wordQuery = {};
  if (qtext) {
    const relevantWords = getRelevantWords(qtext, process.env.MIN_WORD_LEN, STOP_WORDS);
    if (relevantWords.length > 0) {
      wordQuery = buildWordQuery(process.env.CONTENT_PROPERTY, relevantWords);
      queries.push(wordQuery);
    }
  }

  let typeQuery = {};
  if (type) {
    typeQuery = buildRangeConstraintQuery('type-constraint', type);
    queries.push(typeQuery);
    console.log('Queries type:', JSON.stringify(queries, null, 2));
  }

  let startQuery = {};
  if (start) {
    startQuery = buildRangeConstraintQuery('time', [start], "GE");
    queries.push(startQuery);
    console.log('Queries startQuery:', JSON.stringify(queries, null, 2));
  }

  let endQuery = {};
  if (end) {
    endQuery = buildRangeConstraintQuery('time', [end], "LE");
    queries.push(endQuery);
    console.log('Queries endQuery:', JSON.stringify(queries, null, 2));
  }

  let circleQuery = {};
  if (latitude && longitude) {
    if (!radius) {
      radius = process.env.DEFAULT_RADIUS;
    }
    circleQuery = buildCircleQuery(radius, latitude, longitude);
    queries.push(circleQuery);
    console.log('Queries circleQuery:', JSON.stringify(queries, null, 2));
  }

  console.log('Queries:', JSON.stringify(queries, null, 2));

  const combinedQuery = buildCombinedQuery(queries);

  console.log('Combined Query:', JSON.stringify(combinedQuery, null, 2));

  postSearch(digestClient, url, combinedQuery).then((searchResponse) => {
    res.send(searchResponse);
  })

});

app.post('/api/nearby', (req, res) => {

  console.log('/api/nearby');

  const digestClient = new DigestClient(
    process.env.MARKLOGIC_USERNAME, 
    process.env.MARKLOGIC_PASSWORD, 
    { algorithm: 'MD5' }
  );

  const url = process.env.MARKLOGIC_BASE_PATH + 'v1/search?format=json&options=search-options';
  const { radius, latitude, longitude } = req.body;

  const circleQuery = buildCircleQuery(radius, latitude, longitude);
  const combinedQuery = {
    "search": {
      "query": {
        "queries": [circleQuery]
      }
    }
  }

  postSearch(digestClient, url, combinedQuery).then((searchResponse) => {
    res.send(searchResponse);
  })

});

app.use((req, res) => {
  res.status(404).json({ message: 'Not Found' });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});