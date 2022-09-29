import { isEmpty, split } from 'lodash';
import scrypt from 'scryptsy';
import MetriMaskController from '.';
import IController from './iController';
import { STORAGE } from '../../constants';

const INIT_VALUES = {
  appSalt: undefined,
  passwordHash: undefined,
};

export default class CryptoController extends IController {
  private static SCRYPT_PARAMS_PW: any = { N: 131072, r: 8, p: 1 };

  public get validPasswordHash(): string {
    if (!this.passwordHash) {
      throw Error('passwordHash should be defined');
    }
    return this.passwordHash;
  }

  private appSalt?: Uint8Array = INIT_VALUES.appSalt;
  private passwordHash?: string = INIT_VALUES.passwordHash;

  constructor(main: MetriMaskController) {
    super('crypto', main);

    chrome.storage.local.get([STORAGE.APP_SALT], ({ appSalt }: any) => {
      if (!isEmpty(appSalt)) {
        const array = split(appSalt as string, ',').map((str) => parseInt(str, 10));
        this.appSalt =  Uint8Array.from(array);
      }

      this.initFinished();
    });
  }

  public hasValidPasswordHash(): boolean {
    return !!this.passwordHash;
  }

  public resetPasswordHash = () => {
    this.passwordHash = INIT_VALUES.passwordHash;
  };

  /*
  * Generates the one-time created appSalt (if necessary) used to encrypt the user password.
  */
  public generateAppSaltIfNecessary = () => {
    try {
      if (!this.appSalt) {
        const appSalt: Uint8Array = self.crypto.getRandomValues(new Uint8Array(16)) ;
        this.appSalt = appSalt;
        chrome.storage.local.set(
          { [STORAGE.APP_SALT]: appSalt.toString() },
          () => console.log('appSalt set'),
        );
      }
    } catch (err) {
      throw Error('Error generating appSalt');
    }
  };

  /*
  * Derives the password hash with the password input.
  */
  public derivePasswordHash = (password: string, finish: () => {}) => {
    if (!this.appSalt) {
      throw Error('appSalt should not be empty');
    }


    // FIXME this causes the loading screen to "freeze"
    try {
      const saltBuffer = Buffer.from(this.appSalt);
      const { N, r, p } = CryptoController.SCRYPT_PARAMS_PW;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      const derivedKey = scrypt(password, saltBuffer, N, r, p, 64);
      this.passwordHash = derivedKey.toString('hex');
      finish();
    } catch (err) {
      console.log({ err });
    }


    /*
    * Create a web worker for the scrypt key derivation, so that it doesn't freeze the loading screen ui.
    * File path relative to post bundling of webpack. worker-loader node module did not work for me,
    * possibly a compatibility issue with chrome.
    */
    //  let sww;
    //  if (typeof(sww) === 'undefined') {
    //     sww = new self.Worker(
    //     // eslint-disable-next-line @typescript-eslint/restrict-plus-operands
    //     self.URL.createObjectURL(new Blob(['('+this.worker_function.toString()+')()'], {type: 'text/javascript'})));
    //     // sww = new Worker('./scryptworker.js');

    //     sww.postMessage({
    //      password,
    //      salt: this.appSalt,
    //      scryptParams: CryptoController.SCRYPT_PARAMS_PW,
    //    });

    //    sww.onmessage = (e) => {
    //      if (e.data.err) {
    //        throw Error('scrypt failed to calculate derivedKey');
    //      }
    //      this.passwordHash = e.data.passwordHash;
    //      finish();
    //    };
    // }
  };

  // public worker_function = () => {
  //   onmessage = (e) => {
  //     const ctx: Worker = self as any;
  //     try {
  //       const password = e.data.password;
  //       const salt = e.data.salt;
  //       // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
  //       const saltBuffer = Buffer.from(salt);
  //       const { N, r, p } = e.data.scryptParams;
  //       // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
  //       const derivedKey = scrypt(password, saltBuffer, N, r, p, 64);
  //       const passwordHash = derivedKey.toString('hex');
  //       ctx.postMessage({ passwordHash });
  //     } catch (err) {
  //       ctx.postMessage({ err });
  //     }
  //   };
  // };
}
