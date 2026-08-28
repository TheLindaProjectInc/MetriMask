/* eslint-disable @typescript-eslint/no-unsafe-argument */
import React, { Component } from 'react';
import {
  Typography, Select, MenuItem, TextField, Button, IconButton, CircularProgress, withStyles, WithStyles,
} from '@material-ui/core';
import { CropFree } from '@material-ui/icons';
import { inject, observer } from 'mobx-react';
import { map } from 'lodash';

import styles from './styles';
import NavBar from '../../components/NavBar';
import NetworkFeeControl from '../../components/NetworkFeeControl';
import SliderInput from '../../components/SliderInput';
import InfoTooltip from '../../components/InfoTooltip';
import AppStore from '../../stores/AppStore';
import { handleEnterPress } from '../../../utils';
import MRCToken from '../../../models/MRCToken';
import Config from '../../../config';

interface IProps {
  classes: Record<string, string>;
  store: AppStore;
}

@inject('store')
@observer
class Send extends Component<WithStyles & IProps, {}> {
  public componentDidMount() {
    this.props.store.sendStore.init();
  }

  public render() {
    const { classes } = this.props;
    const { loggedInAccountName } = this.props.store.sessionStore;

    if (!loggedInAccountName) {
      return null;
    }

    return (
      <div className={classes.root}>
        <NavBar hasBackButton title="Send" />
        <div className={classes.contentContainer}>
          <div className={classes.fieldsContainer}>
            <FromField {...this.props} />
            <ToField onEnterPress={this.onEnterPress} {...this.props} />
            <TokenField {...this.props} />
            <AmountField onEnterPress={this.onEnterPress} {...this.props} />
            {this.props.store.sendStore.token && this.props.store.sendStore.token.symbol === 'MRX' ? (
                <FeeSpeedField {...this.props} />
            ) : (
              <div>
                <GasLimitField onEnterPress={this.onEnterPress} {...this.props} />
                <GasPriceField onEnterPress={this.onEnterPress} {...this.props} />
                <FeeSpeedField {...this.props} />
              </div>
            )}
          </div>
          <SendButton {...this.props} />
        </div>
      </div>
    );
  }

  private onEnterPress = (event: any) => {
    handleEnterPress(event, () => {
      if (!this.props.store.sendStore.buttonDisabled) {
        this.props.store.sendStore.routeToSendConfirm();
      }
    });
  };
}

const Heading = withStyles(styles, { withTheme: true })(({ classes, name, info }: any) => (
  <Typography className={classes.fieldHeading}>
    {name}
    {info && <InfoTooltip text={info} />}
  </Typography>
));

const DetailField: React.FC<any> = ({ classes, label, value }: any) => (
  <div className={classes.detailField}>
    <Typography className={classes.detailLabel}>{label}:</Typography>
    <Typography className={classes.detailValue}>{value}</Typography>
  </div>
);

const FromField = observer(({ classes, store: { sessionStore } }: any) => (
  <div className={classes.fromCard}>
    <Typography className={classes.fromCardName}>{sessionStore.loggedInAccountName}</Typography>
    <div className={classes.detailRow}>
      <DetailField classes={classes} label="Network" value={sessionStore.networkName} />
      <DetailField classes={classes} label="Balance" value={`${sessionStore.info.balance} MRX`} />
    </div>
    <DetailField classes={classes} label="Address" value={sessionStore.info.addrStr} />
  </div>
));

