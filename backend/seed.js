const User = require('./models/User');
const express = require('express');
const bcrypt =  require('bcrypt');

const path = require('path')
const session = require('express-session');
const app = express();
const port = 5000
const mongoose = require('mongoose');
mongoose.connect('mongodb://localhost:27017/myDatabase', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => {
  console.log("Connected to MongoDB");
}).catch((err) => {
  console.error("MongoDB connection error:", err);
});
const createUser = async (username, password) => {
  // Step 1: Fetch all existing users before creating the new one
  const existingUsers = await User.find();
   const salt = await bcrypt.genSalt(12);
   console.log(salt);
    const hash = await bcrypt.hash(password,salt);
    console.log(hash);
  // Step 2: Create the new user with existing users as contacts
  const newUser = new User({
    username,
    password:hash
  });

  await newUser.save(); // Save before adding this user to others' contacts

  // Step 3: Add the new user to all existing users' contacts
 

  return newUser;
};


// Seeding users
const seedUsers = async () => {
  for (let i = 1; i <= 10; i++) {
    const username = `user${i}`;
    const password = '1234';
   // console.log(i);
    const newUser = await createUser(username, password); // Add await here
    //console.log(newUser);
  }

  console.log("Seeding complete.");
};

seedUsers();
