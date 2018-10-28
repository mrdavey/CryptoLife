import express from 'express';
import asyncMiddleware from '../middlewares/async_middleware';

export const create = (identityService) => async (req, res) => {
  const {managementKey, ensName} = req.body;
  const transaction = await identityService.create(managementKey, ensName);
  res.status(201)
    .type('json')
    .send(JSON.stringify({transaction}));
};

export const execution = (identityService) => async (req, res) => {
  const {contractAddress, ...message} = req.body;
  const transaction = await identityService.executeSigned(contractAddress, message);
  res.status(201)
    .type('json')
    .send(JSON.stringify({transaction}));
};

export default (identityService) => {
  const router = new express.Router();

  router.post('/',
    asyncMiddleware(create(identityService)));

  router.post('/execution',
    asyncMiddleware(execution(identityService)));

  return router;
};
