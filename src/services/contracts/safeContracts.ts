import {
  getFallbackHandlerDeployment,
  getMultiSendCallOnlyDeployment,
  getMultiSendDeployment,
  getProxyFactoryDeployment,
  getSafeL2SingletonDeployment,
  getSafeSingletonDeployment,
  type SingletonDeployment,
} from '@gnosis.pm/safe-deployments'
import { LATEST_SAFE_VERSION } from '@/config/constants'
import { Contract } from 'ethers'
import { Interface } from '@ethersproject/abi'
import semverSatisfies from 'semver/functions/satisfies'
import { type ChainInfo } from '@gnosis.pm/safe-react-gateway-sdk'
import type { GetContractProps } from '@gnosis.pm/safe-core-sdk-types'
import { type Compatibility_fallback_handler } from '@/types/contracts/Compatibility_fallback_handler'
import { createEthersAdapter, isValidSDKSafeVersion } from '@/hooks/coreSDK/safeCoreSDK'

export const getMultiSendCallOnlyContractAddress = (chainId: string): string | undefined => {
  const deployment = getMultiSendCallOnlyDeployment({ network: chainId }) || getMultiSendCallOnlyDeployment()

  return deployment?.networkAddresses[chainId]
}

export const getMultiSendContractAddress = (chainId: string): string | undefined => {
  const deployment = getMultiSendDeployment({ network: chainId }) || getMultiSendDeployment()

  return deployment?.networkAddresses[chainId]
}

const getValidatedGetContractProps = (
  chainId: string,
  safeVersion: string,
): Pick<GetContractProps, 'chainId' | 'safeVersion'> => {
  if (!isValidSDKSafeVersion(safeVersion)) {
    throw new Error(`${safeVersion} is not a valid Safe version`)
  }

  return {
    chainId: +chainId,
    safeVersion,
  }
}

const getSafeContractDeployment = (chain: ChainInfo, safeVersion: string): SingletonDeployment | undefined => {
  // We check if version is prior to v1.0.0 as they are not supported but still we want to keep a minimum compatibility
  const useOldestContractVersion = semverSatisfies(safeVersion, '<1.0.0')

  // We had L1 contracts in three L2 networks, xDai, EWC and Volta so even if network is L2 we have to check that safe version is after v1.3.0
  const useL2ContractVersion = chain.l2 && semverSatisfies(safeVersion, '>=1.3.0')
  const getDeployment = useL2ContractVersion ? getSafeL2SingletonDeployment : getSafeSingletonDeployment

  return (
    getDeployment({
      version: safeVersion,
      network: chain.chainId,
    }) ||
    getDeployment({
      version: safeVersion,
    }) ||
    // In case we couldn't find a valid deployment and it's a version before 1.0.0 we return v1.0.0 to allow a minimum compatibility
    (useOldestContractVersion
      ? getDeployment({
          version: '1.0.0',
        })
      : undefined)
  )
}

export const getGnosisSafeContractInstance = (chain: ChainInfo, safeVersion: string = LATEST_SAFE_VERSION) => {
  const ethAdapter = createEthersAdapter()

  const singletonDeployment = getSafeContractDeployment(chain, safeVersion)

  return ethAdapter.getSafeContract({
    singletonDeployment,
    ...getValidatedGetContractProps(chain.chainId, safeVersion),
  })
}

export const getMultiSendContractInstance = (chainId: string, safeVersion: string = LATEST_SAFE_VERSION) => {
  const ethAdapter = createEthersAdapter()

  const singletonDeployment = getMultiSendDeployment({ network: chainId }) || getMultiSendDeployment()

  return ethAdapter.getMultiSendContract({
    singletonDeployment,
    ...getValidatedGetContractProps(chainId, safeVersion),
  })
}

export const getMultiSendCallOnlyContractInstance = (chainId: string, safeVersion: string = LATEST_SAFE_VERSION) => {
  const ethAdapter = createEthersAdapter()

  const singletonDeployment = getMultiSendCallOnlyDeployment({ network: chainId }) || getMultiSendCallOnlyDeployment()

  return ethAdapter.getMultiSendCallOnlyContract({
    singletonDeployment,
    ...getValidatedGetContractProps(chainId, safeVersion),
  })
}

export const getProxyFactoryContractInstance = (chainId: string, safeVersion: string = LATEST_SAFE_VERSION) => {
  const ethAdapter = createEthersAdapter()

  const singletonDeployment =
    getProxyFactoryDeployment({
      version: LATEST_SAFE_VERSION,
      network: chainId,
    }) ||
    getProxyFactoryDeployment({
      version: LATEST_SAFE_VERSION,
    })

  return ethAdapter.getSafeProxyFactoryContract({
    singletonDeployment,
    ...getValidatedGetContractProps(chainId, safeVersion),
  })
}

// TODO: Yet to be implemented in Core SDK
export const getFallbackHandlerContractInstance = (chainId: string): Compatibility_fallback_handler => {
  const fallbackHandlerDeployment =
    getFallbackHandlerDeployment({
      version: LATEST_SAFE_VERSION,
      network: chainId,
    }) ||
    getFallbackHandlerDeployment({
      version: LATEST_SAFE_VERSION,
    })

  if (!fallbackHandlerDeployment) {
    throw new Error(`FallbackHandler contract not found for chainId: ${chainId}`)
  }

  const contractAddress = fallbackHandlerDeployment.networkAddresses[chainId]

  return new Contract(contractAddress, new Interface(fallbackHandlerDeployment.abi)) as Compatibility_fallback_handler
}
