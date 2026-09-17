const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, default: "Student" },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true }, // hashed, never store plain text
  goal: { type: String, default: "Become a better student" },
  theme: { type: String, enum: ["dark", "light"], default: "dark" },
  animations: { type: Boolean, default: true },

  // Gamification fields
  xpBonus: { type: Number, default: 0 }, // bonus XP from focus sessions etc.
  focusSessions: { type: Number, default: 0 },
  streak: { type: Number, default: 1 },
  lastActiveDate: { type: String, default: null } // stored as YYYY-MM-DD
}, { timestamps: true });

module.exports = mongoose.model("User", UserSchema);
