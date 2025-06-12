import deepmerge from 'deepmerge';

/**
 * Get relevant words from text
 * @param {string} text 
 * @param {number} minWordLen 
 * @param {string[]} stopWords 
 * @returns Array of relevant words
 */
export function getRelevantWords(text, minWordLen, stopWords) {
  const words = [];
  // Keep words that are at least minWordLen and not in stopWords
  text.split(" ").forEach(token => {
    token = token.toLowerCase().replace("?", "").replace(",", "");
    if (token.length >= minWordLen && stopWords.includes(token) === false) {
      words.push(token)
    }
  })
  return words;
}

/**
 * Build a MarkLogic word query
 * @param {string} jsonProp JSON property where the words are found 
 * @param {string[]} words Array of words to search for
 * @returns JSON word query
 * @see https://docs.marklogic.com/guide/search-dev/structured-query#id_18990
 */
export function buildWordQuery(jsonProp, words) {
  return {
      "word-query": {
          "json-property": jsonProp,
          text: words
      }
  }
}

/**
 * Build a MarkLogic range constraint query
 * @param {string} constraintName Name of the range constraint (e.g., "type-constraint")
 * @param {string[]} value Array of values (e.g., ["vandalism", "cybercrime"])
 * @param {string} rangeOperator Range operator: "LT", "LE", "GT", "GE", "EQ", "NE". Default: "EQ"
 * @returns Range constraint query as JSON
 * @see https://docs.progress.com/bundle/marklogic-server-use-search-11/page/topics/structured-query.html#id_38268
 */
export function buildRangeConstraintQuery(constraintName, value, rangeOperator) {
  if (!Array.isArray(value)) {
    value = [value]; // Ensure value is an array
  }
  const result = {
      "range-constraint-query": {
        "constraint-name": constraintName, 
        value: value,
        "range-operator": "EQ" // Default operator
      }
  }
  if (rangeOperator) {
    result["range-constraint-query"]["range-operator"] = rangeOperator;
  }
  return result;
}

/**
 * Build MarkLogic geospatial circle query
 * @param {number} radius The circle radius in miles
 * @param {number} latitude Latitude of the circle center
 * @param {number} longitude Longitude of the circle center
 * @returns JSON geospatial circle query
 * @see https://docs.progress.com/bundle/marklogic-server-use-search-11/page/topics/structured-query.html#id_45278
 */
export function buildCircleQuery(radius, latitude, longitude) {
  return{
    "geo-elem-pair-query": {
        "parent": {
        "name": "address"
        },
        "lat": {
        "name": "lat"
        },
        "lon": {
        "name": "lng"
        },
        "circle": [
        {
            "radius": radius,
            "point": [{
                "latitude": latitude,
                "longitude": longitude
            }]
        }
        ]
    }
  };
}

/**
 * Build MarkLogic combined query
 * @param {object[]} queries One or more queries to combine
 * @param {object} cq Optional combined query to merge with
 * @param {object} qo Optional query options to merge with
 * @returns JSON combined query
 * @see https://docs.marklogic.com/guide/rest-dev/search#id_69918
 */
export function buildCombinedQuery(queries, cq, qo) {
  // Build a new combined query with queries
  let combinedQuery = { 
    query: { 
      "and-query": { 
        queries: queries
      }
    }
  };
  // Merge any passed-in combined query
  if (cq !== undefined && cq !== null) {
    combinedQuery = deepmerge(combinedQuery, cq);
  }
  // Merge any passed-in query options
  if (qo !== undefined && qo !== null) {
    combinedQuery = deepmerge(combinedQuery, {
      options: qo
    });
  }
  return combinedQuery;
}

/**
 * Execute a MarkLogic search
 * @param {*} dc DigestClient object
 * @param {*} url URL for the search endpoint
 * @param {*} combinedQuery MarkLogic combined query
 * @returns Promise that resolves to JSON search response
 * @see https://docs.marklogic.com/11.0/REST/POST/v1/search
 */
export async function postSearch(dc, url, combinedQuery) {
  console.dir(combinedQuery, { depth: null })
  const options = {
    method: 'POST',
    body: JSON.stringify(combinedQuery),
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
    const response = await dc.fetch(url, options);
    if (response.status !== 200) {
      console.error(`Request failed with status ${response.status}: ${response.statusText}`);
      return;
    }
    const data = await response.json();
    return data;
  } catch (error) {
    throw error;
  }
}
