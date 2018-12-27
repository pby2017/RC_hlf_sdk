//SPDX-License-Identifier: Apache-2.0

/*
  This code is based on code written by the Hyperledger Fabric community.
  Original code can be found here: https://github.com/hyperledger/fabric-samples/blob/release/fabcar/query.js
  and https://github.com/hyperledger/fabric-samples/blob/release/fabcar/invoke.js
 */

// call the packages we need
var express       = require('express');        // call express
var app           = express();                 // define our app using express
var bodyParser    = require('body-parser');
var http          = require('http')
var fs            = require('fs');
var Fabric_Client = require('fabric-client');
var path          = require('path');
var util          = require('util');
var os            = require('os');

module.exports = (function() {
		return{
		init_wallet:  function(req, res){
			console.log("changing holder of tuna catch: ");
			
			var param_userId = req.params.user_id
			console.log("param##########################")
			console.log(param_userId)


			var fabric_client = new Fabric_Client();
	
			// setup the fabric network
			var channel = fabric_client.newChannel('channelrc');
			var peer = fabric_client.newPeer('grpc://localhost:7051');
			channel.addPeer(peer);
			var order = fabric_client.newOrderer('grpc://localhost:7050')
			channel.addOrderer(order);
	
			var member_user = null;
			var store_path = path.join(os.homedir(), '.hfc-key-store');
			console.log('Store path:'+store_path);
			var tx_id = null;
			var result_of_tx = {};
			result_of_tx['userId'] = param_userId; 
	
			// create the key value store as defined in the fabric-client/config/default.json 'key-value-store' setting
			Fabric_Client.newDefaultKeyValueStore({ path: store_path
			}).then((state_store) => {
				// assign the store to the fabric client
				fabric_client.setStateStore(state_store);
				var crypto_suite = Fabric_Client.newCryptoSuite();
				// use the same location for the state store (where the users' certificate are kept)
				// and the crypto store (where the users' keys are kept)
				var crypto_store = Fabric_Client.newCryptoKeyStore({path: store_path});
				crypto_suite.setCryptoKeyStore(crypto_store);
				fabric_client.setCryptoSuite(crypto_suite);
	
				// get the enrolled user from persistence, this user will sign all requests
				return fabric_client.getUserContext('admin', true);
			}).then((user_from_store) => {
				if (user_from_store && user_from_store.isEnrolled()) {
					console.log('Successfully loaded admin from persistence');
					member_user = user_from_store;
				} else {
					throw new Error('Failed to get admin.... run registerAdmin.js');
				}
	
				// get a transaction id object based on the current user assigned to fabric client
				tx_id = fabric_client.newTransactionID();
				console.log("Assigning transaction_id: ", tx_id._transaction_id);
	
				/////////////////////////////////////////////////////////////////////////////
				//                                  init_wallet
				/////////////////////////////////////////////////////////////////////////////
				var request = {
					chaincodeId: 'rc_cc',
					fcn: 'init_wallet',
					args: [param_userId],
					chainId: 'channelrc',
					txId: tx_id
				};

				// send the transaction proposal to the peers
				return channel.sendTransactionProposal(request);
			}).then((results) => {

				var proposalResponses = results[0];
				var proposal = results[1];
				let isProposalGood = false;
				if (proposalResponses && proposalResponses[0].response &&
					proposalResponses[0].response.status === 200) {
						isProposalGood = true;
						console.log('Transaction proposal was good');
					} else {
						console.error('Transaction proposal was bad');
						result_of_tx['message'] = proposalResponses[0].response.message;
					}
				if (isProposalGood) {
					console.log(util.format(
						'Successfully sent Proposal and received ProposalResponse: Status - %s, payload - "%s", proposal - "%s"',
						proposalResponses[0].response.status, proposalResponses[0].response.payload, proposal));
					
					// result for final response
					// result_of_tx = proposalResponses[0].response.payload

					// build up the request for the orderer to have the transaction committed
					var request = {
						proposalResponses: proposalResponses,
						proposal: proposal
					};
	
					var transaction_id_string = tx_id.getTransactionID(); //Get the transaction ID string to be used by the event processing
					var promises = [];
					
					var sendPromise = channel.sendTransaction(request);
					promises.push(sendPromise); //we want the send transaction first, so that we know where to check status
					
					return Promise.all(promises);
				} else {
					console.error('Failed to send Proposal or receive valid response. Response null or status is not 200. exiting...');
					result_of_tx['result'] = 'fail'
					res.json(result_of_tx);
				}
			}).then((results) => {
				console.log('Send transaction promise and event listener promise have completed');
				result_of_tx['result'] = 'success'
				console.log(result_of_tx.toString('utf8', 0, result_of_tx.length));
				res.json(result_of_tx)
			}).catch((err) => {
				console.error('Failed to invoke :: ' + err);
				result_of_tx['result'] = 'fail'
				console.log(result_of_tx.toString('utf8', 0, result_of_tx.length))
				res.send(result_of_tx);
			});
	
		},
		publish:  function(req, res){
			console.log("changing holder of tuna catch: ");
			
			var param_userId = req.params.user_id;
			var param_amount = req.params.amount;
			var param_date = req.params.date;
			console.log("###################################################")
			console.log(param_userId + ":" + param_amount + ":" + param_date)
			console.log("###################################################")
	
			var fabric_client = new Fabric_Client();
	
			// setup the fabric network
			var channel = fabric_client.newChannel('channelrc');
			var peer = fabric_client.newPeer('grpc://localhost:7051');
			channel.addPeer(peer);
			var order = fabric_client.newOrderer('grpc://localhost:7050')
			channel.addOrderer(order);
	
			var member_user = null;
			var store_path = path.join(os.homedir(), '.hfc-key-store');
			console.log('Store path:'+store_path);
			var tx_id = null;
			var result_of_tx = {};
			result_of_tx['userId'] = param_userId;
			result_of_tx['amount'] = param_amount;
			result_of_tx['date']   = param_date;
	
			// create the key value store as defined in the fabric-client/config/default.json 'key-value-store' setting
			Fabric_Client.newDefaultKeyValueStore({ path: store_path
			}).then((state_store) => {
				// assign the store to the fabric client
				fabric_client.setStateStore(state_store);
				var crypto_suite = Fabric_Client.newCryptoSuite();
				// use the same location for the state store (where the users' certificate are kept)
				// and the crypto store (where the users' keys are kept)
				var crypto_store = Fabric_Client.newCryptoKeyStore({path: store_path});
				crypto_suite.setCryptoKeyStore(crypto_store);
				fabric_client.setCryptoSuite(crypto_suite);
	
				// get the enrolled user from persistence, this user will sign all requests
				return fabric_client.getUserContext('admin', true);
			}).then((user_from_store) => {
				if (user_from_store && user_from_store.isEnrolled()) {
					console.log('Successfully loaded admin from persistence');
					member_user = user_from_store;
				} else {
					throw new Error('Failed to get admin.... run registerAdmin.js');
				}
	
				// get a transaction id object based on the current user assigned to fabric client
				tx_id = fabric_client.newTransactionID();
				console.log("Assigning transaction_id: ", tx_id._transaction_id);
	
				/////////////////////////////////////////////////////////////////////////////
				//                                  publish
				/////////////////////////////////////////////////////////////////////////////
				var request = {
					chaincodeId: 'rc_cc',
					fcn: 'publish',
					args: [param_userId, "0", param_amount, param_date],
					chainId: 'channelrc',
					txId: tx_id
				};

				// send the transaction proposal to the peers
				return channel.sendTransactionProposal(request);
			}).then((results) => {

				var proposalResponses = results[0];
				var proposal = results[1];
				let isProposalGood = false;
				if (proposalResponses && proposalResponses[0].response &&
					proposalResponses[0].response.status === 200) {
						isProposalGood = true;
						console.log('Transaction proposal was good');
					} else {
						console.error('Transaction proposal was bad');
						result_of_tx['message'] = proposalResponses[0].response.message;
					}
				if (isProposalGood) {
					console.log(util.format(
						'Successfully sent Proposal and received ProposalResponse: Status - %s, payload - "%s", proposal - "%s"',
						proposalResponses[0].response.status, proposalResponses[0].response.payload, proposal));
					
					// result for final response
					// result_of_tx = proposalResponses[0].response.payload

					// build up the request for the orderer to have the transaction committed
					var request = {
						proposalResponses: proposalResponses,
						proposal: proposal
					};
	
					var transaction_id_string = tx_id.getTransactionID(); //Get the transaction ID string to be used by the event processing
					var promises = [];
					
					var sendPromise = channel.sendTransaction(request);
					promises.push(sendPromise); //we want the send transaction first, so that we know where to check status
					
					return Promise.all(promises);
				} else {
					console.error('Failed to send Proposal or receive valid response. Response null or status is not 200. exiting...');
					// result_of_tx = proposalResponses[0].response.message
					result_of_tx['result'] = 'fail'
					res.json(result_of_tx);
				}
			}).then((results) => {
				console.log('Send transaction promise and event listener promise have completed');
				result_of_tx['result'] = 'success'
				res.json(result_of_tx)
			}).catch((err) => {
				console.error('Failed to invoke :: ' + err);
				result_of_tx['result'] = 'fail'
				res.json(result_of_tx);
			});
	
		},
		transfer:  function(req, res){
			console.log("transfer: ");
			
			var param_fromId = req.params.from_id;
			var param_toId = req.params.to_id;
			var param_amount = req.params.amount;
			var param_type = req.params.type;
			var param_date = req.params.date;
			console.log("###################################################")
			console.log(param_fromId + ":" + param_toId + ":" + param_amount + ":" + param_type + ":" + param_date)
			console.log("###################################################")

			var fabric_client = new Fabric_Client();
	
			// setup the fabric network
			var channel = fabric_client.newChannel('channelrc');
			var peer = fabric_client.newPeer('grpc://localhost:7051');
			channel.addPeer(peer);
			var order = fabric_client.newOrderer('grpc://localhost:7050')
			channel.addOrderer(order);
	
			var member_user = null;
			var store_path = path.join(os.homedir(), '.hfc-key-store');
			console.log('Store path:'+store_path);
			var tx_id = null;
			var result_of_tx = {};
			result_of_tx['fromId'] = param_fromId;
			result_of_tx['toId'] = param_toId;
			result_of_tx['amount'] = param_amount;
			result_of_tx['type'] = param_type;
			result_of_tx['date'] = param_date;
	
			// create the key value store as defined in the fabric-client/config/default.json 'key-value-store' setting
			Fabric_Client.newDefaultKeyValueStore({ path: store_path
			}).then((state_store) => {
				// assign the store to the fabric client
				fabric_client.setStateStore(state_store);
				var crypto_suite = Fabric_Client.newCryptoSuite();
				// use the same location for the state store (where the users' certificate are kept)
				// and the crypto store (where the users' keys are kept)
				var crypto_store = Fabric_Client.newCryptoKeyStore({path: store_path});
				crypto_suite.setCryptoKeyStore(crypto_store);
				fabric_client.setCryptoSuite(crypto_suite);
	
				// get the enrolled user from persistence, this user will sign all requests
				return fabric_client.getUserContext('admin', true);
			}).then((user_from_store) => {
				if (user_from_store && user_from_store.isEnrolled()) {
					console.log('Successfully loaded admin from persistence');
					member_user = user_from_store;
				} else {
					throw new Error('Failed to get admin.... run registerAdmin.js');
				}
	
				// get a transaction id object based on the current user assigned to fabric client
				tx_id = fabric_client.newTransactionID();
				console.log("Assigning transaction_id: ", tx_id._transaction_id);

				/////////////////////////////////////////////////////////////////////////////
				//                                  transfer
				// '{"Args":["transfer", "yang", "lee", "10", "1", "2"]}'
				/////////////////////////////////////////////////////////////////////////////
				var request = {
					chaincodeId: 'rc_cc',
					fcn: 'transfer',
					args: [param_fromId, param_toId, param_amount, param_type, param_date],
					chainId: 'channelrc',
					txId: tx_id
				};

				// send the transaction proposal to the peers
				return channel.sendTransactionProposal(request);
			}).then((results) => {

				var proposalResponses = results[0];
				var proposal = results[1];
				let isProposalGood = false;
				console.log(proposalResponses)
				if (proposalResponses && proposalResponses[0].response &&
					proposalResponses[0].response.status === 200) {
						isProposalGood = true;
						console.log('Transaction proposal was good');
					} else {
						console.error('Transaction proposal was bad');
						result_of_tx['message'] = proposalResponses[0].response.message;
					}
				if (isProposalGood) {
					console.log(util.format(
						'Successfully sent Proposal and received ProposalResponse: Status - %s, payload - "%s", proposal - "%s"',
						proposalResponses[0].response.status, proposalResponses[0].response.payload, proposal));
					
					// result for final response
					// result_of_tx = proposalResponses[0].response.payload

					// build up the request for the orderer to have the transaction committed
					var request = {
						proposalResponses: proposalResponses,
						proposal: proposal
					};
	
					var transaction_id_string = tx_id.getTransactionID(); //Get the transaction ID string to be used by the event processing
					var promises = [];
					
					var sendPromise = channel.sendTransaction(request);
					promises.push(sendPromise); //we want the send transaction first, so that we know where to check status
					
					return Promise.all(promises);
				} else {
					console.error('Failed to send Proposal or receive valid response. Response null or status is not 200. exiting...');
					// result_of_tx = proposalResponses[0].response.message
					result_of_tx['result'] = 'fail'
					res.json(result_of_tx);
				}
			}).then((results) => {
				console.log('Send transaction promise and event listener promise have completed');
				result_of_tx['result'] = 'success'
				res.json(result_of_tx)
			}).catch((err) => {
				console.error('Failed to invoke :: ' + err);
				result_of_tx['result'] = 'fail'
				res.json(result_of_tx);
			});
	
		},
		get_account: function(req, res){
			console.log("get account from database: ");
			
			var param_userId = req.params.user_id;
			console.log("###################################################")
			console.log(param_userId)
			console.log("###################################################")
	
			var fabric_client = new Fabric_Client();
	
			// setup the fabric network
			var channel = fabric_client.newChannel('channelrc');
			var peer = fabric_client.newPeer('grpc://localhost:7051');
			channel.addPeer(peer);
	
			//
			var member_user = null;
			var store_path = path.join(os.homedir(), '.hfc-key-store');
			console.log('Store path:'+store_path);
			var tx_id = null;
			var result_of_tx = {};
			result_of_tx['userId'] = param_userId;
	
			// create the key value store as defined in the fabric-client/config/default.json 'key-value-store' setting
			Fabric_Client.newDefaultKeyValueStore({ path: store_path
			}).then((state_store) => {
				// assign the store to the fabric client
				fabric_client.setStateStore(state_store);
				var crypto_suite = Fabric_Client.newCryptoSuite();
				// use the same location for the state store (where the users' certificate are kept)
				// and the crypto store (where the users' keys are kept)
				var crypto_store = Fabric_Client.newCryptoKeyStore({path: store_path});
				crypto_suite.setCryptoKeyStore(crypto_store);
				fabric_client.setCryptoSuite(crypto_suite);
	
				// get the enrolled user from persistence, this user will sign all requests
				return fabric_client.getUserContext('admin', true);
			}).then((user_from_store) => {
				if (user_from_store && user_from_store.isEnrolled()) {
					console.log('Successfully loaded admin from persistence');
					member_user = user_from_store;
				} else {
					throw new Error('Failed to get admin.... run registerAdmin.js');
				}
	
				/////////////////////////////////////////////////////////////////////////////
				//                                  get_account
				/////////////////////////////////////////////////////////////////////////////
				var request = {
					//targets : --- letting this default to the peers assigned to the channel
					chaincodeId: 'rc_cc',
					fcn: 'get_account',
					args: [param_userId],
					chainId: 'channelrc',
					txId: tx_id
				};
	
				// send the query proposal to the peer
				return channel.queryByChaincode(request);
			}).then((query_responses) => {
				console.log("Query has completed, checking results");
				// query_responses could have more than one  results if there multiple peers were used as targets
				if (query_responses && query_responses.length == 1) {
					if (query_responses[0] instanceof Error) {	
						console.error("error from query = ", query_responses[0].toString());
						result_of_tx['result'] = 'fail'
						result_of_tx['message'] = query_responses[0].message;
						res.json(result_of_tx);
					} else {
						console.log("Response is ",  query_responses[0].toString());
						result_of_tx['result'] = 'success'
						result_of_tx['value'] = query_responses[0].toString();
						res.json(result_of_tx);
					}
				} else {
					console.log("No payloads were returned from query");
				}
			}).catch((err) => {
				console.error('Failed to query successfully :: ' + err);
				result_of_tx['message'] = err;
				result_of_tx['result'] = 'fail'
				res.json(result_of_tx)
			});
		},
		get_txList: function(req, res){
			console.log("get transaction list from database: ");
			
			var param_userId = req.params.user_id;
			console.log("###################################################")
			console.log(param_userId)
			console.log("###################################################")
	
			var fabric_client = new Fabric_Client();
	
			// setup the fabric network
			var channel = fabric_client.newChannel('channelrc');
			var peer = fabric_client.newPeer('grpc://localhost:7051');
			channel.addPeer(peer);
	
			//
			var member_user = null;
			var store_path = path.join(os.homedir(), '.hfc-key-store');
			console.log('Store path:'+store_path);
			var tx_id = null;
			var result_of_tx = {};
			result_of_tx['userId'] = param_userId;
	
			// create the key value store as defined in the fabric-client/config/default.json 'key-value-store' setting
			Fabric_Client.newDefaultKeyValueStore({ path: store_path
			}).then((state_store) => {
				// assign the store to the fabric client
				fabric_client.setStateStore(state_store);
				var crypto_suite = Fabric_Client.newCryptoSuite();
				// use the same location for the state store (where the users' certificate are kept)
				// and the crypto store (where the users' keys are kept)
				var crypto_store = Fabric_Client.newCryptoKeyStore({path: store_path});
				crypto_suite.setCryptoKeyStore(crypto_store);
				fabric_client.setCryptoSuite(crypto_suite);
	
				// get the enrolled user from persistence, this user will sign all requests
				return fabric_client.getUserContext('admin', true);
			}).then((user_from_store) => {
				if (user_from_store && user_from_store.isEnrolled()) {
					console.log('Successfully loaded admin from persistence');
					member_user = user_from_store;
				} else {
					throw new Error('Failed to get user1.... run registerAdmin.js');
				}
	
				/////////////////////////////////////////////////////////////////////////////
				//                                  get_txList
				/////////////////////////////////////////////////////////////////////////////
				var request = {
					//targets : --- letting this default to the peers assigned to the channel
					chaincodeId: 'rc_cc',
					fcn: 'get_txList',
					args: [param_userId],
					chainId: 'channelrc',
					txId: tx_id
				};
	
				// send the query proposal to the peer
				return channel.queryByChaincode(request);
			}).then((query_responses) => {
				console.log("Query has completed, checking results");
				// query_responses could have more than one  results if there multiple peers were used as targets
				if (query_responses && query_responses.length == 1) {
					if (query_responses[0] instanceof Error) {	
						console.error("error from query = ", query_responses[0].toString());
						result_of_tx['result'] = 'fail';
						result_of_tx['message'] = query_responses[0].message;
						res.json(result_of_tx);
					} else {
						let json_string = JSON.parse(query_responses[0].toString());
						let result_list = [];

						for( let i=0; i<json_string.length; i++){
							console.log(json_string[i]['txId']);
console.log(json_string[i]);
							let result_map = {
								'tx_id' : json_string[i]['txId'],
								'balance' : json_string[i]['value']['balance'],
								'trader' : json_string[i]['value']['TxInfo']['trader'],
								'amount' : json_string[i]['value']['TxInfo']['amount'],
								'txType' : json_string[i]['value']['TxInfo']['txType'],
								'date' : json_string[i]['value']['TxInfo']['date']
							};
							result_list.push(result_map)
						}

						console.log("Response is ", result_list);
						result_of_tx['result'] = 'success';
						result_of_tx['value'] = query_responses[0].toString();
						
						res.json(result_list);
					}
				} else {
					console.log("No payloads were returned from query");
				}
			}).catch((err) => {
				console.error('Failed to query successfully :: ' + err);
				result_of_tx['message'] = err;
				result_of_tx['result'] = 'fail'
				res.json(result_of_tx)
			});
		}
	}
})();
