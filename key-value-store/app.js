const express = require("express")
const axios = require('axios')
const bodyParser = require("body-parser")
const HashRing = require('hashring')
const { response } = require("express")
const app = express()
  
// Middleware to parse JSON bodies with custom reviver function
app.use(bodyParser.json())
let key_store = {}
let local_shard_id = ""

//implemented hashing, made the view check if the key is where it belongs if not it delegates it to the right one
//implemented the sharding mechanism and added the nodes to each shard
//implemented all the sharding commands



//------------------------------------------------------------------------------------------------------------------------------------------------------------

function causalConsistent(metadata,senderPosition = undefined) {
    let senderCheck = true;
    // console.log("Now using for causality" + metadata + " and " + vectorClock + " with " + senderPosition)
    for (let i = 0; i < metadata.length; i++) {
        if (senderPosition !== undefined && i === senderPosition) {
            if (metadata[i] !== vectorClock[i] + 1) {
            senderCheck = false;
            break;
            }else{
                continue
            }
      }
        if (metadata[i] > vectorClock[i]) {
            return false; // Found an element in metadata greater than the vectorClock, causal dependency not satisfied
          }
      }
        if (senderCheck===true) {
            return true; // Causal dependency satisfied or concurent
        } else {
            return false; // Causal dependency not satisfied
        }
    }

  


function maxVectorClock(v1,v2){
    if (v2==0){
        return v1
    }else{
    let vectorResult = []
    for (i=0;i<v1.length;i++){
        vectorResult[i] = Math.max(v1[i],v2[i])
    }
    return vectorResult
    }

}

  async function broadcastViewDelete(viewIp, socketAddress, failures = undefined) {
    // console.log(viewIp,socketAddress,failures)
    const errAddresses = [];
    const codes = [];
    const promises = [];
    for (let i = 0; i < viewIp.length; i++) {
        const address = viewIp[i];
        if (failures !== undefined){
        if (address === ipAddress || address == socketAddress || failures.includes(address)) {
            // console.log("First condition met")
            continue
            }
        }
        else if (address === ipAddress || address == socketAddress) {
        // console.log("second condition met")
        continue
        }
        // console.log("Trying to send a request to " +  address + " to delete " + socketAddress)
        const promise = axios
        .delete("http://" + address + "/view", {
          headers: {
            'Content-Type': 'application/json'
          },
          data: {
            'socket-address': socketAddress,
            'broadcast': true
          },
          timeout: 1000
        })
        .then(function (response) {
          codes.push(response.status);
          return response;
        })
        .catch(function (error) {
v
          });
          
    
        promises.push(promise);
    }
    
    await Promise.allSettled(promises);
    return [errAddresses, codes]; // Return the list of errored addresses and the status codes of the broadcast
  }
  
async function broadcastViewPut(viewIp,socketAddress){
    const errAddresses = [];
    const codes = [];
    const promises = [];
    // console.log(viewIp)
    for (let i = 0; i < viewIp.length; i++) {
        const address = viewIp[i];
        if (address === ipAddress) {
            console.log("First condition met")
            continue
            }
        // console.log("Trying to send a request to " +  address + " to put " + socketAddress)
        const promise = axios
        .put("http://" + address + "/view", {
            'socket-address': socketAddress,
            'broadcast': true
          }, {
            headers: {
              'Content-Type': 'application/json'
            },
            timeout: 1000
          })
          
        .then(function (response) {
          codes.push(response.status);
          return response;
        })
        .catch(function (error) {
            errAddresses.push(address);
            return Promise.reject(error);
          });          
    
        promises.push(promise);
    }
    await Promise.allSettled(promises)
    return [errAddresses, codes]; // Return the list of errored addresses and the status codes of the broadcast
}


