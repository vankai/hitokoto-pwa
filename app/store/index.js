import {createStore, applyMiddleware} from 'redux'
import thunkMiddleware from 'redux-thunk'
import {createLogger} from 'redux-logger'
const loggerMiddleware = createLogger();

import reducer from '../reducers'

let middlewares,
  store;

if (process.env.NODE_ENV === 'production') {
  middlewares = [thunkMiddleware]
} else {
  middlewares = [thunkMiddleware, loggerMiddleware]
  if (module.hot) {
    // Enable Webpack hot module replacement for reducers
    module.hot.accept('../reducers', () => {
      const nextRootReducer = require('../reducers').default
      store.replaceReducer(nextRootReducer)
    })
  }
}

const createStoreWithMiddleware = applyMiddleware(...middlewares)(createStore)
const configureStore = (initialState) => createStoreWithMiddleware(reducer, initialState)
store = configureStore();

export default store;

let fakeState = {
  user: {
    nickname: String,
    token: String
  },
  layout: {
    backgroundColor: String,
    fontWeight: Number
  },
  hitokotoDisplay: {
    hitokoto: Object,
    direction: String,
    processing: Boolean,
    lastCount: Number,
    nextCount: Number
  }
}