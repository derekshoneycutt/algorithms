const path = require('path');
const webpack = require('webpack');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const pagesModule = require('./web/pages.js');
const ALGORITHMS_PAGES =
    pagesModule.ALGORITHMS_PAGES
    || (pagesModule.default && pagesModule.default.ALGORITHMS_PAGES)
    || pagesModule.default
    || pagesModule;

const allPages = [
    {
        title: ALGORITHMS_PAGES.title,
        page: ALGORITHMS_PAGES.page,
        template: ALGORITHMS_PAGES.template
    },
    ...ALGORITHMS_PAGES.writings
];

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

        ...allPages.map(page => new HtmlWebpackPlugin({
            title: `Derek's Algorithms Project: ${page.title}`,
            template: page.template,
            filename: page.page,
            inject: true
        }))
    ],

    mode: build_mode
};
