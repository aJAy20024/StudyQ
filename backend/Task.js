const mongoose = require("mongoose");

const TaskSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  name: { type: String, required: true, trim: true },
  subject: { type: String, default: "General" },
  xp: { type: Number, default: 50 },
  done: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model("Task", TaskSchema);
