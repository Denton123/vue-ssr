import Vue from 'vue'
import Router from 'vue-router'

Vue.use(Router)

export function createRouter () {
	return new Router({
		mode: 'history',
		fallback: false,
		routes: [
		    {
		      path: '/',
		      name: 'HelloWorld',
		      component: () => import('@/components/HelloWorld')
		    }
		 ]
	})
}
