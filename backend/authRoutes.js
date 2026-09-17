const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("./user");
const auth = require("./authMiddleware");
const { applyStreak } = require("./streak");

const router = express.Router();

function signToken(userId) {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: "30d" });
}

function publicUser(user) {
  return {
    id: user._id, name: user.name, email: user.email, goal: user.goal,
    theme: user.theme, animations: user.animations,
    xpBonus: user.xpBonus, focusSessions: user.focusSessions, streak: user.streak
  };
}

router.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: "Email and password are required." });
    if (password.length < 6) return res.status(400).json({ message: "Password must be at least 6 characters." });
    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing) return res.status(409).json({ message: "An account with that email already exists." });
    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({ name: name?.trim() || "Student", email: email.toLowerCase().trim(), password: hashed });
    applyStreak(user);
    await user.save();
    const token = signToken(user._id);
    res.status(201).json({ token, user: publicUser(user) });
  } catch (err) { res.status(500).json({ message: "Registration failed.", error: err.message }); }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: "Email and password are required." });
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) return res.status(401).json({ message: "Invalid email or password." });
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ message: "Invalid email or password." });
    applyStreak(user);
    await user.save();
    const token = signToken(user._id);
    res.json({ token, user: publicUser(user) });
  } catch (err) { res.status(500).json({ message: "Login failed.", error: err.message }); }
});

router.get("/me", auth, async (req, res) => {
  const user = await User.findById(req.userId);
  if (!user) return res.status(404).json({ message: "User not found." });
  res.json({ user: publicUser(user) });
});

module.exports = router;
