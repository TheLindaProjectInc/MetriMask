import React, { Component } from 'react';
import { inject, observer } from 'mobx-react';
import { unstable_HistoryRouter as HistoryRouter, Route, Routes } from 'react-router-dom';
import { SynchronizedHistory } from 'mobx-react-router';
import {
  Button,
   Dialog,
   DialogTitle,
   DialogContent,
   DialogContentText,
   DialogActions
  } from '@material-ui/core';

import Loading from './components/Loading';
import Login from './pages/Login';
import CreateWallet from './pages/CreateWallet';
import SaveMnemonic from './pages/SaveMnemonic';
import ImportWallet from './pages/ImportWallet';
import ExportWallet from './pages/ExportWallet';
import AccountLogin from './pages/AccountLogin';
import Settings from './pages/Settings';
import Home from './pages/Home';
import AccountDetail from './pages/AccountDetail';
import Send from './pages/Send';
import Receive from './pages/Receive';
import SendConfirm from './pages/SendConfirm';
import AddToken from './pages/AddToken';
import AddMrc721Token from './pages/AddMRC721Token';
import AppStore, { store } from './stores/AppStore';
import { MESSAGE_TYPE } from '../constants';

interface IProps {
  history: SynchronizedHistory;
  store?: AppStore;
}

@inject('store')
@observer
export default class MainContainer extends Component<IProps, {}> {

  public componentDidMount() {
    this.props.store!.mainContainerStore.init();
  }

  public componentWillUnmount() {
    chrome.runtime.sendMessage({ type: MESSAGE_TYPE.LOGOUT });
  }

  public render() {
    const { history }: any = this.props;

    return (
      <div style={{ width: '100%', height: '100%' }}>
        <HistoryRouter history={history}>
          <Routes>
            <Route path="/loading" element={<Loading />} />
            <Route path="/login" element={<Login store={store}/>} />
            <Route path="/create-wallet" element={<CreateWallet store={store}/>} />
            <Route path="/save-mnemonic" element={<SaveMnemonic store={store}/>} />
            <Route path="/import-wallet" element={<ImportWallet store={store}/>} />
            <Route path="/export-wallet" element={<ExportWallet store={store}/>} />
            <Route path="/account-login" element={<AccountLogin store={store}/>} />
            <Route path="/settings" element={<Settings store={store}/>} />
            <Route path="/home" element={<Home store={store}/>} />
            <Route path="/account-detail" element={<AccountDetail store={store}/>} />
            <Route path="/send" element={<Send store={store}/>} />
            <Route path="/send-confirm" element={<SendConfirm store={store}/>} />
            <Route path="/receive" element={<Receive store={store}/>} />
            <Route path="/add-token" element={<AddToken store={store}/>} />
            <Route path="/add-mrc721-token" element={<AddMrc721Token store={store}/>} />
          </Routes>
        </HistoryRouter>
        <UnexpectedErrorDialog />
      </div>
    );
  }
}

const UnexpectedErrorDialog: React.FC<any> = inject('store')(observer(({ store: { mainContainerStore } }) => (
  <Dialog
    disableBackdropClick
    open={!!mainContainerStore.unexpectedError}
    onClose={() => mainContainerStore.unexpectedError = undefined}
  >
    <DialogTitle>Unexpected Error</DialogTitle>
    <DialogContent>
      <DialogContentText>{ mainContainerStore.unexpectedError }</DialogContentText>
    </DialogContent>
    <DialogActions>
      <Button onClick={() => mainContainerStore.unexpectedError = undefined} color="primary">Close</Button>
    </DialogActions>
  </Dialog>
)));
