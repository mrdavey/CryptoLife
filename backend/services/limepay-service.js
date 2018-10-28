const axios = require('axios');
const ethers = require('ethers');


const LIME_PAY_CONFIG = require("./../config/limepay");

const PAYMENT_URL = LIME_PAY_CONFIG.BASE_URL + "v1/payments";
const SHOPPER_URL = LIME_PAY_CONFIG.BASE_URL + "v1/shoppers";

const API_KEY = LIME_PAY_CONFIG.API_KEY;
const API_SECRET = LIME_PAY_CONFIG.SECRET;

const GAS_LIMIT = "4700000";
const TOTAL_GAS_REQUIRED = ethers.utils.bigNumberify("430000");

const DAI_TOKEN = "0xe5ffE51Cdc233702fD09810B467293161f83562b";
const DETSY_ADDRESS = "0x13bDc9708a3680c4Ae2C220a945e3C5f30e06c36";

const GAS_STATION_URL = "https://ethgasstation.info/json/ethgasAPI.json";

class LimePayService {

    constructor() {
        if (!LimePayService.instance) {
            LimePayService.instance = this;
        }
        return LimePayService.instance;
    }

    async getPayment(id) {
        let url = PAYMENT_URL + "/" + id;
        let result = await executeGET(url);
        return result.data;
    }

    async createPayment(shopperID, itemName, itemPrice, tokenPrice) {

        let gasPrice = await getGasPrice();

        let itemData = { name: itemName, price: itemPrice, tokenPrice };
        let data = buildRequestData(shopperID, itemData, gasPrice);

        try {
            let result = await executePOST(PAYMENT_URL, data);
            return { token: result.headers["x-lime-token"], paymentID: result.data._id };
        } catch (error) {
            console.log(`An error occured while creating payment.Details:\n ${JSON.stringify(error.response.data)}`);
            throw error;
        }
    }

    async createShopper(firstName, lastName, email, walletAddress) {
        try {
            let shopperData = { firstName, lastName, email, walletAddress };
            shopperData.vendor = LIME_PAY_CONFIG.VENDOR;
            let createdShopper = await executePOST(SHOPPER_URL, shopperData);
            return createdShopper.data;
        } catch (error) {
            console.log(`And error occured whilte creating shopper. Details: \n ${JSON.stringify(error.response.data)}`);
            throw error;
        }
    }

}

let limePayService = new LimePayService();
module.exports = limePayService;

let buildRequestData = function (shopperID, item, gasPrice) {
    let data = {};
    data.currency = "EUR";
    data.shopper = shopperID;

    data.items = [{ description: "unicorn doll", lineAmount: item.price, quantity: 1 }];

    let weiAmount = TOTAL_GAS_REQUIRED.mul(gasPrice).toString();
    data.fundTxData = { tokenAmount: item.tokenPrice, weiAmount }; // TODO item.price? what about the commission

    data.genericTransactions = [];
    data.genericTransactions[0] = { gasPrice: gasPrice.toString(), gasLimit: "50000", to: DAI_TOKEN, functionName: "approve" };
    data.genericTransactions[1] = { gasPrice: gasPrice.toString(), gasLimit: "170000", to: DETSY_ADDRESS, functionName: "buyItem" };

    return data;
}

let buildHeaders = function () {
    return {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache",
        "Authorization": "Basic " + Buffer.from(API_KEY + ":" + API_SECRET).toString('base64')
    }
}

let getGasPrice = async function () {
    var price = await axios.get(GAS_STATION_URL);
    var parsedPrice = ethers.utils.parseUnits((price.data.fast / 10).toString(10), 'gwei');

    return parsedPrice;
}

let executePOST = async function (url, data) {
    return axios({
        method: "POST",
        url: url,
        headers: buildHeaders(),
        data: data
    });
}

let executeGET = async function (url) {
    return axios({
        method: "GET",
        url: url,
        headers: buildHeaders()
    });
}
