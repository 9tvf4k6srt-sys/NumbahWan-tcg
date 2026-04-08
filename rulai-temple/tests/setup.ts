import '@testing-library/jest-dom'

// Mock HTMLMediaElement.play() — jsdom doesn't implement it
Object.defineProperty(HTMLMediaElement.prototype, 'play', {
  configurable: true,
  value: function() { return Promise.resolve(); }
});
