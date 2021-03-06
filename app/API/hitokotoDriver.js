import 'whatwg-fetch';
import PatternManager, {SOURCE_UPDATE_KEYS} from './PatternManager'
import httpManager from './httpManager'
import showNotification from './showNotification'

import {PERSE_ADAPTER_SAFE, AdapterValidate, PERSE_ADAPTER, ADAPTER_ORGIN} from './AdapterValidate'
import offlineWatcher from './Offline'
import indexedDBManager from './IndexedDBManager'
const HITOKOTO_KEYS = [
  'id',
  'hitokoto',
  'creator',
  'type',
  'source',
  'created_at'
];

let PREFETCH = [],
  ROLLBACK = [];
class HitokotoDriver {
  constructor() {
    console.debug('driver initiating')
    this.patterManager = new PatternManager();
    this.httpManager = httpManager;
    this.state = {}; //  状态 用于保存模式的进度信息
    this.adaptersMap = null; //  adapters map
    this.pattern = null;
    this.sources = null;

    this.nextHitokotoHandler = Function.prototype; // 获取到hitokoto后注入返回的hitokoto
    this.lastHitokotoHandler = Function.prototype; // 获取到hitokoto后注入返回的hitokoto
    this.UIResolver = Function.prototype; // 外部注入的展示不同状态下的处理函数；

    this.lastTime = null;
    this.patternValid = false;
    this.processing = false; // 是否请求中的flag标志
    this.timerDisabled = true; //用于页面失去焦点后停用计时器;
    this.signal = []; //  用于存储标志已经有请求hitokoto的操作了，信号量

    this.errSignal = 0;

    this.drive(this.patterManager.getDefaultPattern()); //  默认模式
    this.hertbeat = this.reborn(); //  用于保存hitokotoDriver内部计时器的;
    console.log('hitokoto inited');
    this.windowBlur = false;
    window.addEventListener('blur', () => {
      this.stop().windowBlur = true;
    });
    window.addEventListener('focus', () => {
      if (this.windowBlur) {
        this.start().windowBlur = false;
      } else {
        return;
      }
    });
  }

  drive(pattern) {
    if (!pattern) {
      this.patternValid = false;
    } else {
      this.pattern = pattern;
      this.sources = pattern.sources;
      this.registAdapter(this.sources);
      this.patternValid = this.sources.some(source => source.online || source.local)
    }

    this.timmerDisabled = true
    PREFETCH.length = 0;
    this.lastTime = Date.now();
    this.updateProcessing(false);
    this.signal.length = 0;
    return this;
  }
  start() {
    console.debug('driver start')
    this.patternValid = this.sources.some(source => source.online || source.local);
    if (this.patternValid && this.nextHitokotoHandler !== Function.prototype) {
      this.timerDisabled = false;
    }
    this.lastTime = Date.now();
    return this;
  }
  stop() {
    console.debug('driver stop')
    this.timerDisabled = true;
    return this;
  }

  getRandomSource() {
    return this.sources[Math.floor(Math.random() * this.sources.length)]
  }
  reborn() {
    this.rebornDetail();
    return setInterval(this.rebornDetail.bind(this), 1000)
  }
  rebornDetail() {
    if (this.timerDisabled) {
      return;
    }
    if (PREFETCH.length < 5) {
      //  没有预缓存的数据
      if (this.signal.length == 0) {
        //  信号量为零，需要去获取hitokoto
        let allowedURL = this.sources.filter(source => source.online);
        if (offlineWatcher.online && allowedURL.length !== 0) {
          //  在线采用在线的方式；
          let {type, id} = this.pattern;
          allowedURL.forEach((source, index) => {
            let pid = '' + Date.now() + index;
            this.signal.push(pid)
            this.getHitokotoFromWEB(source.url, {type, source}).then(hitokoto => {
              //  increase count
              if (type == 'next') {
                this.increaseSourceCount(id, source.id);
              }

              //添加url以便收藏使用
              if (!hitokoto.url) {
                hitokoto.url = source.url;
              }

              let index = this.signal.findIndex(item => item === pid);
              if (~ index) {
                this.signal.splice(index, 1)
                PREFETCH.push(hitokoto);
                if (this.processing) {
                  this.updateProcessing(false);
                  this.next();
                }
              }
            }).catch(e => {
              let index = this.signal.findIndex(item => item === pid);
              if (~ index) {
                this.signal.splice(index, 1)
                // return Promise.reject(reason);
              }

              //只在processing的状态下才增加错误信号量。
              if (this.processing) {
                this.errSignal += 1; //增加错误信号量。

                if (this.errSignal > 10) {
                  this.updateProcessing(false);
                  this.timerDisabled = true;
                  showNotification('从网络获取hitokoto出错次数已经超过10次！已暂停播放器!', 'error', true)
                }
              } else {
                this.errSignal > 0
                  ? this.errSignal -= 1
                  : void 0;
              }

              //  失败了 使用离线缓存
              return this.getHitokotoFromIDB(source.url, {type, source});
            })
          })
        } else {
          //  采用离线的方式
          allowedURL = this.sources.filter(source => source.local);
          let {type, id} = this.pattern;
          allowedURL.forEach((source, index) => {
            let pid = '' + Date.now() + index;
            this.signal.push(pid)
            this.getHitokotoFromIDB(source.url, {type, source}).then((hitokoto) => {
              //  increase count
              if (type == 'next') {
                this.increaseSourceCount(id, source.id);
              }

              //添加url以便收藏使用
              if (!hitokoto.url) {
                hitokoto.url = source.url;
              }

              let index = this.signal.findIndex(item => item === pid);
              if (~ index) {
                this.signal.splice(index, 1)
                PREFETCH.push(hitokoto);
                if (this.processing) {
                  this.updateProcessing(false);
                  this.next();
                }
              }
            }).catch(e => {
              let index = this.signal.findIndex(item => item === pid);
              if (~ index) {
                this.signal.splice(index, 1)
                // return Promise.reject(reason);
              }
              console.log(e);
            })
          })
        }
      }
    }
    //  以上保证的能够去获取hitokoto
    let timeGap,
      now = Date.now();
    if ((timeGap = this.pattern.interval) !== 0 && (now - this.lastTime > timeGap * 1000)) {
      this.next();
    }
    if (ROLLBACK.length > 5) {
      ROLLBACK.length = 5;
    }
  }
  next() {
    if (PREFETCH.length == 0) {
      this.updateProcessing(true);
    } else {
      ROLLBACK.unshift(PREFETCH.shift())
      this.nextHitokotoHandler(ROLLBACK.slice(0, 1)[0], this.getCount())
    }
    if (this.errSignal > 20 && this.timerDisabled) {
      this.timerDisabled = false;
      this.errSignal = 0;
    }
    this.lastTime = Date.now()
  }
  last() {
    if (ROLLBACK.length > 1) {
      PREFETCH.unshift(ROLLBACK.shift())
    }
    this.lastHitokotoHandler(ROLLBACK.slice(0, 1)[0], this.getCount())
    this.updateProcessing(false);
    this.lastTime = Date.now()
  }
  initRollback(hitokoto) {
    ROLLBACK.unshift(hitokoto);
    return this;
  }
  getCount() {
    return {lastCount: ROLLBACK.length, nextCount: PREFETCH.length}
  }
  registAdapter(sources) {
    this.adaptersMap = {};
    sources.forEach((source) => {
      this.adaptersMap[source.url] = PERSE_ADAPTER_SAFE(source.adapter)
    });
    return this;
  }

