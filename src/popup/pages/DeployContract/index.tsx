/* eslint-disable @typescript-eslint/no-unsafe-argument */
import React, { Component } from 'react';
import { inject, observer } from 'mobx-react';
import { Typography, TextField, Button, withStyles, WithStyles } from '@material-ui/core';

import styles from './styles';
import NavBar from '../../components/NavBar';
import NetworkFeeControl from '../../components/NetworkFeeControl';
import SliderInput from '../../components/SliderInput';
import InfoTooltip from '../../components/InfoTooltip';
import AppStore from '../../stores/AppStore';
import Config from '../../../config';

const GAS_LIMIT_INFO = 'Maximum amount of gas this deployment may consume. Unused gas is ' +
  'refunded, so a higher limit is safe to set — but too low can cause the deployment to fail.';
const GAS_PRICE_INFO = 'Price paid per unit of gas, in satoshi. This is multiplied by the gas ' +
  'actually used to determine your deployment cost — higher values do not speed up execution, ' +
  'they only raise the cost.';

interface IProps {
  classes: Record<string, string>;
  store: AppStore;
}

@inject('store')
@observer
class DeployContract extends Component<WithStyles & IProps, {}> {
  public componentDidMount() {
    if (!this.props.store.settingsStore.developerModeEnabled) {
      this.props.store.routerStore.push('/settings');
      return;
    }
    this.props.store.deployContractStore.init();
  }

  public render() {
    const { classes, store } = this.props;
    const { deployContractStore, sessionStore } = store;

    return (
      <div className={classes.root}>
        <NavBar hasBackButton title="Deploy Contract" />
        <div className={classes.contentContainer}>
          <div className={classes.card}>
            <DetailField classes={classes} label="From" value={sessionStore.info && sessionStore.info.addrStr} />
          </div>

          <BytecodeField {...this.props} />
          <NumberField
            classes={classes}
            name="Gas Limit"
            unit="GAS"
            value={deployContractStore.gasLimit}
            onChange={deployContractStore.changeGasLimit}
            slider={{ min: Config.TRANSACTION.GAS_LIMIT_MIN, max: Config.TRANSACTION.GAS_LIMIT_MAX }}
            info={GAS_LIMIT_INFO}
          />
          <NumberField
            classes={classes}
            name="Gas Price"
            unit="SATOSHI/GAS"
            value={deployContractStore.gasPrice}
            onChange={deployContractStore.changeGasPrice}
            slider={{ min: Config.TRANSACTION.GAS_PRICE_MIN, max: Config.TRANSACTION.GAS_PRICE_MAX }}
            info={GAS_PRICE_INFO}
          />

          <NetworkFeeControl
            feeSpeed={deployContractStore.feeSpeed}
            isCustomFee={deployContractStore.isCustomFee}
            customFeeRate={deployContractStore.customFeeRate}
            feeRateTiers={deployContractStore.feeRateTiers}
            networkFeeLabel={deployContractStore.networkFeeLabel}
            networkFeeUsdLabel={deployContractStore.networkFeeUsdLabel}
            onSelectTier={deployContractStore.selectFeeTier}
            onApplyCustomFee={deployContractStore.applyCustomFeeRate}
          />

          <div className={classes.card}>
            <DetailField
              classes={classes}
              label="Max Transaction Fee"
              value={`${deployContractStore.maxTxFee} MRX`}
            />
          </div>

          {deployContractStore.errorMessage && (
            <Typography className={classes.errorText}>{deployContractStore.errorMessage}</Typography>
          )}
          {deployContractStore.deployedTxid && (
            <Typography className={classes.successText}>
              Broadcast: {deployContractStore.deployedTxid}. Once confirmed, look up the resulting
              contract address on the explorer or via callcontract.
            </Typography>
          )}

          <Button
            className={classes.deployButton}
            fullWidth
            variant="contained"
            color="primary"
            disabled={deployContractStore.buttonDisabled}
            onClick={deployContractStore.deploy}
          >
            {deployContractStore.deploying ? 'Deploying...' : 'Deploy'}
          </Button>
        </div>
      </div>
    );
  }
}

const DetailField: React.FC<any> = ({ classes, label, value }: any) => (
  <div className={classes.detailField}>
    <Typography className={classes.detailLabel}>{label}:</Typography>
    <Typography className={classes.detailValue}>{value}</Typography>
  </div>
);

const BytecodeField = observer(({ classes, store: { deployContractStore } }: any) => (
  <div className={classes.fieldContainer}>
    <div className={classes.fieldHeadingRow}>
      <Typography className={classes.fieldHeading}>
        Bytecode
        <InfoTooltip text="The compiled contract bytecode to deploy, as a hex string." />
      </Typography>
    </div>
    <div className={classes.fieldTextContainer}>
      <TextField
        className={classes.selectOrTextField}
        fullWidth
        multiline
        rows={4}
        rowsMax={10}
        placeholder="606060405260..."
        value={deployContractStore.bytecode}
        InputProps={{
          className: `${classes.fieldTextOrInput} ${classes.bytecodeField}`,
          disableUnderline: true,
        }}
        onChange={(event) => deployContractStore.changeBytecode(event.target.value)}
      />
    </div>
    {!!deployContractStore.bytecode && deployContractStore.bytecodeError && (
      <Typography className={classes.errorText}>{deployContractStore.bytecodeError}</Typography>
    )}
  </div>
));

const NumberField: React.FC<any> = observer(({ classes, name, unit, value, onChange, slider, info }: any) => (
  <div className={classes.fieldContainer}>
    <div className={classes.fieldHeadingRow}>
      <Typography className={classes.fieldHeading}>
        {name}
        {info && <InfoTooltip text={info} />}
      </Typography>
    </div>
    <div className={classes.fieldTextContainer}>
      <TextField
        className={classes.selectOrTextField}
        fullWidth
        type="number"
        InputProps={{
          className: classes.fieldTextOrInput,
          endAdornment: <Typography className={classes.fieldUnit}>{unit}</Typography>,
          disableUnderline: true,
        }}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
    {slider && (
      <SliderInput
        min={slider.min}
        max={slider.max}
        value={value}
        onChange={(newValue) => onChange(String(newValue))}
      />
    )}
  </div>
));

// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
export default withStyles(styles)(DeployContract);
