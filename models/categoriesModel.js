import db from '../adapter.js';

export function list() {
  return db.get('categories').value();
}
