import React, { useState } from 'react';
import Web3 from 'web3';
import { Chart } from 'react-google-charts';

const App = () => {
  const [tokenAddress, setTokenAddress] = useState('0x43C3EBaFdF32909aC60E80ee34aE46637E743d65');
  const [tokenName, setTokenName] = useState('');
  const [tokenSymbol, setTokenSymbol] = useState('');
  const [tokenPrice, setTokenPrice] = useState('');
  const [error, setError] = useState('');

  const web3 = new Web3('https://bsc-dataseed4.ninicoin.io/');

  const tokenAbi = [
    {
      constant: true,
      inputs: [],
      name: 'name',
      outputs: [{ name: '', type: 'string' }],
      type: 'function',
    },
    {
      constant: true,
      inputs: [],
      name: 'symbol',
      outputs: [{ name: '', type: 'string' }],
      type: 'function',
    },
    {
      constant: true,
      inputs: [{ name: 'timestamp', type: 'uint256' }],
      name: 'candleStickData',
      outputs: [
        { name: 'time', type: 'uint256' },
        { name: 'open', type: 'uint256' },
        { name: 'close', type: 'uint256' },
        { name: 'high', type: 'uint256' },
        { name: 'low', type: 'uint256' },
      ],
      type: 'function',
    },
    {
      constant: true,
      inputs: [],
      name: 'totalTx',
      outputs: [{ name: '', type: 'uint256' }],
      type: 'function',
    },
    {
      constant: true,
      inputs: [{ name: 'index', type: 'uint256' }],
      name: 'txTimeStamp',
      outputs: [{ name: '', type: 'uint256' }],
      type: 'function',
    },
  ];
  const tokenContract = new web3.eth.Contract(tokenAbi, tokenAddress);

  const fetchTokenInfo = async () => {
    setError('');
    setTokenName('');
    setTokenSymbol('');
    setTokenPrice('');

    if (!web3.utils.isAddress(tokenAddress)) {
      setError('Invalid token address');
      return;
    }

    try {

      const name = await tokenContract.methods.name().call();
      setTokenName(name);

      const symbol = await tokenContract.methods.symbol().call();
      setTokenSymbol(symbol);

      const totalTx = await tokenContract.methods.totalTx().call();
      console.log(totalTx);

      const latestTimestamp = await tokenContract.methods.txTimeStamp(totalTx).call();
      const latestDate = new Date(Number(latestTimestamp) * 1000);
      console.log(latestDate);
      const latestCandle = await tokenContract.methods.candleStickData(latestTimestamp).call();
      console.log('price ', latestCandle.close);
      const price = web3.utils.fromWei(latestCandle.close, 'ether');
      setTokenPrice(price);
    } catch (err) {
      setError('Failed to fetch token info. Please check the address or try again.');
    }
  };

  const fetchTokenPriceHistory = async () => {
    const totalTx = await tokenContract.methods.totalTx().call();
    const priceData = [];
    for (let i = 1; i <= totalTx; i++) {
      const timestamp = await tokenContract.methods.txTimeStamp(i).call();
      const candle = await tokenContract.methods.candleStickData(timestamp).call();
      const closePrice = web3.utils.fromWei(candle.close, 'ether');

      priceData.push({ timestamp, closePrice });
      console.log(`Transaction #${i}: Timestamp - ${timestamp}, Close Price - ${closePrice}`);
    }

  console.log('All Price Data:', priceData);

  };

  const handleInputChange = (e) => {
    setTokenAddress(e.target.value);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      fetchTokenInfo();
    }
  };

  return (
    <div style={{ textAlign: 'center', marginTop: '50px' }}>
      <h1>Fetch Token Info</h1>
      <div>
        <input
          type="text"
          placeholder="Enter token address"
          value={tokenAddress}
          onChange={handleInputChange}
          onKeyPress={handleKeyPress}
          style={{ padding: '10px', width: '300px', marginRight: '10px' }}
        />
        <button
          onClick={fetchTokenInfo}
          style={{
            padding: '10px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
          }}
        >
          Fetch Price
        </button>
        <button
          onClick={fetchTokenPriceHistory}
          style={{
            padding: '10px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
          }}
        >
          Fetch Price History
        </button>
      </div>

      {tokenName && tokenSymbol && tokenPrice && (
        <div style={{ marginTop: '20px', fontSize: '18px', color: 'green' }}>
          <strong>Token Name:</strong> {tokenName} ({tokenSymbol})
          <br />
          <strong>Current Price:</strong> {tokenPrice} SRG
        </div>
      )}

      {error && (
        <div style={{ marginTop: '20px', fontSize: '16px', color: 'red' }}>
          {error}
        </div>
      )}
    </div>
  );
};

export default App;