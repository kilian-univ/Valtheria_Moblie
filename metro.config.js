// Configuration Metro d'Expo, complétée par Sentry : chaque bundle reçoit un
// identifiant de debug, pour que les traces des plantages soient lisibles
// (source maps envoyées à la construction, voir README « Suivi des plantages »).
const { getSentryExpoConfig } = require('@sentry/react-native/metro');

module.exports = getSentryExpoConfig(__dirname);
