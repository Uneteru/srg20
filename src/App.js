import React, { useState } from 'react';
import Web3 from 'web3';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const App = () => {
  const [tokenAddress, setTokenAddress] = useState('0x43C3EBaFdF32909aC60E80ee34aE46637E743d65');
  const [tokenName, setTokenName] = useState('');
  const [tokenSymbol, setTokenSymbol] = useState('');
  const [tokenPrice, setTokenPrice] = useState('');
  const [error, setError] = useState('');
  const [progress, setProgress] = useState(0);
  const [priceData, setPriceData] = useState([]);
  const [volumeData, setVolumeData] = useState([]);

  //Ititializa web3 Contract
  const web3 = new Web3('https://bsc-dataseed4.ninicoin.io/');
  const tokenAbi = require('./ContractAbi.json');
  const tokenContract = new web3.eth.Contract(tokenAbi, tokenAddress);

  //Dividor
  const pDivisor = 10 ** 45; 
  const vDivisor = 10 ** 40;

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
      const price = Number(latestCandle.close) / pDivisor;
      setTokenPrice(price);
    } catch (err) {
      setError('Failed to fetch token info. Please check the address or try again.');
    }
  };

  const fetchTokenPriceHistory = async () => {
    fetchTokenInfo();
    //localStorage.clear();
    setProgress(0); // Reset progress


    /*const storedData = localStorage.getItem('priceData');
    if (storedData) {
      const parsedData = JSON.parse(storedData);
      setPriceData(parsedData); // Set data for the chart
      setProgress(100); // Set progress to 100% if data is already cached
      return;
    }*/

    const totalTx = await tokenContract.methods.totalTx().call();
    const priceDataArray = [];
    const volumeDataArray = [];
    
    for (let i = 1; i <= totalTx; i++) {


      const timestamp = await tokenContract.methods.txTimeStamp(i).call();
      const candle = await tokenContract.methods.candleStickData(timestamp).call();
      let txVolume = await tokenContract.methods.tVol(timestamp).call();
      const tnDate = new Date(Number(timestamp) * 1000).toLocaleString('en-US')
      const volDate = new Date(Number(timestamp) * 1000).toLocaleDateString('en-US')
    
      txVolume = Number(txVolume) / vDivisor;
      const openPrice = Number(candle.open) / pDivisor
      const closePrice = Number(candle.close) / pDivisor

      const existingEntry = volumeDataArray.find(entry => entry.date === volDate);

      if (existingEntry) {
        // If the date exists, add to its volume
        existingEntry.volume += Number(txVolume);
      } else {
        // Otherwise, create a new entry
        volumeDataArray.push({
          date: volDate,
          volume: Number(txVolume),
        });
      }

      priceDataArray.push({
        date: tnDate,
        closePrice,
      });

      setProgress(Math.floor((i / Number(totalTx)) * 100));
    }

    //localStorage.setItem('priceData', JSON.stringify(priceDataArray));

    setPriceData(priceDataArray)
    setVolumeData(volumeDataArray)
    console.log('All Price Data:', priceDataArray);
    console.log('Daily Volume History:', volumeDataArray);
    setProgress(100); // Ensure progress reaches 100% at the end
  };

  const fetchHistoryLiquidity = async () => {
    setProgress(0); // Reset progress
    try {
      const currentLiquidity = await tokenContract.methods.getLiquidity().call();
      console.log("Current Liquidity:", currentLiquidity);
  
      let liquidityAtTimestamp = Number(currentLiquidity);
  
      let totalTx = await tokenContract.methods.totalTx().call();
      totalTx = Number(totalTx);
  
      for (let i = totalTx; i >= 1; i--) {
        if (i <= totalTx - 10) break; // Limit to last 10 transactions
        const timestamp = await tokenContract.methods.txTimeStamp(i).call();
        const candle = await tokenContract.methods.candleStickData(timestamp).call();
  
        const openPrice = Number(candle.open);
        const closePrice = Number(candle.close);
  
        console.log("Transaction no:", i);
        console.log(
          "Timestamp:",
          new Date(Number(timestamp) * 1000).toLocaleString('en-US')
        );

  
        if (openPrice && closePrice) {
          const priceChange = closePrice - openPrice;
          const liquidityImpact = liquidityAtTimestamp * (priceChange / openPrice);
  
          // Determine if it's a BUY or SELL
          const isBuy = liquidityImpact < 0;
          console.log(isBuy ? "BUY." : "SELL.");
  
          // Adjust liquidity
          liquidityAtTimestamp = isBuy
            ? liquidityAtTimestamp - liquidityImpact
            : liquidityAtTimestamp + liquidityImpact;
  
          console.log("Liquidity Impact:", liquidityImpact);
          console.log("Liquidity at Timestamp:", liquidityAtTimestamp);
        }
        setProgress(Math.floor((Number(totalTx) / i) * 100));
      }

      setProgress(100); // Ensure progress reaches 100% at the end
    } catch (err) {
      console.error("Error interacting with contract:", err);
      setError("Failed to fetch liquidity. Please try again.");
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


      {progress > 0 && (
        <div style={{ marginTop: '20px', width: '50%', margin: '20px auto' }}>
          <div
            style={{
              width: '100%',
              height: '20px',
              backgroundColor: '#e0e0e0',
              borderRadius: '5px',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: `${progress}%`,
                height: '100%',
                backgroundColor: '#007bff',
                transition: 'width 0.3s ease',
              }}
            />
          </div>
          <p style={{ marginTop: '10px', fontSize: '14px' }}>
            Progress: {progress}%
          </p>
        </div>
      )}

      {tokenName && tokenSymbol && tokenPrice && (
        <div style={{ marginTop: '20px', fontSize: '18px', color: 'green' }}>
          <strong>Token Name:</strong> {tokenName} ({tokenSymbol})
          <br />
          <strong>Current Price:</strong> {tokenPrice} SRG
        </div>
      )}

      {priceData.length > 0 && (
        <div style={{ width: '100%', height: 400, marginTop: '20px' }}>
          <ResponsiveContainer>
            <LineChart data={priceData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Line type="monotone" dataKey="closePrice" stroke="#8884d8" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {volumeData.length > 0 && (
        <div style={{ width: '100%', height: 400, marginTop: '20px' }}>
          <ResponsiveContainer>
            <LineChart data={volumeData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Line type="monotone" dataKey="volume" stroke="#8884d8" dot={false} />
            </LineChart>
          </ResponsiveContainer>
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