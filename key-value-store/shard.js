function shard(view, shardCount = undefined) {
    ("Sharding beginning.....")
    shards = {}
    shardIDs = []
    let count = 0
    let shardAmount = 0
    console.log("shardCount: " + shardCount)
    if (shardCount !== undefined) {
        shardAmount = shardCount
        if (shardAmount < 2) {
            return 500
        }
    } else {
        if (view.length / process.env.SHARD_COUNT < 2) {
            return 500
        }
        shardAmount = Math.floor(view.length / process.env.SHARD_COUNT)
    }
    console.log("shardAmount: " + shardAmount)
    let shardNum = 0
    while (count < view.length) {
        for (let i = count; i < count + shardAmount; i++) {
            shards[view[i]] = "s" + String(shardNum)
            if (i + 1 === view.length - 1 && i + 1 === count + shardAmount) {
                shards[view[i + 1]] = "s" + String(shardNum)
            }

        }
        console.log("shards: " + shards)
        shardIDs.push("s" + String(shardNum))
        shardNum += 1
        count += shardAmount
        if (view.length - count === 1) {
            break
        }
    }
}

async function reshard(view, shardCount) {
    // console.log("Beginning the reshard...")
    let shardAmount = shardCount
    let visited = {}
    let combinedStore = {}
    for (let i = 0; i < view.length; i++) {
        let address = view[i]
        if (visited[shards[address]] === 1) {
            continue
        }
        try {
            const response = await axios.get("http://" + address + "/store")
            console.log("length of response " + Object.keys(response.data).length)
            combinedStore = Object.assign({}, combinedStore, response.data)
            console.log("length of the combined store after " + Object.keys(combinedStore).length)
            visited[shards[address]] = 1
        } catch (error) {
            throw error;
        }
    }
    // console.log("Key stores recieved from each node....")
    for (let i = 0; i < view.length; i++) {
        let address = view[i]
        try {
            const response = await axios.delete("http://" + address + "/store")
        } catch (error) {
            throw error;
        }
    }
    // console.log("key stores deleted at each node....")
    // console.log("Keys redistributed to each node...")
    for (let i = 0; i < view.length; i++) {
        let address = view[i]
        try {
            const response = await axios.patch("http://" + address + "/store", {
                'shard-amount': shardAmount
            })
        } catch (error) {
            throw error;
        }
    }
    let storeKeys = Object.keys(combinedStore)
    for (let i = 0; i < storeKeys.length; i++) {
        let key = storeKeys[i]
        let address = generateShardNode(key)
        try {
            const response = await axios.put("http://" + address + "/store", {
                "key": key,
                "value": combinedStore[key]
            })
            for (let i = 0; i < view.length; i++) {
                if (shards[address] === shards[view[i]] && view[i] !== address) {
                    const response = await axios.put("http://" + view[i] + "/store", {
                        "key": key,
                        "value": combinedStore[key]
                    })
                }
            }
        } catch (error) {
            throw error;
        }
    }
}


function generateShardNode(userKey) {
    let keys = Object.keys(view)
    let node = null
    const hash = fnv1a(userKey) % shardIDs.length
    for (let i = 0; i < keys.length; i++) {
        let address = keys[i]
        if (shards[address] === shardIDs[hash]) {
            node = address
            break
        }
    }

    return node
}