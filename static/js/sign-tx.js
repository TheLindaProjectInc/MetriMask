let fromAddress;
let request;

const updateFields = () => {
  const { args } = request;
  const to = args[0];
  const amount = args[2] || 0;
  const gasLimit = args[3] || 250000;
  const gasPrice = args[4] ? gasConvert(Number(args[4])) : 10000;
  const maxTxFee = Math.round(gasLimit * gasPrice * 1000) / 1e11;

  document.getElementById('from-field').innerText = fromAddress;
  document.getElementById('to-field').innerText = to;
  document.getElementById('amount-field').value = amount;
  document.getElementById('gas-limit-field').value = gasLimit;
  document.getElementById('gas-price-field').value = gasPrice;
  document.getElementById('max-tx-fee-field').innerText = maxTxFee;
  document.getElementById('raw-tx-field').innerText = JSON.stringify(request);
};

function gasConvert(amount) {
  if (amount % 1 != 0) {
    request.args[4] = amount * 1e8;
    return amount * 1e8;
  }
  return amount;
}

const extractReqParams = () => {
  const urlParams = window.location.search.substr(1).split('&');
  urlParams.forEach((param) => {
    const keyValue = param.split('=');
    if (keyValue.length !== 2) {
      return;
    }

    const key = keyValue[0];
    if (key === 'req') {
      request = JSON.parse(decodeURIComponent(keyValue[1]));
      delete request.account; // Remove the account obj from the raw request
    } else if (key === 'from') {
      fromAddress = keyValue[1];
    }
  });

  updateFields();
};

const confirmTransaction = () => {
  const { id, args } = request;
  chrome.runtime.sendMessage({
    type: 'EXTERNAL_SEND_TO_CONTRACT', // MESSAGE_TYPE.EXTERNAL_SEND_TO_CONTRACT
    id,
    args
  });

  window.close();
};

const cancelTransaction = () => {
  chrome.runtime.sendMessage({
    type: 'METRIMASK_WINDOW_CLOSE' // MESSAGE_TYPE.METRIMASK_WINDOW_CLOSE
  });

  window.close();
};

window.onload = () => {
  extractReqParams();
  document
    .getElementById('button-confirm')
    .addEventListener('click', confirmTransaction);
  document
    .getElementById('button-cancel')
    .addEventListener('click', cancelTransaction);
  document.getElementById('amount-field').addEventListener('change', (res) => {
    request.args[2] = res.target.value ? parseInt(res.target.value) : 0;
    updateFields();
  });
  document
    .getElementById('gas-price-field')
    .addEventListener('change', (res) => {
      request.args[4] = res.target.value ? parseInt(res.target.value) : 10000;
      updateFields();
    });
  document
    .getElementById('gas-limit-field')
    .addEventListener('change', (res) => {
      request.args[3] = res.target.value ? parseInt(res.target.value) : 250000;
      updateFields();
    });
};
