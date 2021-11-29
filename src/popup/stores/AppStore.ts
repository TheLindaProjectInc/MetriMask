import { RouterStore } from 'mobx-react-router';

import NavBarStore from './components/NavBarStore';
import SessionStore from './SessionStore';
import LoginStore from './LoginStore';
import CreateWalletStore from './CreateWalletStore';
import SaveMnemonicStore from './SaveMnemonicStore';
import SavePrivateKeyStore from './SavePrivateKeyStore';
import AccountLoginStore from './AccountLoginStore';
import ImportStore from './ImportStore';
import SettingsStore from './SettingsStore';
import AccountDetailStore from './AccountDetailStore';
import SendStore from './SendStore';
import AddTokenStore from './AddTokenStore';
import AddMRC721TokenStore from './AddMRC721TokenStore';
import MainContainerStore from './MainContainerStore';

export default class AppStore {
  public routerStore: RouterStore;
  public sessionStore: SessionStore;
  public navBarStore: NavBarStore;
  public loginStore: LoginStore;
  public createWalletStore: CreateWalletStore;
  public saveMnemonicStore: SaveMnemonicStore;
  public savePrivateKeyStore: SavePrivateKeyStore;
  public accountLoginStore: AccountLoginStore;
  public importStore: ImportStore;
  public settingsStore: SettingsStore;
  public accountDetailStore: AccountDetailStore;
  public sendStore: SendStore;
  public addTokenStore: AddTokenStore;
  public addMrc721TokenStore: AddMRC721TokenStore;
  public mainContainerStore: MainContainerStore;

  constructor() {
    this.routerStore = new RouterStore();
    this.sessionStore = new SessionStore();
    this.navBarStore = new NavBarStore(this);
    this.loginStore = new LoginStore(this);
    this.createWalletStore = new CreateWalletStore(this);
    this.saveMnemonicStore = new SaveMnemonicStore(this);
    this.savePrivateKeyStore = new SavePrivateKeyStore(this);
    this.accountLoginStore = new AccountLoginStore(this);
    this.importStore = new ImportStore(this);
    this.settingsStore = new SettingsStore();
    this.accountDetailStore = new AccountDetailStore(this);
    this.sendStore = new SendStore(this);
    this.addTokenStore = new AddTokenStore(this);
    this.addMrc721TokenStore = new AddMRC721TokenStore(this);
    this.mainContainerStore = new MainContainerStore(this);
  }
}

export const store = new AppStore();
Object.assign(window, { store });
