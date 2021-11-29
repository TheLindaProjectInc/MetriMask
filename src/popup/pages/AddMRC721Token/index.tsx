import React, { Component } from 'react';
import { Typography, TextField, Button, withStyles, WithStyles } from '@material-ui/core';
import { inject, observer } from 'mobx-react';
import cx from 'classnames';

import styles from './styles';
import NavBar from '../../components/NavBar';
import AppStore from '../../stores/AppStore';
import { handleEnterPress } from '../../../utils';

interface IProps {
  classes: Record<string, string>;
  store: AppStore;
}

@inject('store')
@observer
class AddToken extends Component<WithStyles & IProps, {}> {
  public componentDidMount() {
    this.props.store.addMrc721TokenStore.init();
  }

  public render() {
    const { classes, store: { addMrc721TokenStore } } = this.props;

    return (
      <div className={classes.root}>
        <NavBar hasBackButton title="Add Token" />
        <div className={classes.contentContainer}>
          <div className={classes.fieldsContainer}>
            <ContractAddressField onEnterPress={this.onEnterPress} {...this.props} />
            {addMrc721TokenStore.name && (
            <div>
              <DetailField fieldName={'Token Name'} value={addMrc721TokenStore.name} classes={classes} />
              <DetailField fieldName={'Token Symbol'} value={addMrc721TokenStore.symbol} {...this.props} />
            </div>
            )}
          </div>
          {!!addMrc721TokenStore.tokenAlreadyInListError && (
            <Typography className={classes.errorText}>{addMrc721TokenStore.tokenAlreadyInListError}</Typography>
          )}
          <AddButton {...this.props} />
        </div>
      </div>
    );
  }

  private onEnterPress = (event: any) => {
    handleEnterPress(event, () => {
      if (!this.props.store.addMrc721TokenStore.buttonDisabled) {
        this.props.store.addMrc721TokenStore.addToken();
      }
    });
  }
}

const Heading = withStyles(styles, { withTheme: true })(({ classes, name }: any) => (
  <Typography className={classes.fieldHeading}>{name}</Typography>
));

const ContractAddressField = observer(({ classes, store: { addMrc721TokenStore }, onEnterPress }: any) => (
  <div className={classes.fieldContainer}>
    <Heading name="Contract Address" />
    <div className={classes.fieldContentContainer}>
      <TextField
        fullWidth
        type="text"
        multiline={false}
        value={addMrc721TokenStore.contractAddress || ''}
        InputProps={{ disableUnderline: true }}
        onChange={(event) => addMrc721TokenStore.contractAddress = event.target.value}
        onKeyPress={onEnterPress}
      />
    </div>
    {addMrc721TokenStore.contractAddressFieldError && (
      <Typography className={classes.errorText}>{addMrc721TokenStore.contractAddressFieldError}</Typography>
    )}
  </div>
));

const DetailField = ({ classes, fieldName, value }: any) => (
  <div className={cx(classes.detailContainer)}>
    <div className={classes.labelContainer}>
      <Typography className={cx(classes.detailLabel)}>{fieldName}</Typography>
    </div>
    <div className={classes.valueContainer}>
      <Typography className={classes.detailValue}>{value || ''}</Typography>
    </div>
  </div>
);

const AddButton = observer(({ classes, store: { addMrc721TokenStore } }: any) => (
  <Button
    className={classes.addButton}
    fullWidth
    variant="contained"
    color="primary"
    disabled={addMrc721TokenStore.buttonDisabled}
    onClick={addMrc721TokenStore.addToken}
  >
    Add
  </Button>
));

export default withStyles(styles)(AddToken);