async function broadcastkvsDelete(dataBody, route, view, metadata,sender, localShard) {
    // console.log("Using this metadata in the broadcast delete: " + metadata)
    const errAddresses = [];
    const codes = [];
    const promises = [];
    keys = Object.keys(view)
    for (let i = 0; i < keys.length; i++) {
      const address = keys[i];
      if (address === ipAddress) {
        continue;
      }
      const promise = axios
      .delete("http://" + address + route, {
        data: {
          'value': dataBody.value,
          'causal-metadata': metadata,
          'broadcast': true,
          'senderPosition': sender,
          "shard":localShard
        },
        headers: {
          'Content-Type': 'application/json',
        }, timeout : 1000
        })
        .then(function (response) {
          if (response.status === 503) {
            return new Promise((resolve, reject) => {
              setTimeout(() => {
                axios
                .delete("http://" + address + route, {
                    data: {
                      'value': dataBody.value,
                      'causal-metadata': metadata,
                      'broadcast': true,
                      'senderPosition': sender,
                      "shard":localShard
                    },
                    headers: {
                      'Content-Type': 'application/json',
                    }
                  })
                  .then(function (response) {
                    resolve(response);
                  })
                  .catch(function (error) {
                    reject(error);
                  });
              }, 1000);
            });
          } else {
            codes.push(response.status);
            return response;
          }
        })
        .catch(function (error) {
          if (error.status!==410){
            errAddresses.push(address);
          }
            return Promise.reject(error);
        });
  
      promises.push(promise);
    }
  
    await Promise.allSettled(promises);
    return [errAddresses,codes]
  }

  async function broadcastReplicate(dataBody, route, view, metadata,sender,localShard) {
    // console.log("Entered the boradcast replication")
    // console.log(dataBody, route, view, metadata,sender,localShard)
    const errAddresses = [];
    const codes = [];
    const promises = [];
    for (let i = 0; i < view.length; i++) {
      const address = view[i];
      if (address === ipAddress) {
        continue;
      }
      const promise = axios
        .put("http://" + address + route, { "value": dataBody.value, "causal-metadata": metadata,"broadcast": true, "senderPosition": sender, "shard":localShard}, {
          headers: {
            'Content-Type': 'application/json'
          }, timeout : 1000
        })
        .then(function (response) {
          if (response.status === 503) {
            return new Promise((resolve, reject) => {
              setTimeout(() => {
                axios
                  .put("http://" + address + route, { "value": dataBody.value,"causal-metadata": metadata, "broadcast": true, "senderPosition": sender,"shard":localShard}, {
                    headers: {
                      'Content-Type': 'application/json'
                    }
                  })
                  .then(function (response) {
                    resolve(response);
                  })
                  .catch(function (error) {
                    reject(error);
                  });
              }, 1000);
            });
          } else {
            codes.push(response.status);
            return response;
          }
        })
        .catch(function (error) {
          console.log("Error in the replication " + error.response.status)
          if (error.response.status!==410){
            errAddresses.push(address);
          }
            return Promise.reject(error);
        });
  
      promises.push(promise);
    }
  
    await Promise.allSettled(promises);
    return [errAddresses,codes]
  }
  function shard(view, shardCount=undefined){
    ("Sharding beginning.....")
    shards = {}
    shardIDs = []
    let count = 0
    let shardAmount = 0
    if (shardCount !== undefined){
      shardAmount = shardCount
      if (shardAmount < 2){
        return 500
      }
    }else{
      if (view.length / process.env.SHARD_COUNT < 2){
        return 500
      }
      shardAmount = Math.floor(view.length / process.env.SHARD_COUNT)
    }
    let shardNum = 0
    while (count < view.length){
      for (let i=count;i<count+shardAmount;i++){
        shards[view[i]] = "s" + String(shardNum)
        if (i+1 === view.length-1 && i+1 === count+shardAmount){
          shards[view[i+1]] = "s" + String(shardNum)
        }

      }
      shardIDs.push("s" + String(shardNum))
      shardNum+=1
      count+=shardAmount
      if (view.length-count === 1){
        break
      }
    }
  }
  
  async function reshard(view,shardCount){
    console.log("Beginning the reshard...")
    ring = new HashRing(view, 'md5', {replicas : 10})
    let shardAmount = shardCount
    let visited = {}
    let combinedStore = {}
    for (let i = 0;i<view.length;i++){
      let address = view[i]
      if (visited[shards[address]]===1){
        continue
      }
      try {
        const response = await axios.get("http://" + address + "/store")
        combinedStore = Object.assign({}, combinedStore, response.data)
        visited[shards[address]]=1
      } catch (error) {
        throw error;
      }
    }
    console.log("Key stores recieved from each node....")
    for (let i = 0;i<view.length;i++){
      let address = view[i]
      try {
        const response = await axios.delete("http://" + address + "/store")
      } catch (error) {
        throw error;
      }
    }
    console.log("key stores deleted at each node....")
    console.log("Keys redistributed to each node...")
    for (let i = 0;i<view.length;i++){
      let address = view[i]
      try {
        const response = await axios.patch("http://" + address + "/store", {'shard-amount' : shardAmount})
      } catch (error) {
        throw error;
      }
    }
    let storeKeys = Object.keys(combinedStore)
    for (let i = 0; i<storeKeys.length;i++){
      let key = storeKeys[i]
      let address = ring.getNode(key)
      try {
        const response = await axios.put("http://" + address + "/store", {"key": key,"value" : combinedStore[key]})
      } catch (error) {
        throw error;
      }
    }
  }


  function generateShardNode(userKey) {
    const node = ring.get(userKey)
    return node
  }

  async function getStoreLength(address, ID) {
    try {
      const response = await axios.get("http://" + address + "/shard/key-count/" + ID);
      // console.log(response.data);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  async function delegatePut(dataBody,address,route){
    console.log("DELEGATING PUT WITH ")  
    console.log("DATABODY " + dataBody)
    console.log("ADDRESS " + address)
    console.log("ROUTE " + route)
    const response = await axios.put("http://" + address + route, { "value": dataBody.value, "causal-metadata": dataBody['causal-metadata']}, {
    headers: {
      'Content-Type': 'application/json'
    }})
  return response
  }
  async function delegateGet(dataBody,address,route,sender){
    const response = await axios.get("http://" + address + route, { "value": dataBody.value, "causal-metadata": dataBody['causal-metadata']}, {
      headers: {
        'Content-Type': 'application/json'
      }})
    return response
    }
  async function delegateDelete(dataBody,address,route,sender){
    const response = await axios.delete("http://" + address + route, { "value": dataBody.value, "causal-metadata": dataBody['causal-metadata']}, {
      headers: {
        'Content-Type': 'application/json'
      }})
    return response
    }
  async function downDetectionDelete(failures){
  failures.forEach(function(failure) {
    if (view[failure] !== undefined) {
        const failureIndex = view[failure]
        const viewIp = Object.keys(view);
        for (let i = failureIndex; i < viewIp.length; i++) {
        view[viewIp[i]] += -1;
        }
        vectorClock.splice(failureIndex, 1);
        delete view[failure];
        delete shards[failure]
        broadcastViewDelete(Object.keys(view), failure, failures)
        .then((response) => {
            // let needsReshard = false
            // for (const id in shardIDs){
            //   let numOfNodes = 0
            //   for (const address in Object.keys(view)){
            //     if (shards[address] === id){
            //       numOfNodes += 1
            //     }
            //   }
            //   if (numOfNodes < 2){
            //     reshard(Object.keys(view), )
            //   }
            // }
            return Promise.resolve();
        })
        .catch((error) => {
            // console.log(error);
            return Promise.reject(error);
        });
    }
    });
  }
  async function broadcastAddMember(ID,socketaddress){
    let keys = Object.keys(view)
    console.log("Attempting keys are " + keys)
    for (let i = 0; i<keys.length;i++){
      let address = keys[i]
      console.log(address)
    try{
      const response = await axios.put("http://" + address + "/shard/add-member/" + ID, {"socket-address":socketaddress,"broadcast":true})
    }catch(error){
      throw error
    }
  }
  }
  
//--------------------------------------------------------------------------------------------------------------------------------------------------------------
//ON START UP BRAODCAST TO OTHER VIEW AND GET CAUGHT UP WITH OTHER NODES
let view = {} 
let vectorClock = []
let envView = process.env.VIEW.split(",")
let shards = {}
let shardIDs = []
let ring = new HashRing(envView, 'md5', {replicas : 10})
const ipAddress = process.env.SOCKET_ADDRESS
// console.log("This replica is running on " + ipAddress)
for (let i =0;i<envView.length;i++){
    view[envView[i]] = i
    vectorClock.push(0)
}
async function getCaughtUp(curView) {
  let addedNode = false;
  for (let i = 0; i < curView.length; i++) {
    let address = curView[i];
    try {
      const response = await axios.get("http://" + address + "/catchup");
      if (response.data['view'].length !== envView.length) {
        console.log("Added condition met");
        addedNode = true;
      }
      if (response.data['causal-metadata'] !== undefined) {
        vectorClock = response.data['causal-metadata'];
        return addedNode;
      } else {
        continue;
      }
    } catch (error) {
      continue;
    }
  }
  return addedNode;
}

async function startup() {
  let added = await getCaughtUp(envView);
  broadcastViewPut(envView, ipAddress);
  shardCode = shard(envView);
  local_shard_id = shards[ipAddress];
  let keys = envView
  for (let i =0; i<keys.length;i++){
    let address = keys[i]
    if (address == ipAddress){
      continue
    }
    if (shards[address] === local_shard_id){
      const response = await axios.get("http://"+address+"/kvs")
      key_store = response.data
      break
    }
  }

  if (shardCode === 500) {
    console.log("Unable to start with the requested shard amount, please try again");
  } else {
    if (added === true) {
      console.log("This is an added node");
      //await reshard(envView, process.env.SHARD_COUNT);
    }
    console.log("System sharded");
  }
}

startup().catch((error) => {
  console.error("Error:", error);
});


//------------------------------------------------------------------------------------------------------------------------------------------------------------


main().catch(err => console.log(err));

async function main() {
    app.route("/view")
    .put(function(req, res) {
      // if the request is a broadcast we don't want to chain broadcasts
      if (req.body['broadcast'] !== undefined) {
        if (view[req.body['socket-address']] !== undefined) {
          res.status(200).json({ "result": "already present" });
        } else {
          vectorClock.push(0);
          view[req.body['socket-address']] = vectorClock.length - 1;
          res.status(201).json({ "result": "added" });
        }
      } else {
        // else we treat it as the origin of the view put request
        if (view[req.body['socket-address']] !== undefined) {
          res.status(200).json({ "result": "already present" });
        } else {
        // push to the local view and then broadcast the request to all over replicas
        vectorClock.push(0);
        view[req.body['socket-address']] = vectorClock.length - 1;
        const viewIp = Object.keys(view);
        broadcastViewPut(viewIp, req.body['socket-address'])
            .then((returnValue) => {
            let failures = returnValue[0];
            let successes = returnValue[1];
            console.log("Successful replications " + successes);
            console.log("Down nodes detected and deleted  " + failures);
            if (failures.length !== 0) {
              downDetectionDelete(failures)
            }
            })
            .catch((error) => {
            // console.log("Error in broadcastViewDelete: ", error);
            res.status(500).json({ "error": "An unexpected error occurred" });
            });
        res.status(201).json({ "result": "added" });
        }
      }
    })
    .get(function(req,res){
        const viewList = []
        const keys = Object.keys(view)
        keys.forEach(function(key){
            viewList.push(key)
        })
        res.status(200).json({"view":viewList})
    })
    .delete(function (req, res) {
        if (view[req.body['socket-address']] !== undefined) {
          const viewIp = Object.keys(view);
          for (let i = view[req.body['socket-address']]; i < viewIp.length; i++) {
            view[viewIp[i]] += -1;
          }
          vectorClock.splice(view[req.body['socket-address']], 1);
          delete view[req.body['socket-address']];
          if (req.body['broadcast'] !== undefined) {
            res.status(201).json({ "result": "deleted" });
          } else {
            broadcastViewDelete(Object.keys(view), req.body['socket-address'])
              .then((returnValue) => {
                let failures = returnValue[0];
                let successes = returnValue[1];
                console.log("Successful replications " + successes)
                console.log("Down nodes detected and deleted  " + failures)
                if (failures.length !== 0) {
                  downDetectionDelete(failures)
              }
            })
              .catch((error) => {
                console.log("Error in broadcastViewDelete: ", error);
                res.status(500).json({ "error": "An unexpected error occurred" });
              });
              res.status(201).json({ "result": "deleted" });
          }
        } else {
          res.status(404).json({ "error": "View has no such replica" });
        }
      });
      
      
    app.route("/kvs")
    .get(function(req,res){
      res.send(key_store)
    })
    
    app.route("/kvs/:key")
    .put(async function(req, res) {
    const metadata = req.body["causal-metadata"];
    let causality = null;
    if (metadata === 0) {
        causality = true;
    } else {
        if (req.body['broadcast'] !== undefined) {
        causality = causalConsistent(req.body['causal-metadata'], senderPosition = req.body['senderPosition']);
        } else {
        causality = causalConsistent(req.body['causal-metadata']);
        }
    }
    const keys = Object.keys(view);
    if (causality === true) {
        let delegatedNode = generateShardNode(req.params.key)
        if (delegatedNode === ipAddress || shards[delegatedNode]===local_shard_id){
        if (req.params.key.length > 50) {
        res.status(400).json({ "error": "Key is too long" });
        } else {
        if (req.body["value"] === undefined) {
            res.status(400).json({ "error": "PUT request does not specify a value" });
        } else {
            if (key_store[req.params.key] === undefined) {
            if (req.body['broadcast'] !== undefined || keys.length === 1) {
                console.log("Put broadcasted correctly to " + ipAddress)
                vectorClock = maxVectorClock(vectorClock, metadata)
                if (req.body['shard']===local_shard_id){
                key_store[req.params.key] = req.body.value;
                res.status(201).json({ "result": "created", "causal-metadata": vectorClock });
                }else{
                  res.status(410).send("Pass")
                }
            } else {
                ("Vector clock " + vectorClock + " at " + ipAddress)
                vectorClock[view[ipAddress]] += 1;
                key_store[req.params.key] = req.body.value;
                let sender = view[ipAddress];
                broadcastReplicate(req.body, "/kvs/" + req.params.key, keys, vectorClock, sender,local_shard_id)
                .then(function(returnValue) {
                    let failures = returnValue[0];
                    let successes = returnValue[1];
                    console.log("Successful replications " + successes);
                    console.log("Down nodes detected and deleted  " + failures);
                    if (failures.length !== 0) {
                      downDetectionDelete(failures)
                    }
                    res.status(201).json({ "result": "created", "causal-metadata": vectorClock });
                })
                .catch(function(error) {
                    console.log(error);
                });
            }
            } else {
            if (req.body['broadcast'] !== undefined || keys.length === 1) {
                vectorClock = maxVectorClock(vectorClock, metadata);
                if (req.body['shard']===local_shard_id){
                key_store[req.params.key] = req.body.value;
                res.status(200).json({ "result": "updated", "causal-metadata": vectorClock });
                }else{
                  res.status(400).send("Pass")
                }
            } else {
                key_store[req.params.key] = req.body.value;
                vectorClock[view[ipAddress]] += 1;
                key_store[req.params.key] = req.body.value;
                let sender = view[ipAddress];
                broadcastReplicate(req.body, "/kvs/" + req.params.key, keys, vectorClock, sender,local_shard_id)
                .then(function(returnValue) {
                    let failures = returnValue[0];
                    let successes = returnValue[1];
                    console.log("Successful replications " + successes);
                    console.log("Down nodes detected and deleted  " + failures);
                    if (failures.length !== 0) {
                      downDetectionDelete(failures)
                    }
                    res.status(200).json({ "result": "updated", "causal-metadata": vectorClock });
                })
                .catch(function(error) {
                    console.log(error);
                });
            }
            }
        }
        }
      }else{
        if (req.body['broadcast'] !== undefined || keys.length === 1){
          vectorClock = maxVectorClock(vectorClock, metadata)
          res.status(410).send("Pass")
        }else{
        let sender = view[ipAddress];
        let response = await delegatePut(req.body,delegatedNode,"/kvs/"+req.params.key)
        res.status(response.status).json(response.data)
        }
      }
    } else if (causality === false) {
        res.status(503).json({ "error": "Causal dependencies not satisfied; try again later" });
    }
    })
    .get(async function(req,res){
        const metadata = req.body["causal-metadata"]
        // let newClock = maxVectorClock(vectorClock,req.body['causal-metadata'])
        let causality = null
            if (metadata == undefined){
                causality = true
            }else{
                causality = causalConsistent(req.body['causal-metadata'])
            }
            if (causality === true){
              let delegatedNode = generateShardNode(req.params.key)
              if (delegatedNode === ipAddress){
                if (key_store[req.params.key]===undefined){
                    res.status(404).json({"error" : "Key does not exist"})
                } else{
                res.status(200).json({"result" : "found", "value" : key_store[req.params.key], "causal-metadata":vectorClock})
                }
              }else{
                let sender = view[ipAddress]
                let response = await delegateGet(req.body,delegatedNode,"/kvs/"+req.params.key,sender)
                res.status(response.status).json(response.data)
              }
            }else if (causality ===false){
                res.status(503).json({"error": "Causal dependencies not satisfied; try again later"})
            }
    })
    .delete(async function(req, res) {
        const metadata = req.body["causal-metadata"];
        // console.log("metadata:", metadata);
        let causality = null;
        if (metadata === 0) {
            causality = true;
        } else {
            if (req.body['broadcast'] !== undefined) {
            causality = causalConsistent(req.body['causal-metadata'], senderPosition = req.body['senderPosition']);
            } else {
            causality = causalConsistent(req.body['causal-metadata']);
            }
        }
        const keys = Object.keys(view)
        if (causality === true) {
            let delegatedNode = generateShardNode(req.params.key)
            if (delegatedNode === ipAddress){
            if (key_store[req.params.key] === undefined) {
            res.status(404).json({ "error": "Key does not exist" });
            } else {
            if (req.body['broadcast'] !== undefined || keys.length === 1) {
                vectorClock = maxVectorClock(vectorClock, metadata)
                if (req.body['shard']===local_shard_id){
                delete key_store[req.params.key];
                res.status(200).json({ "result": "deleted", "causal-metadata": vectorClock })
                }else{
                  res.status(400).send("Pass")
                }
            } else {
                vectorClock[view[ipAddress]] += 1;
                delete key_store[req.params.key];
                let sender = view[ipAddress];
                broadcastkvsDelete(req.body, "/kvs/" + req.params.key, keys, vectorClock, sender,local_shard_id)
                .then(function(returnValue) {
                    let failures = returnValue[0];
                    let successes = returnValue[1];
                    console.log("Successful replications " + successes);
                    console.log("Down nodes detected and deleted  " + failures);
                    if (failures.length !== 0) {
                      downDetectionDelete(failures)
                    }
                    res.status(200).json({ "result": "deleted", "causal-metadata": vectorClock});
                });
            }
            }
          }else{
            let sender = view[ipAddress]
            let response = await delegateDelete(req.body,delegatedNode,"/kvs/"+req.params.key,sender)
            res.status(response.status).json(response.data)
          }
        } else if (causality === false) {
            res.status(503).json({ "error": "Causal dependencies not satisfied; try again later" });
        }
        })

    app.route("/catchup")
    .get(function(req,res){
      let keys = Object.keys(view)
      res.json({'causal-metadata':vectorClock,'key-store':key_store, 'view':keys})
    })

    //------------------------------SHARDS----------------------------------------

    app.route("/shard/ids")
    .get(function(req,res){
      res.status(200).json({"shard-ids":shardIDs})
    })
    app.route("/shard/node-shard-id")
    .get(function(req,res){
      res.status(200).json({"node-shard-id":shards[ipAddress]})
    })
    app.route("/shard/members/:ID")
      .get(function(req,res){
      let members = []
      let keys = Object.keys(view)
      keys.forEach(function(address){
        if (shards[address]===req.params.ID){
          members.push(address)
        }
      })
      if (members.length === 0){
        res.status(404).send("The ID does not exist")
      }else{
        res.status(200).json({"shard-members":members})
      }
    })
    app.route("/shard/key-count/:ID")
    .get(async function(req,res){
      if (shards[ipAddress]===req.params.ID){
        res.status(200).json({"shard-key-count":Object.keys(key_store).length})
      }else{
        let found = null
        let responseData = null
        let keys = Object.keys(view)
        for (const address of keys){
          if (shards[address]===req.params.ID){
            responseData = await getStoreLength(address, req.params.ID)
            found = true
            break
          }
        }
        if (found === true){
          res.status(200).json(responseData)
        }else{
          res.status(400).json({"error":"ID does not exist"})
        }
      }
      })
      app.route("/shard/add-member/:ID")
      .put(async function(req,res){
        if (req.body['socket-address'] === ipAddress){
          local_shard_id = req.params.ID
          let keys = Object.keys(view)
          for (let i =0; i<keys.length;i++){
            let address = keys[i]
            if (shards[address] === req.params.ID){
              const response = await axios.get("http://"+address+"/kvs")
              key_store = response.data
              break
            }
          }
        }
        if (req.body['broadcast'] !== undefined){
          shards[req.body['socket-address']] = req.params.ID
          res.status(200).send()
        }else{
        let foundID = null
        let foundIP = null
        let keys = Object.keys(view)
        keys.forEach(function(address){
          if (address === req.body['socket-address']){
            foundIP = true
          }
          if (shards[address]===req.params.ID){
            foundID = true
          }
        })
        if (foundID === true && foundIP === true){
          shards[req.body['socket-address']] = req.params.ID
          const response = await broadcastAddMember(req.params.ID,req.body['socket-address'])
          res.status(200).json({"result":"node added to shard"})
        }else{
          res.status(400).send()
        }
      }
      })
      app.route("/shard/reshard")
      .put(async function(req,res){
        let keys = Object.keys(view)
        shardAmount = Math.floor(keys.length/req.body['shard-count'])
        console.log("Shard Amount: " + shardAmount)
        if (shardAmount < 2){
          res.status(400).json({"error": "Not enough nodes to provide fault tolerance withrequested shard count"})
        }else{
          await reshard(keys,shardAmount)
          res.status(200).json({"result":"resharded"})
        }
      })

      app.route("/store")
      .get(function(req,res){
        res.send(key_store)
      })
      .delete(function(req,res){
        key_store = {}
        res.status(200).send()
      })
      .put(function(req,res){
        key_store[req.body['key']] = req.body['value']
        res.status(200).send()
      })
      .patch(function(req,res){
        shard(Object.keys(view),req.body['shard-amount'])
        res.status(200).send()
      })

      app.route("/copystore")
      .put(function(req,res){

      })
    app.listen(8090,function(){
        console.log("Replica started")
    })
}


// START COMMANDS
// docker run --rm -p 8082:8090 --net=asg4net --ip=10.10.0.2 --name=alice -e=SHARD_COUNT=2 -e=SOCKET_ADDRESS=10.10.0.2:8090 -e=VIEW=10.10.0.2:8090,10.10.0.3:8090,10.10.0.4:8090,10.10.0.5:8090,10.10.0.6:8090,10.10.0.7:8090 asg4img
// docker run --rm -p 8083:8090 --net=asg4net --ip=10.10.0.3 --name=bob   -e=SHARD_COUNT=2 -e=SOCKET_ADDRESS=10.10.0.3:8090 -e=VIEW=10.10.0.2:8090,10.10.0.3:8090,10.10.0.4:8090,10.10.0.5:8090,10.10.0.6:8090,10.10.0.7:8090 asg4img
// docker run --rm -p 8084:8090 --net=asg4net --ip=10.10.0.4 --name=carol -e=SHARD_COUNT=2 -e=SOCKET_ADDRESS=10.10.0.4:8090 -e=VIEW=10.10.0.2:8090,10.10.0.3:8090,10.10.0.4:8090,10.10.0.5:8090,10.10.0.6:8090,10.10.0.7:8090 asg4img
// docker run --rm -p 8085:8090 --net=asg4net --ip=10.10.0.5 --name=dave  -e=SHARD_COUNT=2 -e=SOCKET_ADDRESS=10.10.0.5:8090 -e=VIEW=10.10.0.2:8090,10.10.0.3:8090,10.10.0.4:8090,10.10.0.5:8090,10.10.0.6:8090,10.10.0.7:8090 asg4img
// docker run --rm -p 8086:8090 --net=asg4net --ip=10.10.0.6 --name=erin  -e=SHARD_COUNT=2 -e=SOCKET_ADDRESS=10.10.0.6:8090 -e=VIEW=10.10.0.2:8090,10.10.0.3:8090,10.10.0.4:8090,10.10.0.5:8090,10.10.0.6:8090,10.10.0.7:8090 asg4img
// docker run --rm -p 8087:8090 --net=asg4net --ip=10.10.0.7 --name=frank -e=SHARD_COUNT=2 -e=SOCKET_ADDRESS=10.10.0.7:8090 -e=VIEW=10.10.0.2:8090,10.10.0.3:8090,10.10.0.4:8090,10.10.0.5:8090,10.10.0.6:8090,10.10.0.7:8090 asg4img
// docker run --rm -p 8088:8090 --net=asg4net --ip=10.10.0.8 --name=grace -e=SHARD_COUNT=2 -e=SOCKET_ADDRESS=10.10.0.8:8090 -e=VIEW=10.10.0.2:8090,10.10.0.3:8090,10.10.0.4:8090,10.10.0.5:8090,10.10.0.6:8090,10.10.0.7:8090,10.10.0.8:8090 asg4img

// {
//  'socket-address' : 10.10.0.2:8090
// }