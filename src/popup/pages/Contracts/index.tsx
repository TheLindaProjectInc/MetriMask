import React, { Component } from 'react';
import { inject, observer } from 'mobx-react';
import { Typography, withStyles, WithStyles } from '@material-ui/core';
import { Code } from '@material-ui/icons';

import styles from './styles';
import NavBar from '../../components/NavBar';
import AppStore from '../../stores/AppStore';

interface IProps {
  classes: Record<string, string>;
  store: AppStore;
}

@inject('store')
@observer
class Contracts extends Component<WithStyles & IProps, {}> {
  public componentDidMount() {
    // Developer mode only -- reachable via the NavBar menu, which already hides this entry
    // otherwise, but guard direct navigation too.
    if (!this.props.store.settingsStore.developerModeEnabled) {
      this.props.store.routerStore.push('/home');
    }
  }

  public render() {
    const { classes, store } = this.props;

    return (
      <div className={classes.root}>
        <NavBar hasBackButton title="Contracts" />
        <div className={classes.contentContainer}>
          <div className={classes.actionCard} onClick={() => store.routerStore.push('/deploy-contract')}>
            <Code className={classes.actionIcon} />
            <div className={classes.actionTextContainer}>
              <Typography className={classes.actionTitle}>Deploy Contract</Typography>
              <Typography className={classes.actionSubtitle}>
                Broadcast a new contract's bytecode to the network
              </Typography>
            </div>
          </div>
        </div>
      </div>
    );
  }
}

// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
export default withStyles(styles)(Contracts);
