const express = require("express");
const router = express.Router();

const { signup, signin } = require("../validators/auth");
const AuthService = require("../services/auth");
const authService = new AuthService();

// @route POST auth/signup
// @desc User registration
// @param name
// @param email
// @param password

router.post("/signup", signup, async function (req, res, next) {
  try {
    const { newUser, token, cookieConfig } = await authService.signUpUser(
      req.body
    );
    return res.status(201).cookie("token", token, cookieConfig).json(newUser);
  } catch (error) {
    next(error);
  }
});

router.post("/signin", signin, async function (req, res, next) {
  try {
    const { user, token, cookieConfig } = await authService.signInUser(
      req.body
    );
    return res.cookie("token", token, cookieConfig).json(user);
  } catch (error) {
      console.log(error)
    next(error);
  }
});

module.exports = router;
