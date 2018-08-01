import { createApp } from './main.js'

const isDev = process.env.NODE_ENV !== 'production'

// 因为有可能会是异步路由钩子函数或组件，所以我们将返回一个 Promise，
// 以便服务器能够等待所有的内容在渲染前，
// 就已经准备就绪。
export default context => {
  return new Promise((resolve, reject) => {

    const s = isDev && Date.now()
    const { app, router, store } = createApp()

    const { url } = context
    const { fullPath } = router.resolve(url).route

    if (fullPath !== url) {
      return reject({ url: fullPath })
    }

    // 设置服务器端的router的位置
    router.push(url)

    // 等到 router 将可能的异步组件和钩子函数解析完
    router.onReady(() => {

      const matchedComponents = router.getMatchedComponents()

      // 匹配不到路由,执行reject函数,并返回404
      if (!matchedComponents.length) {
        return reject({ code: 404 })
      }

      // 对所有匹配的路由组件调用fetchData钩子
      // 当处理完了一个preFetch 钩子触发store的action和返回一个Promise时也就意味着action已经完成且store state已经更新
      // Promise.all(matchedComponents.map(Component => {
      //   if(Component.asyncData) {
      //     return Component.asyncData({
      //       store,
      //       route: router.currentRoute
      //     })
      //   }
      // }))
      // 上面代码简化为：
      Promise.all(matchedComponents.map(({ asyncData }) => asyncData && asyncData({
        store,
        route: router.currentRoute
      }))).then(() => {
        isDev && console.log(`data pre-fetch: ${Date.now() - s}ms`)

        // 在所有预取钩子(preFetch hook) resolve 后，
        // 我们的 store 现在已经填充入渲染应用程序所需的状态。
        // 当我们将状态附加到上下文，
        // 并且 `template` 选项用于 renderer 时，
        // 状态将自动序列化为 `window.__INITIAL_STATE__`，并注入 HTML。
        
        // context.state = store.state
        
        // Promise应该resolve应用程序,以便可以渲染
        resolve(app)
      }).catch(reject)
    }, reject)
  })
}

// import {createApp} from './main.js'

// export default context => {
//   const {app} = createApp()
//   return app
// }