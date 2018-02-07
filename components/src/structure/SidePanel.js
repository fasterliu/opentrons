// @flow
// collapsable side panel
import * as React from 'react'
import classnames from 'classnames'
import {IconButton} from '../buttons'
import {CLOSE} from '../icons'
import styles from './SidePanel.css'

type SidePanelProps= {
  title: string,
  children: React.Node,
  isClosed?: boolean,
  onCloseClick?: (event: SyntheticEvent<>) => void
}

export default function SidePanel (props: SidePanelProps) {
  const open = !props.isClosed || props.onCloseClick == null
  const closeButton = props.onCloseClick && (
    <IconButton
      title='close panel'
      onClick={props.onCloseClick}
      className={styles.button_close}
      name={CLOSE}
    />
  )
  const className = classnames(styles.panel, {[styles.closed]: !open})

  return (
    <div className={className}>
      <div className={styles.title_bar}>
        <h2 className={styles.title}>
          {props.title}
        </h2>
        {closeButton}
      </div>
      <div className={styles.panel_contents}>
        {props.children}
      </div>
    </div>
  )
}
