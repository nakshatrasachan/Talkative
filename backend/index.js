const express = require('express')
const app = express();
const http = require('http');
const server = http.createServer(app);
const {Server} = require('socket.io');
const io = new Server(server);
require('dotenv').config();
const bcrypt =  require('bcrypt');
const path = require('path')
const session = require('express-session');

const port = 5000
const mongoose = require('mongoose');
const User = require('./models/User');
const Chat = require('./models/Chat');
const { timeStamp } = require('console');
const flash = require('connect-flash');
// const { Configuration, OpenAIApi } = require("openai");

// const configuration = new Configuration({
//   apiKey: process.env.OPENAI_API_KEY
// });
// const openai = new OpenAIApi(configuration);

// const { Configuration, OpenAIApi } = require('openai');
// const configuration = new Configuration({
//   apiKey: process.env.OPENAI_API_KEY
// });
// const openai = new OpenAIApi(configuration);
// Using Google Generative AI SDK
// const { GoogleGenerativeAI } = require("@google/generative-ai");

// const genAI = new GoogleGenerativeAI(process.env.OPENAI_API_KEY);
// const model = genAI.getGenerativeModel({ model: "gemini-pro" });



mongoose.connect('mongodb://localhost:27017/myDatabase', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => {
  console.log("Connected to MongoDB");
}).catch((err) => {
  console.error("MongoDB connection error:", err);
});


app.use(session({
  secret: 'yourSecretKey',
  resave: false,
  saveUninitialized: true
}));
app.use(flash());
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.set('io',io);
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use((req,res,next)=>{
    res.locals.signupsuccess = req.flash('signupsuccess');
    res.locals.loginsuccess = req.flash('loginsuccess');
    res.locals.logoutsuccess = req.flash('logoutsuccess');
    next();
})
app.get('/login',(req,res)=>{
    res.render('login');
})
app.get('/signup',(req,res)=>{
    res.render('signup');
})
app.get('/',(req,res)=>{
    res.render('home')
})
app.get('/:id', async (req, res) => {
  if(!req.session.userid){
    res.redirect('/');
  }else{
  const userId = req.params.id;
  const user = await User.findById(req.params.id);
  const allUsers = await User.find({ _id: { $ne: req.params.id } });
  const chats = await Chat.find({
    $or: [
      { firstusername: req.params.id },
      { secondusername: req.params.id }
    ]
  }).populate('messages.sender');
  
  const contactData = allUsers.map(contact => {
    const chat = chats.find(
      c => (c.firstusername.equals(contact._id) || c.secondusername.equals(contact._id))
    );
  
    let unreadCount = 0;
    if (chat) {
      unreadCount = chat.messages.filter(
        msg => msg.readBy && !msg.readBy.includes(userId) && !msg.sender._id.equals(userId)
      ).length;
    }
    return {
      contact,
      unreadCount
    };
  });
  res.render('user', {
    isLoggedIn: true,
    user,
    userId: user._id,
    username: user.username,
    contactData: contactData,
    selectedContact: null,
    messages: []
  });
}
});
app.get('/:id/chat/:contact_id', async (req, res) => {
  if(!req.session.userid){
    res.redirect('/');
  }else{
  const userId = req.params.id;
  const contactId = req.params.contact_id;

  const user = await User.findById(userId);
  const allUsers = await User.find({ _id: { $ne: userId } });
  
  // Find chat between user and contact
  let chat = await Chat.findOne({
    $or: [
      { firstusername: userId, secondusername: contactId },
      { firstusername: contactId, secondusername: userId }
    ]
  }).populate('messages.sender');

  // if (!chat) {
  //   chat = { messages: [] }; // No chat yet
  // }
  if(chat){
  for(let message of chat.messages){
    if(!message.readBy.includes(userId)){
    message.readBy.push(userId);
    }
   
  }
  
  await chat.save();
  // const senderSocketId = onlineUsersMap.get(userId); // Make sure you track this
  // if (senderSocketId) {
  //   io.to(senderSocketId).emit("messageOpen",{userId});
  //   console.log(senderSocketId);
  //   console.log(userId);
  // }
}
else{
  chat = { messages: [] }; // No chat yet
}
const chats = await Chat.find({
  $or: [
    { firstusername: req.params.id },
    { secondusername: req.params.id }
  ]
}).populate('messages.sender');
  const selectedContact = await User.findById(contactId);
  const contactData = allUsers.map(contact => {
    const chat = chats.find(
      c => (c.firstusername.equals(contact._id) || c.secondusername.equals(contact._id))
    );
  
    let unreadCount = 0;
    if (chat) {
      unreadCount = chat.messages.filter(
        msg => msg.readBy && !msg.readBy.includes(userId) && !msg.sender._id.equals(userId)
      ).length;
    }
    return {
      contact,
      unreadCount
    };
  });
  res.render('user', {
    user,
    isLoggedIn: true,
    userId: user._id,
    username: user.username,
    receivername: selectedContact.username,
    contacts: allUsers,
    selectedContact,
    contactData,
    messages: chat.messages
  });
}
});


