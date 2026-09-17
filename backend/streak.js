// Returns today's date as YYYY-MM-DD (server local time)
function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

// Updates a user's study streak based on when they were last active.
// - Same day as last active: streak unchanged.
// - Exactly one day after last active: streak increases by 1.
// - Any bigger gap (or first time ever): streak resets to 1.
// Mutates the user document in place; caller is responsible for saving it.
function applyStreak(user) {
  const today = todayStr();
  if (user.lastActiveDate === today) {
    return user; // already counted today
  }
  if (user.lastActiveDate) {
    const last = new Date(user.lastActiveDate);
    const now = new Date(today);
    const diffDays = Math.round((now - last) / (1000 * 60 * 60 * 24));
    user.streak = diffDays === 1 ? user.streak + 1 : 1;
  } else {
    user.streak = 1;
  }
  user.lastActiveDate = today;
  return user;
}

module.exports = { todayStr, applyStreak };
