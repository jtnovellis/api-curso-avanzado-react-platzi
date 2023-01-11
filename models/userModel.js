import db from '../adapter.js';
import { createHash } from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { hash } from 'bcrypt';

export function addFav({ id, photoId }) {
  db.get('users')
    .find({ id })
    .update('favs', (favs) => [...favs, photoId])
    .write();
}

export function removeFav({ id, photoId }) {
  db.get('users')
    .find({ id })
    .update('favs', (favs) => favs.filter((fav) => fav !== photoId))
    .write();
}

export function hasFav({ id, photoId }) {
  const user = db.get('users').find({ id }).value();
  const hasFav = user.favs.includes(photoId);
  return hasFav;
}

export async function create({ email, password }) {
  const avatarHash = createHash('md5').update(email).digest('hex');
  const avatar = `https://gravatar.com/avatar/${avatarHash}`;

  // Create a user
  const user = {
    id: uuidv4(), // with a unique user id
    password: await hash(password, 10), // with the encrypted password
    favs: [],
    avatar,
    email,
  };

  // Write in db.json
  db.get('users').push(user).write();

  return user;
}

export function find({ email }) {
  return db.get('users').find({ email }).value();
}
