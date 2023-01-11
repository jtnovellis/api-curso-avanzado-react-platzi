import { Low } from 'lowdb';
import { JSONFileSync } from 'lowdb/node';
import { Memory } from 'lowdb';

import json from './db.json' assert { type: 'json' };
const isLocal = !process.env.NOW_REGION;
const type = isLocal ? new JSONFileSync('./db.json') : new Memory();

const db = new Low(type);
db.write();

export default db;
