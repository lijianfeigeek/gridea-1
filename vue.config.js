const path = require('path')
const webpack = require('webpack')
const TerserPlugin = require('terser-webpack-plugin')

function resolve(dir) {
  return path.join(__dirname, dir)
}

module.exports = {
  chainWebpack: (config) => {
    config.resolve.alias.set('stream', 'stream-browserify')
    config.resolve.alias.set('buffer', 'buffer/')
    config.resolve.alias.set('crypto', 'crypto-browserify')
    config.resolve.alias.set('process', 'process/browser')

    config.plugin('provide').use(webpack.ProvidePlugin, [{
      process: 'process/browser',
      Buffer: ['buffer', 'Buffer'],
    }])

    // 禁用TypeScript类型检查以解决Node.js 23.x兼容性问题
    config.plugins.delete('fork-ts-checker')

    // Suppress webpack warnings
    config.performance.hints(false)
  },
  configureWebpack: {
    optimization: {
      minimizer: [
        new TerserPlugin({
          terserOptions: {
            compress: {
              drop_console: false,
              ecma: 5,
              warnings: false,
              comparisons: false,
              inline: 2,
            },
            output: {
              ecma: 5,
              comments: false,
            },
          },
          parallel: false, // 禁用并行处理以避免Node.js 23.x的问题
          extractComments: false,
        }),
      ],
    },
    node: {
      buffer: false,
      stream: false,
      crypto: false,
      process: false,
    },
    // Suppress warnings about problematic modules
    stats: {
      warningsFilter: [
        /require.extensions is not supported by webpack/,
        /Critical dependency: the request of a dependency is an expression/,
        /export .* was not found in/,
      ],
    },
  },
  css: {
    loaderOptions: {
      less: {
        import: [
          resolve('src/assets/styles/var.less'),
        ],
        modifyVars: {
          'btn-height-base': '30px',
          'input-height-base': '30px',
        },
        javascriptEnabled: true,
      },
    },
  },
  pluginOptions: {
    electronBuilder: {
      nodeIntegration: true,
      builderOptions: {
        productName: 'Gridea',
        win: {
          icon: './public/app-icons/gridea.ico',
          // target: [
          //   {
          //     target: 'nsis',
          //     arch: [
          //       'ia32',
          //       'x64',
          //     ],
          //   },
          // ],
        },
        mac: {
          icon: './public/app-icons/gridea.icns',
          identity: null, // 禁用代码签名
        },
        linux: {
          icon: './public/app-icons/gridea.png',
          target: [
            {
              target: 'AppImage',
            },
            {
              target: 'deb',
            },
            {
              target: 'snap',
            },
          ],
        },
        asar: false,
        nsis: {
          oneClick: false, // 是否一键安装
          allowElevation: true, // 允许请求提升。 如果为false，则用户必须使用提升的权限重新启动安装程序。
          allowToChangeInstallationDirectory: true, // 允许修改安装目录
          createDesktopShortcut: true, // 创建桌面图标
          createStartMenuShortcut: true, // 创建开始菜单图标
          shortcutName: 'Gridea', // 图标名称
        },
        publish: ['github'],
      },
      // mainProcessWatch: [
      //   'src/server/**/*',
      // ],
    },
  },
}