const ToField = observer(({ classes, store: { sendStore, sessionStore }, onEnterPress }: any) => (
  <div className={classes.fieldContainer}>
    <Heading name="To" />
    <div className={classes.fieldTextContainer}>
      <TextField
        className={classes.selectOrTextField}
        fullWidth
        type="text"
        multiline={false}
        placeholder={sessionStore.info.addrStr}
        value={sendStore.receiverAddress || ''}
        InputProps={{
          className: classes.fieldTextOrInput,
          endAdornment: (
            <IconButton
              className={classes.qrScanButton}
              disabled={sendStore.qrScanning}
              onClick={() => sendStore.scanQrFromPage()}
            >
              {sendStore.qrScanning
                ? <CircularProgress size={18} className={classes.qrScanSpinner} />
                : <CropFree className={classes.qrScanIcon} />}
            </IconButton>
          ),
          disableUnderline: true,
        }}
        onChange={(event) => sendStore.receiverAddress = event.target.value}
        onKeyPress={onEnterPress}
      />
    </div>
    {!!sendStore.receiverAddress && sendStore.receiverFieldError && (
      <Typography className={classes.errorText}>{sendStore.receiverFieldError}</Typography>
    )}
    {sendStore.qrScanError && (
      <Typography className={classes.errorText}>{sendStore.qrScanError}</Typography>
    )}
  </div>
));

const TokenField = observer(({ classes, store: { sendStore } }: any) => (
  <div className={classes.fieldContainer}>
    <Heading name="Token" />
    <div className={classes.fieldContentContainer}>
      <Select
        className={classes.selectOrTextField}
        disableUnderline
        value={sendStore.token ? sendStore.token.symbol : ''}
        onChange={(event) => sendStore.changeToken(event.target.value)}
      >
        {map(sendStore.tokens, (token: MRCToken) => (
          <MenuItem key={token.symbol} value={token.symbol}>
            <Typography className={classes.fieldTextOrInput}>{token.symbol}</Typography>
          </MenuItem>
        ))}
      </Select>
    </div>
  </div>
));

const AmountField = observer(({ classes, store: { sendStore }, onEnterPress }: any) => (
  <div className={classes.fieldContainer}>
    <div className={classes.buttonFieldHeadingContainer}>
      <div className={classes.buttonFieldHeadingTextContainer}>
        <Heading name="Amount" />
      </div>
      <Typography className={classes.fieldButtonText}>{sendStore.maxAmount}</Typography>
      <Button
        color="primary"
        className={classes.fieldButton}
        onClick={() => sendStore.amount = sendStore.maxAmount}
      >
        Max
      </Button>
    </div>
    <div className={classes.fieldTextContainer}>
      <TextField
        className={classes.selectOrTextField}
        fullWidth
        type="number"
        multiline={false}
        placeholder={'0.00'}
        value={sendStore.amount}
        InputProps={{
          classes: {
            input: classes.fieldInput,
          },
          className: classes.fieldTextOrInput,
          endAdornment: (
            <Typography className={classes.fieldTextAdornment}>
              {sendStore.token && sendStore.token.symbol}
            </Typography>
          ),
          disableUnderline: true,
        }}
        onChange={(event) => event.target.value === '' ? sendStore.amount = ''
          : sendStore.amount = Number(event.target.value)}
        onKeyPress={onEnterPress}
      />
    </div>
    {sendStore.amount !== '' && sendStore.amountFieldError && (
      <Typography className={classes.errorText}>{sendStore.amountFieldError}</Typography>
    )}
  </div>
));

const FeeSpeedField = observer(({ store: { sendStore } }: any) => (
  <NetworkFeeControl
    feeSpeed={sendStore.feeSpeed}
    isCustomFee={sendStore.isCustomFee}
    customFeeRate={sendStore.customFeeRate}
    feeRateTiers={sendStore.feeRateTiers}
    networkFeeLabel={sendStore.networkFeeLabel}
    networkFeeUsdLabel={sendStore.networkFeeUsdLabel}
    onSelectTier={sendStore.selectFeeTier}
    onApplyCustomFee={sendStore.applyCustomFeeRate}
  />
));

