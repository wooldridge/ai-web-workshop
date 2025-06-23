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
  const collection = process.env.CONTENT_COLLECTION || 'events-with-transcript';

  const url = process.env.MARKLOGIC_BASE_PATH + `v1/search?format=json&options=search-options&collection=${collection}&pageLength=${pageLength}`;

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

app.post('/api/databases', (req, res) => {

  console.log('/api/databases');

  const { name } = req.body;

  const url = process.env.MARKLOGIC_MGMT_PATH + `manage/v2/databases?format=json`;

  const digestClient = new DigestClient(
    process.env.MARKLOGIC_USERNAME, 
    process.env.MARKLOGIC_PASSWORD, 
    { algorithm: 'MD5' }
  );

  const options = {
    method: 'POST',
    body: JSON.stringify({"database-name": name}),
    auth: {
        username: 'ai-tools-mcp-user',
        password: 'password'
    },
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    },
  };
  try {
    digestClient.fetch(url, options).then((response) => {
      if (response.status !== 201) {
        console.error(`Request failed with status ${response.status}: ${response.statusText}`);
        return;
      }
      res.send(JSON.stringify({
        message: `Database ${name} created successfully`,
        status: response.status,
        statusText: response.statusText
      }));
    })
  } catch (error) {
    throw error;
  }

});

app.get('/api/databases', (req, res) => {

  console.log('/api/databases');

  const name = req.query.name;

  console.log('Database Name:', name);

  const url = process.env.MARKLOGIC_MGMT_PATH + `manage/v2/databases/${name}/properties?format=json`;

  console.log('URL:', url);

  const digestClient = new DigestClient(
    process.env.MARKLOGIC_USERNAME, 
    process.env.MARKLOGIC_PASSWORD, 
    { algorithm: 'MD5' }
  );

  const options = {
    method: 'GET',
    auth: {
        username: 'ai-tools-mcp-user',
        password: 'password'
    },
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    },
  };
  try {
    digestClient.fetch(url, options).then((response) => {
      if (response.status !== 200) {
        console.error(`Request failed with status ${response.status}: ${response.statusText}`);
        return;
      }
      response.json().then((data) => res.send(data));
    })
  } catch (error) {
    throw error;
  }

});

app.put('/api/documents', (req, res) => {

  console.log('/api/documents');

  const { uri, content, database, collections, permissions } = req.body;

  let url = process.env.MARKLOGIC_BASE_PATH + `v1/documents?format=json&uri=${encodeURIComponent(uri)}`;

  if (database) {
    url += `&database=${encodeURIComponent(database)}`;
  }

  if (collections && collections.length > 0) {
    collections.forEach((collection) => {
      url += `&collection=${encodeURIComponent(collection)}`;
    });
  }

  if (permissions && permissions.length > 0) {
    permissions.forEach((permission) => {
      const parts = permission.split('=');
      url += `&perm:${encodeURIComponent(parts[0])}=${encodeURIComponent(parts[1])}`;
    });
  }

  console.log('URL:', url);

  const digestClient = new DigestClient(
    process.env.MARKLOGIC_USERNAME, 
    process.env.MARKLOGIC_PASSWORD, 
    { algorithm: 'MD5' }
  );

  const body = JSON.stringify({
    ts: new Date().toISOString(),
    content
  });
  console.log('body:', body);

  const options = {
    method: 'PUT',
    body: body,
    auth: {
        username: 'ai-tools-mcp-user',
        password: 'password'
    },
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    },
  };
  try {
    digestClient.fetch(url, options).then((response) => {
      if (response.status !== 201 && response.status !== 204) {
        console.error(`Request failed with status ${response.status}: ${response.statusText}`);
        return;
      }
      res.send(JSON.stringify({
        message: `Document ${uri} created successfully`,
        status: response.status,
        statusText: response.statusText
      }));
    })
  } catch (error) {
    throw error;
  }

});

app.use((req, res) => {
  res.status(404).json({ message: 'Not Found' });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});