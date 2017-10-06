import React, {Children} from 'react'
import PropTypes from 'prop-types'
import QueueAnim from 'rc-queue-anim';
import windowSize from '../API/windowSize'

import Logo from './Logo';

import {layout_horizon, Content, info, actions, overLoadHitokoto} from './HitokotoLayout.css'

import {FONT_MAP, ANIMATE_CONFIG_HORIZON} from '../configs'
import Nav from '../containers/Nav'

let JUDESIZE = windowSize.width > 768
  ? 140
  : 40;
windowSize.subscriptb(() => {
  JUDESIZE = windowSize.width > 768
    ? 140
    : 40;
})

function LayoutHorizon(props) {
  let body,
    detail;

  let {
    hitokoto: {
      id,
      source,
      author,
      hitokoto,
      creator,
      created_at,
      type
    },
    layout: {
      backgroundColor,
      font,
      fontWeight
    },
    animateConfig
  } = props;
  let OptionsChildren = null,
    overLoad = false;

  if (hitokoto && hitokoto.length > JUDESIZE) {
    overLoad = true;
  }
  Children.forEach(props.children, (one) => {
    if (one.props['data-role'] == 'actions') {
      OptionsChildren = one.props.children;
    }
  })

  return (
    <div
      className={layout_horizon + (props.overflowhide
      ? ' overflowhide'
      : '')}
      style={{
      backgroundColor: backgroundColor
    }}>
      <Logo/>
      <Nav/>
      <QueueAnim
        animConfig={animateConfig}
        className={Content + (overLoad
        ? ' ' + overLoadHitokoto
        : '')}>
        <div className={info} key={id + 'info'} data-id={id}>
          <b title="创建者">
            {creator}
          </b>
        </div>
        <h1
          style={{
          fontFamily: FONT_MAP[font],
          fontWeight: fontWeight
        }}
          key={id + 'hito'}>{hitokoto}</h1>
        {author || source
          ? <p key={id + 'from'}>——&nbsp;&nbsp;{author
                ? author
                : ''}{author
                ? ' '
                : ''}{source}</p>
          : null}
        <div className='oprations' key={id + 'oprations'}>
          <ul className={actions}>
            {OptionsChildren}
          </ul>
        </div>
      </QueueAnim>
    </div>
  );
}
LayoutHorizon.PropTypes = {
  hitokoto: PropTypes.object.isRequired,
  layout: PropTypes.object.isRequired
}

export default LayoutHorizon