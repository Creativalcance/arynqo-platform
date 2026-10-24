/** @param {import('expo/config').ConfigContext} context */
module.exports = ({ config }) => {
  if (process.env.APP_VARIANT !== 'internal-test') return config;

  return {
    ...config,
    name: 'ARYNQO Testes',
    scheme: 'arynqo-test',
    android: {
      ...config.android,
      package: 'com.creativalcance.arynqo.preview',
    },
  };
};