app.post('/:id/chat/:contact_id/send',async(req,res)=>{
  if(!req.session.userid){
    res.redirect('/');
  }
  else{
  const userId = req.params.id;
  const contactId = req.params.contact_id;
    let chat = await Chat.findOne({
      $or: [
        { firstusername: userId, secondusername: contactId },
        { firstusername: contactId, secondusername: userId }
      ]
    }).populate('messages.sender');
console.log(userId,contactId);
    if (!chat) {
      chat = new Chat({
        firstusername: userId,
        secondusername: contactId,
        messages: []
      });
    }
    chat.messages.push({sender:userId,receivertext:req.body.message,sendertext:req.body.sendermessage,timestamp:Date.now()});
    await chat.save();
    console.log('saved message in DB')
    let savedchat = await Chat.findOne({
      $or: [
        { firstusername: userId, secondusername: contactId },
        { firstusername: contactId, secondusername: userId }
      ]
    }).populate('messages.sender');
    
    const savedmessage = savedchat.messages[savedchat.messages.length-1];
    const roomId = [userId.toString(), contactId.toString()].sort().join('-');
    io.to(roomId).emit('sendMessage', {
      roomId,
      receivertext: savedmessage.receivertext,
      sendertext: savedmessage.sendertext,
      senderId: userId,
      senderName: savedmessage.sender.username,
      timestamp: savedmessage.timestamp,
      messageId: savedmessage._id,
      contactId
    });
    console.log("sendMessageSent");
    // console.log(onlineUsersMap)
    const receiverSocketId = onlineUsersMap.get(contactId); // Make sure you track this
      if (receiverSocketId) {
        io.to(receiverSocketId).emit("messageNotify",{userId});
        console.log(receiverSocketId);
        console.log(userId);
      }
    console.log('Send Sent')
    // res.redirect(`/${userId}/chat/${contactId}`);
    res.status(200).json({success:true,message:savedmessage});
  }
})

app.post('/login',async(req,res)=>{
    const {username,password} = req.body;
    const user = await validateLogin(username,password);
    if(user){
        console.log("Login success");
        req.session.isLoggedIn=true;
        req.session.userid=user._id;
        req.flash('loginsuccess','Logged In!!');
        res.redirect(`/${user._id}`);
    }else{
        console.log("Login Failed");
        res.redirect('/login');
    }
    
})
app.post('/signup',async(req,res)=>{
    const {username,password,publicKey} = req.body;
    
    const registerUser = await createUser(username,password,publicKey);
    if(!registerUser){
        console.log("Register Failed");
    }
    req.session.isLoggedIn=true;
    req.session.userid=registerUser._id;
    req.flash('signupsuccess','Successfully Registered!!');
    res.redirect(`/${registerUser._id}`);
    
})
const validateLogin = async (username, password) => {
  if (!username || !password) return false;
  
  const foundUser = await User.findOne({ username });
  if (!foundUser) {
    console.log("No User Found");
    return false;
  }
  const valid = bcrypt.compare(password,foundUser.password);
  if(!valid){
    console.log('Username or password is incorrect');
    return false;
  }

  return foundUser;
};


