// src/lib/proxy.ts
import { setGlobalDispatcher, type Dispatcher } from "undici";
import { SocksProxyAgent } from "socks-proxy-agent";

let enabled = false;

export function enableSocksProxyFromEnv() {
  if (enabled) return;

  const url =
    process.env.SOCKS_PROXY ||
    process.env.socks_proxy ||
    process.env.SOCKS5_PROXY ||
    process.env.socks5_proxy;

  if (!url) {
    enabled = true;
    return;
  }

  const agent = new SocksProxyAgent(url) as unknown as Dispatcher;
  setGlobalDispatcher(agent);
  enabled = true;
}
