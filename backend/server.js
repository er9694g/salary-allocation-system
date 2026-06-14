require('dotenv').config();
const express = require('express');
const cors = require('cors');

const { initDB } = require('./db/init');
const errorHandler = require('./middleware/errorHandler');
const configsRouter = require('./routes/configs');
const recordsRouter = require('./routes/records');
const calculateRouter = require('./routes/calculate');
const exportRouter = require('./routes/export');

const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors());
app.use(express.json());

initDB();

app.use('/api/configs', configsRouter);
app.use('/api/records', recordsRouter);
app.use('/api/calculate', calculateRouter);
app.use('/api/export', exportRouter);

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
