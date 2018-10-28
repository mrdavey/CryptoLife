import chai, {expect} from 'chai';
import chaiHttp from 'chai-http';
import {RelayerUnderTest} from '../../../lib/index';
import {createMockProvider, getWallets} from 'ethereum-waffle';
import {waitForContractDeploy} from '../../../lib/utils/utils';
import Identity from 'universal-login-contracts/build/Identity';

chai.use(chaiHttp);

describe('Relayer - Authorisation routes', async () => {
  let relayer;
  let provider;
  let wallet;
  let otherWallet;
  let contract;

  before(async () => {
    provider = createMockProvider();
    [wallet, otherWallet] = await getWallets(provider);
    relayer = await RelayerUnderTest.createPreconfigured(provider);
    relayer.start();
    const result = await chai.request(relayer.server)
      .post('/identity')
      .send({
        managementKey: wallet.address,
        ensName: 'marek.mylogin.eth'
      });
    const {transaction} = result.body;
    contract = await waitForContractDeploy(wallet, Identity, transaction.hash);
  });

  it('Authorise', async () => {
    const result = await chai.request(relayer.server)
      .post('/authorisation')
      .send({
        identityAddress: contract.address,
        key: wallet.address,
        label: ' '
      });
    expect(result.status).to.eq(201);
  });

  it('get pending authorisations', async () => {
    const result = await chai.request(relayer.server)
      .get(`/authorisation/${contract.address}`);
    expect(result.body.response).to.deep.eq([{key:wallet.address, label: ' ', index: 0}]);
  });

  it('get non-existing pending authorisations', async () => {
    const result = await chai.request(relayer.server)
      .get(`/authorisation/${otherWallet.address}`);
    expect(result.status).to.eq(200);
    expect(result.body.response).to.deep.eq([]);
  });

  it('response status should be 201 when deny request', async () => {
    const result = await chai.request(relayer.server)
      .post(`/authorisation/${contract.address}`)      
      .send({
        key: wallet.address
      });
    expect(result.status).to.eq(201);
  });
});
