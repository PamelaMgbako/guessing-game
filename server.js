
// require express, http and socket.io modules
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const sessions = {};

// Creating the express  app
const app = express();

// Creating the http server by wrapping the express app
const server = http.createServer(app);

// Initializing the socket.io server by passing the http server
const io = new Server(server);

// Creates a counter variable to keep track of the number of online players
let onlinePlayersCount = 0;


// Listens for connections and disconnections from clients
io.on('connection', (socket) => {
    // Increment the online players count when a new player connects
    onlinePlayersCount++;

    //display the updated online players count to all connected clients
    io.emit('updateUserCount', onlinePlayersCount);

    // Listens for disconnections from clients
    socket.on('disconnect', () => {

        // Decrement the online players count when a player disconnects
        onlinePlayersCount--;

        // Display the updated online players count to all connected clients
        io.emit('updateUserCount', onlinePlayersCount);

     for (const sessionId in sessions) {
            const session = sessions[sessionId];
            if (session && socket.username) {
                // Remove the disconnected player from this session's list
                session.players = session.players.filter(name => name !== socket.username);
                // If players are still in the room, update the list
                if (session.players.length > 0) {
                    io.to(sessionId).emit('updatePlayerList', session.players);
                } else {
                    // REQUIREMENT: "Game session is deleted when all the players in the session has left"
                    clearTimeout(session.timer);
                    delete sessions[sessionId];
                    console.log(`Session ${sessionId} deleted because all players left.`);
                }
            }
        }
    });


    // Create session block
    socket.on('createSession', ({ username, sessionId }) => {
        socket.username = username;
        sessions[sessionId] = {
            gameMaster: socket.id,
            gameMasterName: username,
            players: [username],
            scores: { [username]: 0 },
            status: 'waiting'
        }
        socket.join(sessionId);
        io.to(sessionId).emit('updatePlayerList', sessions[sessionId].players);

    });


    // Join session block
    socket.on('joinSession', ({ username, sessionId }) => {
        if (sessions[sessionId] && sessions[sessionId].status === 'waiting') {
            socket.username = username;
            sessions[sessionId].players.push(username);
            socket.join(sessionId);
            io.to(sessionId).emit('updatePlayerList', sessions[sessionId].players);
        }
    });

    // Start game block

    socket.on('startGame', ({ sessionId, question, answer }) => {

        //console log to check if the start game event is received and the sessionId is correct
        console.log('Start game received for room:', sessionId);

        // Ensuring that there are more than 2 players in the room before starting the game
        if (sessions[sessionId] && sessions[sessionId].players.length <= 2) {
            return socket.emit('errorMessage', 'You need more than 2 players in the room to start the game!');
        }

        // Ensuring that the game master is the one starting the game
        if (sessions[sessionId] && sessions[sessionId].gameMaster === socket.id) {

            sessions[sessionId].status = 'inProgress';

            sessions[sessionId].timer = setTimeout(() => {

                if (sessions[sessionId] && sessions[sessionId].status === 'inProgress') {
                    sessions[sessionId].status = 'completed';
                    io.to(sessionId).emit('gameOver', {
                        message: `Time's up! The correct answer was "${sessions[sessionId].answer}".`, winnerId: null,
                        winnerName: null, answer: sessions[sessionId].answer
                    });
                }
            }, 60000); // 60 seconds timer


            sessions[sessionId].question = question;

            sessions[sessionId].answer = answer.trim().toLowerCase();

            // Inside startGame:
            sessions[sessionId].attempts = {};
            io.to(sessionId).emit('gameStarted', { question });
        }
    });

    // Make guess block

    socket.on('makeGuess', ({ sessionId, guess }) => {

        // Ensuring that the game is in progress and the session exists
        if (sessions[sessionId] && sessions[sessionId].status === 'inProgress') {
            const correctAnswer = sessions[sessionId].answer;
            const playerGuess = guess.trim().toLowerCase();

            // Check how many attempts the player has made and how many are left
            const currentAttempts = sessions[sessionId].attempts[socket.id] || 0;


            if (currentAttempts >= 3) {
                return socket.emit('guessResult', {
                    message: 'You have used all 3 attempts! You cannot guess anymore.'
                });
            }


            if (playerGuess === correctAnswer) {
                sessions[sessionId].status = 'completed';
                clearTimeout(sessions[sessionId].timer);

                sessions[sessionId].scores[socket.username] = (
                    sessions[sessionId].scores[socket.username] || 0) + 10;

                // --- ROTATE GAME MASTER ---
                // 1. Find the current game master's index in the players array
                const currentGMIndex = sessions[sessionId].players.findIndex(p => p === sessions[sessionId].gameMasterName);
                // 2. Pick the next player (or wrap around to the first player)
                const nextGMIndex = (currentGMIndex + 1) % sessions[sessionId].players.length;
                const nextGMUsername = sessions[sessionId].players[nextGMIndex];

                sessions[sessionId].gameMasterName = nextGMUsername;

                io.to(sessionId).emit('gameOver', {
                    message: `Congratulations! "${guess}" was the correct answer.`,
                    winnerId: socket.id,
                    winnerName: socket.username,
                    answer: correctAnswer,
                    scores: sessions[sessionId].scores,
                    newGameMaster: nextGMUsername
                });
            } else {
                sessions[sessionId].attempts[socket.id] = currentAttempts + 1;
                const remaining = 3 - sessions[sessionId].attempts[socket.id];

                if (remaining > 0) {
                    socket.emit('guessResult', {
                        message: `Sorry, "${guess}" is incorrect. You have ${remaining} attempt(s) left!`
                    });
                } else {
                    socket.emit('guessResult', {
                        message: `Sorry, "${guess}" is incorrect. You have used all 3 attempts! You cannot guess anymore.`
                    });
                }
            }

        }

    });

});

app.use(express.static('public'));

server.listen(3000, () => console.log('Server listening on port 3000'));