const express = require("express")
const axios = require('axios')
const bodyParser = require("body-parser")
const { response } = require("express")
const e = require("express")
const app = express()
const reviver = (key, value) => {
    if (value === 'null') {
      return null
    }
    return value
  }
  
// Middleware to parse JSON bodies with custom reviver function
app.use(bodyParser.json({ reviver }))
const key_store = {}

function causalConsistent(metadata,senderPosition = undefined) {
    let senderCheck = true;
    console.log("Now using for causality" + metadata + " and " + vectorClock + " with " + senderPosition)
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



function broadcastReplicate(dataBody, route, view, metadata,sender) {
    const promises = [];
    keys = Object.keys(view)
    for (let i = 0; i < keys.length; i++) {
      const address = keys[i];
      if (address === ipAddress) {
        continue;
      }
      const promise = axios
        .put("http://" + address + route, { "value": dataBody.value, "causal-metadata": metadata,"broadcast": true, "senderPosition": sender}, {
          headers: {
            'Content-Type': 'application/json'
          }
        })
        .then(function (response) {
          if (response.status === 503) {
            return new Promise((resolve, reject) => {
              setTimeout(() => {
                axios
                  .put("http://" + address + route, { "value": dataBody.value,"causal-metadata": metadata, "broadcast": true, "senderPosition": sender}, {
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
            return response;
          }
        })
        .catch(function (error) {
          if (error.code === 'EHOSTUNREACH') {
            vectorClock[view[address]] = null
            delete view[address]
            const viewIp = Object.keys(view)
            broadcastUpdate(viewIp,response,"delete")
          }
        });
  
      promises.push(promise);
    }
  
    return Promise.all(promises);
  }
  

  async function broadcastViewDelete(viewIp, socketAddress, failures = undefined) {
    console.log(viewIp,socketAddress,failures)
    const errAddresses = [];
    const codes = [];
    const promises = [];
    for (let i = 0; i < viewIp.length; i++) {
        const address = viewIp[i];
        if (failures !== undefined){
        if (address === ipAddress || address == socketAddress || failures.includes(address)) {
            console.log("First condition met")
            continue
            }
        }
        else if (address === ipAddress || address == socketAddress) {
        console.log("second condition met")
        continue
        }
        console.log("Trying to send a request to " +  address + " to delete " + socketAddress)
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
          errAddresses.push(address);
          return Promise.reject(error);
        });
    
        promises.push(promise);
    }
    
    await Promise.allSettled(promises);
    return [errAddresses, codes]; // Return the list of errored addresses and the status codes of the broadcast
  }
  
  
  
  
  
  
function broadcastViewPut(viewIp,res,socketAddress,erraddresses){
    const requests = viewIp.map((address) => {
        if (address == ipAddress) {
          return Promise.resolve(); // Skip self-address
        }
        console.log("sending request to " + address);
        return axios.put("http://" + address + "/view", {
         "socket-address":socketAddress,
          "broadcast": true
        }, {
          headers: {
            'Content-Type': 'application/json'
          }
        })
        .then((response)=>{
            return response.data
        })
        .catch((error)=>{
            console.log("error sending request to " + address)
            erraddresses.push(address)
        })
      })
      Promise.all(requests)
        .then(function (response) {
            // handle success
            res.status(201).send({"result":"added"})
        })
        .catch(function (error) {
            // handle error
            console.log(error)
            res.status(500).send({"error": "Internal server error"});
        })

}


function broadcastkvsDelete(route) {
    const promises = [];
    const keys = Object.keys(view)
    for (let i = 0; i < view.length; i++) {
      const address = keys[i];
      if (address === ipAddress) {
        continue;
      }
      const promise = axios
        .delete("http://"+address + route, { "broadcast": true })
        .then(function (response) {
          return response;
        })
        .catch(function (error) {
          return Promise.reject(error);
        });
  
      promises.push(promise);
    }
  
    return Promise.all(promises);
  }



let view = {} 
let vectorClock = []
let envView = process.env.VIEW.split(",")
for (let i =0;i<envView.length;i++){
    view[envView[i]] = i
    vectorClock.push(0)
}
const ipAddress = process.env.SOCKET_ADDRESS
console.log("This replica is running on " + ipAddress)
  



main().catch(err => console.log(err));

async function main() {
    app.route("/view")
    .put(function(req,res){
        //if the request is a broadcast we don't want to chain broadcasts
        if (req.body['broadcast']!==undefined){
            if (view[req.body['socket-address']]!==undefined){
                res.status(200).json({"result":"already present"})
            }else{
                vectorClock.push(0)
                view[req.body['socket-address']] = vectorClock.length -1
                res.status(201).json({"result":"added"})
            }
        }else{
        //else we treat it has the origin of the view put request
        if (view[req.body['socket-address']]!==undefined){
            res.status(200).json({"result":"already present"})
        }else{
        //push to the local view and then broadcast the request to all over replicas 
        vectorClock.push(0)
        view[req.body['socket-address']] = vectorClock.length -1
        const viewIp = Object.keys(view)
        if (viewIp.length > 1){
            let erraddresses = []
            broadcastViewPut(viewIp,res,req.body['socket-address'],erraddresses)
            if (erraddresses.length > 0){
                erraddresses.forEach(function(address){
                    if (view[address]!==undefined){
                        broadcastViewDelete(viewIp,res,address)
                }})
            }
            }else{
                res.status(201).json({"result":"added"})
            }
        
            // axios.get(Object.keys(view)[0]+"/kvs")
            //     .then(function (response) {
            //         // handle success
            //         key_store = response.data
            //         res.status(response.status).send(response.data)
            //     })
            //     .catch(function (error) {
            //         // handle error
            //         res.status(error.response.status).send(error.response.data)
            //     })

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
    // .delete(function(req,res){
    //     if (view[req.body['socket-address']]!==undefined){
    //         const viewIp = Object.keys(view)
    //         for (let i=view[req.body['socket-address']]; i<viewIp.length;i++){
    //             view[viewIp[i]] += -1
    //         }
    //         vectorClock.splice(view[req.body['socket-address']],1)
    //         delete view[req.body['socket-address']]
    //         if (req.body['broadcast']!==undefined){
    //             res.status(201).json({"result":"deleted"})
    //         }else{
    //         let erraddresses = []
    //         broadcastViewDelete(viewIp,res,req.body['socket-address'],erraddresses)
    //         if (erraddresses.length > 0){
    //             erraddresses.forEach(function(address){
    //                 if (view[address]!==undefined){
    //                     broadcastViewDelete(viewIp,res,address)
    //             }})
    //         }else{
    //             res.status(201).json({"result":"deleted"})
    //         }
    //     }
    //     }else{
    //         res.status(404).json({"error":"View has no such replica"})
    //     }
    // })
    .delete(function (req, res) {
        console.log("DELETE REQUEST MADE")
        if (view[req.body['socket-address']] !== undefined) {
          const viewIp = Object.keys(view);
          for (let i = view[req.body['socket-address']]; i < viewIp.length; i++) {
            view[viewIp[i]] += -1;
          }
          vectorClock.splice(view[req.body['socket-address']], 1);
          delete view[req.body['socket-address']];
          console.log("deleting node " + req.body['socket-address'])
          console.log("This request is a " + req.body['broadcast'])
          if (req.body['broadcast'] !== undefined) {
            console.log("Brodacast has completed")
            res.status(201).json({ "result": "deleted" });
          } else {
            broadcastViewDelete(Object.keys(view), req.body['socket-address'])
              .then((returnValue) => {
                let failures = returnValue[0];
                let successes = returnValue[1];
                if (failures.length === 0) {
                  res.status(201).json({ "result": "deleted" });
                  console.log("Successes " + successes);
                } else {
                  console.log("Successes " + successes);
                  console.log("Failures" + failures);
                  console.log(returnValue)
                  console.log(typeof(failures))
                failures.forEach(function(failure){
                    console.log("broadcasting to failure " + failure)
                if (view[failure] !== undefined) {
                    const viewIp = Object.keys(view);
                    for (let i = view[failure]; i < viewIp.length; i++) {
                    view[viewIp[i]] += -1;
                    }
                    vectorClock.splice(view[failure], 1);
                    delete view[failure];
                    console.log(view)
                    console.log(vectorClock)
                    broadcastViewDelete(Object.keys(view), failure, failures)
                    .then((response) => {
                        let failures = response[0];
                        let successes = response[1];
                        console.log("Successes " + successes);
                        console.log("Failures" + failures);
                        return Promise.resolve();
                    })
                    .catch((error) => {
                        console.log(error);
                        return Promise.reject(error);
                    });
                }

            })
            res.status(201).json({ "result": "deleted" });
            }
            })
              .catch((error) => {
                console.log("Error in broadcastViewDelete: ", error);
                res.status(500).json({ "error": "An unexpected error occurred" });
              });
          }
        } else {
          res.status(404).json({ "error": "View has no such replica" });
        }
      });
      
      


    app.route("/kvs/:key")
    .put(function(req,res){
        const metadata = req.body["causal-metadata"]
        let causality = null
        if (metadata === 0){
            causality = true
        }else{
            if (req.body['broadcast']!==undefined){
            causality = causalConsistent(req.body['causal-metadata'], senderPosition=req.body['senderPosition'])
            }else{
            causality = causalConsistent(req.body['causal-metadata'])
            }
        }
        const keys = Object.keys(view)
        if (causality === true){
            if (req.params.key.length > 50){
                res.status(400).json({"error" : "Key is too long"})
            }else{
                if (req.body["value"]===undefined){
                    res.status(400).json({"error" : "PUT request does not specify a value"})
                }else{
                
                if (key_store[req.params.key]===undefined){
                    if (req.body['broadcast']!==undefined || keys.length===1){
                        vectorClock  = maxVectorClock(vectorClock,metadata)
                        key_store[req.params.key] = req.body.value
                        res.status(201).json({"result" : "created","causal-metadata":vectorClock})
                    }else{
                        vectorClock[view[ipAddress]]+=1
                        key_store[req.params.key] = req.body.value;
                        let sender = view[ipAddress]
                        broadcastReplicate(req.body, "/kvs/" + req.params.key,view,vectorClock,sender)
                          .then(function () {
                            res.status(201).json({ "result": "created", "causal-metadata": vectorClock});
                          })
                          .catch(function(error){
                            console.log(error)
                          })
                    }
                }else{
                    if(req.body['broadcast']!==undefined || keys.length===1){
                        vectorClock = maxVectorClock(vectorClock,metadata)
                        key_store[req.params.key] = req.body.value
                        res.status(200).json({"result" : "replaced","causal-metadata":vectorClock})
                    }else{
                        key_store[req.params.key] = req.body.value
                        vectorClock[view[ipAddress]]+=1
                        key_store[req.params.key] = req.body.value;
                        let sender = view[ipAddress]
                        broadcastReplicate(req.body,"/kvs/"+req.params.key,view,vectorClock,sender)
                        .then(function () {
                            res.status(200).json({"result" : "replaced","causal-metadata":vectorClock});
                          })
                          .catch(function(error){
                            console.log(error)
                          })
                    }
                }
            }
        }
        }else if (causality ===false){
            res.status(503).json({"error": "Causal dependencies not satisfied; try again later"})
        }
    })
    
           

    .get(function(req,res){
        const metadata = req.body["causal-metadata"]
        // let newClock = maxVectorClock(vectorClock,req.body['causal-metadata'])
        let causality = null
            if (metadata == undefined){
                causality = true
            }else{
                causality = causalConsistent(req.body['causal-metadata'])
            }
            if (causality === true){
                if (key_store[req.params.key]===undefined){
                    res.status(404).json({"error" : "Key does not exist"})
                } else{
                res.status(200).json({"result" : "found", "value" : key_store[req.params.key], "causal-metadata":vectorClock})
                }
            }else if (causality ===false){
                res.status(503).json({"error": "Causal dependencies not satisfied; try again later"})
            }
    })
    .delete(function(req,res){
        const metadata = req.body["causal-metadata"]
        let causality = null
        if (metadata === 0){
            causality = true
        }else{
            if (req.body['broadcast']!==undefined){
            causality = causalConsistent(req.body['causal-metadata'], senderPosition=req.body['senderPosition'])
            }else{
            causality = causalConsistent(req.body['causal-metadata'])
            }
        }
        if (causality === true){
            vectorClock[view[ipAddress]]+=1
            let newClock = maxVectorClock(vectorClock,req.body['causal-metadata'])
            if (key_store[req.params.key]===undefined){
                res.status(404).json({"error" : "Key does not exist"})
            } else{
                if (req.body['broadcast']!==undefined || keys.length===1){
                delete key_store[req.params.key]
                res.status(200).json({"result" : "deleted","causal-metadata":newClock})
                }else{
                delete key_store[req.params.key]
                broadcastkvsDelete("/kvs/"+req.params.key)
                res.status(200).json({"result" : "deleted","causal-metadata":newClock})
                }
            }
    }else if (causality === false){
        res.status(503).json({"error": "Causal dependencies not satisfied; try again later"})
    }
    })

    app.listen(8090,function(){
        console.log("Replica started")
    })
}


// START COMMANDS
// -e FORWARDING_ADDRESS=10.10.0.2:8090
// docker build -t asg2img .
// docker run --rm -p 8082:8090 --net=asg2net -e IP_ADDRESS=10.10.0.2:8090 --ip=10.10.0.2 --name replica1 asg3img
// docker run --rm -p 8083:8090 --net=asg2net -e IP_ADDRESS=10.10.0.3:8090 --ip=10.10.0.3 --name replica2 asg3img
// docker run --rm -p 8084:8090 --net=asg2net -e IP_ADDRESS=10.10.0.4:8090 --ip=10.10.0.4 --name replica3 asg3img
// docker run --rm -p 8085:8090 --net=asg2net -e IP_ADDRESS=10.10.0.5:8090 --ip=10.10.0.5 --name replica4 asg3img



// {
//  'socket-address' : 10.10.0.2:8090
// }