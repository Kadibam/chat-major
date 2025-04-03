const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const { initializeApp } = require("firebase/app");
const { getFirestore, collection, addDoc, getDocs, query, orderBy } = require("firebase/firestore");

const firebaseConfig = {
  apiKey: "AIzaSyAEnJkigsAUNHzRF4xrDxPinVTPq0i-QmI",
  authDomain: "major-bee64.firebaseapp.com",
  projectId: "major-bee64",
  storageBucket: "major-bee64.appspot.com",
  messagingSenderId: "259240573869",
  appId: "1:259240573869:web:163ac26ace61e311ae7f24",
  measurementId: "G-8Z8111C8MS"
};

// Initialize Firebase
const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
  },
});

app.use(cors());

let users = [];

io.on("connection", async (socket) => {
  console.log("A user connected:", socket.id);

  // Load chat history from Firestore
  const q = query(collection(db, "messages"), orderBy("timestamp", "asc"));
  const querySnapshot = await getDocs(q);
  let messages = [];
  querySnapshot.forEach((doc) => messages.push(doc.data()));
  socket.emit("load_messages", messages); // Send past messages to the user

  socket.on("set_user", (user) => {
    if (user) {
      users.push({ id: socket.id, ...user });
    } else {
      users = users.filter((u) => u.id !== socket.id);
    }
    io.emit("update_users", users);
  });

  socket.on("send_message", async (data) => {
    await addDoc(collection(db, "messages"), data); // Store in Firestore
    io.emit("receive_message", data);
  });

  socket.on("typing", (username) => {
    socket.broadcast.emit("user_typing", username);
  });

  socket.on("stop_typing", () => {
    socket.broadcast.emit("user_stopped_typing");
  });

  socket.on("disconnect", () => {
    users = users.filter((user) => user.id !== socket.id);
    io.emit("update_users", users);
    console.log("A user disconnected:", socket.id);
  });
});

server.listen(4000, () => {
  console.log("Server is running on port 4000 🚀");
});
