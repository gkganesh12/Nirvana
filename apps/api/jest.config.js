module.exports = {
    moduleFileExtensions: ['js', 'json', 'ts'],
    rootDir: 'src',
    testRegex: '.*\\.spec\\.ts$',
    transform: {
        '^.+\\.(t|j)s$': ['ts-jest', {
            tsconfig: 'tsconfig.spec.json',
        }],
    },
    collectCoverageFrom: [
        '**/*.ts',
        '!**/*.module.ts',
        '!**/*.dto.ts',
        '!**/index.ts',
        '!main.ts',
    ],
    coverageThreshold: {
        global: {
            branches: 70,
            functions: 70,
            lines: 80,
            statements: 80,
        },
    },
    setupFilesAfterEnv: ['<rootDir>/test/setup.ts'],
    coverageDirectory: '../coverage',
    testEnvironment: 'node',
};
