const express = require('express');
const request = require('superagent');

const app = express();

app.set('view engine', 'ejs');

app.get('/', function (req, res) {
  res.send('Hello World!');
});

app.get('/character/:name', async function (req, res) {
  const name = req.params.name;

  const {body: result} = await request
    .get('https://swapi.co/api/people/')
    .query({search: name});

  const characters = result.results.filter(item => {
    const indexOfReq = item.name.toLowerCase().indexOf(name.toLowerCase());
    return indexOfReq >= 0;
  });

  await getCharacterData(characters)

  res.render('pages/character', {
    characters: characters
  });
});

app.get('/characters', async function (req, res) {
  let characters = [];

  for (let i = 0; i < 5; i += 1) {
    const {body: result} = await request
      .get('https://swapi.co/api/people')
      .query({page: i + 1});

    characters = characters.concat(result.results);
  }

  const enableSortedField = ['name', 'height', 'mass'];

  if (typeof req.query.sort !== undefined &&
      enableSortedField.indexOf(req.query.sort) >= 0) {
        characters.sort((a, b) => {
          const value1 = a[req.query.sort];
          const value2 = b[req.query.sort];

          if (value1 > value2) {
            return 1;
          } else if (value1 < value2) {
            return -1;
          } else {
            return 0;
          }
        });
  }

  res.send(characters);
});

app.get('/planetresidents', async function (req, res) {
  let planets = [];

  let count = 1;
  while (true) {
    try {
      const {body: result} = await request
        .get('https://swapi.co/api/planets')
        .query({page: count});

        planets = planets.concat(result.results);
        count += 1;
    } catch(err) {
      break;
    }
  }

  planets = await getPlanetResidentsData(planets);

  res.send(planets);
});

app.listen(3000, function () {
  console.log('Example app listening on port 3000!');
});

function getCharacterData(characters) {
  return Promise.all(characters.map(async function(item) {
    await Promise.all([
      ['films', 'title'],
      ['species', 'name'],
      ['vehicles', 'name'],
      ['starships', 'name']
    ].map(async ([propToSet, propToFetch]) => {
      item[propToSet] = await getFieldData(item[propToSet], propToFetch);
    }));

    item.homeworld = await getFieldData([item.homeworld], 'name');
  }));
}

function getPlanetResidentsData(planets) {
  return Promise.all(planets.map(async function(planet) {
    const residents = await getFieldData(planet.residents, 'name');

    return { [planet.name]: residents }
  }));
}

function getFieldData(item, propName) {
  return Promise.all(item.map(async function(url) {
    const {body: result} = await request.get(url);

    return result[propName];
  }));
}
