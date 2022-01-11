const BigNumber = require('bignumber.js');
const { FOURTY_EIGHT_HOURS_IN_SECONDS, MARKET_NAMES, TWENTY_FOUR_HOURS_IN_BLOCKS } = require('./constants');

function eth(num) {
  return ethers.utils.parseEther(num.toString());
}
function weiToEth(num) {
  return parseFloat(ethers.utils.formatEther(num.toString()));
}

function encodeData(contract, functionName, args) {
  const func = contract.interface.getFunction(functionName);
  return contract.interface.encodeFunctionData(func, args);
}

async function getBalances(provider, token, accounts) {
  const balances = {};
  for (let account of accounts) {
    const { name, address } = account;
    balances[name] = {};
    balances[name]['eth'] = new BigNumber(parseFloat(weiToEth(await provider.getBalance(address))));
    let tokenBalance = 0;
    if (token && token.address != ethers.constants.AddressZero) {
      tokenBalance = weiToEth(await token.balanceOf(address));
    }
    balances[name]['tokens'] = new BigNumber(parseFloat(tokenBalance));
  }
  return balances;
}

function getTotalContributed(contributions) {
  let totalContributed = 0;
  contributions.map((contribution) => {
    totalContributed += contribution.amount;
  });
  return totalContributed;
}

async function approve(signer, tokenContract, to, tokenId) {
  const data = encodeData(tokenContract, 'approve', [to, tokenId]);

  return signer.sendTransaction({
    to: tokenContract.address,
    data,
  });
}

async function approveForAll(signer, tokenContract, to) {
  const data = encodeData(tokenContract, 'setApprovalForAll', [to, true]);

  return signer.sendTransaction({
    to: tokenContract.address,
    data,
  });
}

async function contribute(partyBidContract, contributorSigner, value) {
  const data = encodeData(partyBidContract, 'contribute');

  return contributorSigner.sendTransaction({
    to: partyBidContract.address,
    data,
    value,
  });
}

async function emergencyWithdrawEth(partyBidContract, signer, value) {
  const data = encodeData(partyBidContract, 'emergencyWithdrawEth', [value]);

  return signer.sendTransaction({
    to: partyBidContract.address,
    data,
  });
}

async function emergencyCall(partyBidContract, signer, contractAddress, calldata) {
  const data = encodeData(partyBidContract, 'emergencyCall', [contractAddress, calldata]);

  return signer.sendTransaction({
    to: partyBidContract.address,
    data,
  });
}

async function emergencyForceLost(partyBidContract, signer) {
  const data = encodeData(partyBidContract, 'emergencyForceLost',);

  return signer.sendTransaction({
    to: partyBidContract.address,
    data,
  });
}

function initExpectedTotalContributed(signers) {
  const expectedTotalContributed = {};
  signers.map((signer) => {
    expectedTotalContributed[signer.address] = 0;
  });
  return expectedTotalContributed;
}

async function bidThroughParty(partyBidContract, signer) {
  const data = encodeData(partyBidContract, 'bid');

  return signer.sendTransaction({
    to: partyBidContract.address,
    data,
  });
}

async function createReserveAuction(
  artist,
  marketContract,
  nftContractAddress,
  tokenId,
  reservePrice,
) {
  const data = encodeData(marketContract, 'createReserveAuction', [
    nftContractAddress,
    tokenId,
    reservePrice,
  ]);

  return artist.sendTransaction({
    to: marketContract.address,
    data,
  });
}

async function createZoraAuction(
  artist,
  marketContract,
  tokenId,
  tokenContractAddress,
  reservePrice,
  duration = FOURTY_EIGHT_HOURS_IN_SECONDS,
  curatorFeePercentage = 0,
) {
  const data = encodeData(marketContract, 'createAuction', [
    tokenId,
    tokenContractAddress,
    duration,
    reservePrice,
    artist.address,
    curatorFeePercentage,
    ethers.constants.AddressZero,
  ]);

  return artist.sendTransaction({
    to: marketContract.address,
    data,
  });
}

async function createSuperRareColdieAuction(
  artist,
  marketContract,
  nftContractAddress,
  tokenId,
  reservePrice,
  duration = TWENTY_FOUR_HOURS_IN_BLOCKS
) {
  const data = encodeData(
    marketContract,
    'createColdieAuction',
    [nftContractAddress, tokenId, reservePrice, duration]
  );

  return artist.sendTransaction({
    to: marketContract.address,
    data,
  });
}

// Validate state variables based on ETH amount added to contract
async function expectRedeemable(
  provider,
  partyBid,
  ethAmountAdded,
  ethAmountRedeemed,
) {
  const redeemableEth = ethAmountAdded - ethAmountRedeemed;

  // eth balance is equal to redeemableEth + excessContributions
  const excessContributions = await partyBid.excessContributions();
  const expectedBalance =
    redeemableEth + parseFloat(weiToEth(excessContributions));
  const ethBalance = await provider.getBalance(partyBid.address);
  await expect(ethBalance).to.equal(eth(expectedBalance));

  // redeemableEthBalance is equal to ethAmountAdded
  const redeemableEthBalance = await partyBid.redeemableEthBalance();
  await expect(redeemableEthBalance).to.equal(eth(redeemableEth));

  // redeemAmount(tokenAmount) is expected portion
  const tokenAmount = 100;
  const totalSupply = await partyBid.totalSupply();
  const expectedRedeemAmount =
    redeemableEth * (tokenAmount / parseFloat(weiToEth(totalSupply)));
  const redeemAmount = await partyBid.redeemAmount(eth(tokenAmount));
  await expect(redeemAmount).to.equal(eth(expectedRedeemAmount));
}

module.exports = {
  eth,
  weiToEth,
  encodeData,
  getBalances,
  getTotalContributed,
  approve,
  contribute,
  emergencyWithdrawEth,
  emergencyCall,
  emergencyForceLost,
  initExpectedTotalContributed,
  bidThroughParty,
  createReserveAuction,
  createZoraAuction,
  createSuperRareColdieAuction,
  approveForAll
};
