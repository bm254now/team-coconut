import React from "react";
import { Grid, makeStyles } from "@material-ui/core";
import PlayerPanel from "../components/game-session/PlayerPanel";
import CluePanel from "../components/game-session/CluePanel";
import GuessPanel from "../components/game-session/GuessPanel";
import Settings from "../components/Settings";

function GameSession() {
  const classes = useStyles();
  const isGuesser = true;
  return (
    <main className={classes.mainContainer}>
      <span className={classes.logo}>
        <strong className={classes.logoStrong}>Just</strong>One
      </span>
      <nav className={classes.settings}>
        <Settings />
      </nav>
      <Grid
        container
        direction="row"
        justify="space-between"
        alignItems="center"
      >
        <Grid item>{isGuesser ? <GuessPanel /> : <CluePanel />}</Grid>
        <Grid item lg>
          <PlayerPanel />
        </Grid>
      </Grid>
    </main>
  );
}

const useStyles = makeStyles((theme) => ({
  mainContainer: {
    position: "relative",
  },
  logo: {
    position: "absolute",
    top: "0",
    left: "0",
    margin: "1.5rem 0 0 3rem",
    fontSize: theme.logo.fontSize,
    fontWeight: theme.logo.fontWeight,
    color: theme.logo.color,
  },
  settings: {
    position: "absolute",
    top: "0",
    right: "0",
    margin: "1.5rem 3rem 0 0",
  },
  logoStrong: {
    color: theme.palette.text.secondary,
    fontWeight: theme.logo.fontWeight,
  },
}));

export default GameSession;