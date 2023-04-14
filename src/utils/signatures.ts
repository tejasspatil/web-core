import { type SafeSignature } from '@safe-global/safe-core-sdk-types'
import { hexlify, hexZeroPad } from 'ethers/lib/utils'

export class EIP1271Signature implements SafeSignature {
  constructor(public signer: string, public data: string, private offset: number) {}

  staticPart(): string {
    return hexZeroPad(this.signer, 32) + hexZeroPad(hexlify(this.offset), 32).slice(2) + '00'
  }
  dynamicPart(): string {
    const byteLength = hexZeroPad(hexlify(this.data.slice(2).length / 2), 32)
    return (byteLength + this.data.slice(2)).slice(2)
  }
}
