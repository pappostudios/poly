/**
 * One-time setup: derives CLOB API credentials from your wallet private key.
 * Run: npm run setup
 * Then paste the printed values into your .env file.
 */
import "dotenv/config";
import { Wallet } from "@ethersproject/wallet";
import { ClobClient } from "@polymarket/clob-client";

async function setup() {
  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    console.error("ERROR: PRIVATE_KEY is not set in .env");
    process.exit(1);
  }

  const host = process.env.CLOB_HOST ?? "https://clob.polymarket.com";
  const signer = new Wallet(privateKey);

  console.log(`Deriving API credentials for address: ${signer.address}`);
  console.log(`CLOB host: ${host}\n`);

  const client = new ClobClient(host, 137, signer);

  try {
    const creds = await client.createOrDeriveApiKey();
    console.log("Add these to your .env file:\n");
    console.log(`CLOB_API_KEY=${creds.key}`);
    console.log(`CLOB_API_SECRET=${creds.secret}`);
    console.log(`CLOB_API_PASSPHRASE=${creds.passphrase}`);
    console.log(`FUNDER_ADDRESS=${signer.address}`);
  } catch (err) {
    console.error("Failed to derive API key:", err);
    process.exit(1);
  }
}

setup();
