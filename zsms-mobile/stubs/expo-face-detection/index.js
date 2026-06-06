const { View } = require('react-native')

/** Placeholder — replace with the real native expo-face-detection module for face ML. */
function FaceDetectionCameraView() {
  return null
}

async function extractEmbedding() {
  return { success: false, errorMessage: 'Face ML module not installed' }
}

async function checkLiveness() {
  return { faceDetected: false, isLive: false }
}

async function registerFace() {
  return { success: false, errorMessage: 'Face ML module not installed' }
}

function setMatchThreshold() {}

module.exports = {
  __isStub: true,
  FaceDetectionCameraView,
  extractEmbedding,
  checkLiveness,
  registerFace,
  setMatchThreshold,
}
