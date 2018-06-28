export default class Store<TState, TAction> {
  constructor(private state:TState, private reducer:(TState, TAction) => TState) {}

  getState() {
    return this.state;
  }

  dispatch(action:TAction) {
    this.state = this.reducer(this.state, action);
    this.notifySubscriptions();
  }

  subscribe(f:(TState) => void) {
    let i = this.ref++;
    this.subscriptions.push([i, f]);
    return this.unsubscribe.bind(this, i);
  }

  private notifySubscriptions() {
    this.subscriptions.forEach(([_, f]) => { f(this.state); });
  }

  private unsubscribe(i) {
    this.subscriptions = this.subscriptions.filter(([j, f]) => j !== i);
  }

  private subscriptions:[number, (TState) => void][] = [];
  private ref = 0;
}