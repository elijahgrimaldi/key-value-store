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

function causalConsistent(metadata){
    //finds the order of the events by comparing causal metadata
    //if the data is not consistent with the causal order it returns an error
    let sameVector = null
    let lessThan = null
    for (i=0;i<metadata.length;i++){
        if (metadata[i]===vectorClock[i]){
            continue
        }else{
            sameVector = false
            if (metadata[i]<vectorClock[i]){
                continue
            }else{
                lessThan = false
            }
        }
    }
    if (sameVector === null){
        sameVector = true
    }
    if (lessThan === null){
        lessThan = true
    }
    if (sameVector === false && lessThan === true){
        return true
    }else if (sameVector === true && lessThan === false){
        return 2
    }else {
        return false
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


// function broadcastReplicate(dataBody,route){
//     //broadcasts the data to every replica and checks if they are down and if so then it broadcasts a delete request for that replica node
//     for (let i = 0; i < view.length; i++) {
//         const address = Object.keys(view)[i];
//         if (address === ipAddress) {
//         continue;
//         }
//     axios.put(address+route,{"value":dataBody.value,"broadcast":true},{
//         headers: {
//         // 'Content-Type': 'application/x-www-form-urlencoded'
//         'Content-Type': 'application/json'
//         }})
//         .then(function (response) {
//             if (response.status===503){
//                 setTimeout(() => {
//                     console.log("Delayed for 1 second.");
//                   }, "1000");
//                   axios.put(address+route,{"value":dataBody.value,"broadcast":true},{
//                     headers: {
//                     // 'Content-Type': 'application/x-www-form-urlencoded'
//                     'Content-Type': 'application/json'
//                     }})
//                     .then(function(req,res){
//                         res.status(response.status).send(response.data)
//                     })
//                     .catch(function (error) {
//                         // handle error
//                         res.status(error.response.status).send(error.response.data);
//                     })
//             }else if (response.status===500){
//                 for (let i = 0; i < view.length; i++) {
//                     const address = Object.keys(view)[i];
//                     if (address === ipAddress) {
//                     continue;
//                     }
//                 //broadcasts a delete from the view, different from broadcastDelete() function
//                 axios.delete(address+"\view", {"socket-address":address,"broadcast":true},{
//                     headers: {
//                     // 'Content-Type': 'application/x-www-form-urlencoded'
//                     'Content-Type': 'application/json'
//                     }})
//                     .then(function (response) {
//                         // handle success
//                         res.status(response.status).send(response.data)
//                     })
//                     .catch(function (error) {
//                         // handle error
//                         res.status(error.response.status).send(error.response.data);
//                     })
//                 }
//             }else{
//             // handle success
//             res.status(response.status).send(response.data)
//             }
//         })
//         .catch(function (error) {
//             // handle error
//             res.status(error.response.status).send(error.response.data);
//         })
//     }

// }
function broadcastReplicate(dataBody, route, view, metadata,node) {
    const promises = [];
    keys = Object.keys(view)
    for (let i = 0; i < keys.length; i++) {
      const address = keys[i];
      if (address === ipAddress) {
        continue;
      }
      const promise = axios
        .put("http://" + address + route, { "value": dataBody.value, "causal-metadata": metadata,"broadcast": true, "node":node }, {
          headers: {
            'Content-Type': 'application/json'
          }
        })
        .then(function (response) {
          if (response.status === 503) {
            return new Promise((resolve, reject) => {
              setTimeout(() => {
                axios
                  .put("http://" + address + route, { "value": dataBody.value,"causal-metadata": metadata, "broadcast": true, "node":node }, {
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
          } else if (response.status === 500) {
            const deletePromises = [];
  
            for (let i = 0; i < view.length; i++) {
              const deleteAddress = Object.keys(view)[i];
              if (deleteAddress === ipAddress) {
                continue;
              }
              const deletePromise = axios
                .delete("http://" + deleteAddress + "/view", { "socket-address": deleteAddress, "broadcast": true }, {
                  headers: {
                    'Content-Type': 'application/json'
                  }
                });
              deletePromises.push(deletePromise);
            }
  
            return Promise.all(deletePromises);
          } else {
            return response;
          }
        })
        .catch(function (error) {
          return Promise.reject(error);
        });
  
      promises.push(promise);
    }
  
    return Promise.all(promises);
  }


function broadcastUpdate(viewIp,res,method){
    const requests = viewIp.map((address) => {
        if (address == ipAddress) {
          return Promise.resolve(); // Skip self-address
        }
        console.log("sending request to " + address);
        return axios.put("http://" + address + "/view", {
          "view": view,
          "clock": vectorClock,
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
            if (method ==="put"){res.status(201).send({"result":"added"})}
            if (method==="delete"){res.status(201).send({"result":"deleted"})}
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
            vectorClock = req.body["clock"]
            view = req.body["view"]
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
            broadcastUpdate(viewIp,res,"put")
            if (erraddresses.length > 0){
                erraddresses.forEach(function(address){
                    if (view[address]!==undefined){
                        vectorClock[view[address]] = null
                        delete view[req.body['socket-address']]
                        console.log("Deleted replica from the view: " + address)
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
    .delete(function(req,res){
        if (view[req.body['socket-address']]!==undefined){
            vectorClock[view[req.body['socket-address']]] = null
            delete view[req.body['socket-address']]
            const viewIp = Object.keys(view)
            broadcastUpdate(viewIp,res,"delete")

        }else{
            res.status(404).json({"error":"View has no such replica"})
        }
    })

    app.route("/debugview")
    .get(function(req,res){
        console.log(view)
        console.log(vectorClock)
    })

    app.route("/kvs")
    .get(function(req,res){
        res.status(200).json(key_store)
    })


    app.route("/kvs/:key")
    .put(function(req,res){
        const metadata = req.body["causal-metadata"]
        if (req.body['broadcast']!==undefined){
            vectorClock[req.body["node"]]+=1
        }else{
        vectorClock[view[ipAddress]]+=1
        }
        console.log("Vector Clock: " + vectorClock)
        let newClock = maxVectorClock(vectorClock,metadata)
        console.log("Vector Clock: " + newClock)
        let causality = null
        if (metadata == 0){
            causality = true
        }else{
            causality = causalConsistent(req.body['causal-metadata'])
        }
        vectorClock = newClock
        const keys = Object.keys(view)
        if (causality === true){ 
            if (req.params.key.length > 50){
                res.status(400).json({"error" : "Key is too long", "causal-metadata":newClock})
            }else{
                if (req.body["value"]===undefined){
                    res.status(400).json({"error" : "PUT request does not specify a value","causal-metadata":newClock})
                }else{
                
                if (key_store[req.params.key]===undefined){
                    if (req.body['broadcast']!==undefined || keys.length===1){
                        let newClock = vectorClock[req.body["node"]]+=1
                        key_store[req.params.key] = req.body.value
                        res.status(201).json({"result" : "created","causal-metadata":newClock})
                    }else{
                        key_store[req.params.key] = req.body.value;
                        broadcastReplicate(req.body, "/kvs/" + req.params.key,view,metadata,view[ipAddress])
                          .then(function () {
                            res.status(201).json({ "result": "created", "causal-metadata": newClock });
                          })
                          .catch(function(error){
                            console.log(error)
                          })
                    }
                }else{
                    if(req.body['broadcast']!==undefined || keys.length===1){
                        key_store[req.params.key] = req.body.value
                        res.status(200).json({"result" : "replaced","causal-metadata":newClock})
                    }else{
                        key_store[req.params.key] = req.body.value
                        broadcastReplicate(req.body,"/kvs/"+req.params.key,view,metadata)
                        .then(function () {
                            res.status(200).json({"result" : "replaced","causal-metadata":newClock});
                          })
                          .catch(function(error){
                            console.log(error)
                          })
                    }
                }
            }
        }
        }else if (causality ===false){
            res.status(503).json({"error": "Causal dependencies not satisfied; try again later","causal-metadata":newClock})
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
                vectorClock[view[ipAddress]]+=1
                if (key_store[req.params.key]===undefined){
                    res.status(404).json({"error" : "Key does not exist","causal-metadata":vectorClock})
                } else{
                res.status(200).json({"result" : "found", "value" : key_store[req.params.key], "causal-metadata":vectorClock})
                }
            }else if (causality ===false){
                res.status(503).json({"error": "Causal dependencies not satisfied; try again later","causal-metadata":vectorClock})
            }
    })
    .delete(function(req,res){
        vectorClock[view[ipAddress]]+=1
        let newClock = maxVectorClock(vectorClock,req.body['causal-metadata'])
        let causality = null
        const keys = Object.keys(view)
        if (req.body['causal-metadata'] === undefined){
            causality === false
        }else{
            causality = causalConsistent(req.body['causal-metadata'])
        }
        vectorClock = newClock
        if (causality === true){
        if (key_store[req.params.key]===undefined){
            res.status(404).json({"error" : "Key does not exist","causal-metadata":newClock})
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
        res.status(503).json({"error": "Causal dependencies not satisfied; try again later","causal-metadata":newClock})
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



// {
//  'socket-address' : 10.10.0.2:8090
// }