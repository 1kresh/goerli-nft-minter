import Head from "next/head";
import Image from "next/image";
import styles from "../styles/Home.module.css";
import {
  Text,
  Box,
  VStack,
  Flex,
  Wrap,
  Center,
  Divider,
  Spinner,
  Input,
} from "@chakra-ui/react";
import { useContext, useEffect, useState } from "react";
import { AppContext } from "../contexts/AppContext";
import Minter_metadata from "../public/contracts/Minter_metadata.json";
import axios from "axios";

import { MINTER_CONTRACTS } from "../constants";

export default function Home() {
  const {
    walletAddress,
    web3,
    chainId,
    isLoading,
    setIsLoading,
    checkIfWalletIsConnected,
    connectWallet,
  } = useContext(AppContext);

  const pinataUploadJSON = async (json, options) => {
    setIsLoading(true);
    var res = false;
    try {
      const data = JSON.stringify({
        ...options,
        pinataContent: json,
      });

      var config = {
        method: "post",
        url: "https://api.pinata.cloud/pinning/pinJSONToIPFS",
        headers: {
          "Content-Type": "application/json",
          pinata_api_key: process.env.NEXT_PUBLIC_PINATA_API_KEY,
          pinata_secret_api_key: process.env.NEXT_PUBLIC_PINATA_SECRET_API_KEY,
        },
        data: data,
      };

      res = await axios(config);
    } catch (error) {
      console.log(error);
    }

    return res;
  };

  const submitNFTFile = async (file) => {
    setIsLoading(true);
    var res = false;
    try {
      var data = new FormData();
      data.append("file", file, file.name);
      data.append("pinataOptions", '{"cidVersion": 1}');
      data.append("pinataMetadata", `{"name": "Image"}`);

      var config = {
        maxContentLength: -1,
        headers: {
          "Content-Type": `multipart/form-data; boundary=${data._boundary}`,
          pinata_api_key: process.env.NEXT_PUBLIC_PINATA_API_KEY,
          pinata_secret_api_key: process.env.NEXT_PUBLIC_PINATA_SECRET_API_KEY,
        },
      };

      res = await axios.post(
        "https://api.pinata.cloud/pinning/pinFileToIPFS",
        data,
        config
      );
    } catch (error) {
      console.log(error);
    }

    return { imageIpfsHash: res?.data?.IpfsHash };
  };

  const submitNFTMetadata = async (name, description, file) => {
    setIsLoading(true);
    var res;
    var metadata;
    try {
      const { imageIpfsHash } = await submitNFTFile(file);
      if (!imageIpfsHash) {
        throw new Error("Image upload failed");
      }
      const image = `https://stylexchange.mypinata.cloud/ipfs/${imageIpfsHash}`;

      metadata = {
        name: name,
        description: description,
        image: image,
      };
      const options = {
        pinataMetadata: {
          name: `NFTMetadata`,
        },
        pinataOptions: {
          cidVersion: 0,
        },
      };

      res = await pinataUploadJSON(metadata, options);
      if (!res) {
        throw new Error("Error uploading metadata");
      }
    } catch (error) {
      console.log(error);
    }

    return { imageIpfsHash: res?.data?.IpfsHash, metadata };
  };

  const [nameState, setNameState] = useState("");
  const [descriptionState, setDescriptionState] = useState("");
  const [imageFile, setImageFile] = useState(null);

  const mint = async () => {
    try {
      setIsLoading(true);
      const contractTmp = new web3.eth.Contract(
        Minter_metadata["output"]["abi"],
        MINTER_CONTRACTS[chainId]
      );

      const { imageIpfsHash, metadata } = await submitNFTMetadata(
        nameState,
        descriptionState,
        imageFile
      );

      if (!imageIpfsHash) {
        setIsLoading(false);
        return;
      }

      const tokenURI = `https://stylexchange.mypinata.cloud/ipfs/${imageIpfsHash}`;

      const contract = await contractTmp.methods
        .mint(walletAddress, tokenURI)
        .send({ from: walletAddress });

      setIsLoading(false);
      return true;
    } catch (e) {
      console.log(e);
      setIsLoading(false);
      return false;
    }
  };

  return (
    <div className={styles.container}>
      <Head>
        <title>Create Next App</title>
        <meta name="description" content="Generated by create next app" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <Center>
        <VStack spacing={4} w="100%" maxW="600px">
          <Text fontSize="2xl" fontWeight="bold">
            Mint NFT
          </Text>
          <Input
            placeholder="Name"
            value={nameState}
            onChange={(e) => setNameState(e.target.value)}
          />
          <Input
            placeholder="Description"
            value={descriptionState}
            onChange={(e) => setDescriptionState(e.target.value)}
          />
          <Input
            type="file"
            onChange={(e) => setImageFile(e.target.files[0])}
          />
          <button onClick={mint}>Mint</button>
        </VStack>
      </Center>
    </div>
  );
}
