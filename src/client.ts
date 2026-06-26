import { Wallet } from "@ethersproject/wallet";
import { ClobClient, ApiKeyCreds } from "@polymarket/clob-client";
import { config } from "./config";

let _client: ClobClient | null = null;

export function getClobClient(): ClobClient {
  if (_client) return _client;

  const signer = new Wallet(config.privateKey);

  const hasCreds = config.apiKey && config.apiSecret && config.apiPassphrase;
  const creds: ApiKeyCreds | undefined = hasCreds
    ? { key: config.apiKey, secret: config.apiSecret, passphrase: config.apiPassphrase }
    : undefined;

  _client = new ClobClient(
    config.clobHost,
    config.chainId,
    signer,
    creds,
    config.signatureType,
    config.funderAddress || undefined,
  );

  return _client;
}

export function getUnauthClient(): ClobClient {
  const signer = new Wallet(config.privateKey);
  return new ClobClient(config.clobHost, config.chainId, signer);
}
