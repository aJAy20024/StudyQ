const express = require("express");
const Note = require("./Note");
const auth = require("./authMiddleware");

const router = express.Router();
router.use(auth);

router.get("/", async (req, res) => {
  const notes = await Note.find({ user: req.userId }).sort({ createdAt: -1 });
  res.json({ notes });
});

router.post("/", async (req, res) => {
  const { title, category, content } = req.body;
  if (!title || !title.trim()) return res.status(400).json({ message: "Note title is required." });
  const note = await Note.create({ user: req.userId, title: title.trim(), category: category?.trim() || "General", content: content?.trim() || "" });
  res.status(201).json({ note });
});

router.delete("/:id", async (req, res) => {
  const note = await Note.findOneAndDelete({ _id: req.params.id, user: req.userId });
  if (!note) return res.status(404).json({ message: "Note not found." });
  res.json({ message: "Note deleted." });
});

module.exports = router;
