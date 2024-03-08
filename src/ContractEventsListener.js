// @ts-check

class ContractEventsListener {
  /**
   * @type {ContractEventsListener}
   */
  static instance;

  /**
   * @param {import('contracts-js').CloneFactoryContext} cloneFactory
   * @param {(id: string, blockNumber: number) => void} onUpdate
   */
  constructor(cloneFactory, onUpdate) {
    this.cloneFactory = cloneFactory;
    this.onUpdate = onUpdate;
    this.cloneFactoryListener = null;
    this.contracts = {};
  }

  /**
   *
   * @param {string} id
   * @param {import('contracts-js').ImplementationContext} instance
   */
  listenContract(id, instance) {
    if (this.contracts[id]) {
      console.log(`Already listening contract (${id}) events`);
      return;
    }
    this.contracts[id] = instance.events.allEvents({});
    this.contracts[id].on("connected", () => {
      console.log(`Start listen contract (${id}) events`);
    });
    this.contracts[id].on("data", (event) => {
      const blockNumber = event.blockNumber;
      console.log(`Contract (${id}) updated`);
      if (this.onUpdate) {
        this.onUpdate(id, blockNumber);
      }
    });
    this.contracts[id].on('error', (error) => {
      console.error(`Error listening contract (${id}) events`, error);
      console.log('Restart server');
      process.exit(1);
    });
  }

  listenCloneFactory() {
    if (this.cloneFactoryListener) {
      console.log("Already listening clone factory events");
      return;
    }
    this.cloneFactoryListener = this.cloneFactory.events.contractCreated({});
    // @ts-ignore ("connected" event is not defined in the type, but exists.)
    this.cloneFactoryListener.on("connected", () => {
      console.log("Start listen clone factory events");
    });
    this.cloneFactoryListener.on("data", (event) => {
      const contractId = event.returnValues._address;
      const blockNumber = event.blockNumber;
      console.log("New contract created", contractId);
      this.onUpdate(contractId, blockNumber);
    });
    this.cloneFactoryListener.on('error', (error) => {
      console.error("Error listening clone factory events", error);
      console.log('Restart server');
      process.exit(1);
    });
  }

  /**
   * @static
   * @param {import('contracts-js').CloneFactoryContext} cloneFactory
   * @param {(id: string, blockNumber: number) => void} onUpdate
   * @returns {ContractEventsListener}
   */
  static create(cloneFactory, onUpdate) {
    if (ContractEventsListener.instance) {
      return ContractEventsListener.instance;
    }

    const instance = new ContractEventsListener(cloneFactory, onUpdate);
    ContractEventsListener.instance = instance;
    instance.listenCloneFactory();
    return instance;
  }

  /**
   * @returns {ContractEventsListener}
   */
  static getInstance() {
    if (!ContractEventsListener.instance) {
      throw new Error("ContractEventsListener instance not created");
    }
    return ContractEventsListener.instance;
  }
}

module.exports = { ContractEventsListener };
