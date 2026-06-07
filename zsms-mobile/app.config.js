/** @type {import('expo/config').ExpoConfig} */
module.exports = () => {
  const { expo } = require('./app.json')
  const projectId = process.env.EAS_PROJECT_ID || expo.extra?.eas?.projectId

  return {
    ...expo,
    extra: {
      ...(expo.extra || {}),
      eas: {
        ...(expo.extra?.eas || {}),
        ...(projectId ? { projectId } : {}),
      },
    },
  }
}
