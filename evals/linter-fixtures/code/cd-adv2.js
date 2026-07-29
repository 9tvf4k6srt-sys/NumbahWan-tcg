// Configuration is delivered as JSON and validated by assertConfig below;
// unknown keys are rejected there, so this boundary stays untyped.
function loadConfig(raw) {
  const cfg = JSON.parse(raw);
  assertConfig(cfg);
  return cfg;
}
module.exports = { loadConfig };
