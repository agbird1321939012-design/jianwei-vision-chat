import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { isPublicAddress } from "./security.js";
export async function resolveDestination(
  hostname: string,
  mode = process.env.DNS_MODE || "system",
): Promise<{ address: string; family: number }[]> {
  let addresses: { address: string; family: number }[];
  if (isIP(hostname))
    addresses = [{ address: hostname, family: isIP(hostname) }];
  else if (mode === "cloudflare") {
    // Optional for environments using synthetic DNS. The connection remains pinned to validated public IPs.
    const records = await Promise.all(
      ["A", "AAAA"].map(async (type) => {
        const response = await fetch(
          `https://cloudflare-dns.com/dns-query?type=${type}&name=${encodeURIComponent(hostname)}`,
          {
            headers: { accept: "application/dns-json" },
            signal: AbortSignal.timeout(8000),
          },
        );
        if (!response.ok) throw new Error("接口 DNS 查询失败");
        const result = (await response.json()) as {
          Answer?: { type: number; data: string }[];
        };
        return (result.Answer || [])
          .filter((record) => record.type === 1 || record.type === 28)
          .map((record) => ({
            address: record.data,
            family: record.type === 1 ? 4 : 6,
          }));
      }),
    );
    addresses = records.flat();
  } else addresses = await lookup(hostname, { all: true });
  if (
    !addresses.length ||
    addresses.some((record) => !isPublicAddress(record.address))
  )
    throw new Error("接口地址必须指向公网服务，不支持本机或内网地址");
  return addresses;
}
