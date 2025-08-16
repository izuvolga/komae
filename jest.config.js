/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testMatch: [
    '**/__tests__/**/*.{ts,tsx}',
    '**/*.(test|spec).{ts,tsx}'
  ],
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest',
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  moduleNameMapper: {
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '^electron$': '<rootDir>/tests/mocks/electron.ts',
    // 共有テストリソース用エイリアス
    '^@test-fixtures/(.*)$': '<rootDir>/tests/fixtures/$1',
    '^@test-mocks/(.*)$': '<rootDir>/tests/mocks/$1',
    '^@test-utils/(.*)$': '<rootDir>/tests/utils/$1',
  },
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/main/**/*', // Electron main process code
  ],
  testTimeout: 10000,
};