  registUIProcessingHandler(handler) {
    this.UIResolver = handler;
    return this;
  }
  registNextHitokotoHandler(handler) {
    this.nextHitokotoHandler = handler;
    return this;
  }
  registLastHitokotoHandler(handler) {
    this.lastHitokotoHandler = handler;
    return this;
  }
  updateProcessing(state) {
    this.processing = state;
    this.UIResolver(this.processing);
  }
  getAdapter(url) {
    return this.adaptersMap[url] || ADAPTER_ORGIN;
  }
  testSourceAdapter(url, adapterString) {
    let adapter;
    try {
      adapter = PERSE_ADAPTER(adapterString);

    } catch (e) {

      return Promise.reject(e);
    }
    return this.httpManager.getHitokoto(url).then(adapter).then((hitokoto) => {
      console.debug('[test.adapter.result]', hitokoto);
      if (!hitokoto) {
        return Promise.reject(hitokoto);
      } else {
        let missed = [];
        HITOKOTO_KEYS.forEach((key) => {
          if (!hitokoto[key]) {
            missed.push(key);
          }
        });
        if (missed.length > 0) {
          return Promise.reject('返回的对象中缺少成员：' + JSON.stringify(missed));
        } else {
          return Promise.resolve(hitokoto);
        }
      }
    })
  }

  getHitokotoFromIDB(url, options) {

    return indexedDBManager.getHitokoto(url, options).catch(e => {
      return Promise.reject(e);
    })
  }
  /**
   *
   *
   * @param {String} url
   * @param {Object} {type:String, source}
   * @returns
   * @memberof HitokotoDriver
   */
  getHitokotoFromWEB(url, {type, source}) {

    let p = this.httpManager.getHitokoto(url, type, source).then(this.getAdapter(url));
    //  并行存储hitokoto
    p.then(hitokoto => {
      try {
        indexedDBManager.putHitokoto(url, hitokoto)
      } catch (e) {}
      return hitokoto
    }).catch(e => {

      return Promise.reject(e);
    });
    return p;
  }

  updateSource(id, sourceToUpdate) {
    this.patterManager.updateSource(id, sourceToUpdate);
    this.pattern.sources.forEach((oldSource) => {
      if (oldSource.id == id) {
        SOURCE_UPDATE_KEYS.forEach((k) => {
          oldSource[k] = sourceToUpdate[k];
        })
      }
    });
    this.drive(this.pattern).start();
  }
  increaseSourceCount(pid, sid) {
    this.patterManager.increaseSourceCount(pid, sid);
  }
  updatePattern(id, patternToUpdate) {
    this.patterManager.updatePattern(id, patternToUpdate);
    if (this.pattern.id == id) {
      let pattern = this.patterManager.getPatternById(id);
      this.drive(pattern).start();
    }
  }
  restorePatterns(patterns) {
    if (patterns && patterns.length && patterns.length > 0) {
      this.patterManager.restorePatterns(patterns);
      this.drive(this.patterManager.getDefaultPattern());
    }
  }
}

export default new HitokotoDriver();