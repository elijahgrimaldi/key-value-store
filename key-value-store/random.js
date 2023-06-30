const hashring = require('hashring');

// Define the list of nodes in the ring
const nodes = ['10.10.0.1:8090', '10.10.0.2:8090', '10.10.0.3:8090', '10.10.0.4:8090', '10.10.0.5:8090'];

// Create the hashring instance
const ring = new hashring(nodes, 'md5',{replicas:10});

// Get the position of a node on the ring
const nodePosition = ring.get('10.10.0.3:8090');
console.log('Node position:', nodePosition);

// Get the position of a key on the ring
const keyPosition = ring.get('myKey');
console.log('Key position:', keyPosition);
console.log(ring.continuum())
console.log()
