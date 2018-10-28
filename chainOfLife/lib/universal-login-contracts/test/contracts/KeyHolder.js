import chai, {expect} from 'chai';
import chaiAsPromised from 'chai-as-promised';
import KeyHolder from '../../build/KeyHolder';
import {createMockProvider, deployContract, getWallets, solidity, contractWithWallet} from 'ethereum-waffle';
import {addressToBytes32} from '../utils';
import {utils} from 'ethers';
import {MANAGEMENT_KEY, ACTION_KEY, ECDSA_TYPE, RSA_TYPE} from '../../lib/consts';

chai.use(chaiAsPromised);
chai.use(solidity);

describe('Key holder', async () => {
  let provider;
  let wallet;
  let anotherWallet;
  let anotherWallet2;
  let managementWallet;

  let identity;
  let unknownWallet;
  let actionWallet;

  let managementWalletKey;
  let unknownWalletKey;

  let fromActionWallet;
  let fromUnknownWallet;

  let managementKey;
  let actionKey;
  let actionKey2;
  let actionWalletKey;

  const amount = utils.parseEther('0.1');

  const addActionKey = () => identity.addKey(actionKey, ACTION_KEY, ECDSA_TYPE);
  const isActionKey = () => identity.keyHasPurpose(actionKey, ACTION_KEY);  

  beforeEach(async () => {
    provider = createMockProvider();
    [wallet, managementWallet, actionWallet, unknownWallet, anotherWallet, anotherWallet2] = await getWallets(provider);

    managementKey = addressToBytes32(wallet.address);
    managementWalletKey = addressToBytes32(managementWallet.address);
    actionWalletKey = addressToBytes32(actionWallet.address);
    unknownWalletKey = addressToBytes32(unknownWallet.address);
    actionKey = addressToBytes32(anotherWallet.address);
    actionKey2 = addressToBytes32(anotherWallet2.address);

    identity = await deployContract(wallet, KeyHolder, [managementKey]);

    fromActionWallet = await contractWithWallet(identity, actionWallet);
    fromUnknownWallet = await contractWithWallet(identity, unknownWallet);

    await identity.addKey(managementWalletKey, MANAGEMENT_KEY, ECDSA_TYPE);
    await identity.addKey(actionWalletKey, ACTION_KEY, ECDSA_TYPE);

    await wallet.send(identity.address, amount);
  });

  describe('Create', async () => {
    it('Should be deployed successfully', async () => {
      const {address} = identity;
      expect(address).to.not.be.null;
    });

    it('Key should be management key', async () => {
      const key = await identity.getKey(managementKey);
      expect(key.purpose).to.eq(MANAGEMENT_KEY);
    });

    it('Should return the purpose', async () => {
      expect(await identity.keyHasPurpose(managementKey, MANAGEMENT_KEY)).to.be.true;
      expect(await identity.keyHasPurpose(managementKey, ACTION_KEY)).to.be.false;
      expect(await identity.keyHasPurpose(managementWalletKey, MANAGEMENT_KEY)).to.be.true;
      expect(await identity.keyHasPurpose(actionKey, MANAGEMENT_KEY)).to.be.false;
      expect(await identity.keyHasPurpose(actionKey, ACTION_KEY)).to.be.false;
      expect(await identity.keyHasPurpose(actionWalletKey, ACTION_KEY)).to.be.true;
    });
  });

  describe('Add key', async () => {
    it('Should add key successfully', async () => {
      await addActionKey();
      expect(await isActionKey()).to.be.true;
      const existingKeys = await identity.keys(actionKey);
      expect(existingKeys[0]).to.eq(ACTION_KEY);
      expect(existingKeys[1]).to.eq(ECDSA_TYPE);
      expect(existingKeys[2]).to.eq(utils.hexlify(actionKey));
    });

    it('Should not allow to add existing key', async () => {
      await expect(identity.addKey(managementKey, MANAGEMENT_KEY, ECDSA_TYPE)).to.be.reverted;
    });

    it('Should emit KeyAdded event successfully', async () => {
      await expect(addActionKey()).to
        .emit(identity, 'KeyAdded')
        .withArgs(utils.hexlify(actionKey), ACTION_KEY, ECDSA_TYPE);
    });

    it('Should not allow to add new key with unknown key', async () => {
      await expect(fromUnknownWallet.addKey(unknownWalletKey, MANAGEMENT_KEY, ECDSA_TYPE)).to.be.reverted;
    });

    it('Should not allow to add key with action key', async () => {
      await expect(fromActionWallet.addKey(unknownWalletKey, MANAGEMENT_KEY, ECDSA_TYPE)).to.be.reverted;
    });
  });

  describe('Add multiple keys', async () => {
    it('Should add multiple keys successfully', async () => {
      await identity.addKeys([actionKey, actionKey2], [ACTION_KEY, ACTION_KEY], [ECDSA_TYPE, RSA_TYPE]);
      expect(await isActionKey()).to.be.true;
      expect(await identity.keyHasPurpose(actionKey2, ACTION_KEY)).to.be.true;
      const existingKeys = await identity.keys(actionKey);
      expect(existingKeys[0]).to.eq(ACTION_KEY);
      expect(existingKeys[1]).to.eq(ECDSA_TYPE);
      expect(existingKeys[2]).to.eq(utils.hexlify(actionKey));
      const existingKeys2 = await identity.keys(actionKey2);
      expect(existingKeys2[0]).to.eq(ACTION_KEY);
      expect(existingKeys2[1]).to.eq(RSA_TYPE);
      expect(existingKeys2[2]).to.eq(utils.hexlify(actionKey2));
    });

    it('Should not allow to add existing key', async () => {
      await expect(identity.addKeys([managementKey, actionKey], [MANAGEMENT_KEY, ACTION_KEY], [ECDSA_TYPE, ECDSA_TYPE])).to.be.reverted;
    });

    it('Should not allow unequal length argument sets', async () => {
      await expect(identity.addKeys([actionKey, actionKey2], [ACTION_KEY], [])).to.be.reverted;
    });

    it('Should not allow the same key multiple times', async () => {
      await expect(identity.addKeys([actionKey, actionKey], [ACTION_KEY, ACTION_KEY], [ECDSA_TYPE, ECDSA_TYPE])).to.be.reverted;
    });
  });

  describe('Get key', async () => {
    it('Should return key correctly', async () => {
      await addActionKey();
      const getKeyResult = await identity.getKey(actionKey);
      expect(getKeyResult[0]).to.eq(ACTION_KEY);
      expect(getKeyResult[2]).to.eq(utils.hexlify(actionKey));
    });

    it('Should return key purpose correctly', async () => {
      expect(await identity.getKeyPurpose(managementKey)).to.eq(MANAGEMENT_KEY);
      await addActionKey();
      expect(await identity.getKeyPurpose(actionKey)).to.eq(ACTION_KEY);
    });

    it('Should return keys by purpose correctly', async () => {
      const actualManagementKeys = await identity.getKeysByPurpose(MANAGEMENT_KEY);
      expect(actualManagementKeys[0]).to.eq(utils.hexlify(managementKey));
      await identity.addKey(actionKey, ACTION_KEY, ECDSA_TYPE);
      const actualActionKeys = await identity.getKeysByPurpose(ACTION_KEY);
      expect(actualActionKeys[1]).to.eq(utils.hexlify(actionKey));
    });
  });

  describe('Remove key', async () => {
    beforeEach(async () => {
      await addActionKey();
    });

    it('Should remove key successfully', async () => {
      expect(await isActionKey()).to.be.true;
      await identity.removeKey(actionKey, ACTION_KEY);
      expect(await identity.keyHasPurpose(actionKey, ACTION_KEY)).to.be.false;
    });

    it('Should emit KeyRemoved event successfully', async () => {
      expect(await isActionKey()).to.be.true;
      await expect(identity.removeKey(actionKey, ACTION_KEY)).to
        .emit(identity, 'KeyRemoved')
        .withArgs(utils.hexlify(actionKey), ACTION_KEY, ECDSA_TYPE);
    });

    it('Should remove key from keysByPurpose', async () => {
      const actionKeys = await identity.getKeysByPurpose(ACTION_KEY);
      expect(actionKeys[1]).to.eq(utils.hexlify(actionKey));
      expect(await isActionKey()).to.be.true;
      await identity.removeKey(actionKey, ACTION_KEY);
      expect(await isActionKey()).to.be.false;
      const actualActionKeys = await identity.getKeysByPurpose(ACTION_KEY);
      expect(actualActionKeys[1]).not.to.eq(utils.hexlify(actionKey));
    });

    it('Should not allow to remove key with unknown key', async () => {
      expect(await isActionKey()).to.be.true;
      await expect(fromUnknownWallet.removeKey(actionKey, ACTION_KEY)).to.be.reverted;
    });

    it('Should not allow to remove key with action key', async () => {
      await expect(fromActionWallet.removeKey(actionKey, ACTION_KEY)).to.be.reverted;
    });

    it('Should not allow to remove last management key', async () => {
      await identity.removeKey(managementWalletKey, MANAGEMENT_KEY);
      expect(await identity.keyHasPurpose(managementWalletKey, MANAGEMENT_KEY)).to.be.false;
      await expect(identity.removeKey(managementKey, MANAGEMENT_KEY)).to.be.reverted;
    });

    it('Should not allow to remove key with invalid purpose', async () => {
      await expect(identity.removeKey(actionWalletKey, MANAGEMENT_KEY)).to.be.reverted;
    });
  });
});
