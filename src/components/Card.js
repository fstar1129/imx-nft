import { React, useEffect, useState } from "react";
import styles from "../../styles/Home.module.css";
import Image from "next/image";
import { secondsToDhms } from "../utils";

export default function Card({
  imageUrl,
  collectionName,
  assetsName,
  expiryTime,
  votes,
}) {
  const [currentTime, setCurrentTime] = useState();

  useEffect(() => {
    const secondsTimer = setInterval(() => {
      const currentTimeSec = Math.round(new Date().getTime() / 1000);
      setCurrentTime(currentTimeSec);
    }, 1000);
    return () => clearInterval(secondsTimer);
  }, []);

  return (
    <div className={styles.card}>
      {!votes ? (
        <>
          <Image src={imageUrl} height={236} width={236}></Image>
          <h5>{collectionName}</h5>
          <h5>{assetsName}</h5>
        </>
      ) : (
        <>
          <h1 className={styles.cardnumber}>{votes.toString()}</h1>
          {expiryTime < currentTime ? (
            <h3>Expired</h3>
          ) : (
            <h4>
              Expires In {secondsToDhms(Number(expiryTime) - currentTime)}
            </h4>
          )}
          {/* <h4>{currentTime}</h4> */}
        </>
      )}
    </div>
  );
}
