const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  publicKey:{
    type: String,
    required: true
  }
  // No need to store contacts if everyone is a contact
});

const User = mongoose.model('User', userSchema);
module.exports = User;
