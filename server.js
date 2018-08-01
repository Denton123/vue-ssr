const fs = require('fs')
const path = require('path')
const LRU = require('lru-cache')
const compression = require('compression')
const favicon = require('serve-favicon')
const microcache = require('route-cache')
const resolve = file => path.resolve(__dirname, file)

// createBundleRenderer这个API解决了在每次编辑过应用程序源代码之后，都必须停止并重启服务的问题
const { createBundleRenderer } = require('vue-server-renderer')

const server = require('express')()
const express = require('express')


const isProd = process.env.NODE_ENV === 'production'

// const createApp = require('path/to/built-server-bundle.js')

const useMicroCache = process.env.MICRO_CACHE !== 'false'

const serverInfo =
  `express/${require('express/package.json').version} ` +
  `vue-server-renderer/${require('vue-server-renderer/package.json').version}`

const app = express()

function createRenderer (bundle, options) {
	return createBundleRenderer(bundle, Object.assign(options, {
		// shouldPreload: (file, type) => {
		// 	// 基于文件扩展名的类型推断。
		// 	if (type === 'script' || type === 'style') {
		// 		return true
		// 	}
		// 	if (type === 'font') {
		// 		// 只预加载 woff2 字体
		// 		return /\.woff2$/.test(file)
		// 	}
		// 	if (type === 'image') {
		// 		// 只预加载重要 images
		// 		return file === 'hero.jpg'
		// 	}
		// } //控制加载哪些重要资源
		// inject: true // 控制使用template时是否执行自动注入，默认是true
		// 组件级别缓存
		// shouldPrefetch // 控制预提取哪些重要资源
		cache: LRU({
			max: 1000,
			maxAge: 1000 * 60 * 15
		}),
		basedir: resolve('./dist'), // 显示的声明server bundle运行目录
		runInNewContext: false // 每次渲染，bundle render将创建一个新的v8上下文并重新执行整个bundle;这种模式有一些相当大的性能开销，因为重建上下文并执行整个bundle还是相当昂贵的，所以使用值为false或once
	}))
}

let renderer
let readyPromise
const templatePath = resolve('./src/index.templatePath.html')

if (isProd) {
	const template = fs.readFile(templatePath, 'utf-8');
	const bundle = require('./dist/vue-ssr-server-bundle.json')
	const clientManifest = require('./dist/vue-ssr-client-manifest.json')
	// 读取和传输文件到Vue renderer
	renderer = createRenderer(bundle, {
		template,  // 页面模板
		clientManifest // 自动推断出最佳的预加载(preload)和预取(prefetch)指令，以及初始渲染所需的代码分割chunk
	})
} else {
	readyPromise = require('./build/setup-dev-server')(
		app,
		templatePath,
		(bundle, options) => {
			renderer = createRenderer(bundle, options)
		}
	)
}

const serve = (path, cache) => express.static(resolve(path), {
	maxAge: cache && isProd ? 1000 * 60 * 60 * 24 * 30 : 0
})

app.use(compression({threshold: 0}))
app.use('/dist', serve('./dist', true))
app.use('/public', serve('./public', true))
app.use(favicon('./src/assets/logo.png'))

app.use(microcache.cacheSeconds(1, req => useMicroCache && req.originalUrl))

function render(req, res) {
	const s = Date.now()

	res.setHeader('Content-Type', 'text/html')
	res.setHeader('Server', serverInfo)

	const handleError = err => {
		if (err.url) {
			res.redirect(err.url)
		} else if(err.code === 404) {
			res.status(404).send('404 | Page Not Found')
	    } else {
	      // Render Error Page or Redirect
	      res.status(500).send('500 | Internal Server Error')
	      console.error(`error during render : ${req.url}`)
	      console.error(err.stack)
	    }
	}

	// 渲染上下文对象注入到应用程序
	const context = {
		title: 'SSR IN VUE',
		url: req.url
	}

	renderer.renderToString(context, (err, html) => {
		if (err) {
			return handleError(err)
		} 
		res.send(html)
		if (!isProd) {
			console.log(`whole request: ${Date.now() - s}ms`);
		}
	})
}

server.get('*', (req, res) => {

	const context = {url: req.url}

	createApp(context).then(app => {

		// 这里无需传入一个应用程序，因为在执行 bundle 时已经自动创建过。
  		// 现在我们的服务器与应用程序已经解耦！
		renderer.renderToString(app, (err, html) => {
			if (err) {
				if (err.code === 404) {
					res.status(404).end('page not found')
				} else {
					res.status(500).end('Internal Server Error')
				}
			} else {
				res.end(html)
			}
		})
	})
})

app.get('*', isProd ? render : (req, res) => {
	readyPromise.then(() => render(req, res))
})

const port = process.env.PORT || 8082

app.listen(port, () => {
	console.log(`server started at localhost:${port}`);
})