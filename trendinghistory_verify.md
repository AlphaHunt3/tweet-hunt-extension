# VERIFY.md

# Independent Verification Guide

This document explains how any external party can independently verify a published ranking snapshot without trusting the website.

---

## 1. Source of truth

The source of truth is:

1. the Base proxy contract, and
2. the raw Arweave snapshot bytes referenced by that contract.

If the website display conflicts with the contract or Arweave snapshot, trust the contract + Arweave snapshot.

---

## 2. Contract and chain

- Chain: Base Mainnet
- Chain ID: `8453`
- Proxy contract: `0x4330F7F2eE1740fc4BC1f03b7A4aD4656158e4D0`

Use the proxy contract for verification.

---

## 3. What you need to know before verifying

To verify a specific snapshot, you need these dimensions:

- `board`
- `group`
- `window`
- `asOfDate`
- `snapshotRole`

Example:

- `board = top_influencer`
- `group = cn`
- `window = 7d`
- `asOfDate = 2026-04-29`
- `snapshotRole = daily`

---

## 4. Compute snapshotKey

Use this rule for verification:

```solidity
keccak256(abi.encodePacked(board, group, window, asOfDate, snapshotRole))
```

Equivalent examples:

- ethers v6: `solidityPackedKeccak256(['string','string','string','string','string'], [...])`
- web3.py: `Web3.solidity_keccak(['string','string','string','string','string'], [...])`

The current on-chain helper `computeSnapshotKey(...)` matches this packed hashing rule.

---

## 5. Read the snapshot record from the contract

Query:

- `getSnapshot(bytes32 snapshotKey)`

Expected result:

```solidity
struct SnapshotRecord {
    bytes32 contentHash;
    string arweaveId;
    uint64 finalizedAt;
    uint64 publishedAt;
    address publisher;
    bool exists;
}
```

You need at least:

- `contentHash`
- `arweaveId`

---

## 6. Fetch the snapshot bytes

Use one of these gateways:

- `https://turbo-gateway.com/<arweaveId>`
- `https://arweave.net/<arweaveId>`

Download the raw bytes exactly as served.

Important: many snapshots are stored as gzip-compressed JSON. In that case, the contract hash corresponds to the **compressed bytes**, not the decompressed JSON.

Also note:

- some gateways, browsers, or HTTP clients may automatically decompress gzip content
- historical gzip snapshots may carry a `Content-Encoding: gzip` tag, which increases the chance of automatic decompression by browsers
- future gzip snapshots are uploaded without that tag, but verifiers should still assume clients may transform responses unless explicitly configured for raw bytes
- if automatic decompression happens before hashing, your computed digest will not match the on-chain `contentHash`
- `turbo-gateway.com` is usually the safer choice for byte-level verification because it more directly exposes the uploaded payload

---

## 7. Verify the hash

Compute:

```text
sha256(downloaded_raw_bytes)
```

Compare the resulting digest to on-chain `contentHash`.

If they match:

- the snapshot bytes are authentic
- the snapshot has not been altered after publication

If they do not match:

- do not trust the downloaded content
- do not treat it as an official snapshot

---

## 8. Decompress and inspect content

If the snapshot is gzip-compressed:

1. verify the compressed bytes first
2. then decompress
3. parse JSON
4. inspect the ranking payload

Do not hash the parsed JSON object.
Hash only the exact downloaded bytes.

---

## 9. Snapshot payload structure

A typical snapshot includes fields such as:

- `schema_version`
- `snapshot_role`
- `source_system`
- `board`
- `group`
- `window`
- `as_of_date`
- `timezone`
- `finalized_at`
- `published_at`
- `generator`
- `source`
- `input`
- `ranking`
- `metadata`
- `output_hash`

The `ranking` field contains the actual ranking rows.

---

## 10. Example verification flow

1. Decide target snapshot dimensions
2. Compute `snapshotKey`
3. Read `getSnapshot(snapshotKey)` from Base proxy contract
4. Extract `arweaveId` and `contentHash`
5. Download the **raw** bytes from Turbo Gateway or Arweave
6. Compute SHA-256 locally over the raw response bytes
7. Compare local digest with on-chain `contentHash`
8. If valid, decompress (if needed) and inspect ranking JSON

---

## 11. Example pseudocode

```ts
const contract = new ethers.Contract(proxyAddress, abi, provider)

const snapshotKey = await contract.computeSnapshotKey(
  'top_influencer',
  'cn',
  '7d',
  '2026-04-29',
  'daily'
)

const record = await contract.getSnapshot(snapshotKey)
const response = await fetch(`https://turbo-gateway.com/${record.arweaveId}`)
const rawBytes = new Uint8Array(await response.arrayBuffer())

const digest = await crypto.subtle.digest('SHA-256', rawBytes)
const digestHex =
  '0x' + [...new Uint8Array(digest)].map(x => x.toString(16).padStart(2, '0')).join('')

if (digestHex.toLowerCase() !== record.contentHash.toLowerCase()) {
  throw new Error('Verification failed')
}

// If gzip: decompress and inspect JSON
```

---

## 12. Current deployment

The current implementation also supports `batchAnchorSnapshots(...)` for publisher-side write optimization. Verification readers still only need `getSnapshot(...)` and `computeSnapshotKey(...)`.


- Proxy: `0x4330F7F2eE1740fc4BC1f03b7A4aD4656158e4D0`
- Implementation: `0xfCf3d33859f7E2CA167BAb0b36058400d6B31a7C`
- Verification: Sourcify exact match + BaseScan verified

---

## 13. Final rule

A snapshot should be treated as official only if:

1. it is referenced by the Base proxy contract, and
2. the downloaded raw bytes match the on-chain `contentHash`.