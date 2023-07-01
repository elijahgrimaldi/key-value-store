export async function broadcastViewDelete(viewIp, socketAddress, failures = undefined) {
    // console.log(viewIp,socketAddress,failures)
    const errAddresses = [];
    const codes = [];
    const promises = [];
    for (let i = 0; i < viewIp.length; i++) {
        const address = viewIp[i];
        if (failures !== undefined) {
            if (address === ipAddress || address == socketAddress || failures.includes(address)) {
                // console.log("First condition met")
                continue
            }
        } else if (address === ipAddress || address == socketAddress) {
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
            .then(function(response) {
                codes.push(response.status);
                return response;
            })
            .catch(function(error) {
                v
            });


        promises.push(promise);
    }

    await Promise.allSettled(promises);
    return [errAddresses, codes]; // Return the list of errored addresses and the status codes of the broadcast
}

export async function broadcastViewPut(viewIp, socketAddress) {
    const errAddresses = [];
    const codes = [];
    const promises = [];
    // console.log(viewIp)
    for (let i = 0; i < viewIp.length; i++) {
        const address = viewIp[i];
        if (address === ipAddress) {
            // console.log("First condition met")
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

            .then(function(response) {
                codes.push(response.status);
                return response;
            })
            .catch(function(error) {
                errAddresses.push(address);
                return Promise.reject(error);
            });

        promises.push(promise);
    }
    await Promise.allSettled(promises)
    return [errAddresses, codes]; // Return the list of errored addresses and the status codes of the broadcast
}


export async function broadcastkvsDelete(dataBody, route, view, metadata, sender, localShard) {
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
                    "shard": localShard
                },
                headers: {
                    'Content-Type': 'application/json',
                },
                timeout: 1000
            })
            .then(function(response) {
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
                                        "shard": localShard
                                    },
                                    headers: {
                                        'Content-Type': 'application/json',
                                    }
                                })
                                .then(function(response) {
                                    resolve(response);
                                })
                                .catch(function(error) {
                                    reject(error);
                                });
                        }, 1000);
                    });
                } else {
                    codes.push(response.status);
                    return response;
                }
            })
            .catch(function(error) {
                if (error.status !== 410) {
                    errAddresses.push(address);
                }
                return Promise.reject(error);
            });

        promises.push(promise);
    }

    await Promise.allSettled(promises);
    return [errAddresses, codes]
}

export async function broadcastReplicate(dataBody, route, view, metadata, sender, localShard) {
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
            .put("http://" + address + route, {
                "value": dataBody.value,
                "causal-metadata": metadata,
                "broadcast": true,
                "senderPosition": sender,
                "shard": localShard
            }, {
                headers: {
                    'Content-Type': 'application/json'
                },
                timeout: 1000
            })
            .then(function(response) {
                if (response.status === 503) {
                    return new Promise((resolve, reject) => {
                        setTimeout(() => {
                            axios
                                .put("http://" + address + route, {
                                    "value": dataBody.value,
                                    "causal-metadata": metadata,
                                    "broadcast": true,
                                    "senderPosition": sender,
                                    "shard": localShard
                                }, {
                                    headers: {
                                        'Content-Type': 'application/json'
                                    }
                                })
                                .then(function(response) {
                                    resolve(response);
                                })
                                .catch(function(error) {
                                    reject(error);
                                });
                        }, 1000);
                    });
                } else {
                    codes.push(response.status);
                    return response;
                }
            })
            .catch(function(error) {
                // console.log("Error in the replication " + error.response.status)
                if (error.response.status !== 410) {
                    errAddresses.push(address);
                }
                return Promise.reject(error);
            });

        promises.push(promise);
    }

    await Promise.allSettled(promises);
    return [errAddresses, codes]
}

export async function broadcastAddMember(ID, socketaddress) {
    let keys = Object.keys(view)
    // console.log("Attempting keys are " + keys)
    for (let i = 0; i < keys.length; i++) {
        let address = keys[i]
        if (address === ipAddress) {
            continue
        }
        // console.log(address)
        try {
            const response = await axios.put("http://" + address + "/shard/add-member/" + ID, {
                "socket-address": socketaddress,
                "broadcast": true
            })
        } catch (error) {
            throw error
        }
    }
}
export async function getStoreLength(address, ID) {
    try {
        const response = await axios.get("http://" + address + "/shard/key-count/" + ID);
        // console.log(response.data);
        return response.data;
    } catch (error) {
        throw error;
    }
}

