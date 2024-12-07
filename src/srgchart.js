const web3Provider = {
    SELECT: '',
    ETH: 'https://rpc.payload.de',
    BSC: 'https://bsc-dataseed4.ninicoin.io',
    TEST: 'https://bsc-testnet.public.blastapi.io',
    ARBI: 'https://arbitrum-one.public.blastapi.io',
    SRG20BSC: 'https://bsc-dataseed4.ninicoin.io',
    SRG20ETH:'https://rpc.payload.de',
    SRG20ARBI:'https://arbitrum-one.public.blastapi.io'
};

const standardAddress={
    SELECT: '',
    ETH: '0xcD682EF09d07668d49A8103ddD65Ff54AebFbfDe',
    BSC: '0x9f19c8e321bD14345b797d43E01f0eED030F5Bff',
    TEST: '0x3816B271c3D89726e80f4c79EE303639d05999D0',
    ARBI: '0x31aD8255CB8E428E8B0f6Ab6a6f44804642720aF',
    SRG20ARBI:'',
    SRG20BSC:'',
    SRG20ETH:''
}

const dumDivisor = {
    SELECT: '',
    ETH: 10**15,
    BSC: 10**27,
    TEST: 10**27,
    ARBI: 10**15,
    SRG20BSC: 10**45,
    SRG20ETH:10**33,
    SRG20ARBI: 10**33
};

// const tokenAddress = {
//     ETH: '0xAeef259Ecf82030aF988d3902D5cf7Ff7C0443A8',
//     BSC: '0xAeef259Ecf82030aF988d3902D5cf7Ff7C0443A8',
//     TEST: '0x0ad2B0ea33D8440Be279119E5722856Ec4009265'
// };

var dDivisor = dumDivisor[networkSelect.value];
var web3ProviderCurrent = web3Provider[networkSelect.value];
// //const web3 = new Web3();
// //const provider = new Web3.providers.HttpProvider(web3ProviderCurrent);
// //web3.setProvider(provider);

//Add an event listener to update the web3 provider when the network is changed
networkSelect.addEventListener('change', () => {
    web3ProviderCurrent = web3Provider[networkSelect.value];
    dDivisor = dumDivisor[networkSelect.value];
    document.getElementById("tokenAddress").value = standardAddress[networkSelect.value]
    console.log(web3ProviderCurrent)
    //  web3.setProvider(Web3.providers.HttpProvider(web3Provider[networkSelect.value]));
    //     const contract = new web3.eth.Contract(surgeAbi, tokenAddress[networkSelect.value]);
});

//////////////// CHART //////////////////////////

// Create the Lightweight Chart within the container element

const chart = LightweightCharts.createChart(
    document.getElementById('tvChart'),
    {
        layout: {
            background: { color: "#222" },
            textColor: "#DDD",
        },
        grid: {
            vertLines: { color: "#444" },
            horzLines: { color: "#444" },
        }, drawing: true,
        decimals: 5,
    }
);

chart.applyOptions({
    resolution: '5',
    decimals: 7,

});

chart.applyOptions({
    crosshair: {
        // Change mode from default 'magnet' to 'normal'.
        // Allows the crosshair to move freely without snapping to datapoints
        mode: LightweightCharts.CrosshairMode.Normal,
    },
});

// Setting the border color for the vertical axis
chart.priceScale().applyOptions({
    borderColor: "#71649C",
    priceVisible: true,
});

// Setting the border color for the horizontal axis
chart.timeScale().applyOptions({
    borderColor: "#71649C",
    timeVisible: true,
    secondsVisible: true,
});

const myPriceFormatter = p => p.toFixed(6);

// Apply the custom priceFormatter to the chart
chart.applyOptions({
    localization: {
        priceFormatter: myPriceFormatter,
    },
});

//shit charts
var shitAddresses = ["0xdB8068c80a618A8A27Cad29672FA89F30C0dA61c","0x4ceaCF951294f78bde6B51863aF8fDC03d54728e"];

function chunkArray(array, size) {
    return Array.from({ length: Math.ceil(array.length / size) }, (v, i) =>
      array.slice(i * size, i * size + size)
    );
  }

