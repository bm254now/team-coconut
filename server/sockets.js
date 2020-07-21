const MatchManager = require("./engine/MatchManager");
const Player = require("./engine/Player");
const cookie = require("cookie");
const jwt = require("jsonwebtoken");
const { keys } = require("./engine/Words");
const ClientError = require("./common/ClientError");

const sockets = {};

sockets.init = function (server) {
  // Create Match Manager
  const Match = new MatchManager();

  // socket.io setup
  var io = require("socket.io")(server, {
    pingInterval: 5000,
    pingTimeout: 10000,
  });

  /**
   * Socket Connect
   */
  io.use((socket, next) => {
    const cookies = cookie.parse(socket.handshake.headers.cookie);
    const token = cookies["token"];
    if (token) {
      jwt.verify(token, process.env.JWT_SECRET, (error, decoded) => {
        if (error)
          return next(new ClientError("", "Authentication Error", 400));
        socket.decoded = decoded;
        next();
      });
    } else {
      next(new ClientError("", "Unauthorized", 401));
    }
  }).on("connect", (socket) => {
    console.log("connected", socket.id, new Date().toLocaleTimeString());
    socket.on("disconnect", () => {
      console.log("disconnected", socket.id, new Date().toLocaleTimeString());
    });

    /**
     * Join Room
     */
    socket.on("BE-user-joined", ({ gameId, player }) => {
      const newPlayer = new Player(player.email, player.name);

      if (!Match.checkRoomExist(gameId)) {
        Match.createRoom(gameId);
      }

      // Add New Player in the Match Map
      Match.joinRoom(gameId, newPlayer);

      //joining room
      socket.join(gameId);

      //notify all other users in the room
      socket.broadcast.to(gameId).emit("FE-user-joined", player.email);
    });

    /**
     * Start Game
     */
    socket.on("start-game", (gameId) => {
      const gameState = Match.startGame(gameId);

      // Start Timer
      Match.startTimer(gameId, function () {
        console.log("Time Over!!");
        socket.in(gameId).emit("FE-time-over", gameId);
      });

      io.sockets.in(gameId).emit("game-started", gameState);
    });

    /**
     * Send Clues
     */
    socket.on("BE-send-clue", ({ gameId, player, gameState }) => {
      io.sockets.in(gameId).emit("FE-send-clue", { player, gameState });
    });

    /**
     * Send Clues
     */
    socket.on("BE-display-typing-notification", ({ gameId, playerEmail }) => {
      socket.broadcast
        .to(gameId)
        .emit("FE-display-typing-notification", playerEmail);
    });

    /**
     * End of Round
     */
    socket.on("BE-send-answer", ({ gameId, answer, clues }) => {
      const gameState = Match.endRound(gameId, answer, clues);

      // End Timer
      Match.endTimer(gameId);

      io.sockets.in(gameId).emit("FE-send-answer", { gameState, gameId });
    });

    /**
     * Move to Next Round
     */
    socket.on("BE-move-round", ({ gameId, playerSocketId }) => {
      const numberOfPlayers = Match.waitNextRound(gameId, playerSocketId);

      if (numberOfPlayers === 4) {
        const gameState = Match.moveToNextRound(gameId);

        // Start Timer
        Match.startTimer(gameId, function () {
          console.log("Time Over!!");
          socket.in(gameId).emit("FE-time-over", gameId);
        });

        io.sockets.in(gameId).emit("FE-move-round", gameState);
      }
    });

    /**
     * Play Again / Non-Host players join new game
     */
    socket.on("BE-join-new-game", ({ gameId, newGameId }) => {
      socket.broadcast.to(gameId).emit("FE-join-new-game", newGameId);

      io.of("/")
        .in(gameId)
        .clients(function (error, clients) {
          if (clients.length > 0) {
            console.log("clients in the room: \n");
            console.log(clients);
            clients.forEach(function (socket_id) {
              io.sockets.sockets[socket_id].leave(gameId);
            });
          }
        });
    });

    /**
     * Player leaves game AFTER the game has ended
     */
    socket.on("BE-leave-game", ({ gameId }) => {
      io.of("/")
        .in(gameId)
        .clients((error, clients) => {
          clients.forEach((socket_id) => {
            if (socket_id === socket.id) {
              io.sockets.sockets[socket_id].leave(gameId);
            }
          });
        });
    });

    /**
     * End game
     */
    socket.on("BE-end-game", (gameId) => {
      Match.endGame(gameId);
    });
  });
  console.log("Sockets Initialized");
};

module.exports = sockets;
