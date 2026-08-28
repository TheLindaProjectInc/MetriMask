import React, { Component } from 'react';
import {
  Typography, IconButton, TextField, Button,
  Dialog, DialogTitle, DialogContent, DialogActions,
  withStyles, WithStyles,
} from '@material-ui/core';
import { Edit } from '@material-ui/icons';
import cx from 'classnames';

import styles from './styles';
import InfoTooltip from '../InfoTooltip';

const NETWORK_FEE_INFO = 'Fee paid to relay and include this transaction on the network, based ' +
  'on its size in bytes. This is separate from any gas cost above, and goes to the network, not ' +
  'the recipient.';

export type FeeSpeed = 'slow' | 'normal' | 'fast';

const SPEEDS: FeeSpeed[] = ['slow', 'normal', 'fast'];
const SPEED_LABELS: Record<FeeSpeed, string> = { slow: 'Slow', normal: 'Normal', fast: 'Fast' };

interface IProps {
  feeSpeed: FeeSpeed;
  isCustomFee: boolean;
  customFeeRate?: number;
  feeRateTiers?: { slow: number; normal: number; fast: number };
  networkFeeLabel?: string;
  networkFeeUsdLabel?: string;
  onSelectTier: (speed: FeeSpeed) => void;
  onApplyCustomFee: (rate: number) => void;
}

interface IState {
  modalOpen: boolean;
  customDraft: string;
}

class NetworkFeeControl extends Component<WithStyles & IProps, IState> {
  public state: IState = { modalOpen: false, customDraft: '' };

  public render() {
    const { classes, feeSpeed, isCustomFee, customFeeRate, feeRateTiers, networkFeeLabel, networkFeeUsdLabel } =
      this.props;
    const { modalOpen, customDraft } = this.state;
    const isValidCustom = Number(customDraft) > 0 && Number.isFinite(Number(customDraft));

    return (
      <div className={classes.root}>
        <div className={classes.summaryRow} onClick={this.openModal}>
          <Typography className={classes.heading}>
            Network Fee
            <InfoTooltip text={NETWORK_FEE_INFO} />
          </Typography>
          <div className={classes.summaryValues}>
            {networkFeeLabel && <Typography className={classes.feeAmount}>{networkFeeLabel}</Typography>}
            {networkFeeUsdLabel && <Typography className={classes.feeUsd}>{networkFeeUsdLabel}</Typography>}
          </div>
          <IconButton className={classes.editButton} size="small" onClick={this.openModal}>
            <Edit className={classes.editIcon} />
          </IconButton>
        </div>

        <Dialog open={modalOpen} onClose={this.closeModal}>
          <DialogTitle>Edit Network Fee</DialogTitle>
          <DialogContent>
            {SPEEDS.map((speed) => (
              <div
                key={speed}
                className={cx(classes.tierRow, !isCustomFee && feeSpeed === speed && classes.tierRowActive)}
                onClick={() => this.selectTier(speed)}
              >
                <Typography className={classes.tierLabel}>{SPEED_LABELS[speed]}</Typography>
                {feeRateTiers && (
                  <Typography className={classes.tierRate}>{feeRateTiers[speed]} satoshi/byte</Typography>
                )}
              </div>
            ))}
            <div className={cx(classes.tierRow, classes.advancedRow, isCustomFee && classes.tierRowActive)}>
              <Typography className={classes.tierLabel}>Advanced</Typography>
              <TextField
                className={classes.customInput}
                type="number"
                placeholder={customFeeRate ? String(customFeeRate) : 'satoshi/byte'}
                value={customDraft}
                InputProps={{ className: classes.customInputText, disableUnderline: true }}
                onChange={(event) => this.setState({ customDraft: event.target.value })}
              />
            </div>
          </DialogContent>
          <DialogActions>
            <Button onClick={this.closeModal}>Cancel</Button>
            <Button color="primary" disabled={!isValidCustom} onClick={this.applyCustom}>
              Apply Custom
            </Button>
          </DialogActions>
        </Dialog>
      </div>
    );
  }

  private openModal = () => {
    this.setState({ modalOpen: true, customDraft: '' });
  };

  private closeModal = () => {
    this.setState({ modalOpen: false });
  };

  private selectTier = (speed: FeeSpeed) => {
    this.props.onSelectTier(speed);
    this.closeModal();
  };

  private applyCustom = () => {
    const rate = Math.round(Number(this.state.customDraft));
    if (rate > 0) {
      this.props.onApplyCustomFee(rate);
      this.closeModal();
    }
  };
}

// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
export default withStyles(styles)(NetworkFeeControl);
