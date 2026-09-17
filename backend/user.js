const express = require("express");
const User = require("./User");
const Task = require("./Task");
const auth = require("./authMiddleware");
const { applyStreak } = require("./streak");

const router = express.Router();
router.use(auth);

function levelInfo(xp) {
  const level = Math.floor(xp / 100) + 1;
  const title = level >= 10 ? "Quest Master" : level >= 5 ? "Focused Scholar" : "Student Explorer";
  return { xp, level, within: xp % 100, title };
}

router.patch("/profile", async (req, res) => {
  const user = await User.findById(req.userId);
  if (!user) return res.status(404).json({ message: "User not found." });
  const { name, goal, theme, animations } = req.body;
  if (typeof name === "string" && name.trim()) user.name = name.trim();
  if (typeof goal === "string") user.goal = goal.trim();
  if (theme === "light" || theme === "dark") user.theme = theme;
  if (typeof animations === "boolean") user.animations = animations;
  await user.save();
  res.json({ user: { id: user._id, name: user.name, email: user.email, goal: user.goal, theme: user.theme, animations: user.animations } });
});

router.post("/focus-complete", async (req, res) => {
  const user = await User.findById(req.userId);
  if (!user) return res.status(404).json({ message: "User not found." });
  user.focusSessions += 1;
  user.xpBonus += 25;
  applyStreak(user);
  await user.save();
  res.json({ focusSessions: user.focusSessions, xpBonus: user.xpBonus, streak: user.streak });
});

router.get("/dashboard", async (req, res) => {
  const user = await User.findById(req.userId);
  if (!user) return res.status(404).json({ message: "User not found." });
  const tasks = await Task.find({ user: req.userId }).sort({ createdAt: 1 });
  const doneTasks = tasks.filter(t => t.done);
  const taskXp = doneTasks.reduce((sum, t) => sum + Number(t.xp || 50), 0);
  const totalXp = taskXp + Number(user.xpBonus || 0);
  const level = levelInfo(totalXp);
  const achievements = [
    { icon: "🎯", title: "First Steps", desc: "Complete your first task", unlocked: doneTasks.length >= 1, reward: "+50 XP" },
    { icon: "🔥", title: "On Fire", desc: "Maintain a 7-day study streak", unlocked: user.streak >= 7, reward: "+100 XP" },
    { icon: "🏆", title: "Task Master", desc: "Complete 10 tasks", unlocked: doneTasks.length >= 10, reward: "+200 XP" },
    { icon: "⏱️", title: "Focus Mode", desc: "Complete 5 focus sessions", unlocked: user.focusSessions >= 5, reward: "+150 XP" },
    { icon: "👑", title: "Level Up", desc: "Reach level 5", unlocked: level.level >= 5, reward: "+300 XP" }
  ];
  res.json({
    tasks, totalTasks: tasks.length, completedTasks: doneTasks.length,
    focusSessions: user.focusSessions, streak: user.streak, xp: totalXp, level, achievements,
    profile: { name: user.name, goal: user.goal
