/* eslint-disable @typescript-eslint/no-unsafe-argument */
import React, { Component } from 'react';
import { inject, observer } from 'mobx-react';
import {
  Typography, Select, MenuItem, Switch, TextField, Button, withStyles, WithStyles,
} from '@material-ui/core';
import { map } from 'lodash';

import styles from './styles';
import NavBar from '../../components/NavBar';
import InfoTooltip from '../../components/InfoTooltip';
import AppStore from '../../stores/AppStore';
import { NETWORK_NAMES } from '../../../constants';
import { SessionLogoutInterval } from '../../../models/SessionLogoutInterval';

// Mirrors NetworkController.DEFAULT_NETWORK_URLS -- for placeholder display only.
const DEFAULT_NETWORK_URLS: Record<string, string> = {
  [NETWORK_NAMES.MAINNET]: 'https://explorer.metrixcoin.com/',
  [NETWORK_NAMES.TESTNET]: 'https://testnet-explorer.metrixcoin.com/',
  [NETWORK_NAMES.REGTEST]: 'http://localhost:3001/explorer/',
};

const LOCAL_RPC_INFO = 'Connects directly to a metrixd daemon\'s JSON-RPC interface instead ' +
  'of a block explorer. Useful for RegTest, which usually has no explorer running. No special ' +
  'daemon configuration is required. Transaction history only covers recent blocks, since ' +
  'there\'s no address index to search further back.';

const SESSION_LOGOUT_INTERVAL_INFO = 'Automatically logs you out after this period of ' +
  'inactivity, requiring your password to log back in. Choose "None" to disable automatic logout.';

const NETWORK_PROVIDER_INFO = 'The block explorer API MetriMask uses on this network for ' +
  'balances, transactions, and fee estimates. Leave blank to use the default.';

const ENABLE_REGTEST_INFO = 'Shows RegTest as a selectable network. RegTest is a local test ' +
  'network for development -- it isn\'t connected to MainNet or TestNet.';

const DEVELOPER_MODE_INFO = 'Reveals advanced features for development and testing, such as ' +
  'connecting to a local RPC daemon and deploying contracts. Most users don\'t need this.';

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
            <Section classes={classes} title="General">
              <SliField {...this.props} />
            </Section>

            <Section classes={classes} title="Network Providers">
              <NetworkDataSourceField {...this.props} networkName={NETWORK_NAMES.MAINNET} />
              <NetworkDataSourceField {...this.props} networkName={NETWORK_NAMES.TESTNET} />
              <RegtestToggleField {...this.props} />
              <RegtestEndpointField {...this.props} />
            </Section>

            <Section classes={classes} title="Developer">
              <DeveloperModeToggleField {...this.props} />
            </Section>
          </div>
        </div>
      </div>
    );
  }
}

const Section: React.FC<any> = ({ classes, title, children }: any) => (
  <div className={classes.section}>
    <Typography className={classes.sectionTitle}>{title}</Typography>
    {children}
  </div>
);

