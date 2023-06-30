class HashRing {
    constructor(nodes = [], replicas = 3) {
      this.nodes = [];
      this.replicas = replicas;
      this.ring = {};
  
      for (const node of nodes) {
        this.addNode(node);
      }
    }
  
    addNode(node) {
      this.nodes.push(node);
      for (let i = 0; i < this.replicas; i++) {
        const key = this.hash(`${node}-${i}`);
        this.ring[key] = node;
      }
    }
  
    removeNode(node) {
      this.nodes = this.nodes.filter((n) => n !== node);
      for (let i = 0; i < this.replicas; i++) {
        const key = this.hash(`${node}-${i}`);
        delete this.ring[key];
      }
    }
  
    getNode(key) {
      if (this.nodes.length === 0) {
        return null;
      }
  
      const hashKey = this.hash(key);
      const sortedKeys = Object.keys(this.ring).sort();
  
      for (const ringKey of sortedKeys) {
        if (hashKey <= ringKey) {
          return this.ring[ringKey];
        }
      }
  
      return this.ring[sortedKeys[0]];
    }
  
    hash(key) {
      return md5(key); // Use MD5 hash function
    }
  }
  