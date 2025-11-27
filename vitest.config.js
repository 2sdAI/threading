import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
    test: {
        globals: true,
        environment: 'jsdom',
        setupFiles: ['./__tests__/setup.js'],
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html'],
            exclude: [
                'node_modules/',
                '__tests__/',
                '*.config.js',
                'sw.js',
                'test-results/',
                'playwright-report/'
            ]
        },
        include: [
            '__tests__/unit/**/*.test.js',
            '__tests__/integration/**/*.test.js'
        ],
        exclude: ['__tests__/e2e/**'],
        testTimeout: 10000
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './js'),
            '@modules': path.resolve(__dirname, './js/modules')
        }
    }
});
