import { React, useState, useEffect } from "react";
import { ImmutableXClient, Link } from "@imtbl/imx-sdk";
import { ethers } from "ethers";
import styles from "../../styles/Home.module.css";
import Card from "./Card";
import votingNFTABI from "../contracts/votingNFTABI.json";
import { votingNFT } from "../contracts";
import { secondsToDhms } from "../utils";

// Ropsten Testnet
const linkAddress = "https://link.ropsten.x.immutable.com";
const apiAddress = "https://api.ropsten.x.immutable.com/v1";

export default function IMX() {
  const [client, setClient] = useState();
  const [wallet, setWallet] = useState();
  const [balance, setBalance] = useState();
  const [assets, setAssets] = useState();
  const [votingNFTs, setVotingNFTs] = useState();
  const [error, setError] = useState();
  const [isVotingNFTGenerated, setIsVotingNFTGenerated] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [lastVotingNFTindex, setLastVotingNFTindex] = useState(0);
  const [viewType, setViewType] = useState("asset");
  const [voteNFTBtnText, setVoteNFTBtnText] = useState(
    "View previously generated voting nft"
  );

  useEffect(() => {
    buildIMX();
  }, []);

  useEffect(() => {
    if (wallet) {
      getLastVotingNFTIndex();
    }
    const clientFn = async () => {
      if (client && wallet) {
        setBalance(
          (
            await client.getBalance({ user: wallet, tokenAddress: "eth" })
          ).balance.toString()
        );
        // console.log((await client.getAssets({ user: wallet })).result);
        setAssets((await client.getAssets({ user: wallet })).result);
      }
    };
    clientFn();
  }, [client, wallet]);

  useEffect(() => {
    if (wallet && assets && assets.length == 0) {
      setError("No NFT found");
    }
  }, [assets]);

  async function getLastVotingNFTIndex() {
    const provider = new ethers.providers.JsonRpcProvider(
      "https://polygontestapi.terminet.io/rpc"
    );
    // const provider = new ethers.providers.Web3Provider(window.ethereum);
    const contract = new ethers.Contract(votingNFT, votingNFTABI, provider);
    console.log(wallet);
    const lastNFTIndex = (await contract.totalNFT(wallet)) - 1;
    if (lastNFTIndex > 0) {
      setLastVotingNFTindex(lastNFTIndex);
      setIsVotingNFTGenerated(true);
    }
  }
  async function linkSetup() {
    const link = new Link(linkAddress);

    const res = await link.setup({});
    // console.log(res.address);
    setWallet(res.address);

    // setBalance(await client.getBalance({user: res.address, tokenAddress: 'eth'}))
  }

  async function generateVotingNFT() {
    setIsLoading(true);
    if (!window.ethereum) {
      setIsLoading(false);
      setError("Install metamask");
      return;
    }
    const chainId = 80001; // Mumbai

    if (window.ethereum.networkVersion !== chainId) {
      try {
        await window.ethereum.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: "0x" + chainId.toString(16) }],
        });
      } catch (err) {
        // This error code indicates that the chain has not been added to MetaMask
        if (err.code === 4902) {
          await window.ethereum.request({
            method: "wallet_addEthereumChain",
            params: [
              {
                chainName: "Mumbai",
                chainId: "0x" + chainId.toString(16),
                nativeCurrency: {
                  name: "MATIC",
                  decimals: 18,
                  symbol: "MATIC",
                },
                rpcUrls: ["https://polygontestapi.terminet.io/rpc"],
              },
            ],
          });
        }
      }
    }
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    window.ethereum.enable().then(async () => {
      try {
        const signer = provider.getSigner();
        const address = await signer.getAddress();
        if (address.toLowerCase() !== wallet.toLowerCase()) {
          setIsLoading(false);
          setError(
            "Metamask account " +
              address +
              " is not same as IMX account. Please connect metamask with same account "
          );
          return;
        }

        const contract = new ethers.Contract(votingNFT, votingNFTABI, signer);

        const userData = await contract.userData(address, lastVotingNFTindex);
        const currentTime = Math.round(new Date().getTime() / 1000);
        if (currentTime < Number(userData.expiryTime)) {
          setIsLoading(false);
          setError(
            "Last created nft is not yet expired. Try after  " +
              secondsToDhms(Number(userData.expiryTime) - currentTime)
          );
          if (viewType === "asset") {
            setVoteNFTBtnText("View previously generated voting nft");
          }

          return;
        }
        const expiryTime = Math.round(new Date().getTime() / 1000) + 900;

        const tx = await contract.generateVotingCard(assets.length, expiryTime);
        //   console.log(tx)
        await tx.wait();
        console.log(await provider.waitForTransaction(tx.hash));
        setIsLoading(false);
        if (viewType === "asset") {
          setVoteNFTBtnText(
            "Voting NFT generated. Click here to view generated NFT"
          );
        }

        getLastVotingNFTIndex();
        if (votingNFTs) {
          const lastNFTIndex = (await contract.totalNFT(wallet)) - 1;
          const nftData = await contract.userData(wallet, lastNFTIndex);
          setVotingNFTs([nftData].concat(votingNFTs));
        }
        setError("");
      } catch (error) {
        setIsLoading(false);
        setError("something went wrong");
        console.log(error);
      }
    });
  }

  async function getNFTData() {
    setIsLoading(true);
    if (viewType === "asset") {
      setViewType("votingCard");
      setVoteNFTBtnText("View Immutable-x NFTs");
    } else {
      setIsLoading(false);
      setVoteNFTBtnText("View previously generated voting nft");
      setViewType("asset");
    }
    let votingNFTArr = [];
    setError("");
    if (votingNFTs) {
      setIsLoading(false);
      return;
    }
    const provider = new ethers.providers.JsonRpcProvider(
      "https://polygontestapi.terminet.io/rpc"
    );
    const contract = new ethers.Contract(votingNFT, votingNFTABI, provider);
    for (let i = lastVotingNFTindex; i >= 0; i--) {
      const nftData = await contract.userData(wallet, i);
      votingNFTArr.push(nftData);
    }
    setIsLoading(false);
    setVotingNFTs(votingNFTArr);
  }

  // initialise an Immutable X Client to interact with apis more easily
  async function buildIMX() {
    console.log(await ImmutableXClient.build({ publicApiUrl: apiAddress }));
    setClient(await ImmutableXClient.build({ publicApiUrl: apiAddress }));
  }
  return (
    <>
      {wallet ? (
        <>
          <h4>IMX wallet: {wallet}</h4>
          {assets && assets.length > 0 && (
            <button onClick={generateVotingNFT}>Create Voting NFT</button>
          )}

          {isVotingNFTGenerated && (
            <>
              <br></br>
              <button onClick={getNFTData}>{voteNFTBtnText}</button>
            </>
          )}

          {isLoading && (
            <>
              <br></br>
              <div className={styles.loader}></div>
              <br></br>
            </>
          )}
          {error && !isLoading && <h5>{error}</h5>}

          <br></br>
        </>
      ) : (
        <button onClick={linkSetup}>Connect with IMX</button>
      )}
      <div className={styles.grid}>
        {wallet && (
          <>
            {assets &&
              viewType === "asset" &&
              assets.map((asset) => {
                // console.log(asset);
                return (
                  <Card
                    key={asset.token_id}
                    imageUrl={asset.image_url}
                    collectionName={asset.collection.name}
                    assetsName={asset.name}
                  ></Card>
                );
              })}{" "}
            {votingNFTs &&
              viewType === "votingCard" &&
              votingNFTs.map((votingNFT) => {
                // console.log(votingNFT);
                return (
                  <Card
                    key={votingNFT.tokenId}
                    votes={votingNFT.votes}
                    expiryTime={votingNFT.expiryTime}
                  ></Card>
                );
              })}
          </>
        )}
        {wallet && !assets && <div className={styles.loader}></div>}
      </div>
    </>
  );
}
