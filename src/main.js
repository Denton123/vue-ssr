// The Vue build version to load with the `import` command
// (runtime-only or standalone) has been set in webpack.base.conf with an alias.
import Vue from 'vue'
import App from './App'
import {createRouter} from './router'
// import {sync} from 'vuex-router-sync'
Vue.config.productionTip = false

// 导出一个工厂函数，用于创建新的应用程序、router和store实例
export function createApp () {

	// 创建router实例
	const router = createRouter()

	// sync(router)
	
	const app = new Vue({
		// 注入router到根实例
		router,
		// 根实例简单的渲染应用程序组件
		render: h => h(App)
	})

	return {router, app}
}