const createUser = async (username, password,publicKey) => {
  const salt = await bcrypt.genSalt(12);
  const hash = await bcrypt.hash(password,salt);
  const existingUser = await User.findOne({ username });
  if (existingUser) {
    throw new Error("Username already exists.");
  }

  const newUser = new User({ username, password:hash,publicKey });
  await newUser.save();
  return newUser;
};

app.post('/logout',(req,res)=>{
    req.session.isLoggedIn=false;
    req.session.userid=null;
    req.flash('logoutsuccess','Logged Out!!')
    res.redirect('/');
})

app.post('/:id/chat/:contact_id/remove/:message_id', async (req, res) => {
  if(!req.session.userid){
    res.redirect('/');
  }
  else{
  const userId = req.params.id;
  const contactId = req.params.contact_id;
  const messageId = req.params.message_id;

  let chat = await Chat.findOne({
    $or: [
      { firstusername: userId, secondusername: contactId },
      { firstusername: contactId, secondusername: userId }
    ]
  });

  if (!chat) {
    return res.status(404).send("Chat not found");
  }

  for (let message of chat.messages) {
    if (message._id.toString() === messageId) {
      // Ensure the `deleted` array exists
      if (!message.deleted) {
        message.deleted = [];
      }

      // Add userId to deleted list if not already present
      if (!message.deleted.includes(userId)) {
        message.deleted.push(userId);
      }
      const senderSocketId = onlineUsersMap.get(userId); // Make sure you track this
      if (senderSocketId) {
        io.to(senderSocketId).emit("messageDeletedForMe", { messageId });
      }
      
    }
  }

  await chat.save();
  
  res.status(200).json({success:true,message:"Fake"});
  // res.redirect(`/${userId}/chat/${contactId}`);
}
});
app.post('/:id/chat/:contact_id/delete/:message_id', async (req, res) => {
  if(!req.session.userid){
    res.redirect('/');
  }
  else{
  const userId = req.params.id;
  const contactId = req.params.contact_id;
  const messageId = req.params.message_id;

  let chat = await Chat.findOne({
    $or: [
      { firstusername: userId, secondusername: contactId },
      { firstusername: contactId, secondusername: userId }
    ]
  });

  if (!chat) {
    return res.status(404).send("Chat not found");
  }

  for (let message of chat.messages) {
    if (message._id.toString() === messageId) {
      if (!message.deleted) {
        message.deleted = [];
      }

      // Add userId to deleted list if not already present
      if (!message.deleted.includes(userId)) {
        message.deleted.push(userId);
      }
      if (!message.deleted.includes(contactId)) {
        message.deleted.push(contactId);
      }
      console.log('Preparing to emit delete...');
      const roomId = [userId.toString(), contactId.toString()].sort().join('-');
      io.to(roomId).emit('messageDeleted', {
        messageId: message._id.toString(),
        sender: userId,
        deleteforme: false
      });
      console.log(`Emitted to room ${roomId}, messageId: ${message._id.toString()}`);
      
      
    }
  }

  await chat.save();
      
  res.status(200).json({success:true,message:"Fake"});
  // res.redirect(`/${userId}/chat/${contactId}`);
}
});

