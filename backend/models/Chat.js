const mongoose = require('mongoose');

const chatSchema = new mongoose.Schema({
  firstusername: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  secondusername: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  messages: [
    {
      sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
      },
      deleted:[{
        type: mongoose.Schema.Types.ObjectId
      }],
      readBy:[{
        type: mongoose.Schema.Types.ObjectId
      }],
      receivertext: {
        type: String,
        required: true
      },
      sendertext: {
        type: String,
        required: true
      },
      timestamp: {
        type: Date,
        default: Date.now
      }
    }
  ]
});

const Chat = mongoose.model('Chat', chatSchema);
module.exports = Chat;
