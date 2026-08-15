/** @type {import('jest').Config} */
export default {
  moduleFileExtensions: ["js", "json", "ts"],
  rootDir: "src",
  testRegex: ".*\\.spec\\.ts$",
  extensionsToTreatAsEsm: [".ts"],
  // Jest ne comprend pas la résolution NodeNext (imports relatifs suffixés
  // en .js pointant vers des fichiers .ts) — on retire le suffixe avant que
  // son propre résolveur n'intervienne ; ts-jest gère ensuite la transpilation.
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1",
  },
  transform: {
    "^.+\\.ts$": ["ts-jest", { useESM: true }],
  },
  collectCoverageFrom: ["**/*.(t|j)s"],
  coverageDirectory: "../coverage",
  testEnvironment: "node",
};