app.post('/:id/chat/:contact_id/edit/:message_id', async (req, res) => {
  if(!req.session.userid){
    res.redirect('/');
  }
  else{
    const {senderusername,receivername,sender,receiver, messageId, message, sendermessage } = req.body;

    try {
      // const chat = await Chat.findOne({ "messages._id": messageId }).populate("firstusername secondusername messages.sender");
      // if (!chat) return res.status(404).json({ success: false, error: "Chat not found" });
  
      // const messageDB = chat.messages.id(messageId);
      // if (!messageDB) return res.status(404).json({ success: false, error: "Message not found" });
  
      // const sender = await User.findById(message.sender);
      // const receiverId = sender._id.equals(chat.firstusername._id)
      //   ? chat.secondusername._id
      //   : chat.firstusername._id;
  
      // const receiver = await User.findById(receiverId);
      // let chat = await Chat.findOne({
      //   $or: [
      //     { firstusername: sender, secondusername: receiver },
      //     { firstusername: receiver, secondusername: sender }
      //   ]
      // });
      console.log("EDIT ROUTE HIT");
      await Chat.updateOne(
        { "messages._id": messageId },
        {
          $set: {
            "messages.$.sendertext": sendermessage,
            "messages.$.receivertext": message
          }
        }
      );
      
      // Encrypt for both sender and receiver
      // const encoded = new TextEncoder().encode(newText);
  
      // const [senderEncrypted, receiverEncrypted] = await Promise.all([
      //   encryptWithKey(sender.publicKey, encoded),
      //   encryptWithKey(receiver.publicKey, encoded)
      // ]);
  
      // message.sendertext = senderEncrypted;
      // message.receivertext = receiverEncrypted;
      // chat.updateOne({set:{sendertext:sendermessage,receivertext:message}})
      // await chat.save();
  const senderId = req.params.id;
  console.log(senderId);
  const receiverId = req.params.contact_id;
      // Emit live update
      const roomId = [senderId.toString(), receiverId.toString()].sort().join("-");
      console.log("ROOM ID:",roomId);
      io.to(roomId).emit("messageEdited", {
        messageId,
        sendertext: sendermessage,
        receivertext: message,
        senderusername,
        receivername,
        senderId,
        receiverId
      });
      console.log("messageEditedEmitted");
      res.json({ success: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, error: "Server error" });
    }
  // res.redirect(`/${userId}/chat/${contactId}`);
}
});

//const genAI = new GoogleGenerativeAI("YOUR_GEMINI_API_KEY");

// app.post("/ask", async (req, res) => {
//   const { message } = req.body;

  
//   try{
//   const model = genAI.getGenerativeModel({ model: "models/gemini-pro" });

//   const result = await model.generateContent("Tell me a fun fact about space!");
//   const response = await result.response.text();
  
//   console.log("Response:", response);
//   res.json({ response });
//   } catch (err) {
//     console.error("GPT error:", err);
//     res.status(500).json({ error: "Gemini API request failed" });
//   }
// });

app.post('/ask', async (req, res) => {
    const { message } = req.body;
    try {
      const response = await openai.createChatCompletion({
        model: "gpt-3.5-turbo", // or "gpt-4" if you have access
        messages: [
          { role: "user", content: message }
        ]
      });
      console.log("Response",response);
    //   const reply = response.data.choices[0].message.content;
    //   console.log(reply);
      res.json({ response });
      console.log("Res",res);
    } catch (err) {
      console.error("GPT error:", err);
      res.status(500).json({ error: "Failed to connect to GPT" });
    }
  }); 

  // SOCKET.IO HANDLING
const onlineUsersMap = new Map();
io.on('connection', (socket) => {
  console.log(`A user connected: ${socket.id}`);
  socket.on("registerUser", (userId) => {
    onlineUsersMap.set(userId, socket.id);
  });
  socket.on('joinRoom', (roomId) => {
    socket.join(roomId);
    console.log(`User joined room: ${roomId}`);
  });
  // Listen for typing
  socket.on('typing', ({ roomId, sender }) => {
    socket.to(roomId).emit('typing', sender);
  });

  // Stop typing
  socket.on('stopTyping', ({ roomId }) => {
    socket.to(roomId).emit('stopTyping');
  });
  // socket.on('sendMessage', (data) => {
  //   // Emit to other sockets in the room
  //   io.to(data.roomId).emit('receiveMessage', data);
  //   console.log('ReceivedSend')
  // });

  // socket.on('disconnect', () => {
  //   console.log(`User disconnected: ${socket.id}`);
  // });
  socket.on("disconnect", () => {
    for (const [userId, socketId] of onlineUsersMap.entries()) {
      if (socketId === socket.id) {
        onlineUsersMap.delete(userId);
        break;
      }
    }
  });
  // socket.on('deleteMessage', ({ roomId, messageId }) => {
  //   // Notify all users in the room that the message was deleted
  //   io.to(roomId).emit('messageDeleted', { messageId });
  // });
  
});
server.listen(port,()=>{
    console.log(`Server running on port ${port}`);
})
