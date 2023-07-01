export function causalConsistent(metadata, senderPosition = undefined) {
    let senderCheck = true;
    // console.log("Now using for causality" + metadata + " and " + vectorClock + " with " + senderPosition)
    for (let i = 0; i < metadata.length; i++) {
        if (senderPosition !== undefined && i === senderPosition) {
            if (metadata[i] !== vectorClock[i] + 1) {
                senderCheck = false;
                break;
            } else {
                continue
            }
        }
        if (metadata[i] > vectorClock[i]) {
            return false; // Found an element in metadata greater than the vectorClock, causal dependency not satisfied
        }
    }
    if (senderCheck === true) {
        return true; // Causal dependency satisfied or concurent
    } else {
        return false; // Causal dependency not satisfied
    }
}




export function maxVectorClock(v1, v2) {
    if (v2 == 0) {
        return v1
    } else {
        let vectorResult = []
        for (i = 0; i < v1.length; i++) {
            vectorResult[i] = Math.max(v1[i], v2[i])
        }
        return vectorResult
    }

}