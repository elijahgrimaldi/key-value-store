export async function downDetectionDelete(failures) {
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