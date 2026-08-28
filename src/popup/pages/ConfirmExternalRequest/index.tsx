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

const GAS_LIMIT_INFO = 'Maximum amount of gas this transaction may consume. Unused gas is ' +
  'refunded, so a higher limit is safe to set — but too low can cause the transaction to fail.';
const GAS_PRICE_INFO = 'Price paid per unit of gas, in satoshi. This is multiplied by the gas ' +
  'actually used to determine your contract execution cost — higher values do not speed up ' +
  'execution, they only raise the cost.';

interface IProps {
  classes: Record<string, string>;
  store: AppStore;
}

@inject('store')
@observer
class ConfirmExternalRequest extends Component<WithStyles & IProps, {}> {
  public componentDidMount() {
    this.props.store.externalRequestStore.init();
  }

  public render() {
    const { classes } = this.props;
    const { pendingRequest } = this.props.store.externalRequestStore;

    const kind = pendingRequest && pendingRequest.kind;
    const title = kind === 'signMessage' ? 'Signature Request' : 'Confirm Transaction';

    return (
      <div className={classes.root}>
        <NavBar title={title} />
        <div className={classes.contentContainer}>
          {kind === 'sendToContract' && <ConfirmSendToContract {...this.props} />}
          {kind === 'signMessage' && <ConfirmSignMessage {...this.props} />}
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

const ConfirmSendToContract: React.FC<any> = observer(({ classes, store: { externalRequestStore } }: any) => (
  <React.Fragment>
    <div className={classes.card}>
      <DetailField classes={classes} label="From" value={externalRequestStore.pendingRequest.account.address} />
      <DetailField classes={classes} label="To" value={externalRequestStore.contractAddress} />
    </div>

    <NumberField
      classes={classes}
      name="Amount"
      unit="MRX"
      value={externalRequestStore.amount}
      onChange={externalRequestStore.changeAmount}
    />
    <NumberField
      classes={classes}
      name="Gas Limit"
      unit="GAS"
      value={externalRequestStore.gasLimit}
      onChange={externalRequestStore.changeGasLimit}
      slider={{ min: Config.TRANSACTION.GAS_LIMIT_MIN, max: Config.TRANSACTION.GAS_LIMIT_MAX }}
      info={GAS_LIMIT_INFO}
    />
    <NumberField
      classes={classes}
      name="Gas Price"
      unit="SATOSHI/GAS"
      value={externalRequestStore.gasPrice}
      onChange={externalRequestStore.changeGasPrice}
      slider={{ min: Config.TRANSACTION.GAS_PRICE_MIN, max: Config.TRANSACTION.GAS_PRICE_MAX }}
      info={GAS_PRICE_INFO}
    />

    <NetworkFeeControl
      feeSpeed={externalRequestStore.feeSpeed}
      isCustomFee={externalRequestStore.isCustomFee}
      customFeeRate={externalRequestStore.customFeeRate}
      feeRateTiers={externalRequestStore.feeRateTiers}
      networkFeeLabel={externalRequestStore.networkFeeLabel}
      networkFeeUsdLabel={externalRequestStore.networkFeeUsdLabel}
      onSelectTier={externalRequestStore.selectFeeTier}
      onApplyCustomFee={externalRequestStore.applyCustomFeeRate}
    />

    <div className={classes.card}>
      <DetailField
        classes={classes}
        label="Max Transaction Fee"
        value={`${externalRequestStore.maxTxFee} MRX`}
      />
      <div className={classes.detailField}>
        <Typography className={classes.detailLabel}>Raw Transaction:</Typography>
        <Typography className={classes.rawTransaction}>{externalRequestStore.rawTransaction}</Typography>
      </div>
    </div>

    {externalRequestStore.balanceError && (
      <Typography className={classes.errorText}>{externalRequestStore.balanceError}</Typography>
    )}

    <ConfirmCancelButtons
      classes={classes}
      externalRequestStore={externalRequestStore}
      confirmLabel="Confirm"
      disabled={!!externalRequestStore.balanceError}
    />
  </React.Fragment>
));

const ConfirmSignMessage: React.FC<any> = observer(({ classes, store: { externalRequestStore } }: any) => (
  <React.Fragment>
    <div className={classes.card}>
      <DetailField classes={classes} label="Account" value={externalRequestStore.pendingRequest.account.name} />
      <DetailField classes={classes} label="Address" value={externalRequestStore.pendingRequest.account.address} />
      <DetailField classes={classes} label="Origin" value={externalRequestStore.origin} />
    </div>
    <div className={classes.card}>
      <DetailField classes={classes} label="Message" value={externalRequestStore.message} />
    </div>

    <ConfirmCancelButtons classes={classes} externalRequestStore={externalRequestStore} confirmLabel="Sign" />
  </React.Fragment>
));

const ConfirmCancelButtons: React.FC<any> = ({ classes, externalRequestStore, confirmLabel, disabled }: any) => (
  <div className={classes.buttonRow}>
    <Button
      className={classes.cancelButton}
      variant="outlined"
      color="primary"
      onClick={externalRequestStore.cancel}
    >
      Cancel
    </Button>
    <Button
      className={classes.confirmButton}
      variant="contained"
      color="primary"
      disabled={!!disabled}
      onClick={externalRequestStore.confirm}
    >
      {confirmLabel}
    </Button>
  </div>
);

// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
export default withStyles(styles)(ConfirmExternalRequest);
