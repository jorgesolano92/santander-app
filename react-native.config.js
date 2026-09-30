/**
 * Fuerza el package Android para autolinking / GenerateEntryPoint.
 * Sin esto, el CLI puede cachear un packageName antiguo (com.cess07.puertassantander).
 */
module.exports = {
  project: {
    android: {
      packageName: 'com.puertas.santander',
      sourceDir: './android',
    },
  },
};
