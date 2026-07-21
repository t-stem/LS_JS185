const { Client } = require('pg');

let client = new Client({database: 'js185_01_05'});


async function logQuery(queryText) {
  await client.connect();

  let retrievedData = await client.query(queryText);
  retrievedData.rows.forEach(row => console.log(`id: ${row.id}; name: ${row.name}`));
  
  client.end();
};

let testQuery = 'SELECT * FROM directors';
logQuery(testQuery);