const merge = require('webpack-merge')
const nodeExternals = require('webpack-node-externals')
const baseConfig = require('./webpack.base.config.js')
const VueSSRServerPlugin = require('vue-server-renderer/server-plugin')

module.exports = merge(baseConfig, {
	// 将entry指向应用程序的Server entry文件
	entry: './src/entry-server.js',

	// 这允许webpack以node使用方式（Node-appropriate fashion）处理动态导入（dynamic import），
	// 并且还会编译vue组件时，
	// 告知vue-loader输送面向服务器代码（server-oriented code）
	target: 'node',

	// 对bundle renderer 提供source map 支持
	devtool: 'source-map',

	// 此处告知server bundle使用node风格导出模块（Node）
	output: {
		libraryTarget: 'commonjs2'
	},

	// 外置化应用程序依赖模块，可以使服务器构建速度更快，
	// 并生成较小的bundle文件
	externals: nodeExternals({
		// 不要外置化webpack需要处理的依赖模块
		// 你可以在这里添加更多的文件类型。例如，未处理 *.vue 原始文件，
    	// 你还应该将修改 `global`（例如 polyfill）的依赖模块列入白名单
		whitelist: /\.css$/ //从依赖模块导入的css还应由webpack处理
	}),

	// 这是将服务器的整个输出
  	// 构建为单个 JSON 文件的插件。
  	// 默认文件名为 `vue-ssr-server-bundle.json`
	plugins: [
		new VueSSRServerPlugin()
	]
})