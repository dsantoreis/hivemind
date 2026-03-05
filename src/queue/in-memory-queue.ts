export class InMemoryQueue<T> {
  private readonly items: T[] = [];

  enqueue(item: T) {
    this.items.push(item);
  }

  dequeue(): T | undefined {
    return this.items.shift();
  }

  size() {
    return this.items.length;
  }
}
