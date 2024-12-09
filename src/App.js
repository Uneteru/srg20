import React, { useState } from 'react';
import Web3 from 'web3';

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
      inputs: [],
      name: 'totalVolume',
      outputs: [{ name: '', type: 'uint256' }],
      type: 'function',
    },
    {
      constant: true,
      inputs: [{ name: 'index', type: 'uint256' }],
      name: 'tVol',
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
    {
      constant: true,
      inputs: [],
      name: 'getLiquidity',
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
      const latestTimestamp = await tokenContract.methods.txTimeStamp(totalTx).call();
      const latestCandle = await tokenContract.methods.candleStickData(latestTimestamp).call();
      const price = web3.utils.fromWei(latestCandle.close, 'ether');
      setTokenPrice(price);
    } catch (err) {
      setError('Failed to fetch token info. Please check the address or try again.');
    }
  };

  const fetchDailyVolume = async () => {
    const storedData = localStorage.getItem('dailyVolume');
    if (storedData) {
      console.log('Daily Volume History:', JSON.parse(storedData));
      return;
    }

    const totalTx = await tokenContract.methods.totalTx().call();
    console.log('Total Transactions:', totalTx);

    const dailyVolume = {};

    for (let i = 1; i <= totalTx; i++) {
      const txTimestamp = await tokenContract.methods.txTimeStamp(i).call();
      const txVolume = await tokenContract.methods.tVol(txTimestamp).call();
      const date = new Date((Number(txTimestamp) * 1000)).toISOString().split('T')[0];
      console.log(date);

        // Group by date
        if (!dailyVolume[date]) {
          dailyVolume[date] = 0;
        }
        dailyVolume[date] += parseFloat(web3.utils.fromWei(txVolume, 'ether'));
        console.log(dailyVolume[date]);

    }
    localStorage.setItem('dailyVolume', JSON.stringify(dailyVolume));
    console.log('Daily Volume History:', dailyVolume);

  }

  const fetchTokenPriceHistory = async () => {
    const storedData = localStorage.getItem('priceData');
    if (storedData) {
      console.log('All Price Data:', JSON.parse(storedData));
      return;
    }

    const totalTx = await tokenContract.methods.totalTx().call();
    const priceData = [];
    for (let i = 1; i <= totalTx; i++) {
      const timestamp = await tokenContract.methods.txTimeStamp(i).call();
      const candle = await tokenContract.methods.candleStickData(timestamp).call();
      const closePrice = web3.utils.fromWei(candle.close, 'ether');
      priceData.push({ date: new Date(Number(timestamp) * 1000), closePrice });
    }

    localStorage.setItem('priceData', JSON.stringify(priceData));
    console.log('All Price Data:', priceData);
  };

  const fetchHistoryLiquidity = async () => {
  
      try {
        const currentLiquidity = await tokenContract.methods.getLiquidity().call();
        console.log('Current Liquidity:', currentLiquidity);
  
        let liquidityAtTimestamp = Number(currentLiquidity);
        
        let totalTx = await tokenContract.methods.totalTx().call();
        totalTx = Number(totalTx);

        for (let i = totalTx; i >= 1; i--) {
          if (i <= totalTx - 10) break;
          const timestamp = await tokenContract.methods.txTimeStamp(i).call();
          const candle = await tokenContract.methods.candleStickData(timestamp).call();
        

          const openPrice = Number(candle.open);
          const closePrice = Number(candle.close);

          console.log('Transaction no:', i);
          console.log('Timestamp:', timestamp);
          console.log('Candle: ', candle);

          if (openPrice && closePrice) {
            const priceChange = closePrice - openPrice;
            const liquidityImpact = liquidityAtTimestamp * (priceChange / openPrice);
    
            // Adjust liquidity based on price direction
             liquidityAtTimestamp = closePrice > openPrice
              ? liquidityAtTimestamp - liquidityImpact // Price increase (buy)
              : liquidityAtTimestamp + liquidityImpact; // Price decrease (sell)
    
            console.log("Liquidity Impact:", liquidityImpact);
            console.log("Liquidity at Timestamp:", liquidityAtTimestamp);
          }
        }
        
      } catch (err) {
        console.error('Error interacting with contract:', err);
        setError('Failed to fetch liquidity. Please try again.');
      }
    
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
        <button
          onClick={fetchDailyVolume}
          style={{
            padding: '10px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
          }}
        >
          Fetch Daily Volume
        </button>
        <button
          onClick={fetchHistoryLiquidity}
          style={{
            padding: '10px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
          }}
        >
          Fetch History Liquidity
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