const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = (env, argv) => {
    const mode = argv.mode || 'development';

    const commonConfig = {
        mode: mode,
        devtool: mode === 'development' ? 'inline-source-map' : false,
        resolve: {
            modules: ['node_modules'],
            extensions: ['.ts', '.js']
        },
        module: {
            rules: [
                {
                    test: /\.ts$/,
                    exclude: path.resolve(__dirname, 'node_modules'),
                    use: 'ts-loader'
                }
            ]
        }
    };

    const mainConfig = {
        ...commonConfig,
        target: 'electron-main',
        entry: path.resolve(__dirname, 'src/main/main.ts'),
        output: {
            path: path.resolve(__dirname, 'dist'),
            filename: 'main.js',
        }
    };

    const rendererConfig = {
        ...commonConfig,
        target: 'electron-renderer',
        entry: path.resolve(__dirname, 'src/renderer/main.ts'),
        output: {
            path: path.resolve(__dirname, 'dist'),
            filename: 'renderer.js',
        },
        plugins: [
            new CopyPlugin({
                patterns: [
                    {from: 'src/renderer/index.html', to: path.resolve(__dirname, 'dist')},
                    {from: 'src/renderer/index.css', to: path.resolve(__dirname, 'dist')},
                    {from: 'src/renderer/out01.png', to: path.resolve(__dirname, 'dist')},
                    {from: 'src/renderer/out02.png', to: path.resolve(__dirname, 'dist')},
                    {from: 'src/renderer/out03.png', to: path.resolve(__dirname, 'dist')},
                    {from: 'src/renderer/waiting.png', to: path.resolve(__dirname, 'dist')},
                    {from: 'src/accessories', to: path.resolve(__dirname, 'dist/accessories')}
                ]
            })
        ]
    };

    return [mainConfig, rendererConfig];
};
