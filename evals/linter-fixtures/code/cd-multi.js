function sync(state) {
  // update the state
  state.synced = true;

  try {
    push(state);
  } catch (e) {
  }

  return state;
}

const bridge = window.bridge as any;
module.exports = { sync, bridge };