// Initial chart creation
var candleStickData = [];
var timeFrameSec = 300;
var mainSeries = chart.addCandlestickSeries();
var firstTransformedCandles;
var contract;
var tokenContract;
var ethcallProvider;
var surgeContract;
var txTimeStamps;
var lastIndex;

async function createChart() {
normalChart();
    
}

async function normalChart(){
    console.log("trying to create chart")
    web3 = new Web3(web3ProviderCurrent);
     tokenContract = document.getElementById("tokenAddress").value;
     contract = new web3.eth.Contract(surgeAbi, tokenContract);

    var result = await contract.methods.totalTx().call();
    console.log(result)

    // To connect to a custom URL:
    var customHttpProvider = new ethers.providers.JsonRpcProvider(web3ProviderCurrent);

    //ethcallPRovider
    ethcallProvider = new Provider();
    await ethcallProvider.init(customHttpProvider);

    //ethers contract
     surgeContract = new Contract(tokenContract, surgeAbi);

     
     txTimeStamps = [];
    for (let i = 1; i <= result; i++) {
        txTimeStamps.push(surgeContract.txTimeStamp(i.toString()));
    }

    
var parallelCalls = 8;
 // Chunk the array into smaller arrays to make parallel calls
const txTimeStampsChunks = chunkArray(txTimeStamps, Math.ceil(txTimeStamps.length / parallelCalls));

// Run the calls in parallel using Promise.all
const callResult1 = await Promise.all(
  txTimeStampsChunks.map(async (chunk) => {
    const tempResult1 = await ethcallProvider.all(chunk);
    return tempResult1;
  })
);

// Concatenate the results from all parallel calls
const finalResult1 = callResult1.flat();
    const candleI = [];
    
    for (const call of finalResult1) {
        candleI.push(surgeContract.candleStickData(parseInt(call)));
    }

 // Chunk the array into smaller arrays to make parallel calls
 const candleChunks = chunkArray(candleI, Math.ceil(candleI.length / parallelCalls));

 // Run the calls in parallel using Promise.all
 const callResult2 = await Promise.all(
   candleChunks.map(async (chunk) => {
     const tempResult1 = await ethcallProvider.all(chunk);
     return tempResult1;
   })
 );

const finalResult2 = callResult2.flat();

    firstTransformedCandles = firstTransform(finalResult2);

    candleStickData = transformCandlesticks(firstTransformedCandles, timeFrameSec, dDivisor);

    // Create the Main Series (Candlesticks)
    mainSeries = chart.addCandlestickSeries();
    // Set the data for the Main Series
    mainSeries.setData(candleStickData);

    lastIndex = result;
    autoUpdateChart();
}

function transformCandlesticks(candlesticks, timeFrame, dum_divisor) {

    // Create an empty array to store the 15-minute candlesticks
    const transfromedCandlesticks = [];

    // Create a map to store the candlesticks for each 15-minute block
    const blockCandlesticks = new Map();

    // Iterate over the seconds candlesticks
    for (const candlestick of candlesticks) {
        // Calculate the block number for the candlestick
        const block = Math.floor(candlestick.time / timeFrame);

        // If the block doesn't have any candlesticks yet, initialize it with the current candlestick
        if (!blockCandlesticks.has(block)) {
            blockCandlesticks.set(block, candlestick);
        } else {
            // If the block already has candlesticks, update the block with the current candlestick's prices
            const currentCandlestick = blockCandlesticks.get(block);
            currentCandlestick.high = Math.max(currentCandlestick.high, candlestick.high);
            currentCandlestick.low = Math.min(currentCandlestick.low, candlestick.low);
            currentCandlestick.close = candlestick.close;
        }
    }

    // Iterate over the blocks of candlesticks
    for (const [block, candlestick] of blockCandlesticks) {
        transfromedCandlesticks.push({
            time: block * timeFrame,
            open: candlestick.open / dum_divisor,
            high: candlestick.high / dum_divisor,
            low: candlestick.low / dum_divisor,
            close: candlestick.close / dum_divisor,
        });
    }

    // Return the 15-minute candlesticks
    return transfromedCandlesticks;
}  