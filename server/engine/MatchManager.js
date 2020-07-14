const Game = require('./Game');
const Player = require('./Player');
const ClientError = require('../common/ClientError');

class MatchManager {
  constructor() {
    this.matchManager = new Map();
  }

  /**
   * Create New Room
   * @param {string} gameId 
   */
  createRoom(gameId) {
    this.matchManager.set(gameId, new Game());
  }

  /**
   * Join Room
   * @param {string} gameId 
   * @param {object} player 
   */
  joinRoom(gameId, player) {
    if (!this.checkRoomExist(gameId))
      throw new ClientError('', 'Room Not Found', 404);

    const game = this.matchManager.get(gameId);
    const newPlayer = new Player(player.id, player.name);

    game.addPlayer(newPlayer);
  }

  /**
   * Start Game
   * @param {string} gameId 
   */
  startGame(gameId) {
    if (!this.checkRoomExist(gameId))
      throw new ClientError('', 'Room Not Found', 404);

    const game = this.matchManager.get(gameId);
    const numberOfPlayers = game.getNumberOfPlayers();

    console.log(numberOfPlayers);

    if (numberOfPlayers === 4) {
      game.initGame();
    }

    return game.getState();
  }

  /**
   * End Round
   * @param {string} gameId 
   * @param {string} answer 
   * @param {array} clues 
   */
  endRound(gameId, answer, clues) {
    if (!this.checkRoomExist(gameId))
      throw new ClientError('', 'Room Not Found', 404);

    const game = this.matchManager.get(gameId);
    const correct = game.checkAnswer(answer);

    if (correct) {
      game.givePoints(clues);
    }

    return {
      isCorrect: correct,
      state: game.getState(),
    };
  }

  /**
   * Move To Next Round
   * @param {string} gameId 
   */
  moveToNextRound(gameId) {
    if (!this.checkRoomExist(gameId))
      throw new ClientError('', 'Room Not Found', 404);

    const game = this.matchManager.get(gameId);

    game.nextRound();

    return game.getState();
  }

  /**
   * Player leaves game
   * @param {object} player 
   */
  leavePlayer(player) {
    if (!this.checkRoomExist(gameId))
      throw new ClientError('', 'Room Not Found', 404);

    const game = this.matchManager.get(gameId);

    game.leavePlayer(player);

    return game.getState();
  }

  /**
   * End Game
   */
  endGame() {
    if (!this.checkRoomExist(gameId))
      throw new ClientError('', 'Room Not Found', 404);

    this.matchManager.delete(gameId);
  }

  /**
   * Check Room is Exist in a Match Map
   * @param {string} gameId 
   */
  checkRoomExist(gameId) {
    return this.matchManager.has(gameId);
  }
}

module.exports = MatchManager;