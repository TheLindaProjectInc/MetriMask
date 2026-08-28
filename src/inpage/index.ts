/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { IExtensionAPIMessage } from '../types';
import { TARGET_NAME, API_TYPE } from '../constants';
import { MetriMaskRPCProvider } from './MetriMaskRPCProvider';
import { isMessageNotValid } from '../utils';
import { IInpageAccountWrapper } from '../types';

const metrimaskProvider: MetriMaskRPCProvider = new MetriMaskRPCProvider();

let metrimask: any = {
  rpcProvider: metrimaskProvider,
  account: null,
};

const handlePortDisconnected = () => {
  metrimask = undefined;
  Object.assign(window, { metrimask });
  window.removeEventListener('message', handleInpageMessage, false);
};

const handleInpageMessage = (event: MessageEvent) => {
  if (isMessageNotValid(event, TARGET_NAME.INPAGE)) {
    return;
  }

  const message: IExtensionAPIMessage<any> = event.data.message;
  switch (message.type) {
    case API_TYPE.RPC_RESPONSE:
      return metrimaskProvider.handleRpcCallResponse(message.payload);
    case API_TYPE.SEND_INPAGE_METRIMASK_ACCOUNT_VALUES:
      const accountWrapper: IInpageAccountWrapper = message.payload;
      metrimask.account = accountWrapper.account;
      if (accountWrapper.error) {
        throw accountWrapper.error;
      } else {
        console.log('window.metrimask.account has been updated,\n Reason:',  accountWrapper.statusChangeReason);
      }
      break;
    case API_TYPE.PORT_DISCONNECTED:
      handlePortDisconnected();
      break;
    default:
      // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
      throw Error(`Inpage processing invalid type: ${message}`);
  }
};

// Add message listeners
window.addEventListener('message', handleInpageMessage, false);

// expose apis
Object.assign(window, {
  metrimask,
});
