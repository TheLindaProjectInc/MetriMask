/* eslint-disable @typescript-eslint/no-unsafe-argument */
import React, { Component } from 'react';
import { inject, observer } from 'mobx-react';
import {
  Typography, Select, MenuItem, Switch, TextField, Button, withStyles, WithStyles,
} from '@material-ui/core';
import { map } from 'lodash';

import styles from './styles';
import NavBar from '../../components/NavBar';
import AppStore from '../../stores/AppStore';
import { NETWORK_NAMES } from '../../../constants';
import { SessionLogoutInterval } from '../../../models/SessionLogoutInterval';

// Mirrors NetworkController.DEFAULT_NETWORK_URLS -- for placeholder display only.
const DEFAULT_NETWORK_URLS: Record<string, string> = {
  [NETWORK_NAMES.MAINNET]: 'https://explorer.metrixcoin.com/',
  [NETWORK_NAMES.TESTNET]: 'https://testnet-explorer.metrixcoin.com/',
  [NETWORK_NAMES.REGTEST]: 'http://localhost:3001/explorer/',
};

interface IProps {
  classes: Record<string, string>;
  store: AppStore;
}

@inject('store')
@observer
class Settings extends Component<WithStyles & IProps, {}> {
  public render() {
    const { classes } = this.props;

    return(
      <div className={classes.root}>
        <NavBar hasBackButton title="Settings" />
        <div className={classes.contentContainer}>
          <div className={classes.fieldsContainer}>
            <SliField {...this.props} />
            <DarkModeField {...this.props} />
            <NetworkEndpointField {...this.props} networkName={NETWORK_NAMES.MAINNET} />
            <NetworkEndpointField {...this.props} networkName={NETWORK_NAMES.TESTNET} />
            <RegtestToggleField {...this.props} />
            <RegtestEndpointField {...this.props} />
          </div>
        </div>
      </div>
    );
  }
}

const SliField: React.FC<any> = observer(({ classes, store: { settingsStore } }: any) => (
  <div className={classes.fieldContainer}>
    <Heading name="Session Logout Interval" />
    <div className={classes.fieldContentContainer}>
      <Select
        className={classes.select}
        inputProps={{ name: 'sessionLogoutInterval', id: 'sessionLogoutInterval'}}
        disableUnderline
        value={settingsStore.sessionLogoutInterval}
        onChange={(event) => settingsStore.changeSessionLogoutInterval(event.target.value)}
      >
      {map(settingsStore.sliArray, (sli: SessionLogoutInterval) =>
        <MenuItem key={sli.interval} value={sli.interval}>
          <Typography className={classes.selectTypography}>{sli.name}</Typography>
        </MenuItem>,
      )}
      </Select>
    </div>
  </div>
));

const DarkModeField: React.FC<any> = observer(({ classes, store: { settingsStore } }: any) => (
  <div className={classes.fieldContainer}>
    <div className={classes.switchRow}>
      <Heading name="Dark Mode" />
      <Switch
        color="primary"
        checked={settingsStore.darkMode}
        onChange={(event) => settingsStore.changeDarkMode(event.target.checked)}
      />
    </div>
  </div>
));

const RegtestToggleField: React.FC<any> = observer(({ classes, store: { settingsStore } }: any) => (
  <div className={classes.fieldContainer}>
    <div className={classes.switchRow}>
      <Heading name="Enable RegTest" />
      <Switch
        color="primary"
        checked={settingsStore.regtestEnabled}
        onChange={(event) => settingsStore.changeRegtestEnabled(event.target.checked)}
      />
    </div>
  </div>
));

const NetworkEndpointField: React.FC<any> = observer(({ classes, store: { settingsStore }, networkName }: any) => {
  const testState = settingsStore.endpointTestState[networkName];
  const testMessage = settingsStore.endpointTestMessage[networkName];
  const busy = testState === 'testing' || testState === 'reloading';

  return (
    <div className={classes.fieldContainer}>
      <Heading name={`${networkName} RPC Provider`} />
      <div className={classes.buttonFieldHeadingContainer}>
        <div className={classes.fieldTextContainer}>
          <TextField
            className={classes.selectOrTextField}
            fullWidth
            disabled={busy}
            placeholder={DEFAULT_NETWORK_URLS[networkName]}
            value={settingsStore.endpointOverrides[networkName] || ''}
            InputProps={{ className: classes.fieldTextOrInput, disableUnderline: true }}
            onChange={(event) => settingsStore.updateEndpointOverrideDraft(networkName, event.target.value)}
          />
        </div>
        <Button
          color="primary"
          className={classes.fieldButton}
          disabled={busy}
          onClick={() => settingsStore.testAndSaveEndpointOverride(networkName)}
        >
          {testState === 'testing' ? 'Testing...' : 'Save'}
        </Button>
        <Button
          color="primary"
          className={classes.fieldButton}
          disabled={busy}
          onClick={() => settingsStore.resetEndpointOverride(networkName)}
        >
          Restore default
        </Button>
      </div>
      {testMessage && (
        <Typography
          className={(testState === 'success' || testState === 'reloading') ? classes.successText : classes.errorText}
        >
          {testMessage}
        </Typography>
      )}
    </div>
  );
});

const RegtestEndpointField: React.FC<any> = observer((props: any) => (
  props.store.settingsStore.regtestEnabled
    ? <NetworkEndpointField {...props} networkName={NETWORK_NAMES.REGTEST} />
    : null
));

const Heading = withStyles(styles, { withTheme: true })(({ classes, name }: any) => (
  <Typography className={classes.fieldHeading}>{name}</Typography>
));

// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
export default withStyles(styles)(Settings);
