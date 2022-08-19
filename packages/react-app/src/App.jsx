import { Alert, Button, Col, Menu, Row, message, Dropdown, InputNumber, Divider, Image, Input } from "antd";
import img1 from "./path31.png";
import "antd/dist/antd.css";
import {
  useBalance,
  useContractLoader,
  useContractReader,
  useGasPrice,
  useOnBlock,
  useUserProviderAndSigner,
} from "eth-hooks";
import { useExchangeEthPrice } from "eth-hooks/dapps/dex";
import React, { useCallback, useEffect, useState } from "react";
import { Link, Route, Switch, useLocation } from "react-router-dom";
import "./App.css";
import {
  Account,
  Contract,
  Faucet,
  GasGauge,
  Header,
  Ramp,
  ThemeSwitch,
  NetworkDisplay,
  FaucetHint,
  NetworkSwitch,
} from "./components";
import { NETWORKS, ALCHEMY_KEY, SUPERVISOR, CASPER_RFBTC_CONTRACT_HASH } from "./constants";
import externalContracts from "./contracts/external_contracts";
// contracts
import deployedContracts from "./contracts/hardhat_contracts.json";
import { Transactor, Web3ModalSetup, CasperHelper } from "./helpers";
import { Home, ExampleUI, Hints, Subgraph } from "./views";
import { useStaticJsonRPC } from "./hooks";
//import { useStaticJsonRPC, useLocalStorage } from "./hooks";
const { BigNumber } = require("ethers");

const { ethers } = require("ethers");

const _sodium = require("libsodium-wrappers");

import { CasperClient, CasperServiceByJsonRPC, CLPublicKey, DeployUtil } from "casper-js-sdk";

//Create Casper client and service to interact with Casper node.
const apiUrl = "http://65.21.111.173:7777/rpc";
const casperService = new CasperServiceByJsonRPC(apiUrl);
const casperClient = new CasperClient(apiUrl);

/// 📡 What chain are your contracts deployed to?
const targetNetwork = NETWORKS.localhost; // <------- select your target frontend network (localhost, rinkeby, xdai, mainnet)

// 😬 Sorry for all the console logging
const DEBUG = true;
const NETWORKCHECK = true;

const web3Modal = Web3ModalSetup();

// 🛰 providers
const providers = [
  "https://eth-mainnet.gateway.pokt.network/v1/lb/611156b4a585a20035148406",
  `https://eth-mainnet.alchemyapi.io/v2/${ALCHEMY_KEY}`,
  "https://rpc.scaffoldeth.io:48544",
];

// CASPER 0 [

let casper = {
  connected: false,
  publicKey: "",
};

// CASPER 0 ]

