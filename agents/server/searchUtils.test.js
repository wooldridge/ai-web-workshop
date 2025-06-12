import { getRelevantWords, buildWordQuery, buildRangeConstraintQuery, buildCircleQuery, buildCombinedQuery, postSearch } from './searchUtils'
import DigestClient from "digest-fetch";
import {jest} from '@jest/globals'

describe('Search utils', () => {

  it('Get relevant words from text', () => {
      const words = getRelevantWords('What a quick brown fox?', 3, ['what']);
      expect(words).toEqual(['quick', 'brown', 'fox'])
  })

  it('Build a word query', () => {
      const wq = buildWordQuery('content', ['quick', 'brown', 'fox']);
      expect(wq).toEqual({
          'word-query': {
              'json-property': 'content',
              text: ['quick', 'brown', 'fox']
          }
      })
  })

  it('Build a range constraint query with strings', () => {
    const rcq = buildRangeConstraintQuery('type-constraint', ['vandalism', 'cybercrime']);
    expect(rcq).toEqual({
        'range-constraint-query': {
            'constraint-name': 'type-constraint',
            value: ['vandalism', 'cybercrime'],
            'range-operator': 'EQ'
        }
    })
  })

  it('Build a range constraint query with a date', () => {
    const rcq = buildRangeConstraintQuery('start', ['2025-06-11'], 'GE');
    expect(rcq).toEqual({
        'range-constraint-query': {
            'constraint-name': 'start',
            value: ['2025-06-11'],
            'range-operator': 'GE'
        }
    })
  })

  it('Build a circle query', () => {
    const cq = buildCircleQuery(2, 50.123, -1.234);
    expect(cq).toEqual({
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
        "circle": [{
          "radius": 2,
          "point": [{
              "latitude": 50.123,
              "longitude": -1.234
          }]
        }]
      }
    })
  })
  
  it('Build a combined query with only query', () => {
    const query = 'some query';
    const combinedQuery = buildCombinedQuery([query], null, null);
    expect(combinedQuery).toEqual({
      query: { queries: ['some query'] }
    })
  })

  it('Build a combined query with query and combined query (no options)', () => {
    const query = 'some query';
    const cq = { query: { queries: ['some other query'] }};
    const combinedQuery = buildCombinedQuery([query], cq);
    expect(combinedQuery).toEqual({
      query: { queries: ['some query', 'some other query'] }
    })
  })

  it('Build a combined query with query and options', () => {
    const query = 'some query';
    const qo = { "constraint": [{"name": "constraint"}] };
    const combinedQuery = buildCombinedQuery([query], null, qo);
    expect(combinedQuery).toEqual({
      query: { queries: ['some query'] },
      options: { "constraint": [{"name": "constraint"}] }
    })
  })

  it('Build a combined query with query, combined query (with options), and more options', () => {
    const query = 'some query';
    const cq = { 
      query: { queries: ['some other query'] },
      options: { "constraint": [{"name": "constraint1"}] }
    };
    const qo = { "constraint": [{"name": "constraint2"}] };
    const combinedQuery = buildCombinedQuery([query], cq, qo);
    expect(combinedQuery).toEqual({
      query: { queries: ['some query', 'some other query'] }, 
      options: { "constraint": [{"name": "constraint1"}, {"name": "constraint2"}] }
    })
  })

  it('Post a search', () => {
    const dc = new DigestClient(
      'user', 
      'password', 
      { algorithm: 'MD5' }
    );
    const url = 'http://localhost:4000/v1/search';
    const spy = jest.spyOn(dc, 'fetch');
    spy.mockResolvedValue({
      status: 200,
      json: () => {
        return {
          'some': 'data'
        }
      }
    });
    const cq = { query: { queries: ['some query'] }}
    postSearch(dc, url, cq).then(resp => {
      expect(resp.some).toEqual('data')
    });
  })

})