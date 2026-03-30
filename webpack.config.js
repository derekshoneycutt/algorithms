const path = require('path');
const webpack = require('webpack');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');

const build_mode = 'production';


module.exports = {
    entry: './web/algorithms.jsx',

    output: {
        path: path.resolve(__dirname, 'build/dist'),
        publicPath: '',
        filename: 'bundle.js'
    },

    module: {
        rules: [
            {
                test: /\.jsx?/,
                exclude: /(node_modules)/,
                use: {
                    loader: 'babel-loader',
                    options: {
                        presets: ['@babel/preset-react'],
                    }
                }
            },
            {
                test: /\.(sa|sc|c)ss$/,
                use: [
                    {
                        loader: MiniCssExtractPlugin.loader
                    },
                    {
                        loader: 'css-loader'
                    },
                    {
                        loader: 'postcss-loader'
                    },
                    {
                        loader: 'sass-loader',
                        options: {
                            implementation: require('sass'),
                            webpackImporter: false,
                            sassOptions: {
                                includePaths: [
                                    path.resolve(__dirname, 'node_modules'),
                                    'node_modules'
                                ],
                                loadPaths: ['node_modules']
                            }
                        }
                    }
                ]
            },
            {
                test: /\.(png|svg)$/,
                type: 'asset/resource',
                generator: {
                    filename: 'icons/[name].[ext]'
                }
            },
            {
                test: /\.md$/,
                use: [
                    {
                        loader: 'html-loader'
                    },
                    {
                        loader: path.resolve(__dirname, 'github-markdown-loader.mjs')
                    }
                ]
            }
        ]
    },

    plugins: [
        new MiniCssExtractPlugin({
            filename: 'bundle.css'
        }),

        new HtmlWebpackPlugin({
            template: `README.md`,
            filename: `index.html`,
            inject: true
        }),
        new HtmlWebpackPlugin({
            template: `System-setup.md`,
            filename: `System-setup.html`,
            inject: true
        }),
        new HtmlWebpackPlugin({
            template: `gentoo-setup.md`,
            filename: `Gentoo-setup.html`,
            inject: true
        }),
        new HtmlWebpackPlugin({
            template: `src/random/hello_world/README.md`,
            filename: `random_helloworld.html`,
            inject: true
        })
    ],

    mode: build_mode
};
