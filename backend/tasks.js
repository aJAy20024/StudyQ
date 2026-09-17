const express = require("express");
const Task = require("./Task");
const auth = require("../middleware/auth");

const router = express.Router();
router.use(auth); // every route below requires login

// GET /api/tasks - list all tasks for the logged-in user
router.get("/", async (req, res) => {
  const tasks = await Task.find({ user: req.userId }).sort({ createdAt: 1 });
  res.json({ tasks });
});

// POST /api/tasks - create a new task
router.post("/", async (req, res) => {
  const { name, subject, xp } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ message: "Task name is required." });
  }
  const task = await Task.create({
    user: req.userId,
    name: name.trim(),
    subject: subject?.trim() || "General",
    xp: Number(xp) || 50,
    done: false
  });
  res.status(201).json({ task });
});

// PATCH /api/tasks/:id - toggle done, or edit fields
router.patch("/:id", async (req, res) => {
  const task = await Task.findOne({ _id: req.params.id, user: req.userId });
  if (!task) return res.status(404).json({ message: "Task not found." });

  if (typeof req.body.done === "boolean") task.done = req.body.done;
  if (typeof req.body.name === "string") task.name = req.body.name.trim();
  if (typeof req.body.subject === "string") task.subject = req.body.subject.trim();
  if (typeof req.body.xp === "number") task.xp = req.body.xp;

  await task.save();
  res.json({ task });
});

// DELETE /api/tasks/:id
router.delete("/:id", async (req, res) => {
  const task = await Task.findOneAndDelete({ _id: req.params.id, user: req.userId });
  if (!task) return res.status(404).json({ message: "Task not found." });
  res.json({ message: "Task deleted." });
});

module.exports = router;
