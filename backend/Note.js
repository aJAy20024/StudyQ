const mongoose = require("mongoose");

const NoteSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  title: { type: String, required: true, trim: true },
  category: { type: String, default: "General" },
  content: { type: String, default: "" }
}, { timestamps: true });

module.exports = mongoose.model("Note", NoteSchema);
