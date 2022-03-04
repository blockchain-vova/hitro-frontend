import React, { useState, useCallback, useEffect } from 'react'
import styled from 'styled-components'
import { Heading, Card, CardBody, Button, Flex } from '@pancakeswap/uikit'
import { useWeb3React } from '@web3-react/core'
import useTokenBalance from 'hooks/useTokenBalance'
import useFarmsWithBalance from 'views/Home/hooks/useFarmsWithBalance'
import { getCakeAddress, getMasterChefAddress } from 'utils/addressHelpers'
import { useTranslation } from 'contexts/Localization'
import masterchefABI from 'config/abi/masterchef.json'
import multicall from 'utils/multicall'
import useRefresh from 'hooks/useRefresh'
import useToast from 'hooks/useToast'
import { useMasterchef } from 'hooks/useContract'
import { harvestFarm } from 'utils/calls'
import UnlockButton from 'components/UnlockButton'
import { usePriceCakeBusd } from 'state/farms/hooks'
import { getBalanceNumber } from 'utils/formatBalance'
import CakeHarvestBalance from './CakeHarvestBalance'
import CakeWalletBalance from './CakeWalletBalance'

const StyledFarmStakingCard = styled(Card)`
  min-height: 376px;
`

const StyledCardBody = styled(CardBody)`
  background-image: url('/images/2a.png');
  background-size: 328px;
  background-repeat: no-repeat;
  background-position: top right;
`

const Block = styled.div`
  margin-bottom: 16px;
`

const CardImage = styled.img`
  margin-bottom: 16px;
`

const Label = styled.div`
  color: ${({ theme }) => theme.colors.textSubtle};
  font-size: 14px;
`

const Actions = styled.div`
  margin-top: 24px;
`

const FarmedStakingCard = () => {
  const [pendingTx, setPendingTx] = useState(false)
  const { account } = useWeb3React()
  const {t} = useTranslation()
  const metaBalance = useTokenBalance(getCakeAddress())
  const metaUserBalance = metaBalance.balance ? getBalanceNumber(metaBalance.balance, 9) : 0
  const metaPrice = usePriceCakeBusd().toNumber()

  const registerToken = async (tokenAddress: string, tokenSymbol: string, tokenDecimals: number) => {
    const tokenAdded = await window.ethereum.request({
      method: 'wallet_watchAsset',
      params: {
        type: 'ERC20',
        options: {
          address: tokenAddress,
          symbol: tokenSymbol,
          decimals: tokenDecimals,
          image: `https://hitroswap.finance/images/token.png`,
        },
      },
    })
  
    return tokenAdded
  }

  const { toastSuccess, toastError } = useToast()
  const { farmsWithStakedBalance, earningsSum: farmEarningsSum } = useFarmsWithBalance()
  const numFarmsToCollect = farmsWithStakedBalance.filter((value) => value.pid !== 0).length
  const masterChefContract = useMasterchef()
  const harvestAllFarms = useCallback(async () => {
    setPendingTx(true)
    // eslint-disable-next-line no-restricted-syntax
    for (const farmWithBalance of farmsWithStakedBalance) {
      try {
        // eslint-disable-next-line no-await-in-loop
        await harvestFarm(masterChefContract, farmWithBalance.pid)
        toastSuccess(
          `${t('Harvested')}!`,
          t('Your %symbol% earnings have been sent to your wallet!', { symbol: 'CAKE' }),
        )
      } catch (error) {
        toastError(t('Error'), t('Please try again. Confirm the transaction and make sure you are paying enough gas!'))
      }
    }
    setPendingTx(false)
  }, [farmsWithStakedBalance, masterChefContract, toastSuccess, toastError, t])

  const [startHarvestTimeStamp, setStartHarvestTimeStamp] = useState(2000000000)
  const { fastRefresh } = useRefresh()
  
  return (
    <StyledFarmStakingCard>
      <StyledCardBody>
        <Heading scale="xl" mb="24px">
          {t('Farms & Staking')}
        </Heading>
        <Flex style={{verticalAlign: 'center'}}>
        <CardImage src="/images/token.png" alt="cake logo" width={64} height={64} />
          <Button 
            variant="text"
            style={{height: 32, marginTop: 20, marginLeft: 16, backgroundColor: '#d9d7f2'}}
            onClick={() => registerToken('0xE73200C08559662DAfCA79af982C24b97BcD68D9', 'HTO', 9)}>
            +
            <img src='/images/metamask.png' alt='MetaMask Logo' style={{width: 16, height: 16, marginLeft: 4}}/>
          </Button>
        </Flex>
        <Block>
          <Label>{t('HTO to Harvest')}</Label>
          <CakeHarvestBalance earningsSum={farmEarningsSum}/>
          <Label>~${(metaPrice * farmEarningsSum).toFixed(2)}</Label>
        </Block>
        <Block>
          <Label>{t('HTO in Wallet')}</Label>
          <CakeWalletBalance metaBalance={metaUserBalance} />
          <Label>~${(metaPrice * metaUserBalance).toFixed(2)}</Label>
        </Block>
        <Actions>
          {account ? (
          <Flex >           
            <Button
              mr="8px"
              id="harvest-all"
              disabled={numFarmsToCollect <= 0 || pendingTx}
              onClick={harvestAllFarms}
            >
              {pendingTx ? t('Collecting HTO') : t(`Harvest all (${numFarmsToCollect})`)}
            </Button>
            <Button 
            target="_blank"
            as='a' href="/swap">
              Buy HTO Token
              </Button>
            </Flex>
          ) : (
            <UnlockButton />
          )}
        </Actions>
      </StyledCardBody>
    </StyledFarmStakingCard>
  )
}

export default FarmedStakingCard
