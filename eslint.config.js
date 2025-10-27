import js from '@eslint/js';

export default [
    js.configs.recommended,
    {
        languageOptions: {
            ecmaVersion: 'latest',
            sourceType: 'module',
            globals: {
                console: 'readonly',
                process: 'readonly',
                Buffer: 'readonly',
                __dirname: 'readonly',
                __filename: 'readonly',
                setTimeout: 'readonly',
                clearTimeout: 'readonly',
                setInterval: 'readonly',
                clearInterval: 'readonly',
                setImmediate: 'readonly',
                clearImmediate: 'readonly',
                performance: 'readonly',
                URL: 'readonly',
                fetch: 'readonly',
                WebAssembly: 'readonly',
                XMLHttpRequest: 'readonly',
                TextDecoder: 'readonly',
                DOMException: 'readonly',
                module: 'readonly'
            }
        },
        rules: {
            'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
            'no-console': 'off',
            semi: ['error', 'always'],
            quotes: ['error', 'single', { avoidEscape: true }],
            indent: ['error', 4, { SwitchCase: 1 }],
            'linebreak-style': ['error', 'unix'],
            'no-trailing-spaces': 'error',
            'eol-last': ['error', 'always'],
            'comma-dangle': ['error', 'never'],
            'object-curly-spacing': ['error', 'always'],
            'array-bracket-spacing': ['error', 'never'],
            'arrow-parens': ['error', 'as-needed'],
            'prefer-const': 'error',
            'no-var': 'error'
        }
    },
    {
        ignores: [
            'node_modules/**',
            'build/**',
            'coverage/**',
            '*.wasm',
            '*.min.js',
            'tmp/**',
            'sdl/**',
            'src/wasm/audio-graph.js',
            'src/wasm/*.js',
            'dist/**',
            'examples/**',
            'test-*.js',
            'test/**',
            '!test/api-suite.js',
            'AudioBuffer.js',
            'AudioBufferSourceNode.js',
            'AudioContext.js',
            'AudioParam.js',
            'BiquadFilterNode.js',
            'AudioNode.js',
            'AudioDestinationNode.js',
            'GainNode.js',
            'OscillatorNode.js',
            'PannerNode.js',
            'index.js',
            'index-wasm.js',
            'scripts/**'
        ]
    }
];
