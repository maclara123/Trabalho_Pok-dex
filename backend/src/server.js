const express = require('express');
const cors = require('cors');
const { MongoClient, ObjectId } = require('mongodb');

const app = express();
const port = Number(process.env.PORT || 8080);
const mongoUrl = process.env.MONGO_URL || 'mongodb://localhost:27017';
const dbName = process.env.MONGO_DB || 'pokedex';
const user = process.env.BASIC_USER || 'admin';
const password = process.env.BASIC_PASSWORD || 'secret';
let collection;
let database;

app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use((req, res, next) => {
  if (req.path === '/health') return next();
  const header = req.get('authorization') || '';
  const expected = `Basic ${Buffer.from(`${user}:${password}`).toString('base64')}`;
  if (header !== expected) {
    res.set('WWW-Authenticate', 'Basic realm="Pokedex API"');
    return res.status(401).json({ erro: 'Autenticação necessária.' });
  }
  next();
});

app.get('/health', (req, res) => res.json({ status: 'ok' }));
app.put('/pokemons', async (req, res, next) => {
  try {
    const exists = await database.listCollections({ name: 'pokemons' }, { nameOnly: true }).hasNext();
    if (!exists) {
      await database.createCollection('pokemons');
      return res.status(201).json({ mensagem: 'Coleção pokemons criada.' });
    }
    return res.status(200).json({ mensagem: 'Coleção pokemons já existe.' });
  } catch (e) { next(e); }
});
app.get('/pokemons', async (req, res, next) => {
  try {
    const page = Math.max(0, Number(req.query.page) || 0);
    const size = Math.min(1000, Math.max(1, Number(req.query.pagesize) || 100));
    const docs = await collection.find({}).sort({ numero: 1 }).skip(page * size).limit(size).toArray();
    res.json(docs);
  } catch (e) { next(e); }
});
app.post('/pokemons', async (req, res, next) => {
  try {
    if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) return res.status(400).json({ erro: 'Envie um objeto JSON.' });
    const doc = { ...req.body, criadoEm: req.body.criadoEm || new Date().toISOString(), atualizadoEm: new Date().toISOString() };
    delete doc._id;
    const result = await collection.insertOne(doc);
    res.status(201).location(`/pokemons/${result.insertedId}`).json({ ...doc, _id: result.insertedId });
  } catch (e) { next(e); }
});
app.get('/pokemons/:id', async (req, res, next) => {
  try {
    if (!ObjectId.isValid(req.params.id)) return res.status(400).json({ erro: 'ID inválido.' });
    const doc = await collection.findOne({ _id: new ObjectId(req.params.id) });
    return doc ? res.json(doc) : res.status(404).json({ erro: 'Pokémon não encontrado.' });
  } catch (e) { next(e); }
});
app.put('/pokemons/:id', async (req, res, next) => {
  try {
    if (!ObjectId.isValid(req.params.id)) return res.status(400).json({ erro: 'ID inválido.' });
    const body = { ...req.body };
    delete body._id; delete body.criadoEm;
    body.atualizadoEm = new Date().toISOString();
    const result = await collection.replaceOne({ _id: new ObjectId(req.params.id) }, body);
    return result.matchedCount ? res.json({ mensagem: 'Pokémon atualizado.' }) : res.status(404).json({ erro: 'Pokémon não encontrado.' });
  } catch (e) { next(e); }
});
app.patch('/pokemons/:id', async (req, res, next) => {
  try {
    if (!ObjectId.isValid(req.params.id)) return res.status(400).json({ erro: 'ID inválido.' });
    const changes = { ...req.body };
    delete changes._id; delete changes.criadoEm;
    changes.atualizadoEm = new Date().toISOString();
    const result = await collection.updateOne({ _id: new ObjectId(req.params.id) }, { $set: changes });
    return result.matchedCount ? res.json({ mensagem: 'Pokémon atualizado parcialmente.' }) : res.status(404).json({ erro: 'Pokémon não encontrado.' });
  } catch (e) { next(e); }
});
app.delete('/pokemons/:id', async (req, res, next) => {
  try {
    if (!ObjectId.isValid(req.params.id)) return res.status(400).json({ erro: 'ID inválido.' });
    const result = await collection.deleteOne({ _id: new ObjectId(req.params.id) });
    return result.deletedCount ? res.status(204).end() : res.status(404).json({ erro: 'Pokémon não encontrado.' });
  } catch (e) { next(e); }
});
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ erro: 'Erro interno da API.' });
});

async function start() {
  const client = new MongoClient(mongoUrl);
  await client.connect();
  database = client.db(dbName);
  collection = database.collection('pokemons');
  app.listen(port, '0.0.0.0', () => console.log(`API disponível na porta ${port}`));
}
start().catch((err) => { console.error('Não foi possível conectar ao MongoDB:', err); process.exit(1); });
