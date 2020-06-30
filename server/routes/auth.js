const express = require("express");
const router = express.Router();

const AuthService = require("../services/auth");
const authService = new AuthService();

// @route POST auth/signup
// @desc User registration
// @param name
// @param email
// @param password

router.post("/signup", async function (req, res, next) {
  try {
    const { newUser, token, cookieConfig } = await authService.signUpUser(req.body);
    return res.status(201).cookie("token", token, cookieConfig).json(newUser);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