const SliField: React.FC<any> = observer(({ classes, store: { settingsStore } }: any) => (
  <div className={classes.fieldContainer}>
    <Heading name="Session Logout Interval" info={SESSION_LOGOUT_INTERVAL_INFO} />
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

const RegtestToggleField: React.FC<any> = observer(({ classes, store: { settingsStore } }: any) => (
  <div className={classes.fieldContainer}>
    <div className={classes.switchRow}>
      <Heading name="Enable RegTest" info={ENABLE_REGTEST_INFO} />
      <Switch
        color="primary"
        checked={settingsStore.regtestEnabled}
        onChange={(event) => settingsStore.changeRegtestEnabled(event.target.checked)}
      />
    </div>
  </div>
));

const DeveloperModeToggleField: React.FC<any> = observer(({ classes, store: { settingsStore } }: any) => (
  <div className={classes.fieldContainer}>
    <div className={classes.switchRow}>
      <Heading name="Developer Mode" info={DEVELOPER_MODE_INFO} />
      <Switch
        color="primary"
        checked={settingsStore.developerModeEnabled}
        onChange={(event) => settingsStore.changeDeveloperModeEnabled(event.target.checked)}
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
      <Heading name={`${networkName} RPC Provider`} info={NETWORK_PROVIDER_INFO} />
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
    ? <NetworkDataSourceField {...props} networkName={NETWORK_NAMES.REGTEST} />
    : null
));

/*
 * Explorer URL (default) vs local-daemon-RPC data source for a network -- the RPC option is
 * only surfaced in Developer mode, and is most useful for RegTest, which typically has no
 * explorer running at all.
 */
const NetworkDataSourceField: React.FC<any> = observer(({ classes, store, networkName }: any) => {
  const { settingsStore } = store;
  const rpcEnabled = settingsStore.developerModeEnabled && !!settingsStore.rpcConfigDrafts[networkName];

  return (
    <div>
      {settingsStore.developerModeEnabled && (
        <div className={classes.fieldContainer}>
          <div className={classes.switchRow}>
            <Heading name={`${networkName}: Use Local RPC`} info={LOCAL_RPC_INFO} />
            <Switch
              color="primary"
              checked={rpcEnabled}
              onChange={(event) => settingsStore.toggleRpcMode(networkName, event.target.checked)}
            />
          </div>
        </div>
      )}
      {rpcEnabled
        ? <RpcConfigField classes={classes} store={store} networkName={networkName} />
        : <NetworkEndpointField classes={classes} store={store} networkName={networkName} />}
    </div>
  );
});

const RpcConfigField: React.FC<any> = observer(({ classes, store: { settingsStore }, networkName }: any) => {
  const testState = settingsStore.endpointTestState[networkName];
  const testMessage = settingsStore.endpointTestMessage[networkName];
  const busy = testState === 'testing' || testState === 'reloading';
  const draft = settingsStore.rpcConfigDrafts[networkName] || { host: '', port: '', user: '', password: '' };

  return (
    <div className={classes.fieldContainer}>
      <Heading name={`${networkName} Local RPC`} info={LOCAL_RPC_INFO} />
      <div className={classes.fieldTextContainer}>
        <TextField
          className={classes.selectOrTextField}
          fullWidth
          disabled={busy}
          placeholder="Host (e.g. localhost)"
          value={draft.host}
          InputProps={{ className: classes.fieldTextOrInput, disableUnderline: true }}
          onChange={(event) => settingsStore.updateRpcConfigDraft(networkName, 'host', event.target.value)}
        />
      </div>
      <div className={classes.fieldTextContainer}>
        <TextField
          className={classes.selectOrTextField}
          fullWidth
          type="number"
          disabled={busy}
          placeholder="Port (e.g. 33831)"
          value={draft.port}
          InputProps={{ className: classes.fieldTextOrInput, disableUnderline: true }}
          onChange={(event) => settingsStore.updateRpcConfigDraft(networkName, 'port', event.target.value)}
        />
      </div>
      <div className={classes.fieldTextContainer}>
        <TextField
          className={classes.selectOrTextField}
          fullWidth
          disabled={busy}
          placeholder="RPC user"
          value={draft.user}
          InputProps={{ className: classes.fieldTextOrInput, disableUnderline: true }}
          onChange={(event) => settingsStore.updateRpcConfigDraft(networkName, 'user', event.target.value)}
        />
      </div>
      <div className={classes.fieldTextContainer}>
        <TextField
          className={classes.selectOrTextField}
          fullWidth
          type="password"
          disabled={busy}
          placeholder="RPC password"
          value={draft.password}
          InputProps={{ className: classes.fieldTextOrInput, disableUnderline: true }}
          onChange={(event) => settingsStore.updateRpcConfigDraft(networkName, 'password', event.target.value)}
        />
      </div>
      <Button
        color="primary"
        className={classes.fieldButton}
        disabled={busy}
        onClick={() => settingsStore.testAndSaveRpcConfig(networkName)}
      >
        {testState === 'testing' ? 'Testing...' : 'Test & Save'}
      </Button>
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

const Heading = withStyles(styles, { withTheme: true })(({ classes, name, info }: any) => (
  <Typography className={classes.fieldHeading}>
    {name}
    {info && <InfoTooltip text={info} />}
  </Typography>
));

// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
export default withStyles(styles)(Settings);
