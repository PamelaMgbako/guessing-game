# Real-Time Multiplayer Guessing Game

A live, multiplayer guessing game built with Node.js, Express, and Socket.IO. Players can join custom game sessions, take turns as Game Master, ask questions, make guesses with limited attempts, and compete on a live scoreboard.

## Features
- Multiplayer Sessions & Rooms: Create and join isolated game rooms using unique session IDs.
- Game Master Role: The session creator creates a question and secret answer for the round.
- Player Requirements: Requires more than 2 players before a session can start.
- Guess Limits: Each player is given a maximum of 3 attempts to guess the answer.
- 60-Second Timer: Game automatically expires if no correct guess is submitted within 60 seconds.
- Live Scoreboard: 10 points awarded to the winner with real-time score updates across all players.
- Rotating Game Master: The Game Master role automatically rotates to the next player for subsequent rounds.
- Session Cleanup: Sessions are automatically cleared from server memory when all players leave.

## How to Run the Application
1. Install dependencies: npm install
2. Start the server: node server.js
3. Open your browser to http://localhost:3000
4. Open at least 3 browser tabs (minimum 3 players required)
5. Player 1 creates the session with a question, answer, username, and session ID
6. Players 2 and 3 join the session with the same session ID
7. Player 1 clicks "Start Game" and players submit their guesses
