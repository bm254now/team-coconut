import React, {
  createContext,
  useState,
  useEffect,
  useCallback,
  useContext,
} from "react";
import { GameContext } from "./GameContext";
import sockets from "../utils/sockets";

const TIME = 15;
const GameplayContext = createContext();

function GameplayContextProvider({ children }) {
  const [gameState, setGameState] = useState(null);
  const [gameReady, setGameReady] = useState(false);
  const [clues, setClues] = useState([]);
  const [displayClueError, setDisplayClueError] = useState(false);
  const [showNextRoundScreen, setShowNextRoundScreen] = useState(false);
  const [showEndGameScreen, setShowEndGameScreen] = useState(false);
  const [submitDisable, setSubmitDisable] = useState(false);
  const [isGuesser, setIsGuesser] = useState(false);
  const [redirect, setRedirect] = useState(false);
  const [redirectPath, setRedirectPath] = useState("");
  const [gameTimer, setGameTimer] = useState(TIME);
  const [isGuessPhase, setIsGuessPhase] = useState(false);
  const { joinGame } = useContext(GameContext);

  useEffect(() => {
    const { email: currentUser } = JSON.parse(localStorage.getItem("user"));
    /**
     * Start Game
     */
    sockets.on("game-started", (gameState) => {
      setGameState(gameState); // init data needed for game flow
      setIsGuessPhase(false);
      setGameTimer(TIME);
      setIsGuesser(false);
      setSubmitDisable(false);
      setDisplayClueError(false);
      setClues([]);
      setGameReady(true);

      setRedirect(false); // init data needed for ending the game
      setRedirectPath("");
      setShowEndGameScreen(false);
      // determine guesser on first round
      const currentGuesser = gameState.players.filter(
        (player) => player.isGuesser === true
      );
      if (currentGuesser[0].id === currentUser) {
        setIsGuesser(true);
      }
    });

    /**
     * Send Clues
     */
    sockets.on("FE-send-clue", ({ gameState }) => {
      setGameState(gameState);
      // setClues((prevClues) => [...prevClues, player]);
      const cluesSubmitted = [];
      gameState.players.forEach((player) => {
        if (player.clue !== "" && player.isGuesser === false) {
          const playerWithClue = {
            id: player.id,
            msg: player.clue,
          };
          cluesSubmitted.push(playerWithClue);
        }
      });
      if (cluesSubmitted.length === 3) {
        setIsGuessPhase(true);
        setGameTimer(TIME);
        setSubmitDisable(true);
      }
    });

    /**
     * Display Typing Notification
     */
    sockets.on("FE-display-typing-notification", (gameState) => {
      setGameState(gameState);
    });

    /**
     * Send Answer / End of Round
     */
    sockets.on("FE-send-answer", ({ gameState }) => {
      setGameState(gameState);
      setGameTimer(TIME);
      // if (gameState.state.round === gameState.state.players.length - 1) {
      if (gameState.state.round === 2) {
        setShowEndGameScreen(true);
      } else {
        setShowNextRoundScreen(true);
      }
    });

    /**
     * Send Blank Answer If Time Runs Out
     */
    sockets.on("FE-time-over", ({ gameId, gameState }) => {
      const answer = ""; // time ran out and the guesser did not submit anything
      const cluesSubmitted = [];
      gameState.players.forEach((player) => {
        if (!player.isGuesser) {
          const playerWithClue = {
            id: player.id,
            msg: player.clue,
          };
          cluesSubmitted.push(playerWithClue);
        }
      });
      sockets.emit("BE-send-answer", { gameId, answer, cluesSubmitted });
    });

    /**
     * Move to Next Round
     */
    sockets.on("FE-move-round", (gameState) => {
      setGameState(gameState);
      setClues([]);
      setDisplayClueError(false);
      setIsGuessPhase(false);
      setIsGuesser(false);
      // determine guesser on subsequent rounds
      const currentGuesser = gameState.players.filter(
        (player) => player.isGuesser === true
      );
      if (currentGuesser[0].id === currentUser) {
        setIsGuesser(true);
      }
      console.log(`Round ${gameState.round}: `, gameState);
    });

    /**
     * Join New Game Host Creates
     */
    sockets.on("FE-join-new-game", async (newGameId) => {
      await joinGame(newGameId);
      redirectToNewGame(newGameId);
    });
  }, [joinGame]);

  // --------------------------------------------------------------- //
  // ------------- START: All Function Declarations ---------------- //
  // --------------------------------------------------------------- //

  const decrementTimer = useCallback(() => {
    setGameTimer((time) => time - 1);
  }, []);

  function sendClueToBE(gameId, player, clues) {
    setClues((prevClues) => [...prevClues, player]);
    sockets.emit("BE-send-clue", { gameId, player, clues });
  }

  const sendGuessToBE = useCallback((gameId, answer, clues) => {
    sockets.emit("BE-send-answer", { gameId, answer, clues });
  }, []);

  function displayTypingNotification(gameId, email) {
    sockets.emit("BE-display-typing-notification", {
      gameId,
      playerEmail: email,
    });
  }

  function toggleClueError(bool) {
    setDisplayClueError(bool);
  }

  const changeGamePhase = useCallback((bool) => {
    setIsGuessPhase(bool);
    setGameTimer(TIME);
    setSubmitDisable(true);
  }, []);

  const disableSubmitInputs = useCallback((bool) => {
    setSubmitDisable(bool);
  }, []);

  const closeNextRoundScreen = useCallback((gameId) => {
    sockets.emit("BE-move-round", {
      gameId,
      playerSocketId: sockets.id,
    });
    setShowNextRoundScreen(false);
  }, []);

  function endGame(gameId) {
    sockets.emit("BE-end-game", gameId);
  }

  function leaveGame(gameId) {
    setRedirect(true);
    setRedirectPath("/create-game");
    sockets.emit("BE-leave-game", { gameId });
  }

  function createNewGame(gameId, newGameId) {
    sockets.emit("BE-join-new-game", { gameId, newGameId });
    setRedirect(true);
    setRedirectPath(`/lobby/${newGameId}`);
    setShowEndGameScreen(false);
  }

  function redirectToNewGame(newGameId) {
    setRedirect(true);
    setRedirectPath(`/lobby/${newGameId}`);
    setShowEndGameScreen(false);
  }

  /**
   * @param {object} gameData = {gameId, players}
   */
  async function saveGameToDB(gameData) {
    try {
      await fetch(`/game/${gameData.gameId}/end`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(gameData),
      });
    } catch (error) {
      console.error(error);
    }
  }

  // --------------------------------------------------------------- //
  // -------------- END: All Function Declarations ----------------- //
  // --------------------------------------------------------------- //

  return (
    <GameplayContext.Provider
      value={{
        gameReady,
        gameState,
        isGuesser,
        clues,
        showNextRoundScreen,
        showEndGameScreen,
        submitDisable,
        redirect,
        redirectPath,
        isGuessPhase,
        gameTimer,
        displayClueError,
        closeNextRoundScreen,
        disableSubmitInputs,
        sendClueToBE,
        sendGuessToBE,
        displayTypingNotification,
        saveGameToDB,
        decrementTimer,
        changeGamePhase,
        endGame,
        leaveGame,
        createNewGame,
        toggleClueError,
      }}
    >
      {children}
    </GameplayContext.Provider>
  );
}

export { GameplayContext, GameplayContextProvider };
