import {
  find,
  hasFav as _hasFav,
  removeFav,
  addFav,
  create,
} from './models/userModel.js';
import { list } from './models/categoriesModel.js';
import {
  find as _find,
  addLike,
  removeLike,
  list as _list,
} from './models/photosModel.js';
import { gql } from 'apollo-server-express';
import pkg from 'jsonwebtoken';
import { compare } from 'bcrypt';
const { sign } = pkg;

export const typeDefs = gql`
  type User {
    id: ID
    avatar: String
    name: String
    email: String
    isPremium: Boolean
  }

  type Photo {
    id: ID
    categoryId: Int
    src: String
    likes: Int
    liked: Boolean
    userId: ID
  }

  type Category {
    id: ID
    cover: String
    name: String
    emoji: String
    path: String
  }

  type Query {
    favs: [Photo]
    categories: [Category]
    photos(categoryId: ID): [Photo]
    photo(id: ID!): Photo
  }

  input LikePhoto {
    id: ID!
  }

  input UserCredentials {
    email: String!
    password: String!
  }

  type Mutation {
    likeAnonymousPhoto(input: LikePhoto!): Photo
    likePhoto(input: LikePhoto!): Photo
    signup(input: UserCredentials!): String
    login(input: UserCredentials!): String
  }
`;

function checkIsUserLogged(context) {
  const { email, id } = context;
  // check if the user is logged
  if (!id) throw new Error('you must be logged in to perform this action');
  // find the user and check if it exists
  const user = find({ email });
  // if user doesnt exist, throw an error
  if (!user) throw new Error('user does not exist');
  return user;
}

function tryGetFavsFromUserLogged(context) {
  try {
    const { email } = checkIsUserLogged(context);
    const user = find({ email });
    return user.favs;
  } catch (e) {
    return [];
  }
}

export const resolvers = {
  Mutation: {
    likeAnonymousPhoto: (_, { input }) => {
      // find the photo by id and throw an error if it doesn't exist
      const { id: photoId } = input;
      const photo = _find({ id: photoId });
      if (!photo) {
        throw new Error(`Couldn't find photo with id ${photoId}`);
      }
      // put a like to the photo
      addLike({ id: photoId });
      // get the updated photos model
      const actualPhoto = _find({ id: photoId });
      return actualPhoto;
    },
    likePhoto: (_, { input }, context) => {
      const { id: userId } = checkIsUserLogged(context);

      // find the photo by id and throw an error if it doesn't exist
      const { id: photoId } = input;
      const photo = _find({ id: photoId });
      if (!photo) {
        throw new Error(`Couldn't find photo with id ${photoId}`);
      }

      const hasFav = _hasFav({ id: userId, photoId });

      if (hasFav) {
        removeLike({ id: photoId });
        removeFav({ id: userId, photoId });
      } else {
        // put a like to the photo and add the like to the user database
        addLike({ id: photoId });
        addFav({ id: userId, photoId });
      }

      // get favs from user before exiting
      const favs = tryGetFavsFromUserLogged(context);
      // get the updated photos model
      const actualPhoto = _find({ id: photoId, favs });

      return actualPhoto;
    },
    // Handle user signup
    async signup(_, { input }) {
      // add 1 second of delay in order to see loading stuff
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const { email, password } = input;

      const user = await find({ email });

      if (user) {
        throw new Error('User already exists');
      }

      const newUser = await create({
        email,
        password,
      });

      // return json web token
      return sign(
        { id: newUser.id, email: newUser.email },
        process.env.JWT_SECRET,
        { expiresIn: '1y' }
      );
    },

    // Handles user login
    async login(_, { input }) {
      // add 1 second of delay in order to see loading stuff
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const { email, password } = input;
      const user = await find({ email });

      if (!user) {
        throw new Error('No user with that email');
      }

      const valid = await compare(password, user.password);

      if (!valid) {
        throw new Error('Incorrect password');
      }

      // return json web token
      return sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, {
        expiresIn: '1d',
      });
    },
  },
  Query: {
    favs(_, __, context) {
      const { email } = checkIsUserLogged(context);
      const { favs } = find({ email });
      return _list({ ids: favs, favs });
    },
    categories() {
      return list();
    },
    photo(_, { id }, context) {
      const favs = tryGetFavsFromUserLogged(context);
      return _find({ id, favs });
    },
    photos(_, { categoryId }, context) {
      const favs = tryGetFavsFromUserLogged(context);
      return _list({ categoryId, favs });
    },
  },
};
