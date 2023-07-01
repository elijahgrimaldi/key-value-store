This is my back-end api for a distributed, replicated, fault tolerant, causally consistent, and sharded key-value store.
The system is distributed among shards that contain at least two replicas on each shard to maintain fault-tolerance invariant.
The keys are distributed to the shards using a hash function mod the number of shards to ensure that the keys
are evenly distributed among the system.
A vector clock is used to check for causally consistent writes from the client and other nodes.
Broadcast alogirthms replicate key values among the nodes on the same shard.
