const express = require('express');
const cors = require('cors');
const { Server } = require('socket.io');
const { createServer } = require('http');
const mongoose = require('mongoose');

const { NEXT_PUBLIC_MONGO_URL } = process.env;

const connect = async () => {
  try {
    if (!NEXT_PUBLIC_MONGO_URL) {
      throw new Error("MongoDB URL is not defined.");
    }

    await mongoose.connect(NEXT_PUBLIC_MONGO_URL, {
      dbName: 'GIGA-CHAT'
    });
  } catch (error) {
    throw new Error("Error connecting to Mongoose");
  }
};

const OnlineUsersSchema = new mongoose.Schema({
  onlineUsers: {
    type: [String],
    required: true,
    unique: true
  }
});

const OnlineUser = mongoose.model("OnlineUser", OnlineUsersSchema, "onlineUsers");

const app = express();
const port = 5000;

app.use(express.json());
app.use(cors());

const server = createServer(app)

const io = new Server(server, {
  cors: {
    origin: 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true,
  },
})

let rooms: { [key: string]: string[] } = {};

io.on('connection', (socket) => {
  try {
    socket.on('send_RoomId', (data: { roomId: string, email: string, sender: string, receiver: string }) => {
      const { roomId, email, sender, receiver } = data;
      socket.broadcast.emit('check_RoomId', { room_Id: roomId, email, sender, receiver });
    });

    socket.on('online', (data: any) => {
      console.log('user connected', data)
      socket.broadcast.emit('onlineUsers', data);
    });

    socket.on('remove_online', (data: any) => {
      socket.broadcast.emit('remove_online', data);
    })

    socket.on('new_user_message', (data: any) => {
      socket.broadcast.emit('is_new_user_message', data);
    })

    socket.on('voice_message', (data: any) => {
      socket.broadcast.emit('receive_voice_message', data)
    })

    socket.on('send_Message', (data: { message: string, sender: string, receiver: string, email: string, room_Id: string }) => {
      socket.broadcast.emit('receive_Message', {
        message: data.message,
        sender: data.sender,
        receiver: data.receiver,
        email: data.email,
        roomId: data.room_Id,
      });
      // console.log('current members in room', rooms[data.room_Id], 'message from', data.user, 'message', data.message)
      // console.log(rooms)
    });

    socket.on('private_send_Message', (data: { message: string, sender: string, receiver: string, email: string, room_Id: string }) => {
      socket.to(data.room_Id).emit('receive_Message', {
        message: data.message,
        sender: data.sender,
        receiver: data.receiver,
        email: data.email,
        roomId: data.room_Id,
      });
      // console.log('current members in room', rooms[data.room_Id], 'message from', data.user, 'message', data.message)
      // console.log(rooms)
    });

    socket.on('send_grp_message', (data: any) => {
      console.log(data)
      socket.broadcast.emit('receive_grp_message', data)
    })

    socket.on('join_Room', (data: { room_Id: string, username: string }) => {
      if (data) {
        const { room_Id, username } = data
        if (!rooms[room_Id]) {
          rooms[room_Id] = []
        }
        if (!rooms[room_Id].includes(username)) {
          rooms[room_Id].push(username);
          console.log(username, 'joined room', room_Id)
          socket.join(room_Id);
        }
      }
    });

    socket.on('leave_Room', (data: { room_Id: string, username: string }) => {
      const { room_Id, username } = data
      if (rooms[room_Id] === undefined) return
      rooms[room_Id] = rooms[room_Id].filter(user => user !== username)
      socket.leave(room_Id);
    })

    socket.on('disconnect', async () => {
      try {
        const username = socket?.handshake?.auth?.token as string
        await connect()
        const user = await OnlineUser.findOne({});
        if(!user) return
        if (user?.onlineUsers?.length > 0) {
          user.onlineUsers = user.onlineUsers.filter(user => user !== username);
          await user.save();
          console.log('user disconnected', user.onlineUsers, username)
        }
        socket.broadcast.emit('newOnlineUsers', { onlineUsers: user.onlineUsers });
      } catch (e) { console.log(e) }
    });

  } catch (e) { console.log(e) }
});

server.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
