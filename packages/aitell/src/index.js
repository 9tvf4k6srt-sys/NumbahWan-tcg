// aitell — detect the fingerprints of machine-generated web content.
//
// Three independent layers, each a pure function of a string:
//   • lintText        — regex blocklist of AI-tell phrases (multilingual corpus)
//   • lintLayout      — six visual detectors for machine-assembled UI (L1–L6)
//   • analyzeStylometry — LLM-free machine-rhythm score (0–100) of prose shape
//
// Plus the colour-emoji detector that underpins the loudest visual tell.

const text = require('./text-detect');
const layout = require('./layout-detect');
const stylometry = require('./stylometry');
const defaultCorpus = require('./default-corpus.json');

module.exports = {
  // text layer
  lintText: text.lintText,
  flattenCorpus: text.flattenCorpus,
  defaultCorpus,

  // colour-emoji primitives
  hasColourEmoji: text.hasColourEmoji,
  colourEmojis: text.colourEmojis,
  colourEmojiRegex: text.colourEmojiRegex,
  COLOUR_EMOJI_SOURCE: text.COLOUR_EMOJI_SOURCE,

  // prose helpers
  stripMarkupAndCode: text.stripMarkupAndCode,
  isCJK: text.isCJK,

  // layout layer
  lintLayout: layout.lintLayout,
  checkEmojiIcon: layout.checkEmojiIcon,
  checkGenericGradient: layout.checkGenericGradient,
  checkDefaultShadow: layout.checkDefaultShadow,
  checkOpacityOnlyMotion: layout.checkOpacityOnlyMotion,
  checkCookieCutter: layout.checkCookieCutter,
  checkDeadCenter: layout.checkDeadCenter,

  // stylometry layer
  analyzeStylometry: stylometry.analyzeStylometry,
  band: stylometry.band,
  CONNECTIVES: stylometry.CONNECTIVES,
  HEDGES: stylometry.HEDGES,
};