function App(props) {
  // specify all the chains your app is available on. Eg: ['localhost', 'mainnet', ...otherNetworks ]
  // reference './constants.js' for other networks
  const networkOptions = ["localhost", "mainnet", "rinkeby"];

  const [injectedProvider, setInjectedProvider] = useState();
  const [address, setAddress] = useState();
  const [selectedNetwork, setSelectedNetwork] = useState(networkOptions[0]);
  const location = useLocation();

  /// 📡 What chain are your contracts deployed to?
  const targetNetwork = NETWORKS[selectedNetwork]; // <------- select your target frontend network (localhost, rinkeby, xdai, mainnet)

  // 🔭 block explorer URL
  const blockExplorer = targetNetwork.blockExplorer;

  // load all your providers
  const localProvider = useStaticJsonRPC([
    process.env.REACT_APP_PROVIDER ? process.env.REACT_APP_PROVIDER : targetNetwork.rpcUrl,
  ]);
  const mainnetProvider = useStaticJsonRPC(providers);

  if (DEBUG) console.log(`Using ${selectedNetwork} network`);

  // 🛰 providers
  if (DEBUG) console.log("📡 Connecting to Mainnet Ethereum");

  const logoutOfWeb3Modal = async () => {
    await web3Modal.clearCachedProvider();
    if (injectedProvider && injectedProvider.provider && typeof injectedProvider.provider.disconnect == "function") {
      await injectedProvider.provider.disconnect();
    }
    setTimeout(() => {
      window.location.reload();
    }, 1);
  };

  /* 💵 This hook will get the price of ETH from 🦄 Uniswap: */
  const price = useExchangeEthPrice(targetNetwork, mainnetProvider);

  /* 🔥 This hook will get the price of Gas from ⛽️ EtherGasStation */
  const gasPrice = useGasPrice(targetNetwork, "fast");
  // Use your injected provider from 🦊 Metamask or if you don't have it then instantly generate a 🔥 burner wallet.
  const userProviderAndSigner = useUserProviderAndSigner(injectedProvider, localProvider);
  const userSigner = userProviderAndSigner.signer;

  const updateAddressMetamask = async () => {
    if (injectedProvider) {
      const accounts = await injectedProvider.listAccounts();
      const newAddress = accounts[0];
      setAddress(newAddress);
      return true;
    }
    return false;
  };

  const updateAddress = async () => {
    if (await updateAddressMetamask()) {
      return;
    }
    if (userSigner) {
      const newAddress = await userSigner.getAddress();
      console.log(`set userSigner newAddress ${newAddress}`);
      setAddress(newAddress);
    }
  };

  updateAddress();

  // You can warn the user if you would like them to be on a specific network
  const localChainId = localProvider && localProvider._network && localProvider._network.chainId;
  const selectedChainId =
    userSigner && userSigner.provider && userSigner.provider._network && userSigner.provider._network.chainId;

  // For more hooks, check out 🔗eth-hooks at: https://www.npmjs.com/package/eth-hooks

  // The transactor wraps transactions and provides notificiations
  const tx = Transactor(userSigner, gasPrice);

  // 🏗 scaffold-eth is full of handy hooks like this one to get your balance:
  const yourLocalBalance = useBalance(localProvider, address);

  // Just plug in different 🛰 providers to get your balance on different chains:
  const yourMainnetBalance = useBalance(mainnetProvider, address);

  // const contractConfig = useContractConfig();

  const contractConfig = { deployedContracts: deployedContracts || {}, externalContracts: externalContracts || {} };

  // Load in your local 📝 contract and read a value from it:
  const readContracts = useContractLoader(localProvider, contractConfig);

  // If you want to make 🔐 write transactions to your contracts, use the userSigner:
  const writeContracts = useContractLoader(userSigner, contractConfig, localChainId);
  

//  writeContracts && writeContracts.YourContract && writeContracts.YourContract.setPurpose("🍻 Cheers");

  // EXTERNAL CONTRACT EXAMPLE:
  //
  // If you want to bring in the mainnet DAI contract it would look like:
  const mainnetContracts = useContractLoader(mainnetProvider, contractConfig);

  // If you want to call a function on a new block
  useOnBlock(mainnetProvider, () => {
    console.log(`⛓ A new mainnet block is here: ${mainnetProvider._lastBlockNumber}`);
  });

  // Then read your DAI balance like:
  const myMainnetDAIBalance = useContractReader(mainnetContracts, "DAI", "balanceOf", [
    "0x34aA3F359A9D614239015126635CE7732c18fDF3",
  ]);
  // keep track of a variable from the contract in the local React state:
  const purpose = useContractReader(readContracts, "YourContract", "purpose");

  const orders = useContractReader(readContracts, "YourContract", "getOrders");

  console.log("purpose", purpose);
  console.log("orders", orders);

  const ethContractError = !Array.isArray(orders);

  // ###############
  // #####  1  #####
  // ###############

  // SUPERVISOR [

  const Supervisor = SUPERVISOR;

  // SUPERVISOR ]
  // COIN [

  function tornEthereum() {
    return {
      blockchain: "Ethereum",
      symbol: "ETH",
      price: 1,
      connected: true,
      address: address,
    };
  }

  function tornCasper() {
    return {
      blockchain: "Casper",
      symbol: "RFBTC",
      price: 2,
      connected: casper.connected,
      address: casper.connected ? (
        casper.publicKey
      ) : (
        <div>
          <Button type="link" onClick={casperConnect}>
            Connect Casper Signer
          </Button>
        </div>
      ),
    };
  }

  const coinsDef = [
    {
      index: 0,
      symbol: "ETH",
      torn: tornEthereum,
    },
    {
      index: 1,
      symbol: "RFBTC",
      torn: tornCasper,
    },
  ];

  function coinBySymbol(symbol) {
    return coinsDef.find(i => i.symbol == symbol);
  }

  const [selectedCoinLeft, setSelectedCoinLeft] = useState("ETH");
  const [selectedCoinRight, setSelectedCoinRight] = useState("RFBTC");

  let coinsExchange = [
    // default ETH -> RFBTC
    coinBySymbol(selectedCoinLeft),
    coinBySymbol(selectedCoinRight),
  ];

  // COIN ]

  // ###############
  // #####  3  #####
  // ###############

  // CASPER WALLET [

  const [csprPrivKey, setCsprPrivKey] = useState("");
  const [csprBalance, setCsprBalance] = useState([]);
  const [csprSymbol, setCsprSymbol] = useState([]);

  const handleChangePrivKey = function handleChangePrivKey(e) {
    setCsprPrivKey(e.target.value);
  };
  async function getRFBTCBalance() {
    const contractRFBTC = CASPER_RFBTC_CONTRACT_HASH;
    const rfbtcOwner = casper.publicKey;

    if (rfbtcOwner == "") {
      return;
    }

    const def = await CasperHelper.getContractArtifacts(contractRFBTC, rfbtcOwner);

    if (def.err) {
      console.error(def);
      return;
    }

    setCsprBalance(def.balance);
    setCsprSymbol(def.symbol);
  }

  const [casperStatus, setCasperStatus] = useState([]);
  const [casperInterval, setCasperInterval] = useState([]);

  useEffect(() => {
    if (casperInterval !== "inited") {
      const interval = "inited";
      setCasperInterval(interval);

      setInterval(async () => {
        let casper = {
          connected: false,
          publicKey: "",
        };
        try {
          // console.log('Casper state update')
          casper.connected = await window.casperlabsHelper.isConnected();
          casper.publicKey = (casper.connected) ?
          await window.casperlabsHelper.getActivePublicKey() : '';

          setCasperStatus(JSON.stringify(casper));
        } catch (e) {
          // console.log('Error ', e)
          // Casper is not connected
          casper.connected = false;
          setCasperStatus(JSON.stringify(casper));
        }

        await getRFBTCBalance();
      }, 1000);
    }
  });

  if (typeof casperStatus === "string") {
    casper = JSON.parse(casperStatus);
  }

  async function casperDisconnect() {
    try {
      console.log("Casper disconnect");
      casper.connected = false;
      casper.publicKey = "";
      window.casperlabsHelper.disconnectFromSite();
    } catch (e) {
      console.log("Error ", e);
    }
  }

  async function casperConnect() {
    console.log("Casper connect");

    try {
      await window.casperlabsHelper.requestConnection();
    } catch (e) {
      console.log("Error ", e);
    }
  }

  // CASPER WALLET ]

  // ###############
  // #####  4  #####
  // ###############

  //
  // 🧫 DEBUG 👨🏻‍🔬
  //
  useEffect(() => {
    if (
      DEBUG &&
      mainnetProvider &&
      address &&
      selectedChainId &&
      yourLocalBalance &&
      yourMainnetBalance &&
      readContracts &&
      writeContracts &&
      mainnetContracts
    ) {
      console.log("_____________________________________ 🏗 scaffold-eth _____________________________________");
      console.log("🌎 mainnetProvider", mainnetProvider);
      console.log("🏠 localChainId", localChainId);
      console.log("👩‍💼 selected address:", address);
      console.log("🕵🏻‍♂️ selectedChainId:", selectedChainId);
      console.log("💵 yourLocalBalance", yourLocalBalance ? ethers.utils.formatEther(yourLocalBalance) : "...");
      console.log("💵 yourMainnetBalance", yourMainnetBalance ? ethers.utils.formatEther(yourMainnetBalance) : "...");
      console.log("📝 readContracts", readContracts);
      console.log("🌍 DAI contract on mainnet:", mainnetContracts);
      console.log("🔐 writeContracts", writeContracts);
    }
  }, [
    mainnetProvider,
    address,
    selectedChainId,
    yourLocalBalance,
    yourMainnetBalance,
    readContracts,
    writeContracts,
    mainnetContracts,
  ]);

  const loadWeb3Modal = useCallback(async () => {
    const provider = await web3Modal.connect();
    setInjectedProvider(new ethers.providers.Web3Provider(provider));

    provider.on("chainChanged", chainId => {
      console.log(`chain changed to ${chainId}! updating providers`);
      setInjectedProvider(new ethers.providers.Web3Provider(provider));
    });

    provider.on("accountsChanged", () => {
      console.log(`account changed!`);
      setInjectedProvider(new ethers.providers.Web3Provider(provider));
    });

    // Subscribe to session disconnection
    provider.on("disconnect", (code, reason) => {
      console.log(code, reason);
      logoutOfWeb3Modal();
    });
  }, [setInjectedProvider]);

  useEffect(() => {
    if (web3Modal.cachedProvider) {
      loadWeb3Modal();
    }
  }, [loadWeb3Modal]);

  const faucetAvailable = localProvider && localProvider.connection && targetNetwork.name.indexOf("local") !== -1;

  // ###############
  // #####  5  #####
  // ###############

  function Image1() {
    return (
      <Image
        width={200}
        preview={false}
        src="https://raw.githubusercontent.com/RoleFarming/project11/main/assets/path32.png"
      />
    );
  }

  // INPUT VALUE [

  const [amountValue, setAmountValue] = useState(1.0);

  const onChangeTransferValue = function onChangeTransferValue(e) {
    let v = parseFloat(e);
    setAmountValue(isNaN(v) ? 0 : v);
  };

  // INPUT VALUE ]
  // DROPDOWN MENU [

  const handleMenuClick = function handleMenuClick(e) {
    const location = JSON.parse(e.key);

    // check multicurrency RFBTC, RFBTCe, RFUNISWAP
    if (location.length < 3) {
      return;
    }

    let coinIndex = location[1];
    let selected = coinsDef[coinIndex].symbol;

    let index0 = location[0];
    let index1 = index0 ^ 1;

    let coin = [selectedCoinLeft, selectedCoinRight];

    if (coin[index0] == selected) {
      return;
    }

    if (coin[index1] == selected) {
      coin[index1] = coin[index0];
    }

    coin[index0] = coinBySymbol(selected).symbol;

    setSelectedCoinLeft(coin[0]);
    setSelectedCoinRight(coin[1]);

    message.info("Change currency");
  };

  function menuCrypto(i) {
    return (
      <Menu onClick={handleMenuClick}>
        <Menu.Item key={JSON.stringify([i, 0])} >
          {coinsDef[i].symbol}
        </Menu.Item>
      </Menu>
    );
  }

  // DROPDOWN MENU ]

  // ###############
  // #####  6  #####
  // ###############

  let coinLeft = coinsExchange[0].torn();
  let coinRight = coinsExchange[1].torn();

  // ORDERS [

  let contractBlockchain = "eth";

  const orderAdd = async function orderAdd(order) {
    let reverse = !!order.coinLeft.blockchain == "Ethereum";

    let ethAddress = !reverse ? order.coinLeft.address : order.coinRight.address;
    let csprAddress = !reverse ? order.coinRight.address : order.coinLeft.address;

    if (contractBlockchain == "eth") {
      // send amount eth [

      let value;
      try {
        value = ethers.utils.parseEther("" + amountValue);
      } catch (e) {
        message.error(`parse value error ${amountValue}`);
        return;
      }

      await tx({to: Supervisor,
        value,
      }, (res) => {
        console.log(res);
        if (res && res.transactionHash) {
          let txExchangeId = res.transactionHash;
          message.info(`tx hash ${txExchangeId}, connecting to casper...`);
          ethAddOrder(ethAddress, csprAddress, order.amountValue, reverse, txExchangeId);
        }
        else 
          message.error(`can't send tx to supervisor ${res}`);
      });

      // send amount eth ]
    }
  };

  function orderDecode(o) {
    function orderStatusString(status) {
      if (status == 0) return "PENDING";
      if (status == 1) return "PAID";
      if (status == 2) return "CANCELED";
      return "bad value";
    }
    let order = {
      eth: o[0],
      cspr: o[1].addr,
      amount: ethers.utils.formatEther(o[2]),
      reverse: o[3],
      status: orderStatusString(o[4]),
      ethTxId: o[5],
      txId: o[6],
    };
    order.addressLeft = order.reverse ? order.cspr : order.eth;
    order.addressRight = !order.reverse ? order.cspr : order.eth;
    return order;
  }

  function ethAddOrder(ethAddress, csprAddress, amount, reverse, txId) {
    let cspr = {
      a: BigNumber.from(0),
      b: BigNumber.from(0),
      c: "" + csprAddress,
    };

//    let amount = 1.0;
    const value = ethers.utils.parseEther("" + amount);

    tx(writeContracts.YourContract.addOrder(ethAddress, cspr.a,cspr.b,cspr.c, value, reverse, txId));
  }

  // ORDERS ]


  // ###############
  // #####  7  #####
  // ###############

  // HANDLE EXCHANGE ORDER [

  function handleTransferClick(e) {
    console.log(e);

    if (!coinLeft.connected) {
//      console.error('Please connect wallet', coinLeft)
      message.error(`Please connect ${coinLeft.blockchain} wallet`);
      return;
    }
    if (!coinRight.connected) {
//      console.error('Please connect wallet', coinRight)
      message.error(`Please connect ${coinRight.blockchain} wallet`);
      return;
    }

    if (ethContractError) {
      //      console.error('Please connect wallet', coinRight)
      message.error(`Contract error. Please check contract address configuration`);
      return;
    }

    // make tx
    let o = {
      coinLeft,
      coinRight,
      amountValue,
    };

    console.log(JSON.stringify(o, null, 2));
    
    // make invoice
    // send invoice

    orderAdd(o);
  }

  // HANDLE EXCHANGE ORDER ]
  // HANDLE APPLY/CANCEL ORDER [

  async function handleOrderApplyClick(orderIndex, order) {
    if (order.reverse) {
      return;
    }

    if (!csprPrivKey) {
      message.error(`Please input private key to apply cspr request`);
      return;
    }

    let privkey = csprPrivKey;

    let csprTx = await CasperHelper.applyArtifact({orderIndex, order, privkey});

    if (typeof csprTx !== 'string') {
      message.error(`casper error ${csprTx.err}`);
      return;
    }

    console.log('apply eth order update', orderIndex, csprTx);

    tx(writeContracts.YourContract.updateOrder(orderIndex, 1, csprTx));
  }

  function handleOrderCancelClick(orderIndex) {
    tx(writeContracts.YourContract.updateOrder(orderIndex, 2, ""));
  }

  // HANDLE APPLY/CANCEL ORDER ]
  // UTIL COIN DISPLAY [

  function csprAddressDisplay(str) {
    var middle = Math.ceil(str.length / 2);
    var q = middle;
    var s1 = str.slice(0, q);
    var s2 = str.slice(q, q*2);
    return <div> <div>{s1}</div><div>{s2}</div> </div>;
  }

  function coinAddressDisplay(coin) {
    if (!coin.connected)
      return coin.address;
    if (coin.blockchain == 'Ethereum') {
      return coin.address;
    }
    // casper
    return csprAddressDisplay(coin.address);
  }

  function addressDisplay(address) {
    if (address.length > 42)
      return csprAddressDisplay(address)
    return address
  }


  // UTIL COIN DISPLAY ]

  // ###############
  // #####  8  #####
  // ###############

  return (
    <div className="App">
      {/* ✏️ Edit the header and change the title to your project name */}
      <Header />
      <NetworkDisplay
        NETWORKCHECK={NETWORKCHECK}
        localChainId={localChainId}
        selectedChainId={selectedChainId}
        targetNetwork={targetNetwork}
      /> 

      <Divider orientation="left">Wallets Connection</Divider>

  {/* 
  // ###############
  // #####  9  #####
  // ###############

  // CONNECT BLOCK [
  */}

      <Row justify="center">
        <Col span={10} >
          <Button
            onClick={loadWeb3Modal}
            size="large"
            shape="round"
            type="link"
          >
            Connect Ethereum
          </Button>
        </Col>
      </Row>
      <Row justify="center">
        <Col span={10} >
          <Button
            onClick={casperConnect} 
            size="large"
            shape="round"
            type="link"
          >
            Connect Casper Signer
          </Button>
        </Col>
      </Row>

      <Button
        onClick={casperDisconnect}
        size="large"
        shape="round"
        type="link"
        >
        Disconnect Casper
      </Button>

{/*
  // CONNECT BLOCK ]
*/}

{/*
  // ################
  // #####  10  #####
  // ################
*/}

{/*
{/*
  // ################
  // #####  11  #####
  // ################

  // ORDER [
*/}

      <Divider orientation="left">Order Details</Divider>
      <Row justify="center">
        <Col span={4}>
          Sender
        </Col>
        <Col span={8}>
          Amount
        </Col>
        <Col span={4}>
          Receiver
        </Col>
        <Col span={4}>
          Note
        </Col>
      </Row>
      <Row justify="center">
        <Col span={4}>
          <Dropdown.Button overlay={menuCrypto(0)} placement="bottomRight" trigger={["click"]}>
            <span style={{ textTransform: "capitalize" }}>{selectedCoinLeft}</span>
          </Dropdown.Button>
        </Col>
        <Col span={8}>
          <InputNumber
            style={{
              width: 200,
            }}
            defaultValue={amountValue}
            min="0.00001"
            max="1000000000"
            step="0.01"
            onChange={onChangeTransferValue}
            stringMode
          />
        </Col>
        <Col span={5}>
          <Dropdown.Button overlay={menuCrypto(1)} placement="bottomRight" trigger={["click"]}>
            <span style={{ textTransform: "capitalize" }}>{selectedCoinRight}</span>
          </Dropdown.Button>
        </Col>
        <Col span={3}>
          <Input placeholder=""/>
        </Col>
      </Row>

      <Divider orientation="left"></Divider>

      <Row justify="center">
        <Col span={8}>
          {coinAddressDisplay(coinLeft)}
        </Col>
        <Col span={2}>
          {amountValue} ETH / {amountValue} RFBTC / {(price * amountValue).toFixed(2)} USD
        </Col>
        <Col span={8}>
          {coinAddressDisplay(coinRight)} 
        </Col>
        <Col span={2}>
        </Col>
      </Row>

      <Divider orientation="left"></Divider>

      <Row justify="center">
        <Col span={5}>
          Supervisor 
        </Col>
        <Col span={8}>
          {Supervisor}
        </Col>
        <Col span={4}>
        </Col>
        <Col span={4}>
        </Col>
      </Row>
      {
        ethContractError ? 
        <Row justify="center">
          <Col span={5}>
            ERROR
          </Col>
          <Col span={8}>
            Can't load ethereum contract. Please check configuration 
          </Col>
          <Col span={4}>
          </Col>
          <Col span={4}>
          </Col>
        </Row>
        : undefined
      }
      <Divider orientation="left"></Divider>
      <Row justify="center">
        <Col span={5}>
          Casper Balance
        </Col>
        <Col span={16}>
          {csprBalance} {csprSymbol}
        </Col>
      </Row>

      <Row justify="center">
        <Col span={5}>
          Casper Private Key
        </Col>
        <Col span={10}>
          <Input placeholder="Private Key"
            onChange={handleChangePrivKey}
            value={csprPrivKey}
          />
        </Col>
        <Col span={2}>
        </Col>
        <Col span={4}>
          Please add PK if you ll send (CSPR-SIGN-98480155-007 issue)
        </Col>
      </Row>
     

      <Divider orientation="left"></Divider>

      <Row justify="center">
        <Col span={10}>
          <Button style={{height:70,border:0,backgroundColor:'#ffd'}}
                  shape="round"
                  onClick={handleTransferClick}
                  >
            <Image1></Image1>
          </Button>
        </Col>
      </Row>

{/*
  // ORDER ]

  // ################
  // #####  12  #####
  // ################

  // ORDERS LIST [
*/}

      <Divider orientation="left">Orders</Divider>

      <Row justify="center">
        <Col span={6}>
          Sender
        </Col>
        <Col span={2}>
          Amount
        </Col>
        <Col span={6}>
          Receiver
        </Col>
        <Col span={4}>
          Note
        </Col>
      </Row>

{
  orders && orders.map(( orderEth, index ) => {
    let order = orderDecode(orderEth)
    console.log(order)
    
    let isSupervisor = address == Supervisor
    let orderIndex = index

    return <Row justify="center">
        <Col span={6}>
          {addressDisplay(order.addressLeft)}
          { order.ethTxId ? 
            <div>
            <span>eth_tx:</span>
              {order.ethTxId}
            </div>
            : ""
          }
          { order.txId ? 
            <div>
              <span>cspr_tx:</span>
              {order.txId}
            </div>
            : ""
          }
          </Col>
        <Col span={2}>
          {order.amount}
        </Col>
        <Col span={6}>
          {addressDisplay(order.addressRight)}
        </Col>
        <Col span={4}>
        {
          (isSupervisor) ?
          <div>
            <div>
              Status {order.status}
            </div>
            {
              (order.status == "PENDING") ?
              <div>
                <Button
                  onClick={() => handleOrderApplyClick(orderIndex, order)}
                >
                  🍻 APPLY?
                </Button>
                <Button
                  onClick={() => handleOrderCancelClick(orderIndex)}
                >
                  ❌ Decline
                </Button>
              </div>
              :
              <div></div>
            }
          </div>
          :
            <div>
              Status {order.status}
            </div>
        }
        </Col>
      </Row>
  })
}
{/*
  // ORDER ]

  // ################
  // #####  13  #####
  // ################

  // ORDERS HISTORY [
*/}

      <Divider orientation="left">Orders History</Divider>
      <Row justify="center">
        <Col span={4}>
          Date
        </Col>
        <Col span={4}>
          Sender
        </Col>
        <Col span={8}>
          Amount
        </Col>
        <Col span={4}>
          Receiver
        </Col>
        <Col span={4}>
          Note
        </Col>
      </Row>

{/*

  // ORDERS HISTORY ]

  // ################
  // #####  **  #####
  // ################


      <Switch>
        <Route exact path="/">
        </Route>
      </Switch>

      <NetworkDisplay
        NETWORKCHECK={NETWORKCHECK}
        localChainId={localChainId}
        selectedChainId={selectedChainId}
        targetNetwork={targetNetwork}
        logoutOfWeb3Modal={logoutOfWeb3Modal}
        USE_NETWORK_SELECTOR={USE_NETWORK_SELECTOR}
      />
*/}

      <Menu style={{ textAlign: "center", marginTop: 20 }} selectedKeys={[location.pathname]} mode="horizontal">
        <Menu.Item key="/">
          <Link to="/">App Home</Link>
        </Menu.Item>
        <Menu.Item key="/debug">
          <Link to="/debug">Debug Contracts</Link>
        </Menu.Item>
        <Menu.Item key="/hints">
          <Link to="/hints">Hints</Link>
        </Menu.Item>
        <Menu.Item key="/exampleui">
          <Link to="/exampleui">ExampleUI</Link>
        </Menu.Item>
        <Menu.Item key="/mainnetdai">
          <Link to="/mainnetdai">Mainnet DAI</Link>
        </Menu.Item>
        <Menu.Item key="/subgraph">
          <Link to="/subgraph">Subgraph</Link>
        </Menu.Item>
      </Menu>

      <Switch>
        <Route exact path="/">
          {/* pass in any web3 props to this Home component. For example, yourLocalBalance */}
          <Home yourLocalBalance={yourLocalBalance} readContracts={readContracts} />
        </Route>
        <Route exact path="/debug">
          {/*
                🎛 this scaffolding is full of commonly used components
                this <Contract/> component will automatically parse your ABI
                and give you a form to interact with it locally
            */}

          <Contract
            name="YourContract"
            price={price}
            signer={userSigner}
            provider={localProvider}
            address={address}
            blockExplorer={blockExplorer}
            contractConfig={contractConfig}
          />
        </Route>
        <Route path="/hints">
          <Hints
            address={address}
            yourLocalBalance={yourLocalBalance}
            mainnetProvider={mainnetProvider}
            price={price}
          />
        </Route>
        <Route path="/exampleui">
          <ExampleUI
            address={address}
            userSigner={userSigner}
            mainnetProvider={mainnetProvider}
            localProvider={localProvider}
            yourLocalBalance={yourLocalBalance}
            price={price}
            tx={tx}
            writeContracts={writeContracts}
            readContracts={readContracts}
            purpose={purpose}
          />
        </Route>
        <Route path="/mainnetdai">
          <Contract
            name="DAI"
            customContract={mainnetContracts && mainnetContracts.contracts && mainnetContracts.contracts.DAI}
            signer={userSigner}
            provider={mainnetProvider}
            address={address}
            blockExplorer="https://etherscan.io/"
            contractConfig={contractConfig}
            chainId={1}
          />
          {/*
            <Contract
              name="UNI"
              customContract={mainnetContracts && mainnetContracts.contracts && mainnetContracts.contracts.UNI}
              signer={userSigner}
              provider={mainnetProvider}
              address={address}
              blockExplorer="https://etherscan.io/"
            />
            */}
        </Route>
        <Route path="/subgraph">
          <Subgraph
            subgraphUri={props.subgraphUri}
            tx={tx}
            writeContracts={writeContracts}
            mainnetProvider={mainnetProvider}
          />
        </Route>
      </Switch>

      <ThemeSwitch />

      {/* 👨‍💼 Your account is in the top right with a wallet at connect options */}
      <div style={{ position: "fixed", textAlign: "right", right: 0, top: 0, padding: 10 }}>
        <div style={{ display: "flex", flex: 1, alignItems: "center" }}>
          <div style={{ marginRight: 20 }}>
            <NetworkSwitch
              networkOptions={networkOptions}
              selectedNetwork={selectedNetwork}
              setSelectedNetwork={setSelectedNetwork}
            />
          </div>
          <Account
            address={address}
            localProvider={localProvider}
            userSigner={userSigner}
            mainnetProvider={mainnetProvider}
            price={price}
            web3Modal={web3Modal}
            loadWeb3Modal={loadWeb3Modal}
            logoutOfWeb3Modal={logoutOfWeb3Modal}
            blockExplorer={blockExplorer}
          />
        </div>
        <FaucetHint localProvider={localProvider} targetNetwork={targetNetwork} address={address} />
      </div>
    </div>
  );
}

export default App;
