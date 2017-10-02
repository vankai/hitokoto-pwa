import React, {Component} from 'react';
import {Link, Route, withRouter} from 'react-router-dom';

import update from 'immutability-helper';
import QueueAnim from 'rc-queue-anim';
import PropTypes from 'prop-types'

import NewHitokoto from '../pages/NewHitokoto'
import hitokotoDriver from '../API/hitokotoDriver';
import HitoCollection from '../containers/HitoCollection';
import HitoList from '../containers/HitoList';
import HitokotoPreview from './HitokotoPreview';
import UpdateHitokoto from '../pages/UpdateHitokoto'

let httpManager = hitokotoDriver.httpManager;

import {home, username, menu, left, right} from './Home.css';
class Home extends Component {
  constructor(props) {
    super(props);
    this.state = {
      collections: [],
      horizon: true,
      currentCollectionName: '',
      hitokotos: [],
      previewHitokoto: ''
    }
    this.storeHitokotoToUpdate = this.storeHitokotoToUpdate.bind(this);
    this.doUpdateHitokoto = this.doUpdateHitokoto.bind(this)
    this.previewHitokoto = this.previewHitokoto.bind(this);
    this.pubulishHitokoto = this.pubulishHitokoto.bind(this);
    this.switchLayout = this.switchLayout.bind(this);
    this.removeHitokoto = this.removeHitokoto.bind(this);
  }

  switchLayout() {
    this.setState(state => {
      state.horizon = !state.horizon;
      return state;
    })
  }

  previewHitokoto(hitokoto) {
    let {location: {
        pathname
      }, history} = this.props

    if (!hitokoto.creator) {
      hitokoto.creator = this.props.user.nickname;
    }
    if (!hitokoto.id) {
      let date = new Date();
      hitokoto.id = '' + date.getFullYear() + date.getMonth() + date.getDate()
    }
    this.setState({previewHitokoto: hitokoto})

    if (/(new|update)$/.test(pathname)) {
      history.push(pathname.replace(/(new|update)$/, 'preview'));
    } else {
      history.push(pathname + '/preview');
    }
  }
  storeHitokotoToUpdate(hitokotoToUpdate) {
    this.setState({previewHitokoto: hitokotoToUpdate});
  }
  pubulishHitokoto(hitokoto) {

    let reg = /^\/home\/([^\/]*)\/new$/,
      matchs = reg.exec(this.props.location.pathname);
    let collectionName = matchs[1];
    let form = new FormData();

    form.append('hitokoto', hitokoto.hitokoto);
    form.append('from', hitokoto.from);
    form.append('creator', this.props.user.nickname);
    form.append('category', hitokoto.category);
    return httpManager.API_newHitokoto(collectionName, form).then(result => {
      console.log(result);
      if (result.err) {
        alert(result.err)
      } else {
        this.props.history.push('/home/' + collectionName);
        this.props.requestCollectionHitokotos(collectionName)
      }
      return result
    });
  }
  doUpdateHitokoto(hitokoto) {
    let reg = /^\/home\/([^\/]*)\/update$/,
      matchs = reg.exec(this.props.location.pathname);
    let collectionName = matchs[1];
    let form = new FormData();
    form.append('id', hitokoto._id)
    form.append('from', hitokoto.from);
    form.append('hitokoto', hitokoto.hitokoto);
    form.append('creator', this.props.user.nickname);
    form.append('category', hitokoto.category);
    return httpManager.API_updateHitokoto(collectionName, form).then(result => {
      console.log(result);
      if (result.err) {
        alert(result.err)
      } else {

        this.props.history.push('/home/' + collectionName);
        this.props.requestCollectionHitokotos(collectionName)
      }
      return result
    });
  }

  removeHitokoto(hitokotoToRemove) {
    if (!confirm('你确定删除该hitokoto?')) {
      return;
    }

    let reg = /^\/home\/([^\/]*)$/,
      matchs = reg.exec(this.props.location.pathname);
    let collectionName = matchs[1];
    let form = new FormData();
    form.append('id', hitokotoToRemove._id)
    return httpManager.API_deleteHitokoto(collectionName, form).then(result => {
      console.log(result);

      if (result.err) {
        alert(result.err)
      } else {
        this.props.removeHitokotosSuccess(hitokotoToRemove._id)
      }
      return result
    });
  }

  render() {
    let {location: {
        pathname
      }, layout: {
        backgroundColor
      }, user: {
        nickname
      }} = this.props;
    let frameToShow = null;

    if (/^\/home$/gim.test(pathname)) {
      frameToShow = (<HitoCollection/>)
    } else if (/^\/home\/[^\/]*/gim.test(pathname)) {
      frameToShow = (<HitoList
        updateHitokoto={this.storeHitokotoToUpdate}
        remove={this.removeHitokoto}
        preview={this.previewHitokoto}/>)
    }

    return (
      <div key='home' className={home}>
        <div className={left}>
          <p className={username}>{nickname}</p>
          <ul className={menu}>
            <li>
              <Link to='/'>返回首页</Link>
            </li>
            <li>
              <Link to='/home'>所有句集</Link>
            </li>
            <li>
              <Link to='/profile'>账户设置</Link>
            </li>

          </ul>
        </div>
        <QueueAnim
          className={right}
          animConfig={[
          {
            opacity: [
              1, 0
            ],
            translateY: [0, -50]
          }, {
            opacity: [
              1, 0
            ],
            position: 'absolute',
            translateY: [0, 50]
          }
        ]}>
          {frameToShow}
        </QueueAnim>
        <UpdateHitokoto
          hitokoto={this.state.previewHitokoto}
          update={this.doUpdateHitokoto}
          preview={this.previewHitokoto}/>
        <NewHitokoto publish={this.pubulishHitokoto} preview={this.previewHitokoto}/>
        <HitokotoPreview
          layout={this.props.layout}
          switchLayout={this.switchLayout}
          hitokoto={this.state.previewHitokoto}
          layoutHorizon={this.state.horizon}/>
      </div>
    );
  }
}

Home.propTypes = {
  layout: PropTypes.object.isRequired,
  user: PropTypes.object.isRequired,
  removeHitokotosSuccess: PropTypes.func.isRequired
}
export default withRouter(Home)