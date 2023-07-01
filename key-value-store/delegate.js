export async function delegatePut(dataBody, address, route) {
    // console.log("DELEGATING PUT WITH ")  
    // console.log("DATABODY " + dataBody)
    // console.log("ADDRESS " + address)
    // console.log("ROUTE " + route)
    const response = await axios.put("http://" + address + route, {
        "value": dataBody.value,
        "causal-metadata": dataBody['causal-metadata']
    }, {
        headers: {
            'Content-Type': 'application/json'
        }
    })
    return response
}
export async function delegateGet(dataBody, address, route, sender) {
    const response = await axios.get("http://" + address + route, {
        "value": dataBody.value,
        "causal-metadata": dataBody['causal-metadata']
    }, {
        headers: {
            'Content-Type': 'application/json'
        }
    })
    return response
}
export async function delegateDelete(dataBody, address, route, sender) {
    const response = await axios.delete("http://" + address + route, {
        "value": dataBody.value,
        "causal-metadata": dataBody['causal-metadata']
    }, {
        headers: {
            'Content-Type': 'application/json'
        }
    })
    return response
}