const GasLimitField = observer(({ classes, store: { sendStore }, onEnterPress }: any) => (
  <div className={classes.fieldContainer}>
    <div className={classes.buttonFieldHeadingContainer}>
      <div className={classes.buttonFieldHeadingTextContainer}>
        <Heading
          name="Gas Limit"
          info={
            'Maximum amount of gas this transaction may consume. Unused gas is refunded, ' +
            'so a higher limit is safe to set — but too low can cause the transaction to fail.'
          }
        />
      </div>
      <Typography className={classes.fieldButtonText}>{sendStore.gasLimitRecommendedAmount}</Typography>
      <Button
        color="primary"
        className={classes.fieldButton}
        onClick={() => sendStore.gasLimit = sendStore.gasLimitRecommendedAmount}
      >
        Recommended
      </Button>
    </div>
    <div className={classes.fieldTextContainer}>
      <TextField
        className={classes.selectOrTextField}
        fullWidth
        type="number"
        multiline={false}
        placeholder={sendStore.gasLimitRecommendedAmount.toString()}
        value={sendStore.gasLimit}
        InputProps={{
          classes: {
            input: classes.fieldInput,
          },
          className: classes.fieldTextOrInput,
          endAdornment: (
            <Typography className={classes.fieldTextAdornment}>
              GAS
            </Typography>
          ),
          disableUnderline: true,
        }}
        onChange={(event) => sendStore.gasLimit = event.target.value}
        onKeyPress={onEnterPress}
      />
    </div>
    <SliderInput
      min={Config.TRANSACTION.GAS_LIMIT_MIN}
      max={Config.TRANSACTION.GAS_LIMIT_MAX}
      value={sendStore.gasLimit}
      onChange={(value) => sendStore.gasLimit = value}
    />
    {sendStore.gasLimitFieldError && (
      <Typography className={classes.errorText}>{sendStore.gasLimitFieldError}</Typography>
    )}
  </div>
));

const GasPriceField = observer(({ classes, store: { sendStore }, onEnterPress }: any) => (
  <div className={classes.fieldContainer}>
    <div className={classes.buttonFieldHeadingContainer}>
      <div className={classes.buttonFieldHeadingTextContainer}>
        <Heading
          name="Gas Price"
          info={
            'Price paid per unit of gas, in satoshi. This is multiplied by the gas actually ' +
            'used to determine your contract execution cost — higher values do not speed up ' +
            'execution, they only raise the cost.'
          }
        />
      </div>
      <Typography className={classes.fieldButtonText}>{sendStore.gasPriceRecommendedAmount}</Typography>
      <Button
        color="primary"
        className={classes.fieldButton}
        onClick={() => sendStore.gasPrice = sendStore.gasPriceRecommendedAmount}
      >
        Recommended
      </Button>
    </div>
    <div className={classes.fieldTextContainer}>
      <TextField
        className={classes.selectOrTextField}
        fullWidth
        type="number"
        multiline={false}
        placeholder={sendStore.gasPriceRecommendedAmount.toString()}
        value={sendStore.gasPrice.toString()}
        InputProps={{
          classes: {
            input: classes.fieldInput,
          },
          className: classes.fieldTextOrInput,
          endAdornment: (
            <Typography className={classes.fieldTextAdornment}>
              SATOSHI/GAS
            </Typography>
          ),
          disableUnderline: true,
        }}
        onChange={(event) => sendStore.gasPrice = event.target.value}
        onKeyPress={onEnterPress}
      />
    </div>
    <SliderInput
      min={Config.TRANSACTION.GAS_PRICE_MIN}
      max={Config.TRANSACTION.GAS_PRICE_MAX}
      value={sendStore.gasPrice}
      onChange={(value) => sendStore.gasPrice = value}
    />
    {sendStore.gasPriceFieldError && (
      <Typography className={classes.errorText}>{sendStore.gasPriceFieldError}</Typography>
    )}
  </div>
));

const SendButton = observer(({ classes, store: { sendStore } }: any) => (
  <Button
    className={classes.sendButton}
    fullWidth
    variant="contained"
    color="primary"
    disabled={sendStore.buttonDisabled}
    onClick={sendStore.routeToSendConfirm}
  >
    Send
  </Button>
));

// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
export default withStyles(styles)(Send);
