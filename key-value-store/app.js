const express = require("express")
const axios = require('axios')
const bodyParser = require("body-parser")
const fnv1a = require('fnv1a')
const {
    response
} = require("express")
const app = express()
// Middleware to parse JSON bodies with custom reviver function
app.use(bodyParser.json())
let key_store = {}
let local_shard_id = ""
// Import functions
import { causalConsistent, maxVectorClock } from './consistency.js';
import { broadcastViewDelete, broadcastReplicate, broadcastViewPut, broadcastkvsDelete, broadcastAddMember, getStoreLength } from './broadcast.js';
import { shard, reshard, generateShardNode } from './shard.js';
import { delegateDelete, delegateGet, delegatePut } from './delegate.js';
import { downDetectionDelete } from './downdetection.js';



//--------------------------------------------------------------------------------------------------------------------------------------------------------------
//ON START UP BRAODCAST TO OTHER VIEW AND GET CAUGHT UP WITH OTHER NODES
let view = {}
let vectorClock = []
let envView = process.env.VIEW.split(",")
let shards = {}
let shardIDs = []
const ipAddress = process.env.SOCKET_ADDRESS
// console.log("This replica is running on " + ipAddress)
for (let i = 0; i < envView.length; i++) {
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
                // console.log("Added condition met");
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
    if (added == true) {
        const response = await axios.get("http://" + envView[0] + "/kvsdebug")
        let data = response.data
        shards = data['shards']
        shardIDs = data['shard IDs']
        shardCode = null
    } else {
        shardCode = shard(envView);
        local_shard_id = shards[ipAddress];
        let keys = envView
        for (let i = 0; i < keys.length; i++) {
            let address = keys[i]
            if (address == ipAddress) {
                continue
            }
            if (shards[address] === local_shard_id) {
                const response = await axios.get("http://" + address + "/kvs")
                key_store = response.data
                break
            }
        }

        if (shardCode === 500) {
            console.log("Unable to start with the requested shard amount, please try again");
        } else {
            if (added === true) {
                // console.log("This is an added node");
                //await reshard(envView, process.env.SHARD_COUNT);
            }
            console.log("System sharded");
        }
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
                    res.status(200).json({
                        "result": "already present"
                    });
                } else {
                    vectorClock.push(0);
                    view[req.body['socket-address']] = vectorClock.length - 1;
                    res.status(201).json({
                        "result": "added"
                    });
                }
            } else {
                // else we treat it as the origin of the view put request
                if (view[req.body['socket-address']] !== undefined) {
                    res.status(200).json({
                        "result": "already present"
                    });
                } else {
                    // push to the local view and then broadcast the request to all over replicas
                    vectorClock.push(0);
                    view[req.body['socket-address']] = vectorClock.length - 1;
                    const viewIp = Object.keys(view);
                    broadcastViewPut(viewIp, req.body['socket-address'])
                        .then((returnValue) => {
                            let failures = returnValue[0];
                            let successes = returnValue[1];
                            // console.log("Successful replications " + successes);
                            // console.log("Down nodes detected and deleted  " + failures);
                            if (failures.length !== 0) {
                                downDetectionDelete(failures)
                            }
                        })
                        .catch((error) => {
                            // console.log("Error in broadcastViewDelete: ", error);
                            res.status(500).json({
                                "error": "An unexpected error occurred"
                            });
                        });
                    res.status(201).json({
                        "result": "added"
                    });
                }
            }
        })
        .get(function(req, res) {
            const viewList = []
            const keys = Object.keys(view)
            keys.forEach(function(key) {
                viewList.push(key)
            })
            res.status(200).json({
                "view": viewList
            })
        })
        .delete(function(req, res) {
            if (view[req.body['socket-address']] !== undefined) {
                const viewIp = Object.keys(view);
                for (let i = view[req.body['socket-address']]; i < viewIp.length; i++) {
                    view[viewIp[i]] += -1;
                }
                vectorClock.splice(view[req.body['socket-address']], 1);
                delete view[req.body['socket-address']];
                if (req.body['broadcast'] !== undefined) {
                    res.status(201).json({
                        "result": "deleted"
                    });
                } else {
                    broadcastViewDelete(Object.keys(view), req.body['socket-address'])
                        .then((returnValue) => {
                            let failures = returnValue[0];
                            let successes = returnValue[1];
                            // console.log("Successful replications " + successes)
                            // console.log("Down nodes detected and deleted  " + failures)
                            if (failures.length !== 0) {
                                downDetectionDelete(failures)
                            }
                        })
                        .catch((error) => {
                            // console.log("Error in broadcastViewDelete: ", error);
                            res.status(500).json({
                                "error": "An unexpected error occurred"
                            });
                        });
                    res.status(201).json({
                        "result": "deleted"
                    });
                }
            } else {
                res.status(404).json({
                    "error": "View has no such replica"
                });
            }
        });


    app.route("/kvs")
        .get(function(req, res) {
            res.send(key_store)
        })

    app.route("/kvsdebug")
        .get(function(req, res) {
            let keyslength = Object.keys(key_store).length;
            let data = {
                "key-length": keyslength,
                "shard_id": local_shard_id,
                "shard code": shardCode,
                "shards": shards,
                "shard IDs": shardIDs
            };
            res.json(data);
        });
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
                if (delegatedNode === ipAddress || shards[delegatedNode] === local_shard_id) {
                    if (req.params.key.length > 50) {
                        res.status(400).json({
                            "error": "Key is too long"
                        });
                    } else {
                        if (req.body["value"] === undefined) {
                            res.status(400).json({
                                "error": "PUT request does not specify a value"
                            });
                        } else {
                            if (key_store[req.params.key] === undefined) {
                                if (req.body['broadcast'] !== undefined || keys.length === 1) {
                                    // console.log("Put broadcasted correctly to " + ipAddress)
                                    vectorClock = maxVectorClock(vectorClock, metadata)
                                    if (req.body['shard'] === local_shard_id) {
                                        key_store[req.params.key] = req.body.value;
                                        res.status(201).json({
                                            "result": "created",
                                            "causal-metadata": vectorClock
                                        });
                                    } else {
                                        res.status(410).send("Pass")
                                    }
                                } else {
                                    ("Vector clock " + vectorClock + " at " + ipAddress)
                                    vectorClock[view[ipAddress]] += 1;
                                    key_store[req.params.key] = req.body.value;
                                    let sender = view[ipAddress];
                                    broadcastReplicate(req.body, "/kvs/" + req.params.key, keys, vectorClock, sender, local_shard_id)
                                        .then(function(returnValue) {
                                            let failures = returnValue[0];
                                            let successes = returnValue[1];
                                            // console.log("Successful replications " + successes);
                                            // console.log("Down nodes detected and deleted  " + failures);
                                            if (failures.length !== 0) {
                                                downDetectionDelete(failures)
                                            }
                                            res.status(201).json({
                                                "result": "created",
                                                "causal-metadata": vectorClock
                                            });
                                        })
                                        .catch(function(error) {
                                            // console.log(error);
                                        });
                                }
                            } else {
                                if (req.body['broadcast'] !== undefined || keys.length === 1) {
                                    vectorClock = maxVectorClock(vectorClock, metadata);
                                    if (req.body['shard'] === local_shard_id) {
                                        key_store[req.params.key] = req.body.value;
                                        res.status(200).json({
                                            "result": "updated",
                                            "causal-metadata": vectorClock
                                        });
                                    } else {
                                        res.status(400).send("Pass")
                                    }
                                } else {
                                    key_store[req.params.key] = req.body.value;
                                    vectorClock[view[ipAddress]] += 1;
                                    key_store[req.params.key] = req.body.value;
                                    let sender = view[ipAddress];
                                    broadcastReplicate(req.body, "/kvs/" + req.params.key, keys, vectorClock, sender, local_shard_id)
                                        .then(function(returnValue) {
                                            let failures = returnValue[0];
                                            let successes = returnValue[1];
                                            // console.log("Successful replications " + successes);
                                            // console.log("Down nodes detected and deleted  " + failures);
                                            if (failures.length !== 0) {
                                                downDetectionDelete(failures)
                                            }
                                            res.status(200).json({
                                                "result": "updated",
                                                "causal-metadata": vectorClock
                                            });
                                        })
                                        .catch(function(error) {
                                            // console.log(error);
                                        });
                                }
                            }
                        }
                    }
                } else {
                    if (req.body['broadcast'] !== undefined || keys.length === 1) {
                        vectorClock = maxVectorClock(vectorClock, metadata)
                        res.status(410).send("Pass")
                    } else {
                        let sender = view[ipAddress];
                        let response = await delegatePut(req.body, delegatedNode, "/kvs/" + req.params.key)
                        res.status(response.status).json(response.data)
                    }
                }
            } else if (causality === false) {
                res.status(503).json({
                    "error": "Causal dependencies not satisfied; try again later"
                });
            }
        })
        .get(async function(req, res) {
            const metadata = req.body["causal-metadata"]
            // let newClock = maxVectorClock(vectorClock,req.body['causal-metadata'])
            let causality = null
            if (metadata == undefined) {
                causality = true
            } else {
                causality = causalConsistent(req.body['causal-metadata'])
            }
            if (causality === true) {
                let delegatedNode = generateShardNode(req.params.key)
                if (delegatedNode === ipAddress) {
                    if (key_store[req.params.key] === undefined) {
                        res.status(404).json({
                            "error": "Key does not exist"
                        })
                    } else {
                        res.status(200).json({
                            "result": "found",
                            "value": key_store[req.params.key],
                            "causal-metadata": vectorClock
                        })
                    }
                } else {
                    let sender = view[ipAddress]
                    let response = await delegateGet(req.body, delegatedNode, "/kvs/" + req.params.key, sender)
                    res.status(response.status).json(response.data)
                }
            } else if (causality === false) {
                res.status(503).json({
                    "error": "Causal dependencies not satisfied; try again later"
                })
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
                if (delegatedNode === ipAddress) {
                    if (key_store[req.params.key] === undefined) {
                        res.status(404).json({
                            "error": "Key does not exist"
                        });
                    } else {
                        if (req.body['broadcast'] !== undefined || keys.length === 1) {
                            vectorClock = maxVectorClock(vectorClock, metadata)
                            if (req.body['shard'] === local_shard_id) {
                                delete key_store[req.params.key];
                                res.status(200).json({
                                    "result": "deleted",
                                    "causal-metadata": vectorClock
                                })
                            } else {
                                res.status(400).send("Pass")
                            }
                        } else {
                            vectorClock[view[ipAddress]] += 1;
                            delete key_store[req.params.key];
                            let sender = view[ipAddress];
                            broadcastkvsDelete(req.body, "/kvs/" + req.params.key, keys, vectorClock, sender, local_shard_id)
                                .then(function(returnValue) {
                                    let failures = returnValue[0];
                                    let successes = returnValue[1];
                                    // console.log("Successful replications " + successes);
                                    // console.log("Down nodes detected and deleted  " + failures);
                                    if (failures.length !== 0) {
                                        downDetectionDelete(failures)
                                    }
                                    res.status(200).json({
                                        "result": "deleted",
                                        "causal-metadata": vectorClock
                                    });
                                });
                        }
                    }
                } else {
                    let sender = view[ipAddress]
                    let response = await delegateDelete(req.body, delegatedNode, "/kvs/" + req.params.key, sender)
                    res.status(response.status).json(response.data)
                }
            } else if (causality === false) {
                res.status(503).json({
                    "error": "Causal dependencies not satisfied; try again later"
                });
            }
        })

    app.route("/catchup")
        .get(function(req, res) {
            let keys = Object.keys(view)
            res.json({
                'causal-metadata': vectorClock,
                'key-store': key_store,
                'view': keys
            })
        })

    //------------------------------SHARDS----------------------------------------

    app.route("/shard/ids")
        .get(function(req, res) {
            res.status(200).json({
                "shard-ids": shardIDs
            })
        })
    app.route("/shard/node-shard-id")
        .get(function(req, res) {
            res.status(200).json({
                "node-shard-id": shards[ipAddress]
            })
        })
    app.route("/shard/members/:ID")
        .get(function(req, res) {
            let members = []
            let keys = Object.keys(view)
            keys.forEach(function(address) {
                if (shards[address] === req.params.ID) {
                    members.push(address)
                }
            })
            if (members.length === 0) {
                res.status(404).send("The ID does not exist")
            } else {
                res.status(200).json({
                    "shard-members": members
                })
            }
        })
    app.route("/shard/key-count/:ID")
        .get(async function(req, res) {
            if (shards[ipAddress] === req.params.ID) {
                res.status(200).json({
                    "shard-key-count": Object.keys(key_store).length
                })
            } else {
                let found = null
                let responseData = null
                let keys = Object.keys(view)
                for (const address of keys) {
                    if (shards[address] === req.params.ID) {
                        responseData = await getStoreLength(address, req.params.ID)
                        found = true
                        break
                    }
                }
                if (found === true) {
                    res.status(200).json(responseData)
                } else {
                    res.status(400).json({
                        "error": "ID does not exist"
                    })
                }
            }
        })
    app.route("/shard/add-member/:ID")
        .put(async function(req, res) {
            if (req.body['socket-address'] === ipAddress) {
                shards[ipAddress] = req.params.ID
                local_shard_id = req.params.ID
                let keys = Object.keys(view)
                for (let i = 0; i < keys.length; i++) {
                    let address = keys[i]
                    if (address === ipAddress) {
                        continue
                    }
                    if (shards[address] === local_shard_id) {
                        console.log("add member address " + address)
                        console.log("address shard " + shards[address])
                        console.log("local shard id " + local_shard_id)
                        const response = await axios.get("http://" + address + "/kvs")
                        key_store = response.data
                        break
                    }
                }
                res.status(200).send()
            } else {
                if (req.body['broadcast'] !== undefined) {
                    shards[req.body['socket-address']] = req.params.ID
                    res.status(200).send()
                } else {
                    let foundID = null
                    let foundIP = null
                    let keys = Object.keys(view)
                    keys.forEach(function(address) {
                        if (address === req.body['socket-address']) {
                            foundIP = true
                        }
                        if (shards[address] === req.params.ID) {
                            foundID = true
                        }
                    })
                    if (foundID === true && foundIP === true) {
                        shards[req.body['socket-address']] = req.params.ID
                        console.log("broadcasting the add member")
                        const response = await broadcastAddMember(req.params.ID, req.body['socket-address'])
                        res.status(200).json({
                            "result": "node added to shard"
                        })
                    } else {
                        res.status(400).send()
                    }
                }
            }
        })
    app.route("/shard/reshard")
        .put(async function(req, res) {
            let keys = Object.keys(view)
            shardAmount = Math.floor(keys.length / req.body['shard-count'])
            // console.log("Shard Amount: " + shardAmount)
            if (shardAmount < 2) {
                res.status(400).json({
                    "error": "Not enough nodes to provide fault tolerance withrequested shard count"
                })
            } else {
                await reshard(keys, shardAmount)
                res.status(200).json({
                    "result": "resharded"
                })
            }
        })

    app.route("/store")
        .get(function(req, res) {
            res.json(key_store)
        })
        .delete(function(req, res) {
            key_store = {}
            res.status(200).send()
        })
        .put(function(req, res) {
            key_store[req.body['key']] = req.body['value']
            res.status(200).send()
        })
        .patch(function(req, res) {
            shard(Object.keys(view), req.body['shard-amount'])
            res.status(200).send()
        })

    app.route("/copystore")
        .put(function(req, res) {

        })
    app.listen(8090, function() {
        console.log("Replica started")
    })
}